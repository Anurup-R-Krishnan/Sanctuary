/**
 * Interactive Reading Goals & Time-Budgeted Session Timer Engine
 *
 * Provides session elapsed mathematics, cumulative daily goal tracking,
 * idle timeout detection, SVG circular progress calculations, and harmonic Web Audio chimes.
 */

export interface ProgressRingGeometry {
  circumference: number;
  dashoffset: number;
  radius: number;
  strokeWidth: number;
}

export interface SessionProgress {
  dailyGoalMinutes: number;
  dailyPercent: number;
  elapsedSeconds: number;
  isDailyGoalMet: boolean;
  isSessionGoalMet: boolean;
  remainingSeconds: number;
  sessionBudgetMinutes: number;
  sessionPercent: number;
  todayMinutesTotal: number;
}

/**
 * Calculates real-time progress for the active reading session and the cumulative daily goal.
 */
export function calculateSessionProgress(
  elapsedSeconds: number,
  sessionBudgetMinutes: number,
  todayPriorMinutes: number,
  dailyGoalMinutes: number
): SessionProgress {
  const safeElapsed = Math.max(0, Math.floor(elapsedSeconds));
  const safeBudget = Math.max(0, sessionBudgetMinutes);
  const safePrior = Math.max(0, todayPriorMinutes);
  const safeDailyGoal = Math.max(1, dailyGoalMinutes);

  const budgetSeconds = safeBudget * 60;
  const remainingSeconds = safeBudget > 0 ? Math.max(0, budgetSeconds - safeElapsed) : 0;
  const sessionPercent =
    safeBudget > 0 ? Math.min(100, Math.round((safeElapsed / budgetSeconds) * 100)) : 100;
  const isSessionGoalMet = safeBudget > 0 && safeElapsed >= budgetSeconds;

  const todayMinutesTotal = Math.round((safePrior + safeElapsed / 60) * 10) / 10;
  const dailyPercent = Math.min(100, Math.round((todayMinutesTotal / safeDailyGoal) * 100));
  const isDailyGoalMet = todayMinutesTotal >= safeDailyGoal;

  return {
    dailyGoalMinutes: safeDailyGoal,
    dailyPercent,
    elapsedSeconds: safeElapsed,
    isDailyGoalMet,
    isSessionGoalMet,
    remainingSeconds,
    sessionBudgetMinutes: safeBudget,
    sessionPercent,
    todayMinutesTotal,
  };
}

/**
 * Formats a duration in seconds into human-readable compact text (e.g. "14m", "1h 20m", "45s").
 */
export function formatDurationCompact(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${secs}s`;
}

/**
 * Formats a duration in seconds into standard clock format mm:ss or hh:mm:ss.
 */
export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(secs)}`;
  }
  return `${minutes}:${pad(secs)}`;
}

/**
 * Computes SVG circular progress ring geometry for stroke-dasharray and stroke-dashoffset.
 */
export function calculateProgressRing(
  percent: number,
  radius = 10,
  strokeWidth = 2
): ProgressRingGeometry {
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference - (clampedPercent / 100) * circumference;

  return {
    circumference: Math.round(circumference * 100) / 100,
    dashoffset: Math.round(dashoffset * 100) / 100,
    radius,
    strokeWidth,
  };
}

/**
 * Detects whether a reader has been inactive longer than the idle threshold (default 120 seconds).
 */
export function isUserInactive(
  lastActivityTimestamp: number,
  now = Date.now(),
  thresholdMs = 120000
): boolean {
  return now - lastActivityTimestamp > thresholdMs;
}

/**
 * Synthesizes a gentle harmonic Web Audio celebration chime (528 Hz & 660 Hz solfeggio tone)
 * when a reading session or daily goal is successfully achieved.
 */
export async function playSessionCompletionChime(customAudioCtx?: AudioContext): Promise<boolean> {
  try {
    const AudioCtxClass =
      typeof window !== "undefined"
        ? window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        : null;

    const ctx = customAudioCtx || (AudioCtxClass ? new AudioCtxClass() : null);
    if (!ctx) return false;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const now = ctx.currentTime;
    const duration = 1.6;

    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.18, now + 0.05);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    // Fundamental tone: 528 Hz (relaxation harmonic)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(528, now);
    osc1.connect(masterGain);
    osc1.start(now);
    osc1.stop(now + duration);

    // Overtone: 660 Hz (perfect fifth harmonic)
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(660, now);
    osc2.connect(masterGain);
    osc2.start(now);
    osc2.stop(now + duration);

    return true;
  } catch {
    return false;
  }
}
