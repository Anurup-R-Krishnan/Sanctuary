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

export const DEFAULT_WEEKLY_DATA = [
  { day: "Mon", pages: 0, minutes: 0 },
  { day: "Tue", pages: 0, minutes: 0 },
  { day: "Wed", pages: 0, minutes: 0 },
  { day: "Thu", pages: 0, minutes: 0 },
  { day: "Fri", pages: 0, minutes: 0 },
  { day: "Sat", pages: 0, minutes: 0 },
  { day: "Sun", pages: 0, minutes: 0 },
] as const;

export const DEFAULT_DAILY_GOAL = 30;

export const DEFAULT_PERSONALITY = {
  personality: "Explorer" as string,
  description: "You're just getting started on your reading journey!" as string,
};

export const DEFAULT_BADGES: Badge[] = [
  { id: "first_book", name: "First Steps", icon: "📖", description: "Complete your first book", unlocked: false, progress: 0, target: 1 },
  { id: "bookworm", name: "Bookworm", icon: "📚", description: "Complete 5 books", unlocked: false, progress: 0, target: 5 },
  { id: "librarian", name: "Librarian", icon: "🏛️", description: "Complete 25 books", unlocked: false, progress: 0, target: 25 },
  { id: "streak_3", name: "Getting Started", icon: "🔥", description: "3 day reading streak", unlocked: false, progress: 0, target: 3 },
  { id: "streak_7", name: "Week Warrior", icon: "⚡", description: "7 day reading streak", unlocked: false, progress: 0, target: 7 },
  { id: "streak_30", name: "Monthly Master", icon: "👑", description: "30 day reading streak", unlocked: false, progress: 0, target: 30 },
  { id: "hour_1", name: "Time Flies", icon: "⏱️", description: "Read for 1 hour total", unlocked: false, progress: 0, target: 60 },
  { id: "hour_10", name: "Dedicated", icon: "🎯", description: "Read for 10 hours total", unlocked: false, progress: 0, target: 600 },
  { id: "pages_100", name: "Page Turner", icon: "📄", description: "Read 100 pages", unlocked: false, progress: 0, target: 100 },
  { id: "pages_1000", name: "Thousand Club", icon: "📑", description: "Read 1000 pages", unlocked: false, progress: 0, target: 1000 },
  { id: "night_owl", name: "Night Owl", icon: "🦉", description: "Read after midnight", unlocked: false },
  { id: "early_bird", name: "Early Bird", icon: "🌅", description: "Read before 6 AM", unlocked: false },
];

export interface ReadingSession {
  id: string;
  bookId: string;
  bookTitle: string;
  date: string;
  startTime?: string;
  localStartHour?: number;
  duration: number;
  pagesRead: number;
}

export type SessionAggregates = {
  totalReadingTime: number;
  totalPagesRead: number;
  nightOwlUnlocked: boolean;
  earlyBirdUnlocked: boolean;
  sessionDates: Set<string>;
  dayTotals: Map<string, { pages: number; minutes: number }>;
  monthMinutes: Map<string, number>;
  sessionCount: number;
};
