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

export interface Highlight {
  id: string;
  cfi: string;
  text: string;
  color: "yellow" | "green" | "blue" | "pink" | "purple";
  note?: string;
  createdAt: string;
}

export interface Bookmark {
  id: string;
  cfi: string;
  title: string;
  note?: string;
  createdAt: string;
}

export interface VocabWord {
  id: string;
  word: string;
  definition?: string;
  context?: string;
  bookId: string;
  createdAt: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  epubBlob: Blob | null;
  progress: number;
  lastLocation: string;
  genre?: string;
  completedAt?: string;
  addedAt?: string;
  lastOpenedAt?: string;
  isFavorite?: boolean;
  isIncognito?: boolean;
  series?: string;
  seriesIndex?: number;
  tags?: string[];
  readingList?: "to-read" | "reading" | "finished";
  highlights?: Highlight[];
  bookmarks?: Bookmark[];
  totalPages?: number;
  locationHistory?: string[];
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
  totalBooksInLibrary: number;
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

export type SortOption = "title" | "author" | "recent" | "progress" | "added";
export type ViewMode = "grid" | "list";
export type FilterOption = "all" | "favorites" | "to-read" | "reading" | "finished";
