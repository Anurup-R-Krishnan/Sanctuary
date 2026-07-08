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
  cfi: string;
  color: "yellow" | "green" | "blue" | "pink" | "purple";
  createdAt: string;
  id: string;
  note?: string;
  text: string;
}

export interface Bookmark {
  cfi: string;
  createdAt: string;
  id: string;
  note?: string;
  title: string;
}


export interface LibraryItem {
  author: string;
  bookmarks?: Array<{ cfi: string; title?: string }>;
  coverUrl?: string | null;
  favorite?: boolean;
  id: string;
  lastLocation?: string | null;
  progressPercent: number;
  status?: "to-read" | "reading" | "finished";
  title: string;
  totalPages?: number;
  updatedAt?: string;
}

export interface Book extends Omit<LibraryItem, "bookmarks" | "favorite" | "lastLocation" | "progressPercent" | "status"> {
  addedAt?: string;
  bookmarks?: Bookmark[];
  completedAt?: string;
  epubBlob: Blob | null;
  genre?: string;
  highlights?: Highlight[];
  isFavorite?: boolean;
  isIncognito?: boolean;
  lastLocation: string;
  lastOpenedAt?: string;
  locationHistory?: string[];
  progress: number; // Mapping progressPercent to progress for consistency with epubjs usage
  readingList?: "to-read" | "reading" | "finished";
  series?: string;
  seriesIndex?: number;
  tags?: string[];
  totalPages?: number;
}

export interface ReadingGoalWindow {
  goal: number;
  minutes: number;
  progressPercent: number;
  targetMinutes: number;
  totalMinutes: number;
}

export interface ReadingGoals {
  day: ReadingGoalWindow;
  month: ReadingGoalWindow;
  week: ReadingGoalWindow;
}

export interface Badge {
  description: string;
  icon: string;
  id: string;
  name: string;
  progress?: number;
  target?: number;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface ReadingStats {
  authorNetwork: { author: string; books: number }[];
  averageReadingSpeed: number;
  badges: Badge[];
  booksCompletedThisMonth: number;
  currentStreak: number;
  dailyGoal: number;
  dailyProgress: number;
  genreDistribution: { genre: string; count: number; color: string }[];
  goals?: ReadingGoals; // Added goal tracking
  heatmapData: number[][];
  longestStreak: number;
  monthlyData: { month: string; hours: number; books: number }[];
  personalityDescription: string;
  readingPersonality: string;
  totalBooksInLibrary: number;
  totalBooksRead: number;
  totalPagesRead: number;
  totalReadingTime: number;
  weeklyData: { day: string; pages: number; minutes: number }[];
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
  bookId: string;
  bookTitle: string; // Additional field used by the web app for UI display
  date: string;
  device?: "web" | "ios" | "android" | string;
  duration: number;
  endedAt?: string;
  id: string;
  localStartHour?: number;
  pagesRead: number;
  startedAt?: string;
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
