import type { ReactNode } from "react";
import React, { createContext, useState, useEffect, useContext } from "react";
import { settingsService } from "@/services/settingsService";

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
  showFloatingCapsule: boolean;
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
  lineHeight: 1.65,
  textAlignment: "justify" as TextAlignment,
  fontPairing: "merriweather-georgia",
  maxTextWidth: 150,
  hyphenation: true,
  pageMargin: 40,
  paragraphSpacing: 17,
  continuous: false,
  spread: false,
  direction: "ltr" as "ltr" | "rtl",
  brightness: 100,
  grayscale: false,
  showScrollbar: false,
  showPageCounter: true,
  progressBarType: "bar" as "bar" | "none",
  barPosition: "bottom" as "top" | "bottom",
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
    close: ["Escape"],
  },
  dailyGoal: 30,
  weeklyGoal: 150,
  showStreakReminder: true,
  trackingEnabled: true,
  screenReaderMode: false,
  reduceMotion: false,
};



import { useAuth } from "@/hooks/useAuth";

// ...

const usePersisted = <T,>(key: string, defaultValue: T): [T, (v: T) => void] => {
  const [value, setValue] = useState<T>(defaultValue);
  const [isLoaded, setIsLoaded] = useState(false);
  const { getToken } = useAuth();

  // Load initial value
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      // Get token (might be null if signed out, but service handles it)
      const token = await getToken();
      const saved = await settingsService.getItem<T>(key, token || undefined);
      if (mounted && saved !== null) {
        setValue(saved);
      }
      if (mounted) setIsLoaded(true);
    };
    load();
    return () => { mounted = false; };
  }, [key, getToken]);

  // Save value
  useEffect(() => {
    if (isLoaded) {
      // Async wrapper to get token
      const save = async () => {
        const token = await getToken();
        settingsService.setItem(key, value, token || undefined).catch(console.error);
      };
      save();
    }
  }, [key, value, isLoaded, getToken]);

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
  const [continuous, setContinuous] = usePersisted("continuous", DEFAULTS.continuous);
  const [spread, setSpread] = usePersisted("spread", DEFAULTS.spread);
  const [direction, setDirection] = usePersisted("direction", DEFAULTS.direction);
  const [brightness, setBrightness] = usePersisted("brightness", DEFAULTS.brightness);
  const [grayscale, setGrayscale] = usePersisted("grayscale", DEFAULTS.grayscale);
  const [showScrollbar, setShowScrollbar] = usePersisted("showScrollbar", DEFAULTS.showScrollbar);
  const [showPageCounter, setShowPageCounter] = usePersisted("showPageCounter", DEFAULTS.showPageCounter);
  const [progressBarType, setProgressBarType] = usePersisted("progressBarType", DEFAULTS.progressBarType);
  const [barPosition, setBarPosition] = usePersisted("barPosition", DEFAULTS.barPosition);
  const [showFloatingCapsule, setShowFloatingCapsule] = usePersisted("showFloatingCapsule", DEFAULTS.showFloatingCapsule);
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
    setContinuous(DEFAULTS.continuous);
    setSpread(DEFAULTS.spread);
    setDirection(DEFAULTS.direction);
    setBrightness(DEFAULTS.brightness);
    setGrayscale(DEFAULTS.grayscale);
    setShowScrollbar(DEFAULTS.showScrollbar);
    setShowPageCounter(DEFAULTS.showPageCounter);
    setProgressBarType(DEFAULTS.progressBarType);
    setBarPosition(DEFAULTS.barPosition);
    setShowFloatingCapsule(DEFAULTS.showFloatingCapsule);
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
        continuous, setContinuous,
        spread, setSpread,
        direction, setDirection,
        brightness, setBrightness,
        grayscale, setGrayscale,
        showScrollbar, setShowScrollbar,
        showPageCounter, setShowPageCounter,
        progressBarType, setProgressBarType,
        barPosition, setBarPosition,
        showFloatingCapsule, setShowFloatingCapsule,
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
