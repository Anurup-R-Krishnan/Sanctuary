import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { DEFAULT_DAILY_GOAL } from "@/types";

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

type Settings = SettingsValues & SettingsActions;

const DEFAULTS: SettingsValues = {
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
  dailyGoal: DEFAULT_DAILY_GOAL,
  weeklyGoal: 150,
  showStreakReminder: true,
  trackingEnabled: true,
  screenReaderMode: false,
  reduceMotion: false
};

export const LOCAL_SETTINGS_KEY = "sanctuary.web.settings";

export const pickValues = (state: Settings): SettingsValues => ({
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

export const toRemotePayload = (state: SettingsValues) => ({
  dailyGoal: state.dailyGoal,
  weeklyGoal: state.weeklyGoal,
  lineHeight: state.lineHeight,
  textWidth: Math.max(50, Math.min(120, Math.round(state.maxTextWidth))),
  motion: state.reduceMotion ? "reduced" : "full",
  showPageMeta: state.showPageCounter,
  accent: state.readerAccent
});

export const normalizeStoredSettings = (input: unknown): Partial<SettingsValues> => {
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

export const normalizeRemoteSettings = (input: unknown): Partial<SettingsValues> => {
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

export const useSettingsStore = create<Settings>((set) => ({
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

