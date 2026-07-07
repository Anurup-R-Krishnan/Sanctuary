

import { putMutation, getAllMutations, deleteMutation, type SyncMutation } from "@/utils/db";

import { API } from "./api";
import { buildAuthHeaders } from "./http";

// Fallback logic for when the web app wants to run standalone without core API wrappers
async function rawApiCall(mutation: SyncMutation, getToken: () => Promise<string | null>) {
  const token = await getToken();
  const headers = buildAuthHeaders(token || undefined);
  
  if (mutation.type === "SAVE_SESSION") {
    const res = await fetch(API.SESSIONS, {
      method: "POST",
      headers,
      body: JSON.stringify(mutation.payload)
    });
    if (!res.ok) throw new Error(`SAVE_SESSION failed: ${res.status}`);
  } else if (mutation.type === "SAVE_SETTINGS") {
    const res = await fetch(API.SETTINGS, {
      method: "PUT",
      headers,
      body: JSON.stringify(mutation.payload)
    });
    if (!res.ok) throw new Error(`SAVE_SETTINGS failed: ${res.status}`);
  } else if (mutation.type === "PATCH_LIBRARY") {
    const res = await fetch(`${API.LIBRARY}?id=${encodeURIComponent(mutation.payload.id)}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(mutation.payload.data)
    });
    if (!res.ok) throw new Error(`PATCH_LIBRARY failed: ${res.status}`);
  } else {
    throw new Error(`Unknown mutation type: ${mutation.type}`);
  }
}

class SyncQueueManager {
  private isProcessing = false;
  private getToken: (() => Promise<string | null>) | null = null;
  private isPersistent = true;
  private retryTimeout: number | null = null;
  private backoffMs = 1200;

  init(getToken: () => Promise<string | null>, isPersistent: boolean) {
    this.getToken = getToken;
    this.isPersistent = isPersistent;
    if (this.isPersistent) {
      this.processQueue();
    }
  }

  async enqueue(type: SyncMutation["type"], payload: unknown) {
    if (!this.isPersistent) return;
    
    const mutation: SyncMutation = {
      id: crypto.randomUUID(),
      type,
      payload,
      createdAt: Date.now()
    };
    
    await putMutation(mutation);
    this.processQueue();
  }

  async processQueue() {
    if (this.isProcessing || !this.isPersistent || !this.getToken) return;
    this.isProcessing = true;

    try {
      const mutations = await getAllMutations();
      if (mutations.length === 0) {
        this.backoffMs = 1200; // reset on empty queue
        this.isProcessing = false;
        return;
      }

      // Sort by creation time (oldest first)
      mutations.sort((a, b) => a.createdAt - b.createdAt);

      for (const mutation of mutations) {
        try {
          await rawApiCall(mutation, this.getToken);
          await deleteMutation(mutation.id);
        } catch (error) {
          // A mutation failed. Halt processing for now.
          console.warn(`Mutation ${mutation.id} failed, will retry:`, error);
          this.scheduleRetry();
          this.isProcessing = false;
          return;
        }
      }

      // If we got here, everything succeeded
      this.backoffMs = 1200;
    } catch (err) {
      console.error("Critical failure reading mutation queue", err);
      this.scheduleRetry();
    }
    
    this.isProcessing = false;
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
