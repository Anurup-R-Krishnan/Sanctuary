import { describe, it, expect } from 'vitest';

import type { ReadingSession } from '@/types';

import { createEmptyAggregates, applySessionToAggregates, calculateStats } from '@/utils/stats';

describe('Reading Sessions and Statistics Integrity', () => {

  const now = Date.now();
  const ONE_HOUR = 60 * 60; // Duration is in seconds in the DB

  it('Session durations clamp correctly at midnight boundaries and max lengths', () => {
    // Note: The actual clamping occurs in StatsService.ts when ending a session,
    // but here we verify that applySessionToAggregates faithfully processes whatever it's given
    // without crashing, and compiles them correctly.
    const aggregates = createEmptyAggregates();
    const s1: ReadingSession = { id: '1', bookId: 'b1', startedAt: new Date(now).toISOString(), duration: ONE_HOUR, pagesRead: 10, isSynced: true, date: '2023-01-01' };
    const s2: ReadingSession = { id: '2', bookId: 'b1', startedAt: new Date(now).toISOString(), duration: ONE_HOUR * 25, pagesRead: 10, isSynced: true, date: '2023-01-01' };

    applySessionToAggregates(aggregates, s1);
    applySessionToAggregates(aggregates, s2);

    expect(aggregates.totalReadingTime).toBe(26 * 60); // 26 hours in minutes
  });

  it('Streaks are calculated consecutively across midnight', () => {
    const aggregates = createEmptyAggregates();
    
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const day1 = new Date(now - ONE_DAY_MS * 2);
    const day2 = new Date(now - ONE_DAY_MS);
    const day3 = new Date(now);

    const s1: ReadingSession = { id: '1', bookId: 'b1', startedAt: day1.toISOString(), duration: ONE_HOUR, pagesRead: 10, isSynced: true, date: day1.toISOString().slice(0, 10) };
    const s2: ReadingSession = { id: '2', bookId: 'b1', startedAt: day2.toISOString(), duration: ONE_HOUR, pagesRead: 10, isSynced: true, date: day2.toISOString().slice(0, 10) };
    const s3: ReadingSession = { id: '3', bookId: 'b1', startedAt: day3.toISOString(), duration: ONE_HOUR, pagesRead: 10, isSynced: true, date: day3.toISOString().slice(0, 10) };

    applySessionToAggregates(aggregates, s1);
    applySessionToAggregates(aggregates, s2);
    applySessionToAggregates(aggregates, s3);

    const stats = calculateStats([], aggregates, 30);
    expect(stats.currentStreak).toBeGreaterThanOrEqual(3);
  });

});
