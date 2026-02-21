import type { ReadingSessionV2, SanctuaryApiClient } from "@sanctuary/core";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "sanctuary:v2:sessions-queue";

export type SessionSyncState = "idle" | "syncing" | "error";

interface CreateSessionSyncOptions {
  client: SanctuaryApiClient;
  onStateChange?: (state: SessionSyncState) => void;
}

export function createSessionSyncQueue(options: CreateSessionSyncOptions) {
  const queue = new Map<string, ReadingSessionV2>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let retryMs = 1500;
  let initialized = false;
  let stopped = false;

  const setState = (state: SessionSyncState) => options.onStateChange?.(state);

  const persist = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(queue.values())));
    } catch {
      return;
    }
  };

  const hydrate = async () => {
    if (initialized) return;
    initialized = true;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ReadingSessionV2[];
      if (!Array.isArray(parsed)) return;
      for (const item of parsed) {
        if (!item?.id || !item.bookId) continue;
        queue.set(item.id, item);
      }
    } catch {
      return;
    }
  };

  const schedule = (ms: number) => {
    if (stopped) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void flush();
    }, ms);
  };

  const enqueue = (session: ReadingSessionV2) => {
    queue.set(session.id, session);
    void persist();
    schedule(500);
  };

  const flush = async () => {
    if (stopped) return;
    await hydrate();
    if (!queue.size) {
      setState("idle");
      await persist();
      return;
    }

    setState("syncing");
    const items = Array.from(queue.values());
    try {
      for (const item of items) {
        await options.client.saveSession(item);
        queue.delete(item.id);
        await persist();
      }
      retryMs = 1500;
      setState("idle");
    } catch {
      setState("error");
      retryMs = Math.min(retryMs * 2, 20000);
      schedule(retryMs);
    }
  };

  const init = async () => {
    await hydrate();
    if (queue.size) schedule(200);
  };

  const dispose = () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    void persist();
  };

  return { init, enqueue, flush, dispose };
}
