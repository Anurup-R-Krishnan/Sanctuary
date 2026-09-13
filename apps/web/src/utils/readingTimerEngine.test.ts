import { describe, expect, it } from 'bun:test';

import {
  calculateProgressRing,
  calculateSessionProgress,
  formatClock,
  formatDurationCompact,
  isUserInactive,
} from './readingTimerEngine';

describe('readingTimerEngine', () => {
  describe('calculateSessionProgress', () => {
    it('calculates active session progress accurately midway through target', () => {
      // 10 minutes (600s) read out of 20 min budget, with 5 min prior read today out of 30 min daily goal
      const result = calculateSessionProgress(600, 20, 5, 30);

      expect(result.elapsedSeconds).toBe(600);
      expect(result.sessionBudgetMinutes).toBe(20);
      expect(result.remainingSeconds).toBe(600);
      expect(result.sessionPercent).toBe(50);
      expect(result.isSessionGoalMet).toBe(false);

      // Total today = 5 + 10 = 15m. Daily goal = 30m -> 50%
      expect(result.todayMinutesTotal).toBe(15);
      expect(result.dailyPercent).toBe(50);
      expect(result.isDailyGoalMet).toBe(false);
    });

    it('triggers isSessionGoalMet when target is reached', () => {
      const result = calculateSessionProgress(1200, 20, 0, 30);

      expect(result.sessionPercent).toBe(100);
      expect(result.remainingSeconds).toBe(0);
      expect(result.isSessionGoalMet).toBe(true);
      expect(result.todayMinutesTotal).toBe(20);
      expect(result.dailyPercent).toBe(67);
      expect(result.isDailyGoalMet).toBe(false);
    });

    it('triggers isDailyGoalMet when cumulative minutes exceed daily goal', () => {
      const result = calculateSessionProgress(900, 15, 20, 30);

      // 15 min session + 20 prior = 35 min total. Daily goal 30m.
      expect(result.isSessionGoalMet).toBe(true);
      expect(result.todayMinutesTotal).toBe(35);
      expect(result.dailyPercent).toBe(100);
      expect(result.isDailyGoalMet).toBe(true);
    });

    it('handles open-ended / untimed sessions (budget = 0)', () => {
      const result = calculateSessionProgress(300, 0, 10, 30);

      expect(result.sessionBudgetMinutes).toBe(0);
      expect(result.remainingSeconds).toBe(0);
      expect(result.sessionPercent).toBe(100);
      expect(result.isSessionGoalMet).toBe(false);
      expect(result.todayMinutesTotal).toBe(15);
    });

    it('safely handles negative or invalid inputs gracefully', () => {
      const result = calculateSessionProgress(-50, -10, -5, -20);

      expect(result.elapsedSeconds).toBe(0);
      expect(result.sessionBudgetMinutes).toBe(0);
      expect(result.remainingSeconds).toBe(0);
      expect(result.todayMinutesTotal).toBe(0);
      expect(result.dailyGoalMinutes).toBe(1);
    });
  });

  describe('formatDurationCompact', () => {
    it('formats seconds', () => {
      expect(formatDurationCompact(45)).toBe('45s');
    });

    it('formats minutes', () => {
      expect(formatDurationCompact(120)).toBe('2m');
      expect(formatDurationCompact(75)).toBe('1m');
    });

    it('formats hours and minutes', () => {
      expect(formatDurationCompact(3600)).toBe('1h');
      expect(formatDurationCompact(4500)).toBe('1h 15m');
    });
  });

  describe('formatClock', () => {
    it('formats mm:ss', () => {
      expect(formatClock(0)).toBe('0:00');
      expect(formatClock(45)).toBe('0:45');
      expect(formatClock(605)).toBe('10:05');
    });

    it('formats hh:mm:ss when duration >= 1 hour', () => {
      expect(formatClock(3665)).toBe('1:01:05');
    });
  });

  describe('calculateProgressRing', () => {
    it('calculates full circumference for 0%', () => {
      const ring = calculateProgressRing(0, 10, 2);
      expect(ring.circumference).toBeCloseTo(62.83, 1);
      expect(ring.dashoffset).toBeCloseTo(62.83, 1);
    });

    it('calculates half circumference for 50%', () => {
      const ring = calculateProgressRing(50, 10, 2);
      expect(ring.dashoffset).toBeCloseTo(ring.circumference / 2, 1);
    });

    it('calculates zero dashoffset for 100%', () => {
      const ring = calculateProgressRing(100, 10, 2);
      expect(ring.dashoffset).toBe(0);
    });

    it('clamps values above 100% and below 0%', () => {
      expect(calculateProgressRing(150, 10, 2).dashoffset).toBe(0);
      expect(calculateProgressRing(-20, 10, 2).dashoffset).toBeCloseTo(62.83, 1);
    });
  });

  describe('isUserInactive', () => {
    it('returns false when activity is within threshold', () => {
      const now = 1000000;
      const lastActive = now - 60000; // 60s ago
      expect(isUserInactive(lastActive, now, 120000)).toBe(false);
    });

    it('returns true when activity exceeds threshold', () => {
      const now = 1000000;
      const lastActive = now - 130000; // 130s ago
      expect(isUserInactive(lastActive, now, 120000)).toBe(true);
    });
  });
});
