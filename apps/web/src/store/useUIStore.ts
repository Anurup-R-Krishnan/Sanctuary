import { create } from "zustand";
import { Theme, View } from "@/types";

interface UIState {
  theme: Theme;
  view: View;
  selectedBookId: string | null;
  searchTerm: string;
  setView: (view: View) => void;
  setSelectedBookId: (id: string | null) => void;
  setSearchTerm: (value: string) => void;
  toggleTheme: () => void;
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
