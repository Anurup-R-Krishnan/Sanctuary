import { create } from "zustand";

import type { CatalogSource } from "@/types/opds";

import { DEFAULT_CATALOGS } from "@/services/opdsService";

const STORAGE_KEY = "sanctuary_catalogs";
const SECRETS_KEY = "sanctuary_catalog_secrets";

type CatalogSecrets = Record<string, { bearerToken?: string; password?: string }>;

function readSecrets(storage: Storage | undefined): CatalogSecrets {
  try {
    const raw = storage?.getItem(SECRETS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as CatalogSecrets) : {};
  } catch {
    return {};
  }
}

function writeSecrets(storage: Storage | undefined, secrets: CatalogSecrets) {
  try {
    if (Object.keys(secrets).length === 0) storage?.removeItem(SECRETS_KEY);
    else storage?.setItem(SECRETS_KEY, JSON.stringify(secrets));
  } catch {
    return;
  }
}

function browserStorage(kind: "local" | "session"): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return undefined;
  }
}

function withoutSecrets(catalog: CatalogSource): CatalogSource {
  const rest = { ...catalog };
  delete rest.bearerToken;
  delete rest.password;
  return rest;
}

function attachSecrets(catalogs: CatalogSource[]): CatalogSource[] {
  const secrets = { ...readSecrets(browserStorage("local")), ...readSecrets(browserStorage("session")) };
  return catalogs.map((catalog) => (secrets[catalog.id] ? { ...catalog, ...secrets[catalog.id] } : catalog));
}

function storeSecret(id: string, secret: CatalogSecrets[string], remember: boolean) {
  const target = browserStorage(remember ? "local" : "session");
  const secrets = readSecrets(target);
  secrets[id] = secret;
  writeSecrets(target, secrets);
}

function forgetSecret(id: string) {
  for (const kind of ["local", "session"] as const) {
    const storage = browserStorage(kind);
    const secrets = readSecrets(storage);
    if (id in secrets) {
      delete secrets[id];
      writeSecrets(storage, secrets);
    }
  }
}

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
      const legacy = userCatalogs.filter((c: CatalogSource) => c.password || c.bearerToken);
      if (legacy.length > 0) {
        for (const c of legacy) storeSecret(c.id, { bearerToken: c.bearerToken, password: c.password }, true);
        persistCatalogs([...DEFAULT_CATALOGS, ...userCatalogs]);
      }
      return attachSecrets([...DEFAULT_CATALOGS, ...userCatalogs.map(withoutSecrets)]);
    }
  } catch (err) {
    console.warn("Failed to parse stored catalogs:", err);
  }
  return DEFAULT_CATALOGS;
}

function persistCatalogs(catalogs: CatalogSource[]) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(catalogs.map(withoutSecrets)));
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
      remember?: boolean;
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
        if (newCatalog.password || newCatalog.bearerToken) {
          storeSecret(newCatalog.id, { bearerToken: newCatalog.bearerToken, password: newCatalog.password }, !!auth?.remember);
        }
        persistCatalogs(updated);
        return { activeCatalogId: newCatalog.id, catalogs: updated };
      }),
    catalogs: initial,
    removeCatalog: (id: string) =>
      set((state) => {
        const updated = state.catalogs.filter((c) => c.id !== id || c.isDefault);
        forgetSecret(id);
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
