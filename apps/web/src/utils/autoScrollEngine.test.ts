import { describe, expect, it } from "bun:test";

import {
  AUTO_SCROLL_PRESETS,
  calculatePacerGuidelineY,
  calculateVelocityFromWpm,
  clampVelocity,
  computeDeltaScroll,
  DEFAULT_AUTO_SCROLL_VELOCITY,
  MAX_AUTO_SCROLL_VELOCITY,
  MIN_AUTO_SCROLL_VELOCITY,
  shouldResumeAfterInteraction,
  stepVelocity,
} from "./autoScrollEngine";

describe("autoScrollEngine — Hands-Free Continuous Auto-Scroll & Calibrated Pacing", () => {
  describe("clampVelocity", () => {
    it("clamps values below minimum and above maximum", () => {
      expect(clampVelocity(0)).toBe(MIN_AUTO_SCROLL_VELOCITY);
      expect(clampVelocity(-50)).toBe(MIN_AUTO_SCROLL_VELOCITY);
      expect(clampVelocity(500)).toBe(MAX_AUTO_SCROLL_VELOCITY);
    });

    it("falls back to default velocity for NaN or invalid input", () => {
      expect(clampVelocity(NaN)).toBe(DEFAULT_AUTO_SCROLL_VELOCITY);
      expect(clampVelocity(undefined as unknown as number)).toBe(
        DEFAULT_AUTO_SCROLL_VELOCITY
      );
    });

    it("rounds valid velocities to integers", () => {
      expect(clampVelocity(42.7)).toBe(43);
      expect(clampVelocity(36.1)).toBe(36);
    });
  });

  describe("stepVelocity", () => {
    it("increments and decrements velocity by step size", () => {
      expect(stepVelocity(30, "up", 5)).toBe(35);
      expect(stepVelocity(30, "down", 5)).toBe(25);
      expect(stepVelocity(30, "up", 10)).toBe(40);
    });

    it("respects boundary clamping when stepping", () => {
      expect(stepVelocity(MAX_AUTO_SCROLL_VELOCITY, "up", 10)).toBe(
        MAX_AUTO_SCROLL_VELOCITY
      );
      expect(stepVelocity(MIN_AUTO_SCROLL_VELOCITY, "down", 10)).toBe(
        MIN_AUTO_SCROLL_VELOCITY
      );
    });
  });

  describe("calculateVelocityFromWpm", () => {
    it("calculates calibrated velocity from reading speed", () => {
      const v250 = calculateVelocityFromWpm(250, 28, 10);
      const v400 = calculateVelocityFromWpm(400, 28, 10);

      expect(v250).toBeGreaterThanOrEqual(10);
      expect(v400).toBeGreaterThan(v250);
    });

    it("handles zero or negative WPM safely", () => {
      expect(calculateVelocityFromWpm(0)).toBeGreaterThanOrEqual(
        MIN_AUTO_SCROLL_VELOCITY
      );
    });
  });

  describe("computeDeltaScroll", () => {
    it("returns zero delta for zero or negative delta time", () => {
      const result = computeDeltaScroll(0, 50, 0.5);
      expect(result.deltaInt).toBe(0);
      expect(result.remainder).toBe(0.5);
    });

    it("accumulates sub-pixel remainder across frames accurately", () => {
      // At 20ms and 25 px/sec: each frame raw delta = 0.5 px
      const frame1 = computeDeltaScroll(20, 25, 0);
      expect(frame1.deltaInt).toBe(0);
      expect(frame1.remainder).toBeCloseTo(0.5, 2);

      // Next frame with previous remainder
      const frame2 = computeDeltaScroll(20, 25, frame1.remainder);
      expect(frame2.deltaInt).toBe(1);
      expect(frame2.remainder).toBeCloseTo(0.0, 2);
    });

    it("caps delta time during background tab stalls to prevent leaps", () => {
      // 5000 ms tab background stall capped to 100ms
      const result = computeDeltaScroll(5000, 50, 0);
      // 50 px/s * 0.1s = 5px (not 250px)
      expect(result.deltaInt).toBe(5);
    });
  });

  describe("shouldResumeAfterInteraction", () => {
    it("returns true if no prior interaction recorded", () => {
      expect(shouldResumeAfterInteraction(0, 5000)).toBe(true);
    });

    it("returns false if resume delay has not elapsed", () => {
      const last = 1000;
      const current = 2000; // 1000ms elapsed < 2500ms delay
      expect(shouldResumeAfterInteraction(last, current, 2500)).toBe(false);
    });

    it("returns true once delay has elapsed", () => {
      const last = 1000;
      const current = 3600; // 2600ms elapsed >= 2500ms delay
      expect(shouldResumeAfterInteraction(last, current, 2500)).toBe(true);
    });
  });

  describe("calculatePacerGuidelineY", () => {
    it("computes pacer position based on viewport fraction", () => {
      const y = calculatePacerGuidelineY(1000, 0.4);
      expect(y).toBe(400);
    });

    it("clamps fraction between safe limits", () => {
      const yMin = calculatePacerGuidelineY(1000, 0.01);
      expect(yMin).toBe(100); // clamped to 0.1

      const yMax = calculatePacerGuidelineY(1000, 0.99);
      expect(yMax).toBe(900); // clamped to 0.9
    });
  });

  describe("AUTO_SCROLL_PRESETS", () => {
    it("contains expected presets in increasing velocity order", () => {
      expect(AUTO_SCROLL_PRESETS.length).toBe(5);
      for (let i = 0; i < AUTO_SCROLL_PRESETS.length - 1; i++) {
        expect(AUTO_SCROLL_PRESETS[i].velocityPxPerSec).toBeLessThan(
          AUTO_SCROLL_PRESETS[i + 1].velocityPxPerSec
        );
      }
    });
  });
});
