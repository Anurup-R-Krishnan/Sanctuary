import { create } from "zustand";
import type { ReadingStats, ReadingSession } from "@/types";
import { DEFAULT_WEEKLY_DATA, DEFAULT_PERSONALITY, DEFAULT_DAILY_GOAL } from "@/types";

type StatsStoreState = {
  stats: ReadingStats;
  sessions: ReadingSession[];
  setStats: (stats: ReadingStats) => void;
  setSessions: (sessions: ReadingSession[]) => void;
  addSession: (session: ReadingSession) => void;
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
  sessions: [],

  setStats: (stats) => set({ stats }),
  setSessions: (sessions) => set({ sessions }),
  addSession: (session) => set((state) => ({ sessions: [...state.sessions, session] })),
}));
