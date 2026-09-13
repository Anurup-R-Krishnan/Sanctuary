/**
 * Focus Sprint Engine & Web Audio Harmonic Chime Synthesizer
 *
 * Manages timed reading focus sprints and synthesizes peaceful, asset-free
 * harmonic singing-bowl chimes via the Web Audio API upon sprint completion.
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

/**
 * Synthesizes a peaceful Tibetan singing bowl harmonic chime using Web Audio API.
 * Completely asset-free with zero downloaded audio files.
 */
export async function playSingingBowlChime(
  customContext?: AudioContext | null
): Promise<boolean> {
  try {
    let ctx = customContext;
    if (!ctx) {
      const AudioContextClass =
        (typeof window !== "undefined" && window.AudioContext) ||
        (typeof window !== "undefined" &&
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext);
      if (!AudioContextClass) return false;
      ctx = new AudioContextClass();
    }

    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const now = ctx.currentTime;
    const duration = 3.5; // seconds

    // Master gain envelope
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.35, now + 0.04);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    masterGain.connect(ctx.destination);

    // Harmonic frequencies modeling a singing bowl: fundamental (528 Hz), minor third (630 Hz), octave + fifth (1460 Hz)
    const harmonics = [
      { detune: 0, freq: 528, gain: 0.6 },
      { detune: 4, freq: 630, gain: 0.25 },
      { detune: -6, freq: 1460, gain: 0.15 },
    ];

    for (const h of harmonics) {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(h.freq, now);
      osc.detune.setValueAtTime(h.detune, now);

      oscGain.gain.setValueAtTime(h.gain, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.9);

      osc.connect(oscGain);
      oscGain.connect(masterGain);

      osc.start(now);
      osc.stop(now + duration);
    }

    return true;
  } catch {
    return false;
  }
}
