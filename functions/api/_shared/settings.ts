export interface ReaderSettingsDefaults {
  dailyGoal: number;
  weeklyGoal: number;
  themePreset: "paper" | "ivory" | "ink";
  fontScale: number;
  lineHeight: number;
  textWidth: number;
  motion: "full" | "reduced";
  tapZones: boolean;
  swipeNav: boolean;
  autoHideMs: number;
  showProgress: boolean;
  showPageMeta: boolean;
  accent: string;
}

export const readerSettingsDefaults: ReaderSettingsDefaults = {
  dailyGoal: 30,
  weeklyGoal: 150,
  themePreset: "paper",
  fontScale: 100,
  lineHeight: 1.6,
  textWidth: 70,
  motion: "full",
  tapZones: true,
  swipeNav: true,
  autoHideMs: 4500,
  showProgress: true,
  showPageMeta: true,
  accent: "#B37A4C"
};
