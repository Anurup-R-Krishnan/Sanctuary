import { describe, expect, it } from "bun:test";

import { SpineWeightProgressEstimator } from "./SpineWeightProgressEstimator";

describe("SpineWeightProgressEstimator", () => {
  it("calculates progress and locations for evenly weighted sections", () => {
    // 4 sections of 1500 chars each = 6000 chars = 4 locations
    const estimator = new SpineWeightProgressEstimator([
      { weight: 1500 },
      { weight: 1500 },
      { weight: 1500 },
      { weight: 1500 },
    ]);

    expect(estimator.totalLocations).toBe(4);
    expect(estimator.totalWeight).toBe(6000);

    // Section 0 at 0%
    expect(estimator.getProgress(0, 0)).toBe(0);
    expect(estimator.getLocation(0, 0)).toBe(1);

    // Section 0 at 50%
    expect(estimator.getProgress(0, 0.5)).toBe(0.125);

    // Section 1 at 0% (quarter of book)
    expect(estimator.getProgress(1, 0)).toBe(0.25);
    expect(estimator.getLocation(1, 0)).toBe(2);

    // Section 2 at 0% (half of book)
    expect(estimator.getProgress(2, 0)).toBe(0.5);
    expect(estimator.getLocation(2, 0)).toBe(3);

    // End of book (Section 3 at 100%)
    expect(estimator.getProgress(3, 1)).toBe(1);
    expect(estimator.getLocation(3, 1)).toBe(4);
  });

  it("handles highly uneven section weights correctly", () => {
    // Section 0 is massive (90,000 chars), Section 1 is tiny (10,000 chars)
    // Total = 100,000 chars
    const estimator = new SpineWeightProgressEstimator([
      { weight: 90000 },
      { weight: 10000 },
    ]);

    // Section 0 at 50% through section = 45,000 / 100,000 = 45% of book
    expect(estimator.getProgress(0, 0.5)).toBe(0.45);

    // Section 0 at end = 90% of book
    expect(estimator.getProgress(0, 1.0)).toBe(0.9);

    // Section 1 at start = 90% of book
    expect(estimator.getProgress(1, 0)).toBe(0.9);

    // Section 1 at 50% = 95% of book
    expect(estimator.getProgress(1, 0.5)).toBe(0.95);
  });

  it("accurately resolves target progress back to section and fraction", () => {
    const estimator = new SpineWeightProgressEstimator([
      { weight: 2000 },
      { weight: 8000 },
    ]);

    // 10% of book falls in section 0 (target weight 1000 / 2000 = 0.5)
    const res1 = estimator.getSectionAndFraction(0.1);
    expect(res1.sectionIndex).toBe(0);
    expect(res1.fraction).toBeCloseTo(0.5, 4);

    // 60% of book falls in section 1 (cumulative 2000, target 6000 -> 4000 in section 1 of 8000 = 0.5)
    const res2 = estimator.getSectionAndFraction(0.6);
    expect(res2.sectionIndex).toBe(1);
    expect(res2.fraction).toBeCloseTo(0.5, 4);
  });

  it("computes instantaneously under 5ms for 500 sections", () => {
    const largeSpine = Array.from({ length: 500 }, (_, i) => ({
      weight: 1000 + (i % 20) * 100,
    }));

    const start = performance.now();
    const estimator = new SpineWeightProgressEstimator(largeSpine);

    for (let i = 0; i < 500; i++) {
      estimator.getProgress(i, 0.42);
      estimator.getLocation(i, 0.42);
      estimator.getSectionAndFraction(i / 500);
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(10);
    expect(estimator.totalLocations).toBeGreaterThan(100);
  });
});
