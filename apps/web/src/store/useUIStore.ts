import { create } from "zustand";

import { Theme, View } from "@/types";

interface UIState {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  setView: (view: View) => void;
  theme: Theme;
  toggleTheme: () => void;
  view: View;
}

export const useUIStore = create<UIState>((set) => ({
  theme: Theme.LIGHT,
  view: View.LIBRARY,
  searchTerm: "",
  setView: (view) => set({ view }),
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT
    }))
}));
