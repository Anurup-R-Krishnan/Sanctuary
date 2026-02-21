import { create } from "zustand";
import type { Book } from "@/types";
import { Theme, View } from "@/types";

interface UIState {
  theme: Theme;
  view: View;
  selectedBook: Book | null;
  searchTerm: string;
  setView: (view: View) => void;
  setSelectedBook: (book: Book | null) => void;
  setSearchTerm: (value: string) => void;
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: Theme.LIGHT,
  view: View.LIBRARY,
  selectedBook: null,
  searchTerm: "",
  setView: (view) => set({ view }),
  setSelectedBook: (selectedBook) => set({ selectedBook }),
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT
    }))
}));
