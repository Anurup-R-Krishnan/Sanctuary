import type { SanctuaryApiClient } from "@sanctuary/core";

import { createSyncQueue, type SyncState } from "./syncQueue";

export type { SyncState };

export interface ProgressUpdate {
  author?: string;
  bookmarks?: Array<{ cfi: string; title: string }>;
  id: string;
  lastLocation?: string;
  progress?: number;
  title?: string;
  totalPages?: number;
}

interface CreateProgressSyncOptions {
  client: SanctuaryApiClient;
  onStateChange?: (state: SyncState) => void;
}

export function createProgressSyncQueue(options: CreateProgressSyncOptions) {
  return createSyncQueue<ProgressUpdate>({
    storageKey: "sanctuary:progress-queue",
    onStateChange: options.onStateChange,
    flush: async (items) => {
      for (const update of items) {
        await options.client.patchLibraryItem(update.id, {
          title: update.title,
          author: update.author,
          progress: update.progress,
          totalPages: update.totalPages,
          lastLocation: update.lastLocation,
          bookmarks: update.bookmarks,
        });
      }
    },
    serialize: (item) => item,
    deserialize: (item): ProgressUpdate | null => {
      const u = item as Partial<ProgressUpdate>;
      return u?.id ? u as ProgressUpdate : null;
    },
  });
}
