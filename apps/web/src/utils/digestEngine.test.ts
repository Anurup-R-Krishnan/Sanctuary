import { beforeEach, describe, expect, it } from "bun:test";

import type { Book } from "@/types";
import type { ReaderAnnotation } from "@/types/reader";

import {
  addDays,
  buildDailyDigestItems,
  calculateNextReview,
  createSeededRandom,
  DIGEST_STORAGE_KEY,
  formatDateKey,
  getDigestSummary,
  loadDigestReviews,
  recordDigestReview,
  saveDigestReviews,
  selectDailyDigestAnnotations,
} from "./digestEngine";

const store: Record<string, string> = {};
const mockLocalStorage = {
  clear: () => {
    for (const key of Object.keys(store)) {
      delete store[key];
    }
  },
  getItem: (key: string) => store[key] ?? null,
  removeItem: (key: string) => {
    delete store[key];
  },
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
};
// @ts-expect-error test polyfill
globalThis.localStorage = mockLocalStorage;

describe("digestEngine", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  describe("Date utilities & seeded PRNG", () => {
    it("formats dates as YYYY-MM-DD", () => {
      const d = new Date(2026, 8, 13); // Sept 13, 2026
      expect(formatDateKey(d)).toBe("2026-09-13");
    });

    it("adds days reliably across month boundaries", () => {
      expect(addDays("2026-09-28", 5)).toBe("2026-10-03");
      expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    });

    it("produces deterministic numbers from identical seed string", () => {
      const rng1 = createSeededRandom("2026-09-13");
      const rng2 = createSeededRandom("2026-09-13");

      const seq1 = [rng1(), rng1(), rng1()];
      const seq2 = [rng2(), rng2(), rng2()];

      expect(seq1).toEqual(seq2);
    });

    it("produces different sequences for different seeds", () => {
      const rng1 = createSeededRandom("2026-09-13");
      const rng2 = createSeededRandom("2026-09-14");

      expect(rng1()).not.toBe(rng2());
    });
  });

  describe("calculateNextReview", () => {
    it("resets to Box 1 with 1 day interval on hard rating", () => {
      const res = calculateNextReview(3, "hard", "2026-09-13");
      expect(res.box).toBe(1);
      expect(res.nextReviewDate).toBe("2026-09-14");
    });

    it("increments box by 1 on good rating with appropriate intervals", () => {
      const res1 = calculateNextReview(1, "good", "2026-09-13");
      expect(res1.box).toBe(2);
      expect(res1.nextReviewDate).toBe("2026-09-16"); // +3 days

      const res2 = calculateNextReview(2, "good", "2026-09-13");
      expect(res2.box).toBe(3);
      expect(res2.nextReviewDate).toBe("2026-09-20"); // +7 days

      const resCapped = calculateNextReview(5, "good", "2026-09-13");
      expect(resCapped.box).toBe(5);
      expect(resCapped.nextReviewDate).toBe("2026-10-13"); // +30 days
    });

    it("increments box by 2 on easy rating capped at Box 5", () => {
      const res1 = calculateNextReview(1, "easy", "2026-09-13");
      expect(res1.box).toBe(3);
      expect(res1.nextReviewDate).toBe("2026-09-23"); // +10 days

      const res2 = calculateNextReview(4, "easy", "2026-09-13");
      expect(res2.box).toBe(5);
      expect(res2.nextReviewDate).toBe("2026-10-28"); // +45 days
    });
  });

  describe("selectDailyDigestAnnotations", () => {
    const mockAnnotations: ReaderAnnotation[] = [
      {
        bookId: "b1",
        cfiRange: "cfi/1",
        chapterLabel: "Ch 1",
        color: "#facc15",
        createdAt: 1000,
        href: "ch1.xhtml",
        id: "a1",
        note: "Remarkable quote",
        text: "Knowledge is the quiet antidote to confusion.",
        type: "highlight",
        updatedAt: 1000,
      },
      {
        bookId: "b1",
        cfiRange: "cfi/2",
        chapterLabel: "Ch 2",
        color: "#facc15",
        createdAt: 1001,
        href: "ch2.xhtml",
        id: "a2",
        note: "",
        text: "The library was a sanctuary of silenced centuries.",
        type: "highlight",
        updatedAt: 1001,
      },
      {
        bookId: "b2",
        cfiRange: "cfi/3",
        chapterLabel: "Ch 1",
        color: "#38bdf8",
        createdAt: 1002,
        href: "ch1.xhtml",
        id: "a3",
        note: "",
        text: "To read without reflection is like eating without digesting.",
        type: "highlight",
        updatedAt: 1002,
      },
      {
        bookId: "b2",
        cfiRange: "cfi/4",
        chapterLabel: "Ch 3",
        color: "#38bdf8",
        createdAt: 1003,
        href: "ch3.xhtml",
        id: "a4",
        note: "Core insight",
        text: "In the depth of winter, I finally learned that within me there lay an invincible summer.",
        type: "highlight",
        updatedAt: 1003,
      },
      {
        bookId: "b3",
        cfiRange: "cfi/5",
        chapterLabel: "Intro",
        color: "#4ade80",
        createdAt: 1004,
        href: "intro.xhtml",
        id: "a5",
        note: "",
        text: "Attention is the rarest and purest form of generosity.",
        type: "highlight",
        updatedAt: 1004,
      },
      {
        bookId: "b3",
        cfiRange: "cfi/6",
        chapterLabel: "Ch 4",
        color: "#4ade80",
        createdAt: 1005,
        href: "ch4.xhtml",
        id: "a6",
        note: "",
        text: "Simplicity is prerequisite for reliability.",
        type: "highlight",
        updatedAt: 1005,
      },
    ];

    it("returns empty array for empty annotations list", () => {
      const selected = selectDailyDigestAnnotations([], {}, "2026-09-13", 5);
      expect(selected).toEqual([]);
    });

    it("returns all annotations when list size is less than or equal to target count", () => {
      const smallList = mockAnnotations.slice(0, 3);
      const selected = selectDailyDigestAnnotations(smallList, {}, "2026-09-13", 5);
      expect(selected.length).toBe(3);
      expect(selected.map((a) => a.id)).toEqual(["a1", "a2", "a3"]);
    });

    it("prioritizes due items over unreviewed candidates", () => {
      const reviews = {
        a6: {
          annotationId: "a6",
          box: 2,
          lastReviewedAt: 500,
          nextReviewDate: "2026-09-10", // overdue
          reviewCount: 2,
        },
      };

      const selected = selectDailyDigestAnnotations(mockAnnotations, reviews, "2026-09-13", 5);
      expect(selected.length).toBe(5);
      expect(selected[0].id).toBe("a6"); // due item at the front
    });

    it("deterministically samples across different days", () => {
      const selectedDay1 = selectDailyDigestAnnotations(mockAnnotations, {}, "2026-09-13", 3);
      const selectedDay1Again = selectDailyDigestAnnotations(mockAnnotations, {}, "2026-09-13", 3);

      expect(selectedDay1.map((a) => a.id)).toEqual(selectedDay1Again.map((a) => a.id));
    });
  });

  describe("buildDailyDigestItems and getDigestSummary", () => {
    const mockBooks: Book[] = [
      {
        addedAt: "2026-09-13",
        author: "Marcus Aurelius",
        epubBlob: null,
        format: "epub",
        id: "b1",
        lastLocation: "cfi/1",
        progress: 0.5,
        title: "Meditations",
      },
    ];

    const mockAnnotations: ReaderAnnotation[] = [
      {
        bookId: "b1",
        cfiRange: "cfi/1",
        chapterLabel: "Book IV",
        color: "#facc15",
        createdAt: 1000,
        href: "ch1.xhtml",
        id: "a1",
        note: "Stoic wisdom",
        text: "You have power over your mind - not outside events.",
        type: "highlight",
        updatedAt: 1000,
      },
    ];

    it("enriches annotation with book metadata and review state", () => {
      const items = buildDailyDigestItems(mockAnnotations, mockBooks, {}, "2026-09-13", 5);
      expect(items.length).toBe(1);
      expect(items[0].bookTitle).toBe("Meditations");
      expect(items[0].bookAuthor).toBe("Marcus Aurelius");
      expect(items[0].isReviewedToday).toBe(false);
    });

    it("calculates summary progress percentages correctly", () => {
      const items = buildDailyDigestItems(mockAnnotations, mockBooks, {}, "2026-09-13", 5);
      const summaryInitial = getDigestSummary(items, "2026-09-13");
      expect(summaryInitial.totalCount).toBe(1);
      expect(summaryInitial.reviewedCount).toBe(0);
      expect(summaryInitial.completionPercentage).toBe(0);

      items[0].isReviewedToday = true;
      const summaryReviewed = getDigestSummary(items, "2026-09-13");
      expect(summaryReviewed.reviewedCount).toBe(1);
      expect(summaryReviewed.completionPercentage).toBe(100);
    });
  });

  describe("LocalStorage persistence", () => {
    it("persists and reloads reviews from localStorage", () => {
      saveDigestReviews({
        a1: {
          annotationId: "a1",
          box: 2,
          lastReviewedAt: 12345,
          nextReviewDate: "2026-09-20",
          rating: "good",
          reviewCount: 1,
        },
      });

      const loaded = loadDigestReviews();
      expect(loaded.a1).toBeDefined();
      expect(loaded.a1.box).toBe(2);
    });

    it("records a review, advances interval, and saves to storage", () => {
      const testDate = new Date(2026, 8, 13);
      const updated = recordDigestReview("a1", "good", testDate);

      expect(updated.box).toBe(2);
      expect(updated.nextReviewDate).toBe("2026-09-16");
      expect(updated.reviewCount).toBe(1);

      const raw = localStorage.getItem(DIGEST_STORAGE_KEY);
      expect(raw).toContain('"a1"');
    });
  });
});
