import type { CoreAnnotation, ReaderSettings, ReadingSession, SanctuaryApiClient } from "@sanctuary/core";

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

class SyncQueueManager {
  private isProcessing = false;
  private api: SanctuaryApiClient | null = null;
  private isPersistent = true;
  private retryTimeout: number | null = null;
  private backoffMs = 1200;
  private status: SyncQueueStatus = "idle";

  getApi(): SanctuaryApiClient | null {
    return this.api;
  }

  getStatus(): SyncQueueStatus {
    return this.status;
  }

  private setStatus(status: SyncQueueStatus) {
    this.status = status;
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

        let processedAny = false;
        for (const mutation of mutations) {
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
