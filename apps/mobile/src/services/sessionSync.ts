import type { ReadingSession, SanctuaryApiClient } from "@sanctuary/core";

import { createSyncQueue, type SyncState } from "./syncQueue";

export type { SyncState };

interface CreateSessionSyncOptions {
  client: SanctuaryApiClient;
  onStateChange?: (state: SyncState) => void;
}

export function createSessionSyncQueue(options: CreateSessionSyncOptions) {
  return createSyncQueue<ReadingSession>({
    storageKey: "sanctuary:sessions-queue",
    onStateChange: options.onStateChange,
    flush: async (items) => {
      for (const item of items) {
        await options.client.saveSession(item);
      }
    },
    serialize: (item) => item,
    deserialize: (item): ReadingSession | null => {
      const s = item as Partial<ReadingSession>;
      return s?.id && s?.bookId ? (s as ReadingSession) : null;
    },
  });
}
