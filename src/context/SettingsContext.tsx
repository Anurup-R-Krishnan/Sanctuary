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
  continuous: boolean;
  spread: boolean;
  direction: "ltr" | "rtl";
  // Visuals
  brightness: number;
  grayscale: boolean;
  showScrollbar: boolean;
  showPageCounter: boolean;
  progressBarType: "bar" | "none";
  barPosition: "top" | "bottom";
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
  setContinuous: (v: boolean) => void;
  setSpread: (v: boolean) => void;
  setDirection: (v: "ltr" | "rtl") => void;
  setBrightness: (v: number) => void;
  setGrayscale: (v: boolean) => void;
  setShowScrollbar: (v: boolean) => void;
  setShowPageCounter: (v: boolean) => void;
  setProgressBarType: (v: "bar" | "none") => void;
  setBarPosition: (v: "top" | "bottom") => void;
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
  continuous: false,
  spread: false,
  direction: "ltr" as "ltr" | "rtl",
  brightness: 100,
  grayscale: false,
  showScrollbar: false,
  showPageCounter: true,
  progressBarType: "bar" as "bar" | "none",
  barPosition: "bottom" as "top" | "bottom",
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
  const [continuous, setContinuous] = usePersisted("continuous", DEFAULTS.continuous);
  const [spread, setSpread] = usePersisted("spread", DEFAULTS.spread);
  const [direction, setDirection] = usePersisted("direction", DEFAULTS.direction);
  const [brightness, setBrightness] = usePersisted("brightness", DEFAULTS.brightness);
  const [grayscale, setGrayscale] = usePersisted("grayscale", DEFAULTS.grayscale);
  const [showScrollbar, setShowScrollbar] = usePersisted("showScrollbar", DEFAULTS.showScrollbar);
  const [showPageCounter, setShowPageCounter] = usePersisted("showPageCounter", DEFAULTS.showPageCounter);
  const [progressBarType, setProgressBarType] = usePersisted("progressBarType", DEFAULTS.progressBarType);
  const [barPosition, setBarPosition] = usePersisted("barPosition", DEFAULTS.barPosition);
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
    setContinuous(DEFAULTS.continuous);
    setSpread(DEFAULTS.spread);
    setDirection(DEFAULTS.direction);
    setBrightness(DEFAULTS.brightness);
    setGrayscale(DEFAULTS.grayscale);
    setShowScrollbar(DEFAULTS.showScrollbar);
    setShowPageCounter(DEFAULTS.showPageCounter);
    setProgressBarType(DEFAULTS.progressBarType);
    setBarPosition(DEFAULTS.barPosition);
    setReaderForeground(DEFAULTS.readerForeground);
    setReaderBackground(DEFAULTS.readerBackground);
    setReaderAccent(DEFAULTS.readerAccent);
    setKeybinds(DEFAULTS.keybinds);
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
        continuous, setContinuous,
        spread, setSpread,
        direction, setDirection,
        brightness, setBrightness,
        grayscale, setGrayscale,
        showScrollbar, setShowScrollbar,
        showPageCounter, setShowPageCounter,
        progressBarType, setProgressBarType,
        barPosition, setBarPosition,
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