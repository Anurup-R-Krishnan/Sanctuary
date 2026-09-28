import { create } from "zustand";

import { Theme, View } from "@/types";

interface UIState {
  isCatalogOpen: boolean;
  searchTerm: string;
  setCatalogOpen: (open: boolean) => void;
  setSearchTerm: (value: string) => void;
  setView: (view: View) => void;
  theme: Theme;
  toggleTheme: () => void;
  view: View;
}

export const useUIStore = create<UIState>((set) => ({
  theme: Theme.LIGHT,
  view: View.HOME,
  isCatalogOpen: false,
  searchTerm: "",
  setCatalogOpen: (isCatalogOpen) => set({ isCatalogOpen }),
  setView: (view) => set({ view }),
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT
    }))
}));
