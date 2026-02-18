import type { SanctuaryApiClient } from "@sanctuary/core";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type SyncState = "idle" | "syncing" | "error";

export interface ProgressUpdate {
  id: string;
  title?: string;
  author?: string;
  progress?: number;
  totalPages?: number;
  lastLocation?: string;
  bookmarks?: Array<{ cfi: string; title: string }>;
}

interface CreateProgressSyncOptions {
  client: SanctuaryApiClient;
  onStateChange?: (state: SyncState) => void;
}

const STORAGE_KEY = "sanctuary:v2:progress-queue";

export function createProgressSyncQueue(options: CreateProgressSyncOptions) {
  const queue = new Map<string, ProgressUpdate>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let retryDelayMs = 1200;
  let stopped = false;
  let initialized = false;

  const persistQueue = async () => {
    try {
      const payload = JSON.stringify(Array.from(queue.values()));
      await AsyncStorage.setItem(STORAGE_KEY, payload);
    } catch {
      // Best effort persistence.
    }
  };

  const hydrateQueue = async () => {
    if (initialized) return;
    initialized = true;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ProgressUpdate[];
      if (!Array.isArray(parsed)) return;
      for (const item of parsed) {
        if (!item?.id) continue;
        queue.set(item.id, item);
      }
    } catch {
      // Ignore malformed persisted payload.
    }
  };

  const setState = (state: SyncState) => {
    options.onStateChange?.(state);
  };

  const schedule = (delayMs: number) => {
    if (stopped) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void flush();
    }, delayMs);
  };

  const flush = async () => {
    if (stopped) return;
    await hydrateQueue();
    if (!queue.size) {
      setState("idle");
      await persistQueue();
      return;
    }

    setState("syncing");
    const updates = Array.from(queue.values());

    try {
      for (const update of updates) {
        await options.client.patchLibraryItem(update.id, {
          title: update.title,
          author: update.author,
          progress: update.progress,
          totalPages: update.totalPages,
          lastLocation: update.lastLocation,
          bookmarks: update.bookmarks,
        });
        queue.delete(update.id);
        await persistQueue();
      }
      retryDelayMs = 1200;
      setState("idle");
    } catch {
      setState("error");
      retryDelayMs = Math.min(retryDelayMs * 2, 15000);
      schedule(retryDelayMs);
    }
  };

  const enqueue = (update: ProgressUpdate) => {
    const prev = queue.get(update.id);
    queue.set(update.id, { ...(prev || { id: update.id }), ...update });
    void persistQueue();
    schedule(500);
  };

  const init = async () => {
    await hydrateQueue();
    if (queue.size) schedule(150);
  };

  const dispose = () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    void persistQueue();
  };

  return {
    init,
    enqueue,
    flush,
    dispose
  };
}
