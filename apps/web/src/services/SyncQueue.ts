import type { CoreAnnotation, ReaderSettings, ReadingSession, SanctuaryApiClient } from "@sanctuary/core";

import { useEffect, useState } from "react";

import { deleteMutation, getAllMutations, putMutation, type SyncMutation } from "@/utils/db";

export type SyncQueueStatus = "local-only" | "idle" | "syncing" | "failed";

// Fallback logic for when the web app wants to run standalone without core API wrappers
async function rawApiCall(mutation: SyncMutation, api: SanctuaryApiClient) {
  if (mutation.type === "SAVE_SESSION") {
    await api.saveSession(mutation.payload as ReadingSession);
  } else if (mutation.type === "SAVE_SETTINGS") {
    await api.saveSettings(mutation.payload as ReaderSettings);
  } else if (mutation.type === "PATCH_LIBRARY") {
    const payload = mutation.payload as { id: string; data: Parameters<SanctuaryApiClient["patchLibraryItem"]>[1] };
    await api.patchLibraryItem(payload.id, payload.data);
  } else if (mutation.type === "DELETE_LIBRARY") {
    const payload = mutation.payload as { id: string };
    await api.deleteLibraryItem(payload.id);
  } else if (mutation.type === "SAVE_ANNOTATION") {
    await api.saveAnnotation(mutation.payload as CoreAnnotation);
  } else if (mutation.type === "DELETE_ANNOTATION") {
    const payload = mutation.payload as { id: string };
    await api.deleteAnnotation(payload.id);
  } else {
    throw new Error(`Unknown mutation type: ${mutation.type}`);
  }
}

/**
 * Coalesces redundant or superseded offline mutations into a minimal set.
 * - Consecutively enqueued SAVE_SETTINGS are collapsed to the latest state snapshot.
 * - Multiple PATCH_LIBRARY updates for the same book ID are merged into a single composite patch.
 * - A DELETE_LIBRARY mutation removes any prior un-dispatched PATCH_LIBRARY mutations for the same book.
 * - Superseded mutation IDs are returned as obsoleteIds so they can be purged from IndexedDB in parallel.
 */
export function coalesceMutations(mutations: SyncMutation[]): {
  coalesced: SyncMutation[];
  obsoleteIds: string[];
} {
  if (mutations.length <= 1) {
    return { coalesced: mutations, obsoleteIds: [] };
  }

  const obsoleteIds: string[] = [];
  const result: SyncMutation[] = [];
  let lastSettingsIndex = -1;
  const patchIndexByBookId = new Map<string, number>();

  for (const mut of mutations) {
    if (mut.type === "SAVE_SETTINGS") {
      if (lastSettingsIndex !== -1) {
        obsoleteIds.push(result[lastSettingsIndex].id);
        result[lastSettingsIndex] = mut;
      } else {
        lastSettingsIndex = result.length;
        result.push(mut);
      }
    } else if (mut.type === "PATCH_LIBRARY") {
      const payload = mut.payload as { id: string; data?: Record<string, unknown> };
      const bookId = payload?.id;
      const existingIndex = bookId ? patchIndexByBookId.get(bookId) : undefined;

      if (existingIndex !== undefined) {
        const existing = result[existingIndex];
        const existingPayload = existing.payload as { id: string; data?: Record<string, unknown> };
        const mergedPayload = {
          id: bookId,
          data: {
            ...(existingPayload?.data || {}),
            ...(payload?.data || {}),
          },
        };
        obsoleteIds.push(existing.id);
        result[existingIndex] = {
          ...mut,
          payload: mergedPayload,
        };
      } else {
        if (bookId) {
          patchIndexByBookId.set(bookId, result.length);
        }
        result.push(mut);
      }
    } else if (mut.type === "DELETE_LIBRARY") {
      const payload = mut.payload as { id: string };
      const bookId = payload?.id;
      const existingPatchIndex = bookId ? patchIndexByBookId.get(bookId) : undefined;

      if (existingPatchIndex !== undefined) {
        obsoleteIds.push(result[existingPatchIndex].id);
        result.splice(existingPatchIndex, 1);
        patchIndexByBookId.delete(bookId);

        // Adjust remaining indexed positions
        for (const [id, idx] of patchIndexByBookId.entries()) {
          if (idx > existingPatchIndex) {
            patchIndexByBookId.set(id, idx - 1);
          }
        }
        if (lastSettingsIndex > existingPatchIndex) {
          lastSettingsIndex--;
        }
      }
      result.push(mut);
    } else {
      result.push(mut);
    }
  }

  return { coalesced: result, obsoleteIds };
}

class SyncQueueManager {
  private isProcessing = false;
  private api: SanctuaryApiClient | null = null;
  private isPersistent = true;
  private retryTimeout: number | null = null;
  private backoffMs = 1200;
  private status: SyncQueueStatus = "idle";
  private listeners = new Set<(status: SyncQueueStatus) => void>();

  getApi(): SanctuaryApiClient | null {
    return this.api;
  }

  getStatus(): SyncQueueStatus {
    return this.status;
  }

  subscribe(callback: (status: SyncQueueStatus) => void): () => void {
    this.listeners.add(callback);
    callback(this.status);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private setStatus(status: SyncQueueStatus) {
    if (this.status === status) return;
    this.status = status;
    this.listeners.forEach((cb) => {
      try {
        cb(status);
      } catch (err) {
        console.warn("SyncQueue listener error:", err);
      }
    });
  }

  init(api: SanctuaryApiClient, isPersistent: boolean) {
    this.api = api;
    this.isPersistent = isPersistent;
    this.setStatus(isPersistent ? "idle" : "local-only");
    if (this.isPersistent) {
      this.processQueue();
    }
  }

  async enqueue(type: SyncMutation["type"], payload: unknown) {
    if (!this.isPersistent) {
      this.setStatus("local-only");
      return;
    }
    
    const mutation: SyncMutation = {
      id: crypto.randomUUID(),
      type,
      payload,
      createdAt: Date.now()
    };
    
    await putMutation(mutation);
    this.setStatus("idle");
    this.processQueue();
  }

  async processQueue() {
    if (this.isProcessing || !this.isPersistent || !this.api) return;
    this.isProcessing = true;
    this.setStatus("syncing");

    try {
      while (this.isPersistent && this.api) {
        const mutations = await getAllMutations();
        if (mutations.length === 0) {
          this.backoffMs = 1200; // reset on empty queue
          this.setStatus("idle");
          break;
        }

        // Sort by creation time (oldest first)
        mutations.sort((a, b) => a.createdAt - b.createdAt);

        // Coalesce mutations to collapse redundant roundtrips
        const { coalesced, obsoleteIds } = coalesceMutations(mutations);
        if (obsoleteIds.length > 0) {
          await Promise.allSettled(obsoleteIds.map((id) => deleteMutation(id)));
        }

        let processedAny = false;
        for (const mutation of coalesced) {
          try {
            await rawApiCall(mutation, this.api);
            await deleteMutation(mutation.id);
            processedAny = true;
          } catch (error) {
            // A mutation failed. Halt processing for now.
            console.warn(`Mutation ${mutation.id} failed, will retry:`, error);
            this.setStatus("failed");
            this.scheduleRetry();
            this.isProcessing = false;
            return;
          }
        }

        // Safety check to prevent infinite loop if deleteMutation/getAllMutations fail to align
        if (!processedAny) break;
      }
    } catch (err) {
      console.error("Critical failure reading mutation queue", err);
      this.setStatus("failed");
      this.scheduleRetry();
    }
    
    this.isProcessing = false;
    if (this.status === "syncing") this.setStatus("idle");
  }

  private scheduleRetry() {
    if (this.retryTimeout !== null) {
      window.clearTimeout(this.retryTimeout);
    }
    
    // Max backoff of ~1 minute (60000ms)
    this.backoffMs = Math.min(this.backoffMs * 1.5, 60000);
    
    this.retryTimeout = window.setTimeout(() => {
      this.retryTimeout = null;
      this.processQueue();
    }, this.backoffMs);
  }
}

export const syncQueue = new SyncQueueManager();

export function useSyncStatus(): SyncQueueStatus {
  const [status, setStatus] = useState<SyncQueueStatus>(() => syncQueue.getStatus());
  useEffect(() => {
    return syncQueue.subscribe(setStatus);
  }, []);
  return status;
}
