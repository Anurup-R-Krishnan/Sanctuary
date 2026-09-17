/**
 * Reading activity calendar and velocity analytics utilities.
 * Provides calendar grid generation, intensity calibration, time-of-day
 * distribution analysis, and reading velocity calculations.
 */

import type { ReadingSession } from '@/types';

import { toLocalDateKey } from '@/utils/stats';

export interface ActivityDayCell {
  date: Date;
  dateKey: string;
  dayOfWeek: number; // 0 = Monday, 6 = Sunday
  formattedDate: string;
  intensity: number; // 0 to 4
  isFuture: boolean;
  isToday: boolean;
  minutes: number;
  pages: number;
  sessionCount: number;
}

export interface CircadianReadingDistribution {
  afternoonMinutes: number;
  afternoonPercent: number;
  eveningMinutes: number;
  eveningPercent: number;
  morningMinutes: number;
  morningPercent: number;
  nightMinutes: number;
  nightPercent: number;
  peakPeriod: 'afternoon' | 'evening' | 'morning' | 'night';
}

export interface HeatmapGridData {
  cells: ActivityDayCell[][];
  endDate: Date;
  maxMinutes: number;
  monthLabels: MonthHeaderLabel[];
  startDate: Date;
  totalActiveDays: number;
  totalMinutes: number;
  totalSessions: number;
  weeksCount: number;
}

export interface MonthHeaderLabel {
  label: string;
  weekIndex: number;
}

export interface ReadingVelocityMetrics {
  averageMinutesPerActiveDay: number;
  averageMinutesPerSession: number;
  bestDayOfWeek: string;
  longestSessionMinutes: number;
  peakReadingHour: number;
  peakReadingHourLabel: string;
  totalDaysEvaluated: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * Maps hour integer (0-23) to 12-hour formatted label (e.g. "9 PM" or "10 AM").
 */
export function formatHourLabel(hour: number): string {
  const normalized = Math.max(0, Math.min(23, Math.floor(hour)));
  if (normalized === 0) return '12 AM';
  if (normalized === 12) return '12 PM';
  return normalized < 12 ? `${normalized} AM` : `${normalized - 12} PM`;
}

/**
 * Calculates cell intensity (0 to 4) based on minutes and user daily goal.
 */
export function calculateCellIntensity(minutes: number, targetMinutes: number = 30): number {
  if (minutes <= 0) return 0;
  const goal = Math.max(10, targetMinutes);
  if (minutes < Math.round(goal * 0.35)) return 1;
  if (minutes < Math.round(goal * 0.75)) return 2;
  if (minutes < goal) return 3;
  return 4;
}

/**
 * Aggregates raw sessions by dateKey (YYYY-MM-DD).
 */
export function groupSessionsByDate(sessions: ReadingSession[]): Map<string, { minutes: number; pages: number; sessionCount: number }> {
  const map = new Map<string, { minutes: number; pages: number; sessionCount: number }>();

  for (const session of sessions) {
    if (!session.date) continue;
    const durationMin = Math.max(0, session.duration / 60);
    const existing = map.get(session.date);

    if (existing) {
      existing.minutes += durationMin;
      existing.pages += session.pagesRead || 0;
      existing.sessionCount += 1;
    } else {
      map.set(session.date, {
        minutes: durationMin,
        pages: session.pagesRead || 0,
        sessionCount: 1,
      });
    }
  }

  return map;
}

/**
 * Generates calendar grid columns (weeks) and rows (Monday through Sunday).
 */
export function generateActivityGrid(
  sessions: ReadingSession[],
  weeksCount: number = 14,
  dailyTargetMinutes: number = 30,
  referenceDate: Date = new Date(),
): HeatmapGridData {
  const sessionMap = groupSessionsByDate(sessions);
  const now = new Date(referenceDate);
  const todayKey = toLocalDateKey(now);

  // Normalize end day to the Sunday of the reference week
  const end = new Date(now);
  const currentDayOfWeek = (end.getDay() + 6) % 7; // 0 = Monday, 6 = Sunday
  end.setDate(end.getDate() + (6 - currentDayOfWeek));
  end.setHours(23, 59, 59, 999);

  // Compute start day (Monday, weeksCount - 1 weeks prior)
  const start = new Date(end);
  start.setDate(start.getDate() - (weeksCount * 7 - 1));
  start.setHours(0, 0, 0, 0);

  const cells: ActivityDayCell[][] = [];
  const monthLabels: MonthHeaderLabel[] = [];
  let lastMonth = -1;
  let maxMinutes = 0;
  let totalActiveDays = 0;
  let totalMinutes = 0;
  let totalSessions = 0;

  for (let w = 0; w < weeksCount; w++) {
    const weekColumn: ActivityDayCell[] = [];

    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(start);
      cellDate.setDate(cellDate.getDate() + (w * 7 + d));

      const dateKey = toLocalDateKey(cellDate);
      const isFuture = cellDate.getTime() > now.getTime() && dateKey !== todayKey;
      const isToday = dateKey === todayKey;

      const dayData = sessionMap.get(dateKey);
      const minutes = dayData ? Math.round(dayData.minutes) : 0;
      const pages = dayData ? dayData.pages : 0;
      const daySessions = dayData ? dayData.sessionCount : 0;

      if (minutes > 0) {
        totalActiveDays++;
        totalMinutes += minutes;
        totalSessions += daySessions;
        if (minutes > maxMinutes) {
          maxMinutes = minutes;
        }
      }

      // Check month boundary on first day of week (Monday)
      if (d === 0) {
        const month = cellDate.getMonth();
        if (month !== lastMonth) {
          monthLabels.push({
            label: MONTH_NAMES[month]!,
            weekIndex: w,
          });
          lastMonth = month;
        }
      }

      const formattedDate = cellDate.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        weekday: 'short',
        year: 'numeric',
      });

      weekColumn.push({
        date: cellDate,
        dateKey,
        dayOfWeek: d,
        formattedDate,
        intensity: isFuture ? 0 : calculateCellIntensity(minutes, dailyTargetMinutes),
        isFuture,
        isToday,
        minutes,
        pages,
        sessionCount: daySessions,
      });
    }

    cells.push(weekColumn);
  }

  return {
    cells,
    endDate: end,
    maxMinutes,
    monthLabels,
    startDate: start,
    totalActiveDays,
    totalMinutes,
    totalSessions,
    weeksCount,
  };
}

/**
 * Computes circadian distribution of reading time across morning, afternoon, evening, and night.
 */
export function calculateCircadianDistribution(sessions: ReadingSession[]): CircadianReadingDistribution {
  let morningMinutes = 0;
  let afternoonMinutes = 0;
  let eveningMinutes = 0;
  let nightMinutes = 0;

  for (const session of sessions) {
    const durationMin = Math.max(0, session.duration / 60);

    let hour = typeof session.localStartHour === 'number' ? session.localStartHour : NaN;
    if (Number.isNaN(hour) && session.startedAt) {
      hour = new Date(session.startedAt).getHours();
    }
    if (Number.isNaN(hour)) {
      hour = 20; // Default evening baseline if unspecified
    }

    if (hour >= 6 && hour < 12) {
      morningMinutes += durationMin;
    } else if (hour >= 12 && hour < 18) {
      afternoonMinutes += durationMin;
    } else if (hour >= 18 && hour < 22) {
      eveningMinutes += durationMin;
    } else {
      nightMinutes += durationMin;
    }
  }

  const total = morningMinutes + afternoonMinutes + eveningMinutes + nightMinutes;

  const toPercent = (mins: number) => (total > 0 ? Math.round((mins / total) * 100) : 0);

  const morningPercent = toPercent(morningMinutes);
  const afternoonPercent = toPercent(afternoonMinutes);
  const eveningPercent = toPercent(eveningMinutes);
  const nightPercent = toPercent(nightMinutes);

  let peakPeriod: CircadianReadingDistribution['peakPeriod'] = 'evening';
  let maxVal = eveningMinutes;

  if (morningMinutes > maxVal) {
    peakPeriod = 'morning';
    maxVal = morningMinutes;
  }
  if (afternoonMinutes > maxVal) {
    peakPeriod = 'afternoon';
    maxVal = afternoonMinutes;
  }
  if (nightMinutes > maxVal) {
    peakPeriod = 'night';
  }

  return {
    afternoonMinutes: Math.round(afternoonMinutes),
    afternoonPercent,
    eveningMinutes: Math.round(eveningMinutes),
    eveningPercent,
    morningMinutes: Math.round(morningMinutes),
    morningPercent,
    nightMinutes: Math.round(nightMinutes),
    nightPercent,
    peakPeriod,
  };
}

/**
 * Computes overall reading velocity metrics: cadence, averages, and peak hours.
 */
export function calculateReadingVelocity(
  sessions: ReadingSession[],
): ReadingVelocityMetrics {
  const hourlyMinutes = new Array(24).fill(0);
  const dayOfWeekMinutes = new Array(7).fill(0);
  let longestSessionMinutes = 0;
  let totalMinutes = 0;

  const activeDates = new Set<string>();

  for (const session of sessions) {
    const durationMin = Math.max(0, session.duration / 60);
    totalMinutes += durationMin;

    if (durationMin > longestSessionMinutes) {
      longestSessionMinutes = durationMin;
    }

    if (session.date) {
      activeDates.add(session.date);
    }

    let hour = typeof session.localStartHour === 'number' ? session.localStartHour : NaN;
    if (Number.isNaN(hour) && session.startedAt) {
      hour = new Date(session.startedAt).getHours();
    }
    if (!Number.isNaN(hour)) {
      const h = Math.max(0, Math.min(23, Math.floor(hour)));
      hourlyMinutes[h] += durationMin;
    }

    if (session.date) {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(session.date);
      if (match) {
        const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        const dayIdx = (d.getDay() + 6) % 7;
        dayOfWeekMinutes[dayIdx] += durationMin;
      }
    }
  }

  // Find peak hour
  let peakHour = 20;
  let peakHourMinutes = 0;
  for (let h = 0; h < 24; h++) {
    if (hourlyMinutes[h] > peakHourMinutes) {
      peakHourMinutes = hourlyMinutes[h];
      peakHour = h;
    }
  }

  // Find best day of week
  let bestDayIdx = 6; // Sunday default
  let bestDayMinutes = 0;
  for (let d = 0; d < 7; d++) {
    if (dayOfWeekMinutes[d] > bestDayMinutes) {
      bestDayMinutes = dayOfWeekMinutes[d];
      bestDayIdx = d;
    }
  }

  const sessionCount = sessions.length;
  const activeDayCount = activeDates.size;

  const averageMinutesPerSession = sessionCount > 0 ? Math.round(totalMinutes / sessionCount) : 0;
  const averageMinutesPerActiveDay = activeDayCount > 0 ? Math.round(totalMinutes / activeDayCount) : 0;

  return {
    averageMinutesPerActiveDay,
    averageMinutesPerSession,
    bestDayOfWeek: DAY_NAMES[bestDayIdx]!,
    longestSessionMinutes: Math.round(longestSessionMinutes),
    peakReadingHour: peakHour,
    peakReadingHourLabel: formatHourLabel(peakHour),
    totalDaysEvaluated: activeDayCount,
  };
}
