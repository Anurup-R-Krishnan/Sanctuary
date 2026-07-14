import type { ReactNode } from "react";

import { useEffect, useRef } from "react";

import { useSanctuaryApi } from "@/api/useSanctuaryApi";
import { useSanctuaryAuth } from "@/auth/useSanctuaryAuth";
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
  const { isSignedIn } = useSanctuaryAuth();
  const { mode } = useSessionStore();
  const isPersistent = import.meta.env.VITE_DISABLE_AUTH !== "true" && !!(isSignedIn && mode !== "guest");

  const hydratedRef = useRef(false);
  const remoteSaveTimerRef = useRef<number | null>(null);
  const localSaveTimerRef = useRef<number | null>(null);

  const api = useSanctuaryApi();

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
        const remote = await settingsService.getSettings(api);
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
  }, [api, isPersistent]);

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
  }, [isPersistent]);

  return <>{children}</>;
}
