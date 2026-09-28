import { describe, expect, it } from "bun:test";

import type { ReadingSession, Book } from "@/types";

import { calculateStats, createEmptyAggregates, applySessionToAggregates, toLocalDateKey } from "./stats";

describe("calculateStats", () => {
  it("should calculate dailyProgress in minutes, not pages", () => {
    const now = new Date();
    const today = toLocalDateKey(now);
    const aggregates = createEmptyAggregates();

    // Simulate a 30-minute reading session today
    const session: ReadingSession = {
      id: "test-session",
      bookId: "test-book",
      bookTitle: "Test Book",
      date: today,
      duration: 30 * 60, // 30 minutes in seconds
      pagesRead: 10,
    };

    applySessionToAggregates(aggregates, session);

    const books: Book[] = [];
    const stats = calculateStats(books, aggregates, 30); // 30-minute daily goal

    // dailyProgress should be in minutes (30 minutes)
    expect(stats.dailyProgress).toBe(30);
    expect(stats.dailyGoal).toBe(30);
  });

  it("should accumulate reading time correctly across multiple sessions today", () => {
    const now = new Date();
    const today = toLocalDateKey(now);
    const aggregates = createEmptyAggregates();

    // Two sessions: 15 min + 20 min = 35 min
    const session1: ReadingSession = {
      id: "session-1",
      bookId: "book-1",
      bookTitle: "Book 1",
      date: today,
      duration: 15 * 60,
      pagesRead: 5,
    };

    const session2: ReadingSession = {
      id: "session-2",
      bookId: "book-2",
      bookTitle: "Book 2",
      date: today,
      duration: 20 * 60,
      pagesRead: 8,
    };

    applySessionToAggregates(aggregates, session1);
    applySessionToAggregates(aggregates, session2);

    const books: Book[] = [];
    const stats = calculateStats(books, aggregates, 30);

    // dailyProgress should be 35 minutes
    expect(stats.dailyProgress).toBe(35);
  });

  it("should not include previous days in dailyProgress", () => {
    const now = new Date();
    const today = toLocalDateKey(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = toLocalDateKey(yesterday);

    const aggregates = createEmptyAggregates();

    // Yesterday: 60 minutes
    const yesterdaySession: ReadingSession = {
      id: "yesterday-session",
      bookId: "book-1",
      bookTitle: "Book 1",
      date: yesterdayStr,
      duration: 60 * 60,
      pagesRead: 20,
    };

    // Today: 15 minutes
    const todaySession: ReadingSession = {
      id: "today-session",
      bookId: "book-2",
      bookTitle: "Book 2",
      date: today,
      duration: 15 * 60,
      pagesRead: 5,
    };

    applySessionToAggregates(aggregates, yesterdaySession);
    applySessionToAggregates(aggregates, todaySession);

    const books: Book[] = [];
    const stats = calculateStats(books, aggregates, 30);

    // dailyProgress should only count today: 15 minutes
    expect(stats.dailyProgress).toBe(15);
    // totalReadingTime should include both: 75 minutes
    expect(stats.totalReadingTime).toBe(75);
  });
});
