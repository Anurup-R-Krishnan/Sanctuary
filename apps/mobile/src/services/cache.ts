import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LibraryItemV2, ReadingGoalsV2 } from "@sanctuary/core";
import { STORAGE_KEYS } from "@sanctuary/core";
import { api } from "./api";

const LIBRARY_KEY = STORAGE_KEYS.LIBRARY;
const GOALS_KEY = STORAGE_KEYS.GOALS;

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

async function cacheWriteLibrary(data: LibraryItemV2[]): Promise<void> {
  try { await writeEnvelope(LIBRARY_KEY, data); } catch { return; }
}

async function cacheReadLibrary(): Promise<CacheEnvelope<LibraryItemV2[]> | null> {
  try { return await readEnvelope<LibraryItemV2[]>(LIBRARY_KEY); } catch { return null; }
}

async function cacheWriteGoals(data: ReadingGoalsV2): Promise<void> {
  try { await writeEnvelope(GOALS_KEY, data); } catch { return; }
}

async function cacheReadGoals(): Promise<CacheEnvelope<ReadingGoalsV2> | null> {
  try { return await readEnvelope<ReadingGoalsV2>(GOALS_KEY); } catch { return null; }
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
    if (!cached) return { data: options.empty, stale: true };
    return { data: cached.data, stale: true, cachedAt: cached.cachedAt };
  }
}

export interface LibraryLoadResult {
  items: LibraryItemV2[];
  stale: boolean;
  cachedAt?: string;
}

export interface GoalsLoadResult {
  data: ReadingGoalsV2 | null;
  stale: boolean;
  cachedAt?: string;
}

export async function loadLibraryWithFallback(): Promise<LibraryLoadResult> {
  const result = await loadWithCachedFallback({
    loadLive: () => api.getLibrary(),
    cacheRead: cacheReadLibrary,
    cacheWrite: cacheWriteLibrary,
    empty: []
  });
  return { items: result.data, stale: result.stale, cachedAt: result.cachedAt };
}

export async function loadGoalsWithFallback(): Promise<GoalsLoadResult> {
  const result = await loadWithCachedFallback({
    loadLive: () => api.getGoals(),
    cacheRead: cacheReadGoals,
    cacheWrite: async (value) => { if (value) await cacheWriteGoals(value); },
    empty: null
  });
  return { data: result.data, stale: result.stale, cachedAt: result.cachedAt };
}
