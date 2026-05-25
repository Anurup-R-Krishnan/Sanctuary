import type { LibraryItem, ReadingGoals } from "@sanctuary/core";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@sanctuary/core";

import { api } from "./api";

const LIBRARY_KEY = STORAGE_KEYS.LIBRARY;
const GOALS_KEY = STORAGE_KEYS.GOALS;

interface CacheEnvelope<T> {
  cachedAt: string;
  data: T;
}

export interface CachedLoadResult<T> {
  cachedAt?: string;
  data: T;
  stale: boolean;
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

async function cacheWriteLibrary(data: LibraryItem[]): Promise<void> {
  try { await writeEnvelope(LIBRARY_KEY, data); } catch { return; }
}

async function cacheReadLibrary(): Promise<CacheEnvelope<LibraryItem[]> | null> {
  try { return await readEnvelope<LibraryItem[]>(LIBRARY_KEY); } catch { return null; }
}

async function cacheWriteGoals(data: ReadingGoals): Promise<void> {
  try { await writeEnvelope(GOALS_KEY, data); } catch { return; }
}

async function cacheReadGoals(): Promise<CacheEnvelope<ReadingGoals> | null> {
  try { return await readEnvelope<ReadingGoals>(GOALS_KEY); } catch { return null; }
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
  cachedAt?: string;
  items: LibraryItem[];
  stale: boolean;
}

export interface GoalsLoadResult {
  cachedAt?: string;
  data: ReadingGoals | null;
  stale: boolean;
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
