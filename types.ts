export enum Theme {
  LIGHT = "light",
  DARK = "dark",
}

export enum View {
  LIBRARY = "library",
  READER = "reader",
  SETTINGS = "settings",
  STATS = "stats",
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  epubBlob: Blob;
  progress: number;
  lastLocation: string;
  genre?: string;
  completedAt?: string;
  addedAt?: string;
  isFavorite?: boolean;
  isIncognito?: boolean;
  series?: string;
  seriesIndex?: number;
  tags?: string[];
  readingList?: "to-read" | "reading" | "finished";
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlocked: boolean;
  progress?: number;
  target?: number;
  unlockedAt?: string;
}

export interface ReadingStats {
  currentStreak: number;
  longestStreak: number;
  totalBooksRead: number;
  totalPagesRead: number;
  totalReadingTime: number;
  averageReadingSpeed: number;
  dailyProgress: number;
  dailyGoal: number;
  booksCompletedThisMonth: number;
  weeklyData: { day: string; pages: number; minutes: number }[];
  monthlyData: { month: string; hours: number; books: number }[];
  heatmapData: number[][];
  genreDistribution: { genre: string; count: number; color: string }[];
  authorNetwork: { author: string; books: number }[];
  badges: Badge[];
  readingPersonality: string;
  personalityDescription: string;
}
