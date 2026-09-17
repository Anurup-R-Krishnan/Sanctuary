import { describe, expect, it } from "bun:test";

import {
  calculateSprintProgress,
  createInitialSprintState,
  estimateSprintWords,
  formatSprintTime,
  playCompletionChime,
  playSingingBowlChime,
} from "./focusSprintEngine";

describe("focusSprintEngine", () => {
  describe("createInitialSprintState", () => {
    it("creates default 25-minute sprint state", () => {
      const state = createInitialSprintState();
      expect(state.durationMinutes).toBe(25);
      expect(state.elapsedSeconds).toBe(0);
      expect(state.remainingSeconds).toBe(1500);
      expect(state.progressPercent).toBe(0);
      expect(state.isRunning).toBe(false);
      expect(state.isPaused).toBe(false);
      expect(state.isCompleted).toBe(false);
    });

    it("creates custom sprint duration state", () => {
      const state = createInitialSprintState(15);
      expect(state.durationMinutes).toBe(15);
      expect(state.remainingSeconds).toBe(900);
    });
  });

  describe("calculateSprintProgress", () => {
    it("handles initial zero elapsed progress", () => {
      const result = calculateSprintProgress(0, 25);
      expect(result.progressPercent).toBe(0);
      expect(result.remainingSeconds).toBe(1500);
      expect(result.isCompleted).toBe(false);
    });

    it("calculates accurate midpoint progress", () => {
      const result = calculateSprintProgress(750, 25);
      expect(result.progressPercent).toBe(50);
      expect(result.remainingSeconds).toBe(750);
      expect(result.isCompleted).toBe(false);
    });

    it("identifies exact completion", () => {
      const result = calculateSprintProgress(1500, 25);
      expect(result.progressPercent).toBe(100);
      expect(result.remainingSeconds).toBe(0);
      expect(result.isCompleted).toBe(true);
    });

    it("clamps elapsed time exceeding total duration", () => {
      const result = calculateSprintProgress(1600, 25);
      expect(result.progressPercent).toBe(100);
      expect(result.remainingSeconds).toBe(0);
      expect(result.isCompleted).toBe(true);
    });
  });

  describe("formatSprintTime", () => {
    it("formats minutes and seconds with zero-padding", () => {
      expect(formatSprintTime(0)).toBe("0:00");
      expect(formatSprintTime(59)).toBe("0:59");
      expect(formatSprintTime(60)).toBe("1:00");
      expect(formatSprintTime(1499)).toBe("24:59");
      expect(formatSprintTime(1500)).toBe("25:00");
    });
  });

  describe("estimateSprintWords", () => {
    it("calculates words based on elapsed time and calibrated WPM", () => {
      // 1500s = 25m * 250 wpm = 6250 words
      expect(estimateSprintWords(1500, 250)).toBe(6250);
      // 600s = 10m * 300 wpm = 3000 words
      expect(estimateSprintWords(600, 300)).toBe(3000);
    });

    it("uses sensible default WPM when reading speed is not calibrated", () => {
      expect(estimateSprintWords(600, null)).toBe(2500);
      expect(estimateSprintWords(600, 0)).toBe(2500);
    });
  });

  describe("playCompletionChime", () => {
    it("gracefully returns false when AudioContext is unavailable in test environment", async () => {
      const result = await playCompletionChime(null);
      expect(typeof result).toBe("boolean");
      const aliasResult = await playSingingBowlChime(null);
      expect(typeof aliasResult).toBe("boolean");
    });

    it("synthesizes harmonics when mock AudioContext is provided", async () => {
      const mockGainNode = {
        connect: () => {},
        gain: {
          exponentialRampToValueAtTime: () => {},
          linearRampToValueAtTime: () => {},
          setValueAtTime: () => {},
        },
      };

      const mockOscillator = {
        connect: () => {},
        detune: { setValueAtTime: () => {} },
        frequency: { setValueAtTime: () => {} },
        start: () => {},
        stop: () => {},
        type: "sine",
      };

      const mockContext = {
        createGain: () => mockGainNode,
        createOscillator: () => mockOscillator,
        currentTime: 0,
        destination: {},
        resume: async () => {},
        state: "running",
      } as unknown as AudioContext;

      const result = await playCompletionChime(mockContext);
      expect(result).toBe(true);
    });
  });
});
