import { describe, expect, it } from 'bun:test';

import type { Book, SessionAggregates } from '@/types';

import {
  calculateBadgeSummary,
  evaluateBadges,
  type BadgeEvaluationInput,
} from './badgeEngine';

function createMockAggregates(overrides?: Partial<SessionAggregates>): SessionAggregates {
  return {
    dayTotals: new Map(),
    earlyBirdUnlocked: false,
    monthMinutes: new Map(),
    nightOwlUnlocked: false,
    sessionCount: 0,
    sessionDates: new Set(),
    totalPagesRead: 0,
    totalReadingTime: 0,
    ...overrides,
  };
}

function createMockBook(id: string, progress: number, genre = 'Fiction', title = 'Test Book'): Book {
  return {
    addedAt: '2026-01-01T00:00:00Z',
    author: 'Author A',
    coverUrl: null,
    epubBlob: null,
    genre,
    id,
    lastLocation: '',
    progress,
    title,
    totalPages: 250,
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

describe('badgeEngine', () => {
  it('returns all badges as locked for a fresh reader with zero activity', () => {
    const input: BadgeEvaluationInput = {
      aggregates: createMockAggregates(),
      books: [],
      currentStreak: 0,
      longestStreak: 0,
    };

    const badges = evaluateBadges(input);
    expect(badges.length).toBeGreaterThanOrEqual(18);

    const unlocked = badges.filter((b) => b.unlocked);
    expect(unlocked.length).toBe(0);

    const summary = calculateBadgeSummary(badges);
    expect(summary.total).toBe(badges.length);
    expect(summary.unlocked).toBe(0);
    expect(summary.percent).toBe(0);
  });

  it('unlocks book completion milestone badges hierarchically', () => {
    // 1 book completed
    const books1 = [createMockBook('1', 100)];
    const badges1 = evaluateBadges({
      aggregates: createMockAggregates(),
      books: books1,
      currentStreak: 0,
      longestStreak: 0,
    });

    const firstSteps = badges1.find((b) => b.id === 'first_book');
    const bookworm = badges1.find((b) => b.id === 'bookworm');
    expect(firstSteps?.unlocked).toBe(true);
    expect(firstSteps?.progress).toBe(1);
    expect(bookworm?.unlocked).toBe(false);
    expect(bookworm?.progress).toBe(1);

    // 5 books completed
    const books5 = Array.from({ length: 5 }, (_, i) => createMockBook(`b-${i}`, 100));
    const badges5 = evaluateBadges({
      aggregates: createMockAggregates(),
      books: books5,
      currentStreak: 0,
      longestStreak: 0,
    });
    expect(badges5.find((b) => b.id === 'bookworm')?.unlocked).toBe(true);
    expect(badges5.find((b) => b.id === 'librarian')?.unlocked).toBe(false);
    expect(badges5.find((b) => b.id === 'librarian')?.progress).toBe(5);

    // 25 books completed
    const books25 = Array.from({ length: 25 }, (_, i) => createMockBook(`b-${i}`, 100));
    const badges25 = evaluateBadges({
      aggregates: createMockAggregates(),
      books: books25,
      currentStreak: 0,
      longestStreak: 0,
    });
    expect(badges25.find((b) => b.id === 'librarian')?.unlocked).toBe(true);
    expect(badges25.find((b) => b.id === 'bibliophile')?.unlocked).toBe(false);

    // 50 books completed
    const books50 = Array.from({ length: 50 }, (_, i) => createMockBook(`b-${i}`, 100));
    const badges50 = evaluateBadges({
      aggregates: createMockAggregates(),
      books: books50,
      currentStreak: 0,
      longestStreak: 0,
    });
    expect(badges50.find((b) => b.id === 'bibliophile')?.unlocked).toBe(true);
  });

  it('unlocks reading streak milestones using the higher of current and longest streak', () => {
    const input: BadgeEvaluationInput = {
      aggregates: createMockAggregates(),
      books: [],
      currentStreak: 2,
      longestStreak: 30, // Past record
    };

    const badges = evaluateBadges(input);
    expect(badges.find((b) => b.id === 'streak_3')?.unlocked).toBe(true);
    expect(badges.find((b) => b.id === 'streak_7')?.unlocked).toBe(true);
    expect(badges.find((b) => b.id === 'streak_30')?.unlocked).toBe(true);
    expect(badges.find((b) => b.id === 'streak_100')?.unlocked).toBe(false);
    expect(badges.find((b) => b.id === 'streak_100')?.progress).toBe(30);
  });

  it('evaluates cumulative immersion reading time milestones in minutes', () => {
    const aggregates = createMockAggregates({ totalReadingTime: 650 }); // ~10.8 hours
    const badges = evaluateBadges({
      aggregates,
      books: [],
      currentStreak: 0,
      longestStreak: 0,
    });

    expect(badges.find((b) => b.id === 'hour_1')?.unlocked).toBe(true);
    expect(badges.find((b) => b.id === 'hour_10')?.unlocked).toBe(true);
    expect(badges.find((b) => b.id === 'hour_50')?.unlocked).toBe(false);
    expect(badges.find((b) => b.id === 'hour_50')?.progress).toBe(650);
  });

  it('evaluates total page count milestones', () => {
    const aggregates = createMockAggregates({ totalPagesRead: 1200 });
    const badges = evaluateBadges({
      aggregates,
      books: [],
      currentStreak: 0,
      longestStreak: 0,
    });

    expect(badges.find((b) => b.id === 'pages_100')?.unlocked).toBe(true);
    expect(badges.find((b) => b.id === 'pages_1000')?.unlocked).toBe(true);
    expect(badges.find((b) => b.id === 'pages_5000')?.unlocked).toBe(false);
    expect(badges.find((b) => b.id === 'pages_5000')?.progress).toBe(1200);
  });

  it('evaluates circadian rhythm night owl and early bird accomplishments', () => {
    const aggregates = createMockAggregates({
      earlyBirdUnlocked: true,
      nightOwlUnlocked: true,
    });

    const badges = evaluateBadges({
      aggregates,
      books: [],
      currentStreak: 0,
      longestStreak: 0,
    });

    expect(badges.find((b) => b.id === 'night_owl')?.unlocked).toBe(true);
    expect(badges.find((b) => b.id === 'early_bird')?.unlocked).toBe(true);
  });

  it('evaluates genre explorer when reader has books across 3 different genres', () => {
    const books = [
      createMockBook('1', 50, 'Sci-Fi'),
      createMockBook('2', 20, 'Fantasy'),
      createMockBook('3', 10, 'History'),
    ];

    const badges = evaluateBadges({
      aggregates: createMockAggregates(),
      books,
      currentStreak: 0,
      longestStreak: 0,
    });

    const explorer = badges.find((b) => b.id === 'genre_explorer');
    expect(explorer?.unlocked).toBe(true);
    expect(explorer?.progress).toBe(3);
  });

  it('evaluates series finisher when user completes all books in a multi-volume series', () => {
    const books = [
      { ...createMockBook('1', 100, 'Sci-Fi', 'Dune 1'), series: 'Dune Chronicles', seriesIndex: 1 },
      { ...createMockBook('2', 100, 'Sci-Fi', 'Dune 2'), series: 'Dune Chronicles', seriesIndex: 2 },
    ];

    const badges = evaluateBadges({
      aggregates: createMockAggregates(),
      books,
      currentStreak: 0,
      longestStreak: 0,
    });

    const finisher = badges.find((b) => b.id === 'series_finisher');
    expect(finisher?.unlocked).toBe(true);
    expect(finisher?.progress).toBe(1);
  });

  it('calculates badge summary percentages accurately', () => {
    const badges = [
      { category: 'books' as const, description: '', icon: 'book', id: '1', name: 'B1', unlocked: true },
      { category: 'books' as const, description: '', icon: 'book', id: '2', name: 'B2', unlocked: false },
      { category: 'books' as const, description: '', icon: 'book', id: '3', name: 'B3', unlocked: false },
      { category: 'books' as const, description: '', icon: 'book', id: '4', name: 'B4', unlocked: true },
    ];

    const summary = calculateBadgeSummary(badges);
    expect(summary.total).toBe(4);
    expect(summary.unlocked).toBe(2);
    expect(summary.percent).toBe(50);
  });
});
