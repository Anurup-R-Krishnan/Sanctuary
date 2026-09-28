import { create } from "zustand";

import { safeStorageGet, safeStorageSet } from "@/reader/persistence/storage";
import { Theme, View } from "@/types";

export const APP_THEME_STORAGE_KEY = "sanctuary-app-theme";

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

function readStoredTheme(): Theme {
  return safeStorageGet(APP_THEME_STORAGE_KEY) === Theme.DARK ? Theme.DARK : Theme.LIGHT;
}

export const useUIStore = create<UIState>((set) => ({
  theme: readStoredTheme(),
  view: View.HOME,
  isCatalogOpen: false,
  searchTerm: "",
  setCatalogOpen: (isCatalogOpen) => set({ isCatalogOpen }),
  setView: (view) => set({ view }),
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  toggleTheme: () =>
    set((state) => {
      const theme = state.theme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT;
      safeStorageSet(APP_THEME_STORAGE_KEY, theme);
      return { theme };
    })
}));
