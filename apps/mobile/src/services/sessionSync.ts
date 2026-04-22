import type { ReadingSessionV2, SanctuaryApiClient } from "@sanctuary/core";
import { createSyncQueue, type SyncState } from "./syncQueue";

export type { SyncState };

interface CreateSessionSyncOptions {
  client: SanctuaryApiClient;
  onStateChange?: (state: SyncState) => void;
}

export function createSessionSyncQueue(options: CreateSessionSyncOptions) {
  return createSyncQueue<ReadingSessionV2>({
    storageKey: "sanctuary:sessions-queue",
    onStateChange: options.onStateChange,
    flush: async (items) => {
      for (const item of items) {
        await options.client.saveSession(item);
      }
    },
    serialize: (item) => item,
    deserialize: (item): ReadingSessionV2 | null => {
      const s = item as Partial<ReadingSessionV2>;
      return s?.id && s?.bookId ? (s as ReadingSessionV2) : null;
    },
  });
}
