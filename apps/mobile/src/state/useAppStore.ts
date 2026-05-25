import type { LibraryItem, ReadingGoals } from "@sanctuary/core";

import { create } from "zustand";

interface AppState {
  goals: ReadingGoals | null;
  goalsCachedAt: string | null;
  goalsStale: boolean;
  library: LibraryItem[];
  libraryCachedAt: string | null;
  libraryStale: boolean;
  selectBook: (bookId: string | null) => void;
  selectedBookId: string | null;
  setGoals: (goals: ReadingGoals | null, options?: { stale?: boolean; cachedAt?: string | null }) => void;
  setLibrary: (items: LibraryItem[], options?: { stale?: boolean; cachedAt?: string | null }) => void;
  setTheme: (value: "light" | "dark") => void;
  theme: "light" | "dark";
  updateBookProgress: (bookId: string, progressPercent: number, lastLocation: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: "light",
  library: [],
  libraryStale: false,
  libraryCachedAt: null,
  goals: null,
  goalsStale: false,
  goalsCachedAt: null,
  selectedBookId: null,
  setTheme: (value) => set({ theme: value }),
  setLibrary: (items, options) =>
    set({
      library: items,
      libraryStale: !!options?.stale,
      libraryCachedAt: options?.cachedAt || null
    }),
  setGoals: (goals, options) =>
    set({
      goals,
      goalsStale: !!options?.stale,
      goalsCachedAt: options?.cachedAt || null
    }),
  selectBook: (bookId) => set({ selectedBookId: bookId }),
  updateBookProgress: (bookId, progressPercent, lastLocation) =>
    set((state) => ({
      library: state.library.map((book) =>
        book.id === bookId
          ? {
              ...book,
              progressPercent: Math.max(0, Math.min(100, Math.round(progressPercent))),
              lastLocation,
              status: progressPercent <= 0 ? "to-read" : progressPercent >= 100 ? "finished" : "reading",
              updatedAt: new Date().toISOString()
            }
          : book
      )
    }))
}));
