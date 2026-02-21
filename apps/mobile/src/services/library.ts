import type { LibraryItemV2 } from "@sanctuary/core";
import { api } from "./api";
import { cacheLibrary, loadWithCachedFallback, readCachedLibrary } from "./cache";

export interface LibraryLoadResult {
  items: LibraryItemV2[];
  stale: boolean;
  cachedAt?: string;
}

export async function loadLibraryWithFallback(): Promise<LibraryLoadResult> {
  const result = await loadWithCachedFallback<LibraryItemV2[]>({
    loadLive: () => api.getLibrary(),
    cacheRead: () => readCachedLibrary(),
    cacheWrite: (value) => cacheLibrary(value),
    empty: []
  });
  return { items: result.data, stale: result.stale, cachedAt: result.cachedAt };
}
