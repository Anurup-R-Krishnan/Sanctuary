/**
 * Spine / Character-Weight Progress Estimator.
 * Computes instantaneous (<1ms) reading progress, locations, and page estimates
 * based on spine section character/byte weights, eliminating the expensive
 * epub.js locations.generate() background loop.
 */

export interface SectionWeightSource {
  href?: string;
  weight?: number;
}

export class SpineWeightProgressEstimator {
  private readonly sectionWeights: number[];
  private readonly cumulativeWeights: number[];
  public readonly totalWeight: number;
  public readonly totalLocations: number;
  public readonly charsPerPage: number;

  constructor(sections: SectionWeightSource[], charsPerPage = 1500) {
    this.charsPerPage = charsPerPage;
    this.sectionWeights = sections.map((s) =>
      typeof s.weight === "number" && s.weight > 0 ? s.weight : charsPerPage
    );

    this.cumulativeWeights = [];
    let acc = 0;
    for (const w of this.sectionWeights) {
      this.cumulativeWeights.push(acc);
      acc += w;
    }

    this.totalWeight = Math.max(1, acc);
    this.totalLocations = Math.max(1, Math.round(this.totalWeight / charsPerPage));
  }

  /**
   * Calculates overall book progress fraction in [0, 1] given section index and section fraction.
   */
  public getProgress(sectionIndex: number, fraction: number = 0): number {
    if (this.sectionWeights.length === 0) return 0;
    const clampedIndex = Math.max(0, Math.min(sectionIndex, this.sectionWeights.length - 1));
    const clampedFraction = Math.max(0, Math.min(1, fraction));
    const weightBefore = this.cumulativeWeights[clampedIndex];
    const sectionWeight = this.sectionWeights[clampedIndex];
    const currentWeight = weightBefore + clampedFraction * sectionWeight;
    return Math.max(0, Math.min(1, currentWeight / this.totalWeight));
  }

  /**
   * Calculates 1-indexed virtual location / page number.
   */
  public getLocation(sectionIndex: number, fraction: number = 0): number {
    const progress = this.getProgress(sectionIndex, fraction);
    if (progress >= 1) return this.totalLocations;
    return Math.max(1, Math.min(this.totalLocations, Math.floor(progress * this.totalLocations) + 1));
  }

  /**
   * Resolves target progress in [0, 1] back to the nearest section index and section fraction.
   */
  public getSectionAndFraction(progress: number): { sectionIndex: number; fraction: number } {
    const clamped = Math.max(0, Math.min(1, progress));
    const targetWeight = clamped * this.totalWeight;

    for (let i = this.sectionWeights.length - 1; i >= 0; i--) {
      if (targetWeight >= this.cumulativeWeights[i]) {
        const remaining = targetWeight - this.cumulativeWeights[i];
        const fraction = this.sectionWeights[i] > 0 ? remaining / this.sectionWeights[i] : 0;
        return { sectionIndex: i, fraction: Math.max(0, Math.min(1, fraction)) };
      }
    }
    return { sectionIndex: 0, fraction: 0 };
  }
}
