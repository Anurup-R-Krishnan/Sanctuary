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
  annualBookGoal: number;
  annualGoalYear: number;
  barPosition: "top" | "bottom";
  bionicReading: boolean;
  bookVoiceOverrides: Record<string, string>;
  brightness: number;
  continuous: boolean;
  dailyGoal: number;
  direction: "auto" | "ltr" | "rtl";
  fontPairing: string;
  fontSize: number;
  grayscale: boolean;
  hyphenation: boolean;
  keybinds: Keybinds;
  letterSpacing: number;
  lineHeight: number;
  maxTextWidth: number;
  pageMargin: number;
  paragraphSpacing: number;
  progressBarType: "bar" | "none";
  readerAccent: string;
  readerBackground: string;
  readerForeground: string;
  reduceMotion: boolean;
  showFloatingCapsule: boolean;
  showPageCounter: boolean;
  showScrollbar: boolean;
  showStreakReminder: boolean;
  spread: boolean;
  textAlignment: TextAlignment;
  trackingEnabled: boolean;
  ttsParagraphPauseMs: number;
  ttsPitch: number;
  ttsRate: number;
  ttsVoiceURI: string | null;
  weeklyGoal: number;
  writingMode: "horizontal-tb" | "vertical-rl";
};

type SettingsActions = {
  resetToDefaults: () => void;
  setAnnualBookGoal: (v: number) => void;
  setAnnualGoalYear: (v: number) => void;
  setBarPosition: (v: "top" | "bottom") => void;
  setBionicReading: (v: boolean) => void;
  setBookVoiceOverride: (bookId: string, voiceURI: string) => void;
  setBrightness: (v: number) => void;
  setContinuous: (v: boolean) => void;
  setDailyGoal: (v: number) => void;
  setDirection: (v: "auto" | "ltr" | "rtl") => void;
  setFontPairing: (v: string) => void;
  setFontSize: (v: number) => void;
  setGrayscale: (v: boolean) => void;
  setHyphenation: (v: boolean) => void;
  setKeybinds: (v: Keybinds) => void;
  setLetterSpacing: (v: number) => void;
  setLineHeight: (v: number) => void;
  setMaxTextWidth: (v: number) => void;
  setPageMargin: (v: number) => void;
  setParagraphSpacing: (v: number) => void;
  setProgressBarType: (v: "bar" | "none") => void;
  setReaderAccent: (v: string) => void;
  setReaderBackground: (v: string) => void;
  setReaderForeground: (v: string) => void;
  setReduceMotion: (v: boolean) => void;
  setShowFloatingCapsule: (v: boolean) => void;
  setShowPageCounter: (v: boolean) => void;
  setShowScrollbar: (v: boolean) => void;
  setShowStreakReminder: (v: boolean) => void;
  setSpread: (v: boolean) => void;
  setTextAlignment: (v: TextAlignment) => void;
  setTrackingEnabled: (v: boolean) => void;
  setTtsParagraphPauseMs: (v: number) => void;
  setTtsPitch: (v: number) => void;
  setTtsRate: (v: number) => void;
  setTtsVoiceURI: (v: string | null) => void;
  setWeeklyGoal: (v: number) => void;
  setWritingMode: (v: "horizontal-tb" | "vertical-rl") => void;
};

type Settings = SettingsValues & SettingsActions;

const DEFAULTS: SettingsValues = {
  fontSize: 19,
  letterSpacing: 0,
  lineHeight: 1.65,
  textAlignment: "justify",
  fontPairing: "merriweather-georgia",
  maxTextWidth: 150,
  hyphenation: true,
  pageMargin: 40,
  paragraphSpacing: 17,
  continuous: false,
  direction: "auto",
  spread: false,
  writingMode: "horizontal-tb",
  brightness: 100,
  grayscale: false,
  bionicReading: false,
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
  annualBookGoal: 20,
  annualGoalYear: new Date().getFullYear(),
  dailyGoal: DEFAULT_DAILY_GOAL,
  weeklyGoal: 150,
  showStreakReminder: true,
  trackingEnabled: true,
  reduceMotion: false,
  bookVoiceOverrides: {},
  ttsVoiceURI: null,
  ttsRate: 1,
  ttsPitch: 1,
  ttsParagraphPauseMs: 350,
};

export const LOCAL_SETTINGS_KEY = "sanctuary.web.settings";

const KEYBIND_ACTIONS: Array<keyof Keybinds> = [
  "nextPage",
  "prevPage",
  "toggleBookmark",
  "toggleFullscreen",
  "toggleUI",
  "close",
];

const normalizeKeybinds = (raw: unknown): Keybinds | undefined => {
  if (!raw || typeof raw !== "object") return undefined;
  const input = raw as Record<string, unknown>;
  const out = { ...DEFAULTS.keybinds };
  let sawAny = false;
  for (const action of KEYBIND_ACTIONS) {
    const value = input[action];
    if (Array.isArray(value) && value.every((k) => typeof k === "string")) {
      out[action] = value;
      sawAny = true;
    }
  }
  return sawAny ? out : undefined;
};

export const pickValues = (state: Settings): SettingsValues => ({
  annualBookGoal: state.annualBookGoal,
  annualGoalYear: state.annualGoalYear,
  bionicReading: state.bionicReading,
  fontSize: state.fontSize,
  letterSpacing: state.letterSpacing,
  lineHeight: state.lineHeight,
  textAlignment: state.textAlignment,
  fontPairing: state.fontPairing,
  maxTextWidth: state.maxTextWidth,
  hyphenation: state.hyphenation,
  pageMargin: state.pageMargin,
  paragraphSpacing: state.paragraphSpacing,
  continuous: state.continuous,
  direction: state.direction,
  spread: state.spread,
  writingMode: state.writingMode,
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
  reduceMotion: state.reduceMotion,
  bookVoiceOverrides: state.bookVoiceOverrides,
  ttsVoiceURI: state.ttsVoiceURI,
  ttsRate: state.ttsRate,
  ttsPitch: state.ttsPitch,
  ttsParagraphPauseMs: state.ttsParagraphPauseMs,
});

export const toRemotePayload = (state: SettingsValues) => ({
  // Typography
  fontSize: state.fontSize,
  letterSpacing: state.letterSpacing,
  lineHeight: state.lineHeight,
  fontPairing: state.fontPairing,
  maxTextWidth: Math.max(50, Math.min(200, Math.round(state.maxTextWidth))),
  textWidth: Math.max(50, Math.min(200, Math.round(state.maxTextWidth))),
  hyphenation: state.hyphenation,
  pageMargin: state.pageMargin,
  paragraphSpacing: state.paragraphSpacing,
  textAlignment: state.textAlignment,
  bionicReading: state.bionicReading,
  // Appearance
  brightness: state.brightness,
  grayscale: state.grayscale,
  readerForeground: state.readerForeground,
  readerBackground: state.readerBackground,
  accent: state.readerAccent,
  // Reader behavior
  continuous: state.continuous,
  direction: state.direction,
  spread: state.spread,
  writingMode: state.writingMode,
  showScrollbar: state.showScrollbar,
  progressBarType: state.progressBarType,
  barPosition: state.barPosition,
  showFloatingCapsule: state.showFloatingCapsule,
  keybinds: state.keybinds,
  // Reading goals & habits
  annualBookGoal: state.annualBookGoal,
  annualGoalYear: state.annualGoalYear,
  dailyGoal: state.dailyGoal,
  weeklyGoal: state.weeklyGoal,
  showStreakReminder: state.showStreakReminder,
  trackingEnabled: state.trackingEnabled,
  // Accessibility
  reduceMotion: state.reduceMotion,
  motion: state.reduceMotion ? "reduced" as const : "full" as const,
  showPageMeta: state.showPageCounter,
  // TTS
  ttsVoiceURI: state.ttsVoiceURI,
  ttsRate: state.ttsRate,
  ttsPitch: state.ttsPitch,
});

export const normalizeStoredSettings = (input: unknown): Partial<SettingsValues> => {
  if (!input || typeof input !== "object") return {};
  const raw = input as Record<string, unknown>;
  const out: Partial<SettingsValues> = {};

  if (typeof raw.fontSize === "number") out.fontSize = raw.fontSize;
  if (typeof raw.letterSpacing === "number") out.letterSpacing = raw.letterSpacing;
  if (typeof raw.bionicReading === "boolean") out.bionicReading = raw.bionicReading;
  if (typeof raw.lineHeight === "number") out.lineHeight = raw.lineHeight;
  if (raw.textAlignment === "left" || raw.textAlignment === "justify" || raw.textAlignment === "center") out.textAlignment = raw.textAlignment;
  if (typeof raw.fontPairing === "string") out.fontPairing = raw.fontPairing;
  if (typeof raw.maxTextWidth === "number") out.maxTextWidth = raw.maxTextWidth;
  if (typeof raw.hyphenation === "boolean") out.hyphenation = raw.hyphenation;
  if (typeof raw.pageMargin === "number") out.pageMargin = raw.pageMargin;
  if (typeof raw.paragraphSpacing === "number") out.paragraphSpacing = raw.paragraphSpacing;
  if (typeof raw.continuous === "boolean") out.continuous = raw.continuous;
  if (typeof raw.spread === "boolean") out.spread = raw.spread;
  if (raw.direction === "auto" || raw.direction === "ltr" || raw.direction === "rtl") out.direction = raw.direction;
  if (raw.writingMode === "horizontal-tb" || raw.writingMode === "vertical-rl") out.writingMode = raw.writingMode;
  if (typeof raw.brightness === "number") out.brightness = raw.brightness;
  if (typeof raw.grayscale === "boolean") out.grayscale = raw.grayscale;
  if (typeof raw.showScrollbar === "boolean") out.showScrollbar = raw.showScrollbar;
  if (typeof raw.showPageCounter === "boolean") out.showPageCounter = raw.showPageCounter;
  if (raw.progressBarType === "bar" || raw.progressBarType === "none") out.progressBarType = raw.progressBarType;
  if (raw.barPosition === "top" || raw.barPosition === "bottom") out.barPosition = raw.barPosition;
  if (typeof raw.showFloatingCapsule === "boolean") out.showFloatingCapsule = raw.showFloatingCapsule;
  const keybinds = normalizeKeybinds(raw.keybinds);
  if (keybinds) out.keybinds = keybinds;
  if (typeof raw.readerForeground === "string") out.readerForeground = raw.readerForeground;
  if (typeof raw.readerBackground === "string") out.readerBackground = raw.readerBackground;
  if (typeof raw.readerAccent === "string") out.readerAccent = raw.readerAccent;
  if (typeof raw.annualBookGoal === "number") out.annualBookGoal = raw.annualBookGoal;
  if (typeof raw.annualGoalYear === "number") out.annualGoalYear = raw.annualGoalYear;
  if (typeof raw.dailyGoal === "number") out.dailyGoal = raw.dailyGoal;
  if (typeof raw.weeklyGoal === "number") out.weeklyGoal = raw.weeklyGoal;
  if (typeof raw.showStreakReminder === "boolean") out.showStreakReminder = raw.showStreakReminder;
  if (typeof raw.trackingEnabled === "boolean") out.trackingEnabled = raw.trackingEnabled;
  if (typeof raw.reduceMotion === "boolean") out.reduceMotion = raw.reduceMotion;
  if (raw.bookVoiceOverrides && typeof raw.bookVoiceOverrides === "object") {
    out.bookVoiceOverrides = raw.bookVoiceOverrides as Record<string, string>;
  }
  if (typeof raw.ttsVoiceURI === "string" || raw.ttsVoiceURI === null) out.ttsVoiceURI = raw.ttsVoiceURI as string | null;
  if (typeof raw.ttsRate === "number") out.ttsRate = raw.ttsRate;
  if (typeof raw.ttsPitch === "number") out.ttsPitch = raw.ttsPitch;
  if (typeof raw.ttsParagraphPauseMs === "number") out.ttsParagraphPauseMs = raw.ttsParagraphPauseMs;

  return out;
};

export const normalizeRemoteSettings = (input: unknown): Partial<SettingsValues> => {
  if (!input || typeof input !== "object") return {};
  const remote = input as Record<string, unknown>;
  const out: Partial<SettingsValues> = {};

  // ── Reading goals & habits ───────────────────────────────────────────────
  if (typeof remote.annualBookGoal === "number") out.annualBookGoal = remote.annualBookGoal;
  if (typeof remote.annualGoalYear === "number") out.annualGoalYear = remote.annualGoalYear;
  if (typeof remote.dailyGoal === "number") out.dailyGoal = remote.dailyGoal;
  if (typeof remote.weeklyGoal === "number") out.weeklyGoal = remote.weeklyGoal;
  if (typeof remote.showStreakReminder === "boolean") out.showStreakReminder = remote.showStreakReminder;
  if (typeof remote.trackingEnabled === "boolean") out.trackingEnabled = remote.trackingEnabled;

  // ── Typography ────────────────────────────────────────────────────────────
  if (typeof remote.fontSize === "number") out.fontSize = remote.fontSize;
  if (typeof remote.letterSpacing === "number") out.letterSpacing = remote.letterSpacing;
  if (typeof remote.bionicReading === "boolean") out.bionicReading = remote.bionicReading;
  if (typeof remote.lineHeight === "number") out.lineHeight = remote.lineHeight;
  if (typeof remote.fontPairing === "string") out.fontPairing = remote.fontPairing;
  // maxTextWidth: prefer the new field; fall back to legacy textWidth alias
  if (typeof remote.maxTextWidth === "number") out.maxTextWidth = remote.maxTextWidth;
  else if (typeof remote.textWidth === "number") out.maxTextWidth = remote.textWidth;
  if (typeof remote.hyphenation === "boolean") out.hyphenation = remote.hyphenation;
  if (typeof remote.pageMargin === "number") out.pageMargin = remote.pageMargin;
  if (typeof remote.paragraphSpacing === "number") out.paragraphSpacing = remote.paragraphSpacing;
  if (
    remote.textAlignment === "left" ||
    remote.textAlignment === "justify" ||
    remote.textAlignment === "center"
  ) out.textAlignment = remote.textAlignment;

  // ── Appearance ────────────────────────────────────────────────────────────
  if (typeof remote.brightness === "number") out.brightness = remote.brightness;
  if (typeof remote.grayscale === "boolean") out.grayscale = remote.grayscale;
  if (typeof remote.readerForeground === "string") out.readerForeground = remote.readerForeground;
  if (typeof remote.readerBackground === "string") out.readerBackground = remote.readerBackground;
  // readerAccent: prefer the new field; fall back to legacy accent alias
  if (typeof remote.readerAccent === "string") out.readerAccent = remote.readerAccent;
  else if (typeof remote.accent === "string") out.readerAccent = remote.accent;

  // ── Reader behavior ───────────────────────────────────────────────────────
  if (typeof remote.continuous === "boolean") out.continuous = remote.continuous;
  if (typeof remote.spread === "boolean") out.spread = remote.spread;
  if (remote.direction === "auto" || remote.direction === "ltr" || remote.direction === "rtl") out.direction = remote.direction;
  if (remote.writingMode === "horizontal-tb" || remote.writingMode === "vertical-rl") out.writingMode = remote.writingMode;
  if (typeof remote.showScrollbar === "boolean") out.showScrollbar = remote.showScrollbar;
  if (remote.progressBarType === "bar" || remote.progressBarType === "none") {
    out.progressBarType = remote.progressBarType;
  }
  if (remote.barPosition === "top" || remote.barPosition === "bottom") {
    out.barPosition = remote.barPosition;
  }
  if (typeof remote.showFloatingCapsule === "boolean") out.showFloatingCapsule = remote.showFloatingCapsule;
  const remoteKeybinds = normalizeKeybinds(remote.keybinds);
  if (remoteKeybinds) out.keybinds = remoteKeybinds;
  // showPageCounter: prefer the new field; fall back to legacy showPageMeta alias
  if (typeof remote.showPageCounter === "boolean") out.showPageCounter = remote.showPageCounter;
  else if (typeof remote.showPageMeta === "boolean") out.showPageCounter = remote.showPageMeta;

  // ── Accessibility ─────────────────────────────────────────────────────────
  // reduceMotion: prefer the new field; fall back to legacy motion alias
  if (typeof remote.reduceMotion === "boolean") out.reduceMotion = remote.reduceMotion;
  else if (typeof remote.motion === "string") out.reduceMotion = remote.motion === "reduced";

  // ── Text-to-speech ────────────────────────────────────────────────────────
  if (typeof remote.ttsVoiceURI === "string" || remote.ttsVoiceURI === null) {
    out.ttsVoiceURI = remote.ttsVoiceURI as string | null;
  }
  if (typeof remote.ttsRate === "number") out.ttsRate = remote.ttsRate;
  if (typeof remote.ttsPitch === "number") out.ttsPitch = remote.ttsPitch;
  if (typeof remote.ttsParagraphPauseMs === "number") out.ttsParagraphPauseMs = remote.ttsParagraphPauseMs;

  return out;
};

const createSetAction = <K extends keyof SettingsValues>(key: K, set: (partial: Partial<SettingsValues>) => void) => {
  return (value: SettingsValues[K]) => set({ [key]: value } as Partial<SettingsValues>);
};

export const useSettingsStore = create<Settings>((set) => ({
  ...DEFAULTS,
  setBionicReading: createSetAction("bionicReading", set),
  setFontSize: createSetAction("fontSize", set),
  setLetterSpacing: createSetAction("letterSpacing", set),
  setLineHeight: createSetAction("lineHeight", set),
  setTextAlignment: createSetAction("textAlignment", set),
  setFontPairing: createSetAction("fontPairing", set),
  setMaxTextWidth: createSetAction("maxTextWidth", set),
  setHyphenation: createSetAction("hyphenation", set),
  setPageMargin: createSetAction("pageMargin", set),
  setParagraphSpacing: createSetAction("paragraphSpacing", set),
  setContinuous: createSetAction("continuous", set),
  setDirection: createSetAction("direction", set),
  setSpread: createSetAction("spread", set),
  setWritingMode: createSetAction("writingMode", set),
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
  setAnnualBookGoal: createSetAction("annualBookGoal", set),
  setAnnualGoalYear: createSetAction("annualGoalYear", set),
  setDailyGoal: createSetAction("dailyGoal", set),
  setWeeklyGoal: createSetAction("weeklyGoal", set),
  setShowStreakReminder: createSetAction("showStreakReminder", set),
  setTrackingEnabled: createSetAction("trackingEnabled", set),
  setReduceMotion: createSetAction("reduceMotion", set),
  setBookVoiceOverride: (bookId: string, voiceURI: string) =>
    set((state) => ({
      bookVoiceOverrides: {
        ...state.bookVoiceOverrides,
        [bookId]: voiceURI,
      },
    })),
  setTtsVoiceURI: createSetAction("ttsVoiceURI", set),
  setTtsRate: createSetAction("ttsRate", set),
  setTtsPitch: createSetAction("ttsPitch", set),
  setTtsParagraphPauseMs: createSetAction("ttsParagraphPauseMs", set),
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

