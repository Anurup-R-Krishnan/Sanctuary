import { describe, expect, it } from "bun:test";

import type { Book } from "@/types";

import {
  calculateAnnualChallenge,
  getDayOfYear,
  getTotalDaysInYear,
  isBookCompletedInYear,
  isLeapYear,
} from "./challenge";

describe("challenge utilities", () => {
  describe("isLeapYear", () => {
    it("identifies leap years correctly", () => {
      expect(isLeapYear(2024)).toBe(true);
      expect(isLeapYear(2028)).toBe(true);
      expect(isLeapYear(2000)).toBe(true);
      expect(isLeapYear(1900)).toBe(false);
      expect(isLeapYear(2025)).toBe(false);
      expect(isLeapYear(2026)).toBe(false);
    });
  });

  describe("getTotalDaysInYear", () => {
    it("returns 366 for leap years and 365 for standard years", () => {
      expect(getTotalDaysInYear(2024)).toBe(366);
      expect(getTotalDaysInYear(2026)).toBe(365);
    });
  });

  describe("getDayOfYear", () => {
    it("computes day 1 for January 1st", () => {
      expect(getDayOfYear(new Date(2026, 0, 1))).toBe(1);
    });

    it("computes day 60 for February 29th on leap year", () => {
      expect(getDayOfYear(new Date(2024, 1, 29))).toBe(60);
    });

    it("computes day 365 for December 31st on non-leap year", () => {
      expect(getDayOfYear(new Date(2026, 11, 31))).toBe(365);
    });

    it("computes day 366 for December 31st on leap year", () => {
      expect(getDayOfYear(new Date(2024, 11, 31))).toBe(366);
    });
  });

  describe("isBookCompletedInYear", () => {
    const baseBook: Book = {
      author: "Test Author",
      epubBlob: null,
      id: "b1",
      lastLocation: "/test/1",
      progress: 0,
      title: "Test Book",
    };

    it("returns true when completedAt matches the target year", () => {
      const book: Book = {
        ...baseBook,
        completedAt: "2026-04-15T12:00:00.000Z",
        progress: 100,
      };
      expect(isBookCompletedInYear(book, 2026, 2026)).toBe(true);
      expect(isBookCompletedInYear(book, 2025, 2026)).toBe(false);
    });

    it("returns false for books in progress", () => {
      const book: Book = {
        ...baseBook,
        progress: 45,
      };
      expect(isBookCompletedInYear(book, 2026, 2026)).toBe(false);
    });

    it("returns true for finished books using updatedAt year when completedAt missing", () => {
      const book: Book = {
        ...baseBook,
        progress: 100,
        updatedAt: "2026-08-01T00:00:00.000Z",
      };
      expect(isBookCompletedInYear(book, 2026, 2026)).toBe(true);
      expect(isBookCompletedInYear(book, 2025, 2026)).toBe(false);
    });
  });

  describe("calculateAnnualChallenge", () => {
    const makeBook = (id: string, completedAt: string): Book => ({
      author: "Author",
      completedAt,
      epubBlob: null,
      id,
      lastLocation: `/test/${id}`,
      progress: 100,
      title: `Book ${id}`,
    });

    it("calculates pace at beginning of the year", () => {
      const books: Book[] = [makeBook("1", "2026-01-01T10:00:00.000Z")];
      const result = calculateAnnualChallenge(books, 24, new Date(2026, 0, 1), 2026);

      expect(result.completedBooks).toBe(1);
      expect(result.expectedBooks).toBe(0);
      expect(result.paceStatus).toBe("ahead");
      expect(result.aheadBehindCount).toBe(1);
      expect(result.daysRemaining).toBe(364);
    });

    it("calculates ahead/behind status mid-year", () => {
      // Day 183 of 365 (~50% of the year)
      // Goal 20 books -> expected: 10 books
      const midYearDate = new Date(2026, 6, 2); // July 2

      // Scenario: 14 books completed -> 4 books ahead
      const aheadBooks = Array.from({ length: 14 }, (_, i) =>
        makeBook(String(i), "2026-03-01T00:00:00.000Z")
      );
      const aheadResult = calculateAnnualChallenge(aheadBooks, 20, midYearDate, 2026);
      expect(aheadResult.completedBooks).toBe(14);
      expect(aheadResult.expectedBooks).toBe(10);
      expect(aheadResult.paceStatus).toBe("ahead");
      expect(aheadResult.aheadBehindCount).toBe(4);
      expect(aheadResult.percentComplete).toBe(70);

      // Scenario: 6 books completed -> 4 books behind
      const behindBooks = Array.from({ length: 6 }, (_, i) =>
        makeBook(String(i), "2026-03-01T00:00:00.000Z")
      );
      const behindResult = calculateAnnualChallenge(behindBooks, 20, midYearDate, 2026);
      expect(behindResult.completedBooks).toBe(6);
      expect(behindResult.expectedBooks).toBe(10);
      expect(behindResult.paceStatus).toBe("behind");
      expect(behindResult.aheadBehindCount).toBe(4);
      expect(behindResult.percentComplete).toBe(30);

      // Scenario: exactly 10 books completed -> on-pace
      const onPaceBooks = Array.from({ length: 10 }, (_, i) =>
        makeBook(String(i), "2026-03-01T00:00:00.000Z")
      );
      const onPaceResult = calculateAnnualChallenge(onPaceBooks, 20, midYearDate, 2026);
      expect(onPaceResult.completedBooks).toBe(10);
      expect(onPaceResult.expectedBooks).toBe(10);
      expect(onPaceResult.paceStatus).toBe("on-pace");
      expect(onPaceResult.aheadBehindCount).toBe(0);
    });

    it("handles year end verification", () => {
      const yearEndDate = new Date(2026, 11, 31);
      const books = Array.from({ length: 18 }, (_, i) =>
        makeBook(String(i), "2026-06-01T00:00:00.000Z")
      );
      const result = calculateAnnualChallenge(books, 20, yearEndDate, 2026);

      expect(result.daysRemaining).toBe(0);
      expect(result.expectedBooks).toBe(20);
      expect(result.completedBooks).toBe(18);
      expect(result.paceStatus).toBe("behind");
      expect(result.aheadBehindCount).toBe(2);
      expect(result.percentComplete).toBe(90);
    });

    it("sanitizes zero or negative goals gracefully", () => {
      const books: Book[] = [makeBook("1", "2026-01-01T00:00:00.000Z")];
      const result = calculateAnnualChallenge(books, 0, new Date(2026, 0, 1), 2026);
      expect(result.goal).toBe(1);
    });
  });
});
