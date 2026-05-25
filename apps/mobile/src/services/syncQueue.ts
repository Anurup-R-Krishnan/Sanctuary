import AsyncStorage from "@react-native-async-storage/async-storage";
import { SYNC_TIMING } from "@sanctuary/core";

export type SyncState = "idle" | "syncing" | "error";

export interface SyncQueueOptions<T> {
  deserialize: (item: unknown) => T | null;
  flush: (items: T[]) => Promise<void>;
  onStateChange?: (state: SyncState) => void;
  serialize: (item: T) => unknown;
  storageKey: string;
}

export function createSyncQueue<T extends { id: string }>(options: SyncQueueOptions<T>) {
  const queue = new Map<string, T>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let retryDelayMs = SYNC_TIMING.RETRY_INITIAL_MS;
  let stopped = false;
  let initialized = false;

  const setState = (state: SyncState) => options.onStateChange?.(state);

  const persist = async () => {
    try {
      const payload = JSON.stringify(Array.from(queue.values()));
      await AsyncStorage.setItem(options.storageKey, payload);
    } catch {
      return;
    }
  };

  const hydrate = async () => {
    if (initialized) return;
    initialized = true;
    try {
      const raw = await AsyncStorage.getItem(options.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown[];
      if (!Array.isArray(parsed)) return;
      for (const item of parsed) {
        const deserialized = options.deserialize(item);
        if (deserialized?.id) queue.set(deserialized.id, deserialized);
      }
    } catch {
      return;
    }
  };

  const schedule = (delayMs: number) => {
    if (stopped) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { void flush(); }, delayMs);
  };

  const enqueue = (item: T) => {
    const prev = queue.get(item.id);
    queue.set(item.id, { ...(prev || { id: item.id }), ...item });
    void persist();
    schedule(SYNC_TIMING.SCHEDULE_DEBOUNCE_MS);
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
      await options.flush(items);
      queue.clear();
      retryDelayMs = SYNC_TIMING.RETRY_INITIAL_MS;
      setState("idle");
    } catch {
      setState("error");
      retryDelayMs = Math.min(retryDelayMs * 2, SYNC_TIMING.RETRY_MAX_MS);
      schedule(retryDelayMs);
    }
  };

  const init = async () => {
    await hydrate();
    if (queue.size) schedule(SYNC_TIMING.INIT_SCHEDULE_MS);
  };

  const dispose = () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    void persist();
  };

  return { init, enqueue, flush, dispose };
}
