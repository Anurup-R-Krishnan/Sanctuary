import { create } from "zustand";
import type { ReadingStats } from "@/types";

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
  dailyGoal: 30,
  booksCompletedThisMonth: 0,
  weeklyData: [
    { day: "Mon", pages: 0, minutes: 0 },
    { day: "Tue", pages: 0, minutes: 0 },
    { day: "Wed", pages: 0, minutes: 0 },
    { day: "Thu", pages: 0, minutes: 0 },
    { day: "Fri", pages: 0, minutes: 0 },
    { day: "Sat", pages: 0, minutes: 0 },
    { day: "Sun", pages: 0, minutes: 0 },
  ],
  monthlyData: [],
  heatmapData: [],
  genreDistribution: [],
  authorNetwork: [],
  badges: [],
  readingPersonality: "Explorer",
  personalityDescription: "You're just getting started on your reading journey!",
};

export const useStatsStore = create<StatsStoreState>((set) => ({
  stats: emptyStats,

  setStats: (stats) => set({ stats }),
}));
