import { create } from "zustand";
import type { LibraryItemV2 } from "@sanctuary/core";

interface AppState {
  theme: "light" | "dark";
  library: LibraryItemV2[];
  selectedBookId: string | null;
  setTheme: (value: "light" | "dark") => void;
  setLibrary: (items: LibraryItemV2[]) => void;
  selectBook: (bookId: string | null) => void;
  updateBookProgress: (bookId: string, progressPercent: number, lastLocation: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: "light",
  library: [],
  selectedBookId: null,
  setTheme: (value) => set({ theme: value }),
  setLibrary: (items) => set({ library: items }),
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
