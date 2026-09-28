/**
 * Focus sprint timer utilities.
 */

export const FOCUS_SPRINT_PRESETS = [15, 25, 45, 60] as const;
export type FocusSprintDuration = (typeof FOCUS_SPRINT_PRESETS)[number];

export interface FocusSprintState {
  durationMinutes: number;
  elapsedSeconds: number;
  isCompleted: boolean;
  isPaused: boolean;
  isRunning: boolean;
  progressPercent: number;
  remainingSeconds: number;
}

export function createInitialSprintState(
  durationMinutes: FocusSprintDuration = 25
): FocusSprintState {
  const totalSeconds = durationMinutes * 60;
  return {
    durationMinutes,
    elapsedSeconds: 0,
    isCompleted: false,
    isPaused: false,
    isRunning: false,
    progressPercent: 0,
    remainingSeconds: totalSeconds,
  };
}

/**
 * Calculates current sprint progress percentage and remaining seconds,
 * clamped between 0% and 100%.
 */
export function calculateSprintProgress(
  elapsedSeconds: number,
  durationMinutes: number
): {
  isCompleted: boolean;
  progressPercent: number;
  remainingSeconds: number;
} {
  const safeDurationSeconds = Math.max(60, durationMinutes * 60);
  const clampedElapsed = Math.max(
    0,
    Math.min(safeDurationSeconds, elapsedSeconds)
  );
  const remainingSeconds = safeDurationSeconds - clampedElapsed;
  const progressPercent = Math.min(
    100,
    Number(((clampedElapsed / safeDurationSeconds) * 100).toFixed(1))
  );
  const isCompleted = remainingSeconds <= 0;

  return {
    isCompleted,
    progressPercent,
    remainingSeconds,
  };
}

/**
 * Formats seconds into mm:ss time display.
 */
export function formatSprintTime(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Estimates words read during a focus sprint given elapsed time and calibrated WPM.
 */
export function estimateSprintWords(
  elapsedSeconds: number,
  wpm: number | null | undefined
): number {
  const safeWpm = wpm && wpm > 0 ? wpm : 250;
  const elapsedMinutes = elapsedSeconds / 60;
  return Math.round(elapsedMinutes * safeWpm);
}
