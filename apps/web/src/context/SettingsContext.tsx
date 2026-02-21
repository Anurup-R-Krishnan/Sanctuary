import type { ReactNode } from "react";
import React, { useCallback, useEffect, useRef } from "react";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { settingsService } from "@/services/settingsService";
import { useAuth } from "@/hooks/useAuth";

type TextAlignment = "left" | "justify" | "center";

type Keybinds = {
  nextPage: string[];
  prevPage: string[];
  toggleBookmark: string[];
  toggleFullscreen: string[];
  toggleUI: string[];
  close: string[];
};

type SettingsValues = {
  fontSize: number;
  lineHeight: number;
  textAlignment: TextAlignment;
  fontPairing: string;
  maxTextWidth: number;
  hyphenation: boolean;
  pageMargin: number;
  paragraphSpacing: number;
  continuous: boolean;
  spread: boolean;
  direction: "ltr" | "rtl";
  brightness: number;
  grayscale: boolean;
  showScrollbar: boolean;
  showPageCounter: boolean;
  progressBarType: "bar" | "none";
  barPosition: "top" | "bottom";
  showFloatingCapsule: boolean;
  readerForeground: string;
  readerBackground: string;
  readerAccent: string;
  keybinds: Keybinds;
  dailyGoal: number;
  weeklyGoal: number;
  showStreakReminder: boolean;
  trackingEnabled: boolean;
  screenReaderMode: boolean;
  reduceMotion: boolean;
};

type SettingsActions = {
  setFontSize: (v: number) => void;
  setLineHeight: (v: number) => void;
  setTextAlignment: (v: TextAlignment) => void;
  setFontPairing: (v: string) => void;
  setMaxTextWidth: (v: number) => void;
  setHyphenation: (v: boolean) => void;
  setPageMargin: (v: number) => void;
  setParagraphSpacing: (v: number) => void;
  setContinuous: (v: boolean) => void;
  setSpread: (v: boolean) => void;
  setDirection: (v: "ltr" | "rtl") => void;
  setBrightness: (v: number) => void;
  setGrayscale: (v: boolean) => void;
  setShowScrollbar: (v: boolean) => void;
  setShowPageCounter: (v: boolean) => void;
  setProgressBarType: (v: "bar" | "none") => void;
  setBarPosition: (v: "top" | "bottom") => void;
  setShowFloatingCapsule: (v: boolean) => void;
  setReaderForeground: (v: string) => void;
  setReaderBackground: (v: string) => void;
  setReaderAccent: (v: string) => void;
  setKeybinds: (v: Keybinds) => void;
  setDailyGoal: (v: number) => void;
  setWeeklyGoal: (v: number) => void;
  setShowStreakReminder: (v: boolean) => void;
  setTrackingEnabled: (v: boolean) => void;
  setScreenReaderMode: (v: boolean) => void;
  setReduceMotion: (v: boolean) => void;
  resetToDefaults: () => void;
};

export type Settings = SettingsValues & SettingsActions;

export const DEFAULTS: SettingsValues = {
  fontSize: 19,
  lineHeight: 1.65,
  textAlignment: "justify",
  fontPairing: "merriweather-georgia",
  maxTextWidth: 150,
  hyphenation: true,
  pageMargin: 40,
  paragraphSpacing: 17,
  continuous: false,
  spread: false,
  direction: "ltr",
  brightness: 100,
  grayscale: false,
  showScrollbar: false,
  showPageCounter: true,
  progressBarType: "bar",
  barPosition: "bottom",
  showFloatingCapsule: true,
  readerForeground: "#1a1a1a",
  readerBackground: "#ffffff",
  readerAccent: "#8B7355",
  keybinds: {
    nextPage: ["ArrowRight", "ArrowDown", " "],
    prevPage: ["ArrowLeft", "ArrowUp"],
    toggleBookmark: ["b", "B"],
    toggleFullscreen: ["f", "F"],
    toggleUI: ["m", "M"],
    close: ["Escape"]
  },
  dailyGoal: 30,
  weeklyGoal: 150,
  showStreakReminder: true,
  trackingEnabled: true,
  screenReaderMode: false,
  reduceMotion: false
};

const LOCAL_SETTINGS_KEY = "sanctuary.web.settings.v1";

const pickValues = (state: Settings): SettingsValues => ({
  fontSize: state.fontSize,
  lineHeight: state.lineHeight,
  textAlignment: state.textAlignment,
  fontPairing: state.fontPairing,
  maxTextWidth: state.maxTextWidth,
  hyphenation: state.hyphenation,
  pageMargin: state.pageMargin,
  paragraphSpacing: state.paragraphSpacing,
  continuous: state.continuous,
  spread: state.spread,
  direction: state.direction,
  brightness: state.brightness,
  grayscale: state.grayscale,
  showScrollbar: state.showScrollbar,
  showPageCounter: state.showPageCounter,
  progressBarType: state.progressBarType,
  barPosition: state.barPosition,
  showFloatingCapsule: state.showFloatingCapsule,
  readerForeground: state.readerForeground,
  readerBackground: state.readerBackground,
  readerAccent: state.readerAccent,
  keybinds: state.keybinds,
  dailyGoal: state.dailyGoal,
  weeklyGoal: state.weeklyGoal,
  showStreakReminder: state.showStreakReminder,
  trackingEnabled: state.trackingEnabled,
  screenReaderMode: state.screenReaderMode,
  reduceMotion: state.reduceMotion
});

const toRemotePayload = (state: SettingsValues) => ({
  dailyGoal: state.dailyGoal,
  weeklyGoal: state.weeklyGoal,
  lineHeight: state.lineHeight,
  textWidth: Math.max(50, Math.min(120, Math.round(state.maxTextWidth))),
  motion: state.reduceMotion ? "reduced" : "full",
  showPageMeta: state.showPageCounter,
  accent: state.readerAccent
});

const normalizeStoredSettings = (input: unknown): Partial<SettingsValues> => {
  if (!input || typeof input !== "object") return {};
  const raw = input as Record<string, unknown>;
  const out: Partial<SettingsValues> = {};
  for (const key of Object.keys(DEFAULTS) as Array<keyof SettingsValues>) {
    if (raw[key] !== undefined) {
      (out as Record<string, unknown>)[key] = raw[key];
    }
  }
  return out;
};

const normalizeRemoteSettings = (input: unknown): Partial<SettingsValues> => {
  if (!input || typeof input !== "object") return {};
  const remote = input as Record<string, unknown>;
  const out: Partial<SettingsValues> = {};

  if (typeof remote.dailyGoal === "number") out.dailyGoal = remote.dailyGoal;
  if (typeof remote.weeklyGoal === "number") out.weeklyGoal = remote.weeklyGoal;
  if (typeof remote.lineHeight === "number") out.lineHeight = remote.lineHeight;
  if (typeof remote.textWidth === "number") out.maxTextWidth = remote.textWidth;
  if (typeof remote.motion === "string") out.reduceMotion = remote.motion === "reduced";
  if (typeof remote.showPageMeta === "boolean") out.showPageCounter = remote.showPageMeta;
  if (typeof remote.accent === "string") out.readerAccent = remote.accent;

  return out;
};

const createSetAction = <K extends keyof SettingsValues>(key: K, set: (partial: Partial<SettingsValues>) => void) => {
  return (value: SettingsValues[K]) => set({ [key]: value } as Partial<SettingsValues>);
};

const useSettingsStore = create<Settings>((set) => ({
  ...DEFAULTS,
  setFontSize: createSetAction("fontSize", set),
  setLineHeight: createSetAction("lineHeight", set),
  setTextAlignment: createSetAction("textAlignment", set),
  setFontPairing: createSetAction("fontPairing", set),
  setMaxTextWidth: createSetAction("maxTextWidth", set),
  setHyphenation: createSetAction("hyphenation", set),
  setPageMargin: createSetAction("pageMargin", set),
  setParagraphSpacing: createSetAction("paragraphSpacing", set),
  setContinuous: createSetAction("continuous", set),
  setSpread: createSetAction("spread", set),
  setDirection: createSetAction("direction", set),
  setBrightness: createSetAction("brightness", set),
  setGrayscale: createSetAction("grayscale", set),
  setShowScrollbar: createSetAction("showScrollbar", set),
  setShowPageCounter: createSetAction("showPageCounter", set),
  setProgressBarType: createSetAction("progressBarType", set),
  setBarPosition: createSetAction("barPosition", set),
  setShowFloatingCapsule: createSetAction("showFloatingCapsule", set),
  setReaderForeground: createSetAction("readerForeground", set),
  setReaderBackground: createSetAction("readerBackground", set),
  setReaderAccent: createSetAction("readerAccent", set),
  setKeybinds: createSetAction("keybinds", set),
  setDailyGoal: createSetAction("dailyGoal", set),
  setWeeklyGoal: createSetAction("weeklyGoal", set),
  setShowStreakReminder: createSetAction("showStreakReminder", set),
  setTrackingEnabled: createSetAction("trackingEnabled", set),
  setScreenReaderMode: createSetAction("screenReaderMode", set),
  setReduceMotion: createSetAction("reduceMotion", set),
  resetToDefaults: () => set(DEFAULTS)
}));

const identitySelector = (state: Settings): Settings => state;

export function useSettings<T>(selector: (state: Settings) => T): T;
export function useSettings(): Settings;
export function useSettings<T>(selector?: (state: Settings) => T): T | Settings {
  return useSettingsStore((selector ?? identitySelector) as (state: Settings) => T);
}

export function useSettingsShallow<T extends object>(selector: (state: Settings) => T): T {
  return useSettingsStore(useShallow(selector));
}

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { getToken } = useAuth();
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
  }, [getCachedToken]);

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

      if (remoteSaveTimerRef.current !== null) {
        window.clearTimeout(remoteSaveTimerRef.current);
      }
      remoteSaveTimerRef.current = window.setTimeout(async () => {
        try {
          const token = await getCachedToken();
          await settingsService.saveSettings(toRemotePayload(values), token || undefined);
        } catch (error) {
          console.warn("Failed to persist remote settings", error);
        }
      }, 700);
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
  }, [getCachedToken]);

  return <>{children}</>;
};
