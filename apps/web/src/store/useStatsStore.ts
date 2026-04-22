import { create } from "zustand";
import type { ReadingStats } from "@/types";
import { DEFAULT_WEEKLY_DATA, DEFAULT_PERSONALITY, DEFAULT_DAILY_GOAL } from "@/types";

type StatsStoreState = {
  stats: ReadingStats;
  setStats: (stats: ReadingStats) => void;
};

const emptyStats: ReadingStats = {
  currentStreak: 0,
  longestStreak: 0,
  totalBooksRead: 0,
  totalBooksInLibrary: 0,
  totalPagesRead: 0,
  totalReadingTime: 0,
  averageReadingSpeed: 0,
  dailyProgress: 0,
  dailyGoal: DEFAULT_DAILY_GOAL,
  booksCompletedThisMonth: 0,
  weeklyData: [...DEFAULT_WEEKLY_DATA],
  monthlyData: [],
  heatmapData: [],
  genreDistribution: [],
  authorNetwork: [],
  badges: [],
  readingPersonality: DEFAULT_PERSONALITY.personality,
  personalityDescription: DEFAULT_PERSONALITY.description,
};

export const useStatsStore = create<StatsStoreState>((set) => ({
  stats: emptyStats,

  setStats: (stats) => set({ stats }),
}));
