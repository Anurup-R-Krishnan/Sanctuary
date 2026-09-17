import { describe, expect, it } from 'bun:test';

import type { ReadingSession } from '@/types';

import {
  calculateCellIntensity,
  calculateCircadianDistribution,
  calculateReadingVelocity,
  formatHourLabel,
  generateActivityGrid,
  groupSessionsByDate,
} from './readingActivityEngine';

describe('readingActivityEngine', () => {
  describe('formatHourLabel', () => {
    it('formats 12-hour AM/PM representations correctly', () => {
      expect(formatHourLabel(0)).toBe('12 AM');
      expect(formatHourLabel(9)).toBe('9 AM');
      expect(formatHourLabel(12)).toBe('12 PM');
      expect(formatHourLabel(15)).toBe('3 PM');
      expect(formatHourLabel(21)).toBe('9 PM');
      expect(formatHourLabel(23)).toBe('11 PM');
    });

    it('clamps negative or out-of-range hours safely', () => {
      expect(formatHourLabel(-5)).toBe('12 AM');
      expect(formatHourLabel(35)).toBe('11 PM');
    });
  });

  describe('calculateCellIntensity', () => {
    const dailyTarget = 30;

    it('returns 0 for zero or negative reading time', () => {
      expect(calculateCellIntensity(0, dailyTarget)).toBe(0);
      expect(calculateCellIntensity(-10, dailyTarget)).toBe(0);
    });

    it('returns 1 for light activity below 35% target', () => {
      expect(calculateCellIntensity(8, dailyTarget)).toBe(1);
    });

    it('returns 2 for moderate activity below 75% target', () => {
      expect(calculateCellIntensity(18, dailyTarget)).toBe(2);
    });

    it('returns 3 for strong activity approaching daily goal', () => {
      expect(calculateCellIntensity(25, dailyTarget)).toBe(3);
    });

    it('returns 4 for hitting or exceeding daily goal', () => {
      expect(calculateCellIntensity(30, dailyTarget)).toBe(4);
      expect(calculateCellIntensity(60, dailyTarget)).toBe(4);
    });
  });

  describe('groupSessionsByDate', () => {
    it('aggregates multiple sessions on the same calendar date', () => {
      const mockSessions: ReadingSession[] = [
        {
          bookId: 'b1',
          bookTitle: 'Test Book 1',
          date: '2026-09-10',
          duration: 1200, // 20 min
          id: 's1',
          pagesRead: 15,
          startedAt: '2026-09-10T10:00:00Z',
        },
        {
          bookId: 'b1',
          bookTitle: 'Test Book 1',
          date: '2026-09-10',
          duration: 1800, // 30 min
          id: 's2',
          pagesRead: 20,
          startedAt: '2026-09-10T19:00:00Z',
        },
        {
          bookId: 'b2',
          bookTitle: 'Test Book 2',
          date: '2026-09-11',
          duration: 900, // 15 min
          id: 's3',
          pagesRead: 8,
          startedAt: '2026-09-11T21:00:00Z',
        },
      ];

      const grouped = groupSessionsByDate(mockSessions);
      expect(grouped.size).toBe(2);

      const sep10 = grouped.get('2026-09-10');
      expect(sep10).toBeDefined();
      expect(sep10!.minutes).toBe(50);
      expect(sep10!.pages).toBe(35);
      expect(sep10!.sessionCount).toBe(2);

      const sep11 = grouped.get('2026-09-11');
      expect(sep11!.minutes).toBe(15);
      expect(sep11!.pages).toBe(8);
      expect(sep11!.sessionCount).toBe(1);
    });
  });

  describe('generateActivityGrid', () => {
    it('generates 14-week and 52-week calendar matrix structures', () => {
      const refDate = new Date(2026, 8, 13); // Sep 13, 2026

      const grid14 = generateActivityGrid([], 14, 30, refDate);
      expect(grid14.weeksCount).toBe(14);
      expect(grid14.cells.length).toBe(14);
      expect(grid14.cells[0].length).toBe(7); // Monday through Sunday
      expect(grid14.monthLabels.length).toBeGreaterThan(0);

      const grid52 = generateActivityGrid([], 52, 30, refDate);
      expect(grid52.weeksCount).toBe(52);
      expect(grid52.cells.length).toBe(52);
    });

    it('maps sessions onto matching date cells with correct day-of-week and intensity', () => {
      const refDate = new Date(2026, 8, 13); // Sep 13, 2026 (Sunday)
      const mockSessions: ReadingSession[] = [
        {
          bookId: 'b1',
          bookTitle: 'Test Book 1',
          date: '2026-09-13',
          duration: 2700, // 45 min
          id: 's1',
          pagesRead: 25,
          startedAt: '2026-09-13T20:00:00Z',
        },
      ];

      const grid = generateActivityGrid(mockSessions, 14, 30, refDate);
      const lastWeek = grid.cells[grid.cells.length - 1];
      const sundayCell = lastWeek[6]; // Sunday

      expect(sundayCell.dateKey).toBe('2026-09-13');
      expect(sundayCell.dayOfWeek).toBe(6);
      expect(sundayCell.minutes).toBe(45);
      expect(sundayCell.intensity).toBe(4);
      expect(grid.totalMinutes).toBe(45);
      expect(grid.totalActiveDays).toBe(1);
    });
  });

  describe('calculateCircadianDistribution', () => {
    it('accurately groups session reading time into time-of-day periods', () => {
      const mockSessions: ReadingSession[] = [
        {
          bookId: 'b1',
          bookTitle: 'Test Book 1',
          date: '2026-09-10',
          duration: 3600, // 60 min
          id: 's1',
          localStartHour: 8, // Morning
          pagesRead: 30,
          startedAt: '2026-09-10T08:00:00Z',
        },
        {
          bookId: 'b1',
          bookTitle: 'Test Book 1',
          date: '2026-09-10',
          duration: 7200, // 120 min
          id: 's2',
          localStartHour: 20, // Evening
          pagesRead: 50,
          startedAt: '2026-09-10T20:00:00Z',
        },
        {
          bookId: 'b2',
          bookTitle: 'Test Book 2',
          date: '2026-09-11',
          duration: 1800, // 30 min
          id: 's3',
          localStartHour: 23, // Night
          pagesRead: 15,
          startedAt: '2026-09-11T23:00:00Z',
        },
      ];

      const dist = calculateCircadianDistribution(mockSessions);
      expect(dist.morningMinutes).toBe(60);
      expect(dist.eveningMinutes).toBe(120);
      expect(dist.nightMinutes).toBe(30);
      expect(dist.afternoonMinutes).toBe(0);
      expect(dist.peakPeriod).toBe('evening');
      expect(dist.eveningPercent).toBeGreaterThan(dist.morningPercent);
    });

    it('handles empty session arrays with zero values', () => {
      const dist = calculateCircadianDistribution([]);
      expect(dist.morningMinutes).toBe(0);
      expect(dist.eveningMinutes).toBe(0);
      expect(dist.nightMinutes).toBe(0);
      expect(dist.afternoonMinutes).toBe(0);
      expect(dist.morningPercent).toBe(0);
    });
  });

  describe('calculateReadingVelocity', () => {
    it('computes peak reading hour, best day, and average session duration', () => {
      const mockSessions: ReadingSession[] = [
        {
          bookId: 'b1',
          bookTitle: 'Test Book 1',
          date: '2026-09-13', // Sunday
          duration: 3600, // 60 min
          id: 's1',
          localStartHour: 21,
          pagesRead: 35,
          startedAt: '2026-09-13T21:00:00Z',
        },
        {
          bookId: 'b1',
          bookTitle: 'Test Book 1',
          date: '2026-09-12', // Saturday
          duration: 1800, // 30 min
          id: 's2',
          localStartHour: 21,
          pagesRead: 15,
          startedAt: '2026-09-12T21:00:00Z',
        },
      ];

      const velocity = calculateReadingVelocity(mockSessions);
      expect(velocity.peakReadingHour).toBe(21);
      expect(velocity.peakReadingHourLabel).toBe('9 PM');
      expect(velocity.longestSessionMinutes).toBe(60);
      expect(velocity.averageMinutesPerSession).toBe(45);
      expect(velocity.bestDayOfWeek).toBe('Sunday');
      expect(velocity.totalDaysEvaluated).toBe(2);
    });

    it('returns safe fallback values when session array is empty', () => {
      const velocity = calculateReadingVelocity([]);
      expect(velocity.averageMinutesPerSession).toBe(0);
      expect(velocity.longestSessionMinutes).toBe(0);
      expect(velocity.totalDaysEvaluated).toBe(0);
      expect(typeof velocity.bestDayOfWeek).toBe('string');
      expect(typeof velocity.peakReadingHourLabel).toBe('string');
    });
  });
});
