import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Persistence Hook (defined locally for safety/portability in this fix)
function usePersisted<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue] as const;
}

export interface Keybinds {
  nextPage: string[];
  prevPage: string[];
  toggleBookmark: string[];
  toggleFullscreen: string[];
  toggleUI: string[];
  close: string[];
}

export interface CustomTheme {
  id: string;
  name: string;
  colors: { fg: string; bg: string; accent: string };
}

export interface Settings {
  // Typography
  fontSize: number; setFontSize: (v: number) => void;
  lineHeight: number; setLineHeight: (v: number) => void;
  textAlignment: "left" | "justify"; setTextAlignment: (v: "left" | "justify") => void;
  fontPairing: string; setFontPairing: (v: string) => void;
  maxTextWidth: number; setMaxTextWidth: (v: number) => void;
  hyphenation: boolean; setHyphenation: (v: boolean) => void;

  // Layout
  pageMargin: number; setPageMargin: (v: number) => void;
  paragraphSpacing: number; setParagraphSpacing: (v: number) => void;
  dropCaps: boolean; setDropCaps: (v: boolean) => void;
  continuous: boolean; setContinuous: (v: boolean) => void;
  spread: boolean; setSpread: (v: boolean) => void;
  direction: "ltr" | "rtl"; setDirection: (v: "ltr" | "rtl") => void;
  brightness: number; setBrightness: (v: number) => void;

  // Display
  showScrollbar: boolean; setShowScrollbar: (v: boolean) => void;
  showPageCounter: boolean; setShowPageCounter: (v: boolean) => void;
  progressBarType: "bar" | "ring" | "none"; setProgressBarType: (v: "bar" | "ring" | "none") => void;
  barPosition: "bottom" | "top"; setBarPosition: (v: "bottom" | "top") => void;

  // Theme
  readerForeground: string; setReaderForeground: (v: string) => void;
  readerBackground: string; setReaderBackground: (v: string) => void;
  readerAccent: string; setReaderAccent: (v: string) => void;

  themeMode: "system" | "light" | "dark"; setThemeMode: (v: "system" | "light" | "dark") => void;
  computedTheme: "light" | "dark";
  customThemes: CustomTheme[];
  addCustomTheme: (name: string, colors: { fg: string; bg: string; accent: string }) => void;
  removeCustomTheme: (id: string) => void;

  // Shortcuts
  keybinds: Keybinds; setKeybinds: (v: Keybinds) => void;

  // Goals & Tracking
  dailyGoal: number; setDailyGoal: (v: number) => void;
  weeklyGoal: number; setWeeklyGoal: (v: number) => void;
  showStreakReminder: boolean; setShowStreakReminder: (v: boolean) => void;
  trackingEnabled: boolean; setTrackingEnabled: (v: boolean) => void;

  // Accessibility
  screenReaderMode: boolean; setScreenReaderMode: (v: boolean) => void;
  reduceMotion: boolean; setReduceMotion: (v: boolean) => void;
  focusMode: boolean; setFocusMode: (v: boolean) => void;

  // Data
  exportSettings: () => void;
  importSettings: (file: File) => Promise<void>;
  resetToDefaults: () => void;
}

const DEFAULTS = {
  fontSize: 18,
  lineHeight: 1.7,
  textAlignment: "left" as const,
  fontPairing: "crimson-pro",
  maxTextWidth: 65,
  hyphenation: false,
  pageMargin: 24,
  paragraphSpacing: 0.8,
  dropCaps: false,
  continuous: false,
  spread: false,
  direction: "ltr" as const,
  brightness: 100,
  showScrollbar: true,
  showPageCounter: true,
  progressBarType: "bar" as const,
  barPosition: "bottom" as const,
  readerForeground: "#2c2825",
  readerBackground: "#faf8f5",
  readerAccent: "#8B7355",
  keybinds: {
    nextPage: ["ArrowRight", "ArrowDown", "Space", "PageDown", "j", "l"],
    prevPage: ["ArrowLeft", "ArrowUp", "PageUp", "k", "h"],
    toggleBookmark: ["b"],
    toggleFullscreen: ["f"],
    toggleUI: ["u"],
    close: ["Escape", "q"],
  },
  dailyGoal: 30,
  weeklyGoal: 150,
  showStreakReminder: true,
  trackingEnabled: true,
  screenReaderMode: false,
  reduceMotion: false,
  focusMode: false,
  themeMode: "system" as const,
  customThemes: [] as CustomTheme[],
};

const SettingsContext = createContext<Settings | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Hooks for all settings
  const [fontSize, setFontSize] = usePersisted("fontSize", DEFAULTS.fontSize);
  const [lineHeight, setLineHeight] = usePersisted("lineHeight", DEFAULTS.lineHeight);
  const [textAlignment, setTextAlignment] = usePersisted<"left" | "justify">("textAlignment", DEFAULTS.textAlignment);
  const [fontPairing, setFontPairing] = usePersisted("fontPairing", DEFAULTS.fontPairing);
  const [maxTextWidth, setMaxTextWidth] = usePersisted("maxTextWidth", DEFAULTS.maxTextWidth);
  const [hyphenation, setHyphenation] = usePersisted("hyphenation", DEFAULTS.hyphenation);

  const [pageMargin, setPageMargin] = usePersisted("pageMargin", DEFAULTS.pageMargin);
  const [paragraphSpacing, setParagraphSpacing] = usePersisted("paragraphSpacing", DEFAULTS.paragraphSpacing);
  const [dropCaps, setDropCaps] = usePersisted("dropCaps", DEFAULTS.dropCaps);
  const [continuous, setContinuous] = usePersisted("continuous", DEFAULTS.continuous);
  const [spread, setSpread] = usePersisted("spread", DEFAULTS.spread);
  const [direction, setDirection] = usePersisted<"ltr" | "rtl">("direction", DEFAULTS.direction);
  const [brightness, setBrightness] = usePersisted("brightness", DEFAULTS.brightness);
  const [showScrollbar, setShowScrollbar] = usePersisted("showScrollbar", DEFAULTS.showScrollbar);
  const [showPageCounter, setShowPageCounter] = usePersisted("showPageCounter", DEFAULTS.showPageCounter);
  const [progressBarType, setProgressBarType] = usePersisted<"bar" | "ring" | "none">("progressBarType", DEFAULTS.progressBarType);
  const [barPosition, setBarPosition] = usePersisted<"bottom" | "top">("barPosition", DEFAULTS.barPosition);

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
  const [focusMode, setFocusMode] = usePersisted("focusMode", DEFAULTS.focusMode);

  const [themeMode, setThemeMode] = usePersisted<"system" | "light" | "dark">("themeMode", DEFAULTS.themeMode);
  const [customThemes, setCustomThemes] = usePersisted("customThemes", DEFAULTS.customThemes);

  const [computedTheme, setComputedTheme] = useState<"light" | "dark">("light");

  // Theme Logic
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (themeMode === "system") {
        setComputedTheme(mediaQuery.matches ? "dark" : "light");
      }
    };

    if (themeMode === "system") {
      setComputedTheme(mediaQuery.matches ? "dark" : "light");
    } else {
      setComputedTheme(themeMode);
    }

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [themeMode]);

  useEffect(() => {
    const root = document.documentElement;
    if (computedTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [computedTheme]);

  const addCustomTheme = (name: string, colors: { fg: string; bg: string; accent: string }) => {
    const newTheme = { id: crypto.randomUUID(), name, colors };
    setCustomThemes([...customThemes, newTheme]);
  };

  const removeCustomTheme = (id: string) => {
    setCustomThemes(customThemes.filter(t => t.id !== id));
  };

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
    setShowScrollbar(DEFAULTS.showScrollbar);
    setShowPageCounter(DEFAULTS.showPageCounter);
    setProgressBarType(DEFAULTS.progressBarType);
    setBarPosition(DEFAULTS.barPosition);
    setReaderForeground(DEFAULTS.readerForeground);
    setReaderBackground(DEFAULTS.readerBackground);
    setReaderAccent(DEFAULTS.readerAccent);
    setKeybinds(DEFAULTS.keybinds);
    setDailyGoal(DEFAULTS.dailyGoal);
    setWeeklyGoal(DEFAULTS.weeklyGoal);
    setShowStreakReminder(DEFAULTS.showStreakReminder);
    setTrackingEnabled(DEFAULTS.trackingEnabled);
    setScreenReaderMode(DEFAULTS.screenReaderMode);
    setReduceMotion(DEFAULTS.reduceMotion);
    setFocusMode(DEFAULTS.focusMode);
    setThemeMode(DEFAULTS.themeMode);
    setCustomThemes(DEFAULTS.customThemes);
  };

  const exportSettings = () => {
    const settings = {
      fontSize, lineHeight, textAlignment, fontPairing, maxTextWidth, hyphenation,
      pageMargin, paragraphSpacing, dropCaps, continuous, spread, direction,
      brightness, showScrollbar, showPageCounter, progressBarType, barPosition,
      readerForeground, readerBackground, readerAccent, keybinds,
      dailyGoal, weeklyGoal, showStreakReminder, trackingEnabled,
      screenReaderMode, reduceMotion, focusMode, themeMode, customThemes
    };
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sanctuary-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importSettings = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.fontSize) setFontSize(data.fontSize);
      if (data.lineHeight) setLineHeight(data.lineHeight);
      if (data.textAlignment) setTextAlignment(data.textAlignment);
      if (data.fontPairing) setFontPairing(data.fontPairing);
      if (data.maxTextWidth) setMaxTextWidth(data.maxTextWidth);
      if (data.hyphenation !== undefined) setHyphenation(data.hyphenation);
      if (data.pageMargin) setPageMargin(data.pageMargin);
      if (data.paragraphSpacing) setParagraphSpacing(data.paragraphSpacing);
      if (data.dropCaps !== undefined) setDropCaps(data.dropCaps);
      if (data.continuous !== undefined) setContinuous(data.continuous);
      if (data.spread !== undefined) setSpread(data.spread);
      if (data.direction) setDirection(data.direction);
      if (data.brightness) setBrightness(data.brightness);
      if (data.showScrollbar !== undefined) setShowScrollbar(data.showScrollbar);
      if (data.showPageCounter !== undefined) setShowPageCounter(data.showPageCounter);
      if (data.progressBarType) setProgressBarType(data.progressBarType);
      if (data.barPosition) setBarPosition(data.barPosition);
      if (data.readerForeground) setReaderForeground(data.readerForeground);
      if (data.readerBackground) setReaderBackground(data.readerBackground);
      if (data.readerAccent) setReaderAccent(data.readerAccent);
      if (data.keybinds) setKeybinds(data.keybinds);
      if (data.dailyGoal) setDailyGoal(data.dailyGoal);
      if (data.weeklyGoal) setWeeklyGoal(data.weeklyGoal);
      if (data.showStreakReminder !== undefined) setShowStreakReminder(data.showStreakReminder);
      if (data.trackingEnabled !== undefined) setTrackingEnabled(data.trackingEnabled);
      if (data.screenReaderMode !== undefined) setScreenReaderMode(data.screenReaderMode);
      if (data.reduceMotion !== undefined) setReduceMotion(data.reduceMotion);
      if (data.focusMode !== undefined) setFocusMode(data.focusMode);
      if (data.themeMode) setThemeMode(data.themeMode);
      if (data.customThemes) setCustomThemes(data.customThemes);

      alert("Settings imported successfully!");
    } catch (e) {
      console.error("Failed to import settings:", e);
      alert("Failed to import settings. Invalid file format.");
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
        continuous, setContinuous,
        spread, setSpread,
        direction, setDirection,
        brightness, setBrightness,
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
        focusMode, setFocusMode,
        themeMode, setThemeMode,
        computedTheme,
        customThemes, addCustomTheme, removeCustomTheme,
        exportSettings, importSettings,
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