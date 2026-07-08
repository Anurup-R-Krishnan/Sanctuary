import type { ReactNode } from "react";

import { useCallback, useEffect, useRef } from "react";

import { useAuth, useUser } from "@/hooks/useAuth";
import { settingsService } from "@/services/settingsService";
import { useSessionStore } from "@/store/useSessionStore";
import {
  useSettingsStore,
  LOCAL_SETTINGS_KEY,
  normalizeStoredSettings,
  normalizeRemoteSettings,
  pickValues,
  toRemotePayload
} from "@/store/useSettingsStore";

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();
  const { isSignedIn } = useUser();
  const { isGuest } = useSessionStore();
  const isPersistent = import.meta.env.VITE_DISABLE_AUTH !== "true" && !!(isSignedIn && !isGuest);

  const hydratedRef = useRef(false);
  const remoteSaveTimerRef = useRef<number | null>(null);
  const localSaveTimerRef = useRef<number | null>(null);
  const tokenCacheRef = useRef<{ value: string | null; expiresAt: number }>({ value: null, expiresAt: 0 });
  const tokenPromiseRef = useRef<Promise<string | null> | null>(null);
  const getCachedToken = useCallback(async () => {
    const now = Date.now();
    if (tokenCacheRef.current.expiresAt > now) {
      return tokenCacheRef.current.value;
    }
    if (!tokenPromiseRef.current) {
      tokenPromiseRef.current = getToken()
        .then((token) => {
          tokenCacheRef.current = { value: token, expiresAt: Date.now() + 60_000 };
          return token;
        })
        .finally(() => {
          tokenPromiseRef.current = null;
        });
    }
    return tokenPromiseRef.current;
  }, [getToken]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const storedRaw = localStorage.getItem(LOCAL_SETTINGS_KEY);
        if (storedRaw) {
          const parsed = JSON.parse(storedRaw);
          useSettingsStore.setState(normalizeStoredSettings(parsed));
        }
      } catch (error) {
        console.warn("Failed to load local settings cache", error);
      }

      if (!isPersistent) {
        hydratedRef.current = true;
        return;
      }

      try {
        const token = await getCachedToken();
        const remote = await settingsService.getSettings(token || undefined);
        if (mounted && remote) {
          useSettingsStore.setState(normalizeRemoteSettings(remote));
        }
      } catch (error) {
        console.warn("Failed to hydrate remote settings", error);
      } finally {
        hydratedRef.current = true;
      }
    })();

    return () => {
      mounted = false;
    };
  }, [getCachedToken, isPersistent]);

  useEffect(() => {
    const unsubscribe = useSettingsStore.subscribe((state) => {
      if (!hydratedRef.current) return;
      const values = pickValues(state);

      if (localSaveTimerRef.current !== null) {
        window.clearTimeout(localSaveTimerRef.current);
      }
      localSaveTimerRef.current = window.setTimeout(() => {
        try {
          localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(values));
        } catch (error) {
          console.warn("Failed to cache settings locally", error);
        }
      }, 150);

      if (isPersistent) {
        if (remoteSaveTimerRef.current !== null) {
          window.clearTimeout(remoteSaveTimerRef.current);
        }
        remoteSaveTimerRef.current = window.setTimeout(async () => {
          try {
            await settingsService.saveSettings(toRemotePayload(values));
          } catch (error) {
            console.warn("Failed to persist remote settings", error);
          }
        }, 700);
      }
    });

    return () => {
      unsubscribe();
      if (localSaveTimerRef.current !== null) {
        window.clearTimeout(localSaveTimerRef.current);
      }
      if (remoteSaveTimerRef.current !== null) {
        window.clearTimeout(remoteSaveTimerRef.current);
      }
    };
  }, [getCachedToken, isPersistent]);

  return <>{children}</>;
}
