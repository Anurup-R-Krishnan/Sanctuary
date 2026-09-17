/**
 * Auto-scroll velocity calculation and delta accumulator utilities.
 */

export interface AutoScrollPreset {
  id: "fast" | "normal" | "slow" | "swift" | "very-slow";
  label: string;
  velocityPxPerSec: number;
}

export interface DeltaScrollResult {
  deltaInt: number;
  remainder: number;
}

export const AUTO_SCROLL_PRESETS: AutoScrollPreset[] = [
  { id: "very-slow", label: "Very Slow", velocityPxPerSec: 12 },
  { id: "slow", label: "Slow", velocityPxPerSec: 22 },
  { id: "normal", label: "Normal", velocityPxPerSec: 36 },
  { id: "fast", label: "Fast", velocityPxPerSec: 55 },
  { id: "swift", label: "Swift", velocityPxPerSec: 85 },
];

export const MIN_AUTO_SCROLL_VELOCITY = 5;
export const MAX_AUTO_SCROLL_VELOCITY = 150;
export const DEFAULT_AUTO_SCROLL_VELOCITY = 36;
export const DEFAULT_AUTO_RESUME_DELAY_MS = 2500;

/**
 * Clamps auto-scroll velocity within bounds.
 */
export function clampVelocity(velocity: number): number {
  if (typeof velocity !== "number" || isNaN(velocity)) {
    return DEFAULT_AUTO_SCROLL_VELOCITY;
  }
  return Math.max(
    MIN_AUTO_SCROLL_VELOCITY,
    Math.min(MAX_AUTO_SCROLL_VELOCITY, Math.round(velocity))
  );
}

/**
 * Steps the velocity up or down by a discrete increment.
 */
export function stepVelocity(
  currentVelocity: number,
  direction: "down" | "up",
  step = 5
): number {
  const delta = direction === "up" ? step : -step;
  return clampVelocity(currentVelocity + delta);
}

/**
 * Calculates estimated scroll velocity in pixels/second calibrated to reader WPM.
 */
export function calculateVelocityFromWpm(
  wpm: number,
  lineHeightPx = 28,
  wordsPerLine = 10
): number {
  const safeWpm = Math.max(50, Math.min(1000, wpm || 250));
  const safeLineHeight = Math.max(16, Math.min(48, lineHeightPx));
  const safeWordsPerLine = Math.max(4, Math.min(20, wordsPerLine));

  const wordsPerSec = safeWpm / 60;
  const linesPerSec = wordsPerSec / safeWordsPerLine;
  const velocity = linesPerSec * safeLineHeight;

  return clampVelocity(velocity);
}

/**
 * Computes integer pixel scroll delta and retains sub-pixel remainder
 * to guarantee smooth motion across high-refresh-rate frames.
 */
export function computeDeltaScroll(
  deltaTimeMs: number,
  velocityPxPerSec: number,
  accumulatedRemainder = 0
): DeltaScrollResult {
  if (deltaTimeMs <= 0 || velocityPxPerSec <= 0) {
    return { deltaInt: 0, remainder: accumulatedRemainder };
  }

  // Cap delta time to prevent giant leap on tab backgrounding/resuming
  const cappedDeltaMs = Math.min(100, deltaTimeMs);
  const rawDelta = (velocityPxPerSec * cappedDeltaMs) / 1000 + accumulatedRemainder;

  const deltaInt = Math.floor(rawDelta);
  const remainder = rawDelta - deltaInt;

  return { deltaInt, remainder };
}

/**
 * Determines whether user interaction pause delay has expired.
 */
export function shouldResumeAfterInteraction(
  lastInteractionTimestamp: number,
  currentTimestamp: number,
  delayMs = DEFAULT_AUTO_RESUME_DELAY_MS
): boolean {
  if (!lastInteractionTimestamp || lastInteractionTimestamp <= 0) return true;
  return currentTimestamp - lastInteractionTimestamp >= delayMs;
}

/**
 * Computes visual pacer line position as percentage of viewport height (typically 30-45%).
 */
export function calculatePacerGuidelineY(
  viewportHeight: number,
  fraction = 0.38
): number {
  const safeHeight = Math.max(100, viewportHeight);
  const safeFraction = Math.max(0.1, Math.min(0.9, fraction));
  return Math.round(safeHeight * safeFraction);
}
