import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LibraryItemV2, ReadingGoalsV2 } from "@sanctuary/core";

const LIBRARY_KEY = "sanctuary:v2:library-cache";
const GOALS_KEY = "sanctuary:v2:goals-cache";

interface CacheEnvelope<T> {
  cachedAt: string;
  data: T;
}

export interface CachedLoadResult<T> {
  data: T;
  stale: boolean;
  cachedAt?: string;
}

async function writeEnvelope<T>(key: string, data: T): Promise<void> {
  const payload: CacheEnvelope<T> = { cachedAt: new Date().toISOString(), data };
  await AsyncStorage.setItem(key, JSON.stringify(payload));
}

async function readEnvelope<T>(key: string): Promise<CacheEnvelope<T> | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed !== "object" || !("data" in parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function cacheLibrary(data: LibraryItemV2[]): Promise<void> {
  try {
    await writeEnvelope(LIBRARY_KEY, data);
  } catch {
    return;
  }
}

export async function readCachedLibrary(): Promise<CacheEnvelope<LibraryItemV2[]> | null> {
  try {
    return await readEnvelope<LibraryItemV2[]>(LIBRARY_KEY);
  } catch {
    return null;
  }
}

export async function cacheGoals(data: ReadingGoalsV2): Promise<void> {
  try {
    await writeEnvelope(GOALS_KEY, data);
  } catch {
    return;
  }
}

export async function readCachedGoals(): Promise<CacheEnvelope<ReadingGoalsV2> | null> {
  try {
    return await readEnvelope<ReadingGoalsV2>(GOALS_KEY);
  } catch {
    return null;
  }
}

export async function loadWithCachedFallback<T>(options: {
  loadLive: () => Promise<T>;
  cacheRead: () => Promise<CacheEnvelope<T> | null>;
  cacheWrite: (value: T) => Promise<void>;
  empty: T;
}): Promise<CachedLoadResult<T>> {
  try {
    const live = await options.loadLive();
    await options.cacheWrite(live);
    return { data: live, stale: false };
  } catch {
    const cached = await options.cacheRead();
    if (!cached) {
      return { data: options.empty, stale: true };
    }
    return {
      data: cached.data,
      stale: true,
      cachedAt: cached.cachedAt
    };
  }
}
