/**
 * Progress estimation contracts for instant, non-blocking reading metrics.
 */

import type { DocumentLocator } from "./locator";

export interface ProgressEstimate {
  /** Fractional progress between 0.0 and 1.0 */
  fraction: number;
  /** Virtual location index (1-based) */
  location: number;
  /** Whole-book progress percentage (0 - 100) */
  percentage: number;
  /** Total estimated locations in book */
  totalLocations: number;
}

export interface ProgressEstimator {
  /**
   * Fast, non-blocking calculation of overall progress from current section
   * and intra-section offset fraction (0.0 - 1.0).
   */
  estimateProgress(sectionIndex: number, sectionOffsetFraction: number): ProgressEstimate;

  /** Convert a target percentage (0 - 100) to a target locator */
  locatorFromPercentage(percentage: number): DocumentLocator | null;
}
