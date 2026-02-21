import { create } from "zustand";

interface ActiveProgress {
  bookId: string;
  progress: number;
  location: string;
}

interface ReaderProgressState {
  active: ActiveProgress | null;
  setActiveBook: (bookId: string, progress: number, location: string) => void;
  updateActiveProgress: (bookId: string, progress: number, location: string) => void;
  clearActiveBook: () => void;
}

export const useReaderProgressStore = create<ReaderProgressState>((set, get) => ({
  active: null,
  setActiveBook: (bookId, progress, location) => {
    set({ active: { bookId, progress, location } });
  },
  updateActiveProgress: (bookId, progress, location) => {
    const current = get().active;
    if (!current || current.bookId !== bookId) return;
    set({ active: { bookId, progress, location } });
  },
  clearActiveBook: () => set({ active: null }),
}));
