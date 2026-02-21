import type { ReadingGoalsV2 } from "@sanctuary/core";
import { api } from "./api";
import { cacheGoals, loadWithCachedFallback, readCachedGoals } from "./cache";

export interface GoalsLoadResult {
  data: ReadingGoalsV2 | null;
  stale: boolean;
  cachedAt?: string;
}

export async function loadGoalsWithFallback(): Promise<GoalsLoadResult> {
  const result = await loadWithCachedFallback<ReadingGoalsV2 | null>({
    loadLive: () => api.getGoals(),
    cacheRead: () => readCachedGoals(),
    cacheWrite: async (value) => {
      if (value) await cacheGoals(value);
    },
    empty: null
  });
  return { data: result.data, stale: result.stale, cachedAt: result.cachedAt };
}
