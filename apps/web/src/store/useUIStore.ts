import { create } from "zustand";

import { Theme, View } from "@/types";

interface UIState {
  searchTerm: string;
  selectedBookId: string | null;
  setSearchTerm: (value: string) => void;
  setSelectedBookId: (id: string | null) => void;
  setView: (view: View) => void;
  theme: Theme;
  toggleTheme: () => void;
  view: View;
}

export const useUIStore = create<UIState>((set) => ({
  theme: Theme.LIGHT,
  view: View.LIBRARY,
  selectedBookId: null,
  searchTerm: "",
  setView: (view) => set({ view }),
  setSelectedBookId: (selectedBookId) => set({ selectedBookId }),
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT
    }))
}));
