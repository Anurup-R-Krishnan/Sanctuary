import { create } from "zustand";

import { safeStorageRemove, safeStorageSet } from "@/reader/persistence/storage";

interface ActiveProgress {
  bookId: string;
  location: string;
  progress: number;
}

interface ReaderProgressState {
  active: ActiveProgress | null;
  clearActiveBook: () => void;
  setActiveBook: (bookId: string, progress: number, location: string) => void;
  updateActiveProgress: (bookId: string, progress: number, location: string) => void;
}

// Only the id is persisted — a reload restores the reader by reopening this
// book the same way the library would, and picks up that book's own
// lastLocation/progress rather than caching a second copy of them here.
export const ACTIVE_BOOK_STORAGE_KEY = "sanctuary-active-book-id";

export const useReaderProgressStore = create<ReaderProgressState>((set, get) => ({
  active: null,
  setActiveBook: (bookId, progress, location) => {
    set({ active: { bookId, progress, location } });
    safeStorageSet(ACTIVE_BOOK_STORAGE_KEY, bookId);
  },
  updateActiveProgress: (bookId, progress, location) => {
    const current = get().active;
    if (!current || current.bookId !== bookId) return;
    set({ active: { bookId, progress, location } });
  },
  clearActiveBook: () => {
    set({ active: null });
    safeStorageRemove(ACTIVE_BOOK_STORAGE_KEY);
  },
}));
