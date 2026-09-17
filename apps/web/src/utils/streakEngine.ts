/**
 * Daily reading streak tracking and habit statistics.
 */

/**
 * Formats a Date instance to a local YYYY-MM-DD string.
 */
export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export type StreakFlameTier =
  | 'amethyst_phoenix'
  | 'bronze_spark'
  | 'diamond_eternal'
  | 'gold_inferno'
  | 'none'
  | 'silver_blaze';

export type StreakStatus =
  | 'active_today'
  | 'broken'
  | 'pending_today'
  | 'protected_by_shield'
  | 'repaired';

export interface NextMilestoneInfo {
  daysRemaining: number;
  daysRequired: number;
  tier: StreakFlameTier;
  tierLabel: string;
}

export interface SmartStreakAnalytics {
  currentStreak: number;
  flame: StreakFlameInfo;
  longestStreak: number;
  repairChallenge: StreakRepairChallenge | null;
  shields: StreakShieldState;
  status: StreakStatus;
  statusMessage: string;
}

export interface SmartStreakOptions {
  availableShields?: number;
  dailyGoalMinutes?: number;
  earnedShieldCount?: number;
  now?: Date;
  repairChallenge?: null | StreakRepairChallenge;
  usedShieldDates?: string[];
}

export interface StreakFlameInfo {
  color: string;
  icon: string;
  label: string;
  nextMilestone: NextMilestoneInfo | null;
  tier: StreakFlameTier;
}

export interface StreakRepairChallenge {
  completed: boolean;
  expiresAt: string;
  lapsedDate: string;
  progressMinutes: number;
  targetMinutes: number;
}

export interface StreakShieldState {
  availableShields: number;
  earnedShieldCount: number;
  lastShieldUsedDate?: string;
  usedShieldDates: string[];
}

export const MAX_SHIELD_CAPACITY = 2;
export const DAYS_PER_EARNED_SHIELD = 7;


/**
 * Parses YYYY-MM-DD into a local epoch day number.
 */
function parseDateKeyToEpochDay(key: string): number | null {
  const parts = key.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return null;
  }
  const [year, month, day] = parts as [number, number, number];
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

/**
 * Returns YYYY-MM-DD for a date offset by deltaDays from reference.
 */
function getDateKeyOffset(refDate: Date, deltaDays: number): string {
  const target = new Date(refDate);
  target.setDate(target.getDate() + deltaDays);
  return toLocalDateKey(target);
}

/**
 * Evaluates the flame tier, icon, color, and next milestone for a streak day count.
 */
export function evaluateFlameTier(streakDays: number): StreakFlameInfo {
  if (streakDays >= 100) {
    return {
      color: '#06b6d4', // Cyan
      icon: '💎',
      label: 'Diamond Eternal',
      nextMilestone: null,
      tier: 'diamond_eternal',
    };
  }
  if (streakDays >= 30) {
    return {
      color: '#a855f7', // Purple
      icon: '🔮',
      label: 'Amethyst Phoenix',
      nextMilestone: {
        daysRemaining: 100 - streakDays,
        daysRequired: 100,
        tier: 'diamond_eternal',
        tierLabel: 'Diamond Eternal',
      },
      tier: 'amethyst_phoenix',
    };
  }
  if (streakDays >= 14) {
    return {
      color: '#eab308', // Amber gold
      icon: '🌟',
      label: 'Gold Inferno',
      nextMilestone: {
        daysRemaining: 30 - streakDays,
        daysRequired: 30,
        tier: 'amethyst_phoenix',
        tierLabel: 'Amethyst Phoenix',
      },
      tier: 'gold_inferno',
    };
  }
  if (streakDays >= 7) {
    return {
      color: '#38bdf8', // Sky blue
      icon: '⚡',
      label: 'Silver Blaze',
      nextMilestone: {
        daysRemaining: 14 - streakDays,
        daysRequired: 14,
        tier: 'gold_inferno',
        tierLabel: 'Gold Inferno',
      },
      tier: 'silver_blaze',
    };
  }
  if (streakDays >= 3) {
    return {
      color: '#f97316', // Orange
      icon: '🔥',
      label: 'Bronze Spark',
      nextMilestone: {
        daysRemaining: 7 - streakDays,
        daysRequired: 7,
        tier: 'silver_blaze',
        tierLabel: 'Silver Blaze',
      },
      tier: 'bronze_spark',
    };
  }
  return {
    color: '#9ca3af', // Gray
    icon: '🌱',
    label: 'Seedling',
    nextMilestone: {
      daysRemaining: 3 - streakDays,
      daysRequired: 3,
      tier: 'bronze_spark',
      tierLabel: 'Bronze Spark',
    },
    tier: 'none',
  };
}

/**
 * Creates a 24-hour streak repair challenge to recover a lapsed streak.
 */
export function createStreakRepairChallenge(
  lapsedDate: string,
  dailyGoalMinutes: number,
  now = new Date()
): StreakRepairChallenge {
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return {
    completed: false,
    expiresAt: expires.toISOString(),
    lapsedDate,
    progressMinutes: 0,
    targetMinutes: Math.max(30, dailyGoalMinutes * 2),
  };
}

/**
 * Updates reading progress towards an active repair challenge.
 */
export function evaluateRepairChallengeProgress(
  challenge: StreakRepairChallenge,
  readingMinutesToday: number,
  now = new Date()
): StreakRepairChallenge {
  const isExpired = new Date(challenge.expiresAt).getTime() <= now.getTime();
  if (isExpired && !challenge.completed) {
    return {
      ...challenge,
      completed: false,
    };
  }

  const newProgress = Math.max(challenge.progressMinutes, readingMinutesToday);
  const completed = newProgress >= challenge.targetMinutes;

  return {
    ...challenge,
    completed,
    progressMinutes: newProgress,
  };
}

/**
 * Computes smart reading streaks with automated grace shield protection,
 * morning premature reset prevention, and repair challenge evaluation.
 */
export function calculateSmartStreak(
  sessionDates: Set<string>,
  options: SmartStreakOptions = {}
): SmartStreakAnalytics {
  const now = options.now ?? new Date();
  const todayKey = toLocalDateKey(now);
  const yesterdayKey = getDateKeyOffset(now, -1);
  const dayBeforeYesterdayKey = getDateKeyOffset(now, -2);

  const initialUsedShields = [...(options.usedShieldDates ?? [])];
  let availableShields = options.availableShields ?? 1; // Default new users with 1 welcome shield
  let earnedShieldCount = options.earnedShieldCount ?? 1;
  const usedShieldSet = new Set(initialUsedShields);

  // 1. Calculate historical longest streak across all recorded session dates + used shields
  const combinedHistoricalDates = new Set<string>([...sessionDates, ...usedShieldSet]);
  const sortedDatesAsc = Array.from(combinedHistoricalDates)
    .map((k) => ({ epochDay: parseDateKeyToEpochDay(k), key: k }))
    .filter((item): item is { epochDay: number; key: string } => item.epochDay !== null)
    .sort((a, b) => a.epochDay - b.epochDay);

  let longestStreak = 0;
  let runningCount = 0;

  for (let i = 0; i < sortedDatesAsc.length; i++) {
    if (i === 0) {
      runningCount = 1;
    } else {
      const diff = sortedDatesAsc[i]!.epochDay - sortedDatesAsc[i - 1]!.epochDay;
      runningCount = diff === 1 ? runningCount + 1 : 1;
    }
    longestStreak = Math.max(longestStreak, runningCount);
  }

  // 2. Determine current streak backwards from today
  const hasReadToday = sessionDates.has(todayKey);
  const hasReadYesterday = sessionDates.has(yesterdayKey);
  const hasUsedShieldYesterday = usedShieldSet.has(yesterdayKey);
  const hasReadDayBefore = sessionDates.has(dayBeforeYesterdayKey);

  let status: StreakStatus = 'broken';
  let activeChallenge = options.repairChallenge ?? null;
  let statusMessage = '';

  // Check if yesterday was missed but can be protected by a Grace Shield
  let yesterdayCovered = hasReadYesterday || hasUsedShieldYesterday;

  if (!yesterdayCovered && hasReadDayBefore && availableShields > 0) {
    // Grace Shield automatically deploys to protect the streak!
    availableShields -= 1;
    usedShieldSet.add(yesterdayKey);
    yesterdayCovered = true;
  }

  // Probe consecutive reading days backwards starting from yesterday or today
  let currentStreak = 0;
  const probeDate = new Date(now);

  if (hasReadToday) {
    currentStreak++;
    probeDate.setDate(probeDate.getDate() - 1);
  } else {
    // Not read today yet: start probing from yesterday
    probeDate.setDate(probeDate.getDate() - 1);
  }

  while (true) {
    const probeKey = toLocalDateKey(probeDate);
    if (sessionDates.has(probeKey) || usedShieldSet.has(probeKey)) {
      currentStreak++;
      probeDate.setDate(probeDate.getDate() - 1);
    } else {
      break;
    }
  }

  // If today hasn't been read and yesterday was not covered, streak is broken
  if (!hasReadToday && !yesterdayCovered) {
    currentStreak = 0;
  }

  // Handle active repair challenge restoration
  if (activeChallenge && !activeChallenge.completed) {
    const isExpired = new Date(activeChallenge.expiresAt).getTime() <= now.getTime();
    if (isExpired) {
      activeChallenge = null;
    }
  }

  if (activeChallenge && activeChallenge.completed) {
    status = 'repaired';
    statusMessage = 'Streak Restored! Reading challenge completed.';
    // Increase current streak by 1 if repaired and today read
    if (currentStreak === 0 && hasReadToday) {
      currentStreak = 1;
    }
  } else if (hasReadToday) {
    status = 'active_today';
    statusMessage = `Streak active: ${currentStreak} ${currentStreak === 1 ? 'day' : 'days'}! Great reading today.`;
  } else if (usedShieldSet.has(yesterdayKey) && !hasReadYesterday) {
    status = 'protected_by_shield';
    statusMessage = `Shield protected your ${currentStreak}-day streak yesterday! Read today to keep it active.`;
  } else if (hasReadYesterday) {
    status = 'pending_today';
    statusMessage = `Read today to extend your ${currentStreak}-day streak!`;
  } else {
    status = 'broken';
    statusMessage = 'Start a new reading streak today!';
  }

  // 3. Evaluate Grace Shield Earning from total unique reading days
  // 1 shield earned per 7 days of consistency, capped at MAX_SHIELD_CAPACITY
  const earnedFromDays = Math.floor(sessionDates.size / DAYS_PER_EARNED_SHIELD);
  if (earnedFromDays > earnedShieldCount) {
    const newlyEarned = earnedFromDays - earnedShieldCount;
    availableShields = Math.min(MAX_SHIELD_CAPACITY, availableShields + newlyEarned);
    earnedShieldCount = earnedFromDays;
  }

  const updatedUsedShieldList = Array.from(usedShieldSet).sort();
  const lastShieldUsedDate = updatedUsedShieldList.length > 0
    ? updatedUsedShieldList[updatedUsedShieldList.length - 1]
    : undefined;

  longestStreak = Math.max(longestStreak, currentStreak);
  const flame = evaluateFlameTier(currentStreak);

  return {
    currentStreak,
    flame,
    longestStreak,
    repairChallenge: activeChallenge,
    shields: {
      availableShields: Math.max(0, Math.min(MAX_SHIELD_CAPACITY, availableShields)),
      earnedShieldCount,
      lastShieldUsedDate,
      usedShieldDates: updatedUsedShieldList,
    },
    status,
    statusMessage,
  };
}

export const STREAK_SHIELDS_STORAGE_KEY = 'sanctuary_streak_shields_v1';
export const STREAK_CHALLENGE_STORAGE_KEY = 'sanctuary_streak_challenge_v1';

export function loadStreakShieldState(): StreakShieldState {
  if (typeof localStorage === 'undefined') {
    return { availableShields: 1, earnedShieldCount: 1, usedShieldDates: [] };
  }
  try {
    const raw = localStorage.getItem(STREAK_SHIELDS_STORAGE_KEY);
    if (!raw) {
      return { availableShields: 1, earnedShieldCount: 1, usedShieldDates: [] };
    }
    const parsed = JSON.parse(raw);
    return {
      availableShields: typeof parsed.availableShields === 'number' ? parsed.availableShields : 1,
      earnedShieldCount: typeof parsed.earnedShieldCount === 'number' ? parsed.earnedShieldCount : 1,
      lastShieldUsedDate: parsed.lastShieldUsedDate,
      usedShieldDates: Array.isArray(parsed.usedShieldDates) ? parsed.usedShieldDates : [],
    };
  } catch {
    return { availableShields: 1, earnedShieldCount: 1, usedShieldDates: [] };
  }
}

export function saveStreakShieldState(state: StreakShieldState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STREAK_SHIELDS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage write failures (e.g. quota exceeded)
  }
}

export function loadStreakRepairChallenge(): null | StreakRepairChallenge {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STREAK_CHALLENGE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.expiresAt !== 'string') return null;
    return parsed as StreakRepairChallenge;
  } catch {
    return null;
  }
}

export function saveStreakRepairChallenge(challenge: null | StreakRepairChallenge): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (challenge === null) {
      localStorage.removeItem(STREAK_CHALLENGE_STORAGE_KEY);
    } else {
      localStorage.setItem(STREAK_CHALLENGE_STORAGE_KEY, JSON.stringify(challenge));
    }
  } catch {
    // Ignore storage write failures
  }
}

