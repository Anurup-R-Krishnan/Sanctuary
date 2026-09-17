/**
 * Reading milestones and achievement badge evaluation utilities.
 */

import type { Badge, Book, SessionAggregates } from '@/types';

export type BadgeCategory = 'books' | 'habits' | 'pages' | 'special' | 'streaks' | 'time';
export type BadgeRarity = 'common' | 'epic' | 'legendary' | 'rare';

export interface BadgeEvaluationInput {
  aggregates: SessionAggregates;
  books: Book[];
  currentStreak: number;
  longestStreak: number;
}

export interface BadgeSummary {
  percent: number;
  total: number;
  unlocked: number;
}

interface BadgeDefinition {
  category: BadgeCategory;
  description: string;
  evaluate: (input: BadgeEvaluationInput, completedBooks: Book[]) => { progress?: number; unlocked: boolean };
  icon: string;
  id: string;
  name: string;
  rarity: BadgeRarity;
  target?: number;
}

const BADGE_DEFINITIONS: readonly BadgeDefinition[] = [
  // ── Books (Volume Milestones) ──────────────────────────────────────────────
  {
    category: 'books',
    description: 'Complete your first book',
    evaluate: (_, completed) => ({
      progress: Math.min(1, completed.length),
      unlocked: completed.length >= 1,
    }),
    icon: 'book',
    id: 'first_book',
    name: 'First Steps',
    rarity: 'common',
    target: 1,
  },
  {
    category: 'books',
    description: 'Complete 5 books',
    evaluate: (_, completed) => ({
      progress: Math.min(5, completed.length),
      unlocked: completed.length >= 5,
    }),
    icon: 'book',
    id: 'bookworm',
    name: 'Bookworm',
    rarity: 'common',
    target: 5,
  },
  {
    category: 'books',
    description: 'Complete 25 books',
    evaluate: (_, completed) => ({
      progress: Math.min(25, completed.length),
      unlocked: completed.length >= 25,
    }),
    icon: 'award',
    id: 'librarian',
    name: 'Librarian',
    rarity: 'rare',
    target: 25,
  },
  {
    category: 'books',
    description: 'Complete 50 books',
    evaluate: (_, completed) => ({
      progress: Math.min(50, completed.length),
      unlocked: completed.length >= 50,
    }),
    icon: 'trophy',
    id: 'bibliophile',
    name: 'Bibliophile',
    rarity: 'epic',
    target: 50,
  },

  // ── Streaks (Habit Consistency) ───────────────────────────────────────────
  {
    category: 'streaks',
    description: 'Build a 3-day reading streak',
    evaluate: (input) => {
      const best = Math.max(input.currentStreak, input.longestStreak);
      return {
        progress: Math.min(3, best),
        unlocked: best >= 3,
      };
    },
    icon: 'flame',
    id: 'streak_3',
    name: 'Spark',
    rarity: 'common',
    target: 3,
  },
  {
    category: 'streaks',
    description: 'Maintain a 7-day reading streak',
    evaluate: (input) => {
      const best = Math.max(input.currentStreak, input.longestStreak);
      return {
        progress: Math.min(7, best),
        unlocked: best >= 7,
      };
    },
    icon: 'zap',
    id: 'streak_7',
    name: 'Week Warrior',
    rarity: 'rare',
    target: 7,
  },
  {
    category: 'streaks',
    description: 'Achieve an unbroken 30-day streak',
    evaluate: (input) => {
      const best = Math.max(input.currentStreak, input.longestStreak);
      return {
        progress: Math.min(30, best),
        unlocked: best >= 30,
      };
    },
    icon: 'star',
    id: 'streak_30',
    name: 'Monthly Master',
    rarity: 'epic',
    target: 30,
  },
  {
    category: 'streaks',
    description: 'Reach a 100-day reading streak',
    evaluate: (input) => {
      const best = Math.max(input.currentStreak, input.longestStreak);
      return {
        progress: Math.min(100, best),
        unlocked: best >= 100,
      };
    },
    icon: 'trophy',
    id: 'streak_100',
    name: 'Century Club',
    rarity: 'legendary',
    target: 100,
  },

  // ── Time (Hours Read) ─────────────────────────────────────────────────────
  {
    category: 'time',
    description: 'Read for 1 hour total',
    evaluate: (input) => {
      const mins = Math.round(input.aggregates.totalReadingTime);
      return {
        progress: Math.min(60, mins),
        unlocked: mins >= 60,
      };
    },
    icon: 'clock',
    id: 'hour_1',
    name: 'Time Flies',
    rarity: 'common',
    target: 60,
  },
  {
    category: 'time',
    description: 'Read for 10 hours total',
    evaluate: (input) => {
      const mins = Math.round(input.aggregates.totalReadingTime);
      return {
        progress: Math.min(600, mins),
        unlocked: mins >= 600,
      };
    },
    icon: 'target',
    id: 'hour_10',
    name: 'Dedicated',
    rarity: 'rare',
    target: 600,
  },
  {
    category: 'time',
    description: 'Log 50 hours of active reading',
    evaluate: (input) => {
      const mins = Math.round(input.aggregates.totalReadingTime);
      return {
        progress: Math.min(3000, mins),
        unlocked: mins >= 3000,
      };
    },
    icon: 'award',
    id: 'hour_50',
    name: 'Scholar',
    rarity: 'epic',
    target: 3000,
  },
  {
    category: 'time',
    description: 'Read for 100 hours total',
    evaluate: (input) => {
      const mins = Math.round(input.aggregates.totalReadingTime);
      return {
        progress: Math.min(6000, mins),
        unlocked: mins >= 6000,
      };
    },
    icon: 'trophy',
    id: 'hour_100',
    name: 'Centurion',
    rarity: 'legendary',
    target: 6000,
  },

  // ── Pages (Pages Read) ────────────────────────────────────────────────────
  {
    category: 'pages',
    description: 'Read 100 pages',
    evaluate: (input) => {
      const pages = input.aggregates.totalPagesRead;
      return {
        progress: Math.min(100, pages),
        unlocked: pages >= 100,
      };
    },
    icon: 'book',
    id: 'pages_100',
    name: 'Page Turner',
    rarity: 'common',
    target: 100,
  },
  {
    category: 'pages',
    description: 'Read 1,000 pages',
    evaluate: (input) => {
      const pages = input.aggregates.totalPagesRead;
      return {
        progress: Math.min(1000, pages),
        unlocked: pages >= 1000,
      };
    },
    icon: 'target',
    id: 'pages_1000',
    name: 'Thousand Club',
    rarity: 'rare',
    target: 1000,
  },
  {
    category: 'pages',
    description: 'Read 5,000 pages',
    evaluate: (input) => {
      const pages = input.aggregates.totalPagesRead;
      return {
        progress: Math.min(5000, pages),
        unlocked: pages >= 5000,
      };
    },
    icon: 'star',
    id: 'pages_5000',
    name: 'Marathon Reader',
    rarity: 'epic',
    target: 5000,
  },

  // ── Reading Habits ────────────────────────────────────────────────────────
  {
    category: 'habits',
    description: 'Read after midnight',
    evaluate: (input) => ({
      unlocked: Boolean(input.aggregates.nightOwlUnlocked),
    }),
    icon: 'moon',
    id: 'night_owl',
    name: 'Night Owl',
    rarity: 'rare',
  },
  {
    category: 'habits',
    description: 'Read before 6:00 AM',
    evaluate: (input) => ({
      unlocked: Boolean(input.aggregates.earlyBirdUnlocked),
    }),
    icon: 'sun',
    id: 'early_bird',
    name: 'Early Bird',
    rarity: 'rare',
  },
  {
    category: 'special',
    description: 'Explore books across 3 different genres',
    evaluate: (input) => {
      const genres = new Set(
        input.books
          .map((b) => b.genre?.trim())
          .filter((g): g is string => Boolean(g && g.toLowerCase() !== 'uncategorized'))
      );
      return {
        progress: Math.min(3, genres.size),
        unlocked: genres.size >= 3,
      };
    },
    icon: 'compass',
    id: 'genre_explorer',
    name: 'Genre Explorer',
    rarity: 'rare',
    target: 3,
  },
  {
    category: 'special',
    description: 'Complete every book in a series',
    evaluate: (input) => {
      const seriesMap = new Map<string, Book[]>();
      for (const b of input.books) {
        const s = b.series?.trim();
        if (s) {
          const list = seriesMap.get(s) || [];
          list.push(b);
          seriesMap.set(s, list);
        }
      }
      let completedCount = 0;
      for (const booksInSeries of seriesMap.values()) {
        if (booksInSeries.length >= 2 && booksInSeries.every((b) => b.progress >= 100)) {
          completedCount++;
        }
      }
      return {
        progress: Math.min(1, completedCount),
        unlocked: completedCount >= 1,
      };
    },
    icon: 'layers',
    id: 'series_finisher',
    name: 'Series Finisher',
    rarity: 'epic',
    target: 1,
  },
];

/**
 * Dynamically evaluates achievement badges against user books, streaks, and session aggregates.
 */
export function evaluateBadges(input: BadgeEvaluationInput): Badge[] {
  const completedBooks = input.books.filter((b) => b.progress >= 100);

  return BADGE_DEFINITIONS.map((def) => {
    const result = def.evaluate(input, completedBooks);
    return {
      category: def.category,
      description: def.description,
      icon: def.icon,
      id: def.id,
      name: def.name,
      progress: result.progress,
      rarity: def.rarity,
      target: def.target,
      unlocked: result.unlocked,
    };
  });
}

/**
 * Calculates summary metrics (total, unlocked, percentage) across all evaluated badges.
 */
export function calculateBadgeSummary(badges: Badge[]): BadgeSummary {
  const total = badges.length;
  const unlocked = badges.filter((b) => b.unlocked).length;
  const percent = total > 0 ? Math.round((unlocked / total) * 100) : 0;
  return { percent, total, unlocked };
}
