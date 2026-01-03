import React, { createContext, useState, useEffect, useContext, ReactNode } from "react";

type TextAlignment = "left" | "justify" | "center";

interface Settings {
  // Typography
  fontSize: number;
  lineHeight: number;
  textAlignment: TextAlignment;
  fontPairing: string;
  maxTextWidth: number;
  hyphenation: boolean;
  // Layout
  pageMargin: number;
  paragraphSpacing: number;
  dropCaps: boolean;
  // Reading Mode
  immersiveMode: boolean;
  continuousMode: boolean;
  // Colors
  readerForeground: string;
  readerBackground: string;
  readerAccent: string;
  // Keybinds
  keybinds: {
    nextPage: string[];
    prevPage: string[];
    toggleBookmark: string[];
    toggleFullscreen: string[];
    toggleUI: string[];
    close: string[];
  };
  // Stats Settings
  dailyGoal: number;
  weeklyGoal: number;
  showStreakReminder: boolean;
  trackingEnabled: boolean;
  // Accessibility
  screenReaderMode: boolean;
  reduceMotion: boolean;
  // Setters
  setFontSize: (v: number) => void;
  setLineHeight: (v: number) => void;
  setTextAlignment: (v: TextAlignment) => void;
  setFontPairing: (v: string) => void;
  setMaxTextWidth: (v: number) => void;
  setHyphenation: (v: boolean) => void;
  setPageMargin: (v: number) => void;
  setParagraphSpacing: (v: number) => void;
  setDropCaps: (v: boolean) => void;
  setImmersiveMode: (v: boolean) => void;
  setContinuousMode: (v: boolean) => void;
  setReaderForeground: (v: string) => void;
  setReaderBackground: (v: string) => void;
  setReaderAccent: (v: string) => void;
  setKeybinds: (v: Settings['keybinds']) => void;
  setDailyGoal: (v: number) => void;
  setWeeklyGoal: (v: number) => void;
  setShowStreakReminder: (v: boolean) => void;
  setTrackingEnabled: (v: boolean) => void;
  setScreenReaderMode: (v: boolean) => void;
  setReduceMotion: (v: boolean) => void;
  resetToDefaults: () => void;
  applyPreset: (preset: "comfort" | "focus" | "night") => void;
}

const SettingsContext = createContext<Settings | undefined>(undefined);

const DEFAULTS = {
  fontSize: 19,
  lineHeight: 1.85,
  textAlignment: "justify" as TextAlignment,
  fontPairing: "merriweather-georgia",
  maxTextWidth: 60,
  hyphenation: true,
  pageMargin: 40,
  paragraphSpacing: 18,
  dropCaps: true,
  immersiveMode: true,
  continuousMode: false,
  readerForeground: "#1a1a1a",
  readerBackground: "#ffffff",
  readerAccent: "#8B7355",
  keybinds: {
    nextPage: ["ArrowRight", "ArrowDown", " "],
    prevPage: ["ArrowLeft", "ArrowUp"],
    toggleBookmark: ["b", "B"],
    toggleFullscreen: ["f", "F"],
    toggleUI: ["m", "M"],
    close: ["Escape"],
  },
  dailyGoal: 30,
  weeklyGoal: 150,
  showStreakReminder: true,
  trackingEnabled: true,
  screenReaderMode: false,
  reduceMotion: false,
};

const usePersisted = <T,>(key: string, defaultValue: T): [T, (v: T) => void] => {
  const [value, setValue] = useState<T>(() => {
    const saved = localStorage.getItem(`sanctuary-${key}`);
    if (saved === null) return defaultValue;
    try {
      return JSON.parse(saved) as T;
    } catch {
      return saved as unknown as T;
    }
  });

  useEffect(() => {
    localStorage.setItem(`sanctuary-${key}`, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [fontSize, setFontSize] = usePersisted("fontSize", DEFAULTS.fontSize);
  const [lineHeight, setLineHeight] = usePersisted("lineHeight", DEFAULTS.lineHeight);
  const [textAlignment, setTextAlignment] = usePersisted<TextAlignment>("textAlignment", DEFAULTS.textAlignment);
  const [fontPairing, setFontPairing] = usePersisted("fontPairing", DEFAULTS.fontPairing);
  const [maxTextWidth, setMaxTextWidth] = usePersisted("maxTextWidth", DEFAULTS.maxTextWidth);
  const [hyphenation, setHyphenation] = usePersisted("hyphenation", DEFAULTS.hyphenation);
  const [pageMargin, setPageMargin] = usePersisted("pageMargin", DEFAULTS.pageMargin);
  const [paragraphSpacing, setParagraphSpacing] = usePersisted("paragraphSpacing", DEFAULTS.paragraphSpacing);
  const [dropCaps, setDropCaps] = usePersisted("dropCaps", DEFAULTS.dropCaps);
  const [immersiveMode, setImmersiveMode] = usePersisted("immersiveMode", DEFAULTS.immersiveMode);
  const [continuousMode, setContinuousMode] = usePersisted("continuousMode", DEFAULTS.continuousMode);
  const [readerForeground, setReaderForeground] = usePersisted("readerForeground", DEFAULTS.readerForeground);
  const [readerBackground, setReaderBackground] = usePersisted("readerBackground", DEFAULTS.readerBackground);
  const [readerAccent, setReaderAccent] = usePersisted("readerAccent", DEFAULTS.readerAccent);
  const [keybinds, setKeybinds] = usePersisted("keybinds", DEFAULTS.keybinds);
  const [dailyGoal, setDailyGoal] = usePersisted("dailyGoal", DEFAULTS.dailyGoal);
  const [weeklyGoal, setWeeklyGoal] = usePersisted("weeklyGoal", DEFAULTS.weeklyGoal);
  const [showStreakReminder, setShowStreakReminder] = usePersisted("showStreakReminder", DEFAULTS.showStreakReminder);
  const [trackingEnabled, setTrackingEnabled] = usePersisted("trackingEnabled", DEFAULTS.trackingEnabled);
  const [screenReaderMode, setScreenReaderMode] = usePersisted("screenReaderMode", DEFAULTS.screenReaderMode);
  const [reduceMotion, setReduceMotion] = usePersisted("reduceMotion", DEFAULTS.reduceMotion);

  const resetToDefaults = () => {
    setFontSize(DEFAULTS.fontSize);
    setLineHeight(DEFAULTS.lineHeight);
    setTextAlignment(DEFAULTS.textAlignment);
    setFontPairing(DEFAULTS.fontPairing);
    setMaxTextWidth(DEFAULTS.maxTextWidth);
    setHyphenation(DEFAULTS.hyphenation);
    setPageMargin(DEFAULTS.pageMargin);
    setParagraphSpacing(DEFAULTS.paragraphSpacing);
    setDropCaps(DEFAULTS.dropCaps);
    setImmersiveMode(DEFAULTS.immersiveMode);
    setContinuousMode(DEFAULTS.continuousMode);
    setReaderForeground(DEFAULTS.readerForeground);
    setReaderBackground(DEFAULTS.readerBackground);
    setReaderAccent(DEFAULTS.readerAccent);
    setKeybinds(DEFAULTS.keybinds);
  };

  const applyPreset = (preset: "comfort" | "focus" | "night") => {
    // Presets ONLY change colors, not typography
    if (preset === "comfort") {
      // Warm sepia theme
      setReaderForeground("#5C4B37");
      setReaderBackground("#F4ECD8");
      setReaderAccent("#8B7355");
    } else if (preset === "focus") {
      // Clean light theme
      setReaderForeground("#1a1a1a");
      setReaderBackground("#ffffff");
      setReaderAccent("#8B7355");
    } else if (preset === "night") {
      // Dark theme
      setReaderForeground("#e8e6e3");
      setReaderBackground("#1a1a1a");
      setReaderAccent("#d4b58b");
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        fontSize, setFontSize,
        lineHeight, setLineHeight,
        textAlignment, setTextAlignment,
        fontPairing, setFontPairing,
        maxTextWidth, setMaxTextWidth,
        hyphenation, setHyphenation,
        pageMargin, setPageMargin,
        paragraphSpacing, setParagraphSpacing,
        dropCaps, setDropCaps,
        immersiveMode, setImmersiveMode,
        continuousMode, setContinuousMode,
        readerForeground, setReaderForeground,
        readerBackground, setReaderBackground,
        readerAccent, setReaderAccent,
        keybinds, setKeybinds,
        dailyGoal, setDailyGoal,
        weeklyGoal, setWeeklyGoal,
        showStreakReminder, setShowStreakReminder,
        trackingEnabled, setTrackingEnabled,
        screenReaderMode, setScreenReaderMode,
        reduceMotion, setReduceMotion,
        resetToDefaults,
        applyPreset,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): Settings => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within SettingsProvider");
  return context;
};