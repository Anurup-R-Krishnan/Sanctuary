import { create } from "zustand";

import type { CatalogSource } from "@/types/opds";

import { DEFAULT_CATALOGS } from "@/services/opdsService";

const STORAGE_KEY = "sanctuary_catalogs";

function loadStoredCatalogs(): CatalogSource[] {
  if (typeof window === "undefined" || !window.localStorage) {
    return DEFAULT_CATALOGS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CATALOGS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const defaultIds = new Set(DEFAULT_CATALOGS.map((c) => c.id));
      // Drop stale defaults: a catalog persisted from an earlier version of
      // the app as isDefault (e.g. Standard Ebooks, removed after it gated
      // its feed behind paid membership) but no longer present in
      // DEFAULT_CATALOGS shouldn't survive as an unremovable ghost entry —
      // only genuinely user-added catalogs (always isDefault: false) do.
      const userCatalogs = parsed.filter(
        (c: CatalogSource) => !defaultIds.has(c.id) && !c.isDefault
      );
      return [...DEFAULT_CATALOGS, ...userCatalogs];
    }
  } catch (err) {
    console.warn("Failed to parse stored catalogs:", err);
  }
  return DEFAULT_CATALOGS;
}

function persistCatalogs(catalogs: CatalogSource[]) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(catalogs));
  } catch (err) {
    console.warn("Failed to persist catalogs:", err);
  }
}

interface CatalogStoreState {
  activeCatalogId: string;
  addCatalog: (
    name: string,
    url: string,
    auth?: {
      authType?: "basic" | "bearer" | "none";
      bearerToken?: string;
      password?: string;
      username?: string;
    }
  ) => void;
  catalogs: CatalogSource[];
  removeCatalog: (id: string) => void;
  setActiveCatalog: (id: string) => void;
}

export const useCatalogStore = create<CatalogStoreState>((set) => {
  const initial = loadStoredCatalogs();
  return {
    activeCatalogId: initial[0]?.id || "project-gutenberg",
    addCatalog: (name: string, url: string, auth) =>
      set((state) => {
        const newCatalog: CatalogSource = {
          authType: auth?.authType,
          bearerToken: auth?.bearerToken?.trim(),
          id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          isDefault: false,
          name: name.trim(),
          password: auth?.password,
          url: url.trim(),
          username: auth?.username?.trim(),
        };
        const updated = [...state.catalogs, newCatalog];
        persistCatalogs(updated);
        return { activeCatalogId: newCatalog.id, catalogs: updated };
      }),
    catalogs: initial,
    removeCatalog: (id: string) =>
      set((state) => {
        const updated = state.catalogs.filter((c) => c.id !== id || c.isDefault);
        persistCatalogs(updated);
        const nextActive =
          state.activeCatalogId === id
            ? updated[0]?.id || "project-gutenberg"
            : state.activeCatalogId;
        return { activeCatalogId: nextActive, catalogs: updated };
      }),
    setActiveCatalog: (id: string) => set({ activeCatalogId: id }),
  };
});
