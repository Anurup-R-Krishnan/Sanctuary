import { create } from "zustand";
import type { LibraryItemV2, ReadingGoalsV2 } from "@sanctuary/core";

interface AppState {
  theme: "light" | "dark";
  library: LibraryItemV2[];
  libraryStale: boolean;
  libraryCachedAt: string | null;
  goals: ReadingGoalsV2 | null;
  goalsStale: boolean;
  goalsCachedAt: string | null;
  selectedBookId: string | null;
  setTheme: (value: "light" | "dark") => void;
  setLibrary: (items: LibraryItemV2[], options?: { stale?: boolean; cachedAt?: string | null }) => void;
  setGoals: (goals: ReadingGoalsV2 | null, options?: { stale?: boolean; cachedAt?: string | null }) => void;
  selectBook: (bookId: string | null) => void;
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
