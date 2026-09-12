import type { AnnualChallenge, Book, ChallengePaceStatus } from "@/types";

import { clampPercent } from "@/utils/number";

export const isLeapYear = (year: number): boolean => {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
};

export const getTotalDaysInYear = (year: number): number => {
  return isLeapYear(year) ? 366 : 365;
};

export const getDayOfYear = (date: Date): number => {
  const startOfYear = Date.UTC(date.getFullYear(), 0, 1);
  const currentUtcDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((currentUtcDay - startOfYear) / 86_400_000);
  return diffDays + 1;
};

export const isBookCompletedInYear = (
  book: Book,
  targetYear: number,
  fallbackYear: number
): boolean => {
  if (book.completedAt) {
    const completedDate = new Date(book.completedAt);
    if (!Number.isNaN(completedDate.getTime())) {
      return completedDate.getFullYear() === targetYear;
    }
  }

  const isComplete = book.progress >= 100 || book.readingList === "finished";
  if (!isComplete) {
    return false;
  }

  if (book.updatedAt) {
    const updatedDate = new Date(book.updatedAt);
    if (!Number.isNaN(updatedDate.getTime())) {
      return updatedDate.getFullYear() === targetYear;
    }
  }

  if (book.addedAt) {
    const addedDate = new Date(book.addedAt);
    if (!Number.isNaN(addedDate.getTime())) {
      return addedDate.getFullYear() === targetYear;
    }
  }

  return fallbackYear === targetYear;
};

export const calculateAnnualChallenge = (
  books: Book[],
  goal: number,
  currentDate?: Date,
  challengeYear?: number
): AnnualChallenge => {
  const now = currentDate ?? new Date();
  const year = challengeYear ?? now.getFullYear();
  const totalDays = getTotalDaysInYear(year);

  let dayOfYear: number;
  if (year < now.getFullYear()) {
    dayOfYear = totalDays;
  } else if (year > now.getFullYear()) {
    dayOfYear = 1;
  } else {
    dayOfYear = Math.min(totalDays, Math.max(1, getDayOfYear(now)));
  }

  const daysRemaining = Math.max(0, totalDays - dayOfYear);

  let completedBooks = 0;
  for (const book of books) {
    if (isBookCompletedInYear(book, year, now.getFullYear())) {
      completedBooks++;
    }
  }

  const sanitizedGoal = Math.max(1, goal);
  const percentComplete = clampPercent((completedBooks / sanitizedGoal) * 100);

  const expectedFraction = dayOfYear / totalDays;
  const rawExpected = expectedFraction * sanitizedGoal;
  const expectedBooks = Math.round(rawExpected);

  let paceStatus: ChallengePaceStatus = "on-pace";
  let aheadBehindCount = 0;

  const diff = completedBooks - expectedBooks;
  if (diff > 0) {
    paceStatus = "ahead";
    aheadBehindCount = diff;
  } else if (diff < 0) {
    paceStatus = "behind";
    aheadBehindCount = Math.abs(diff);
  } else {
    paceStatus = "on-pace";
    aheadBehindCount = 0;
  }

  return {
    aheadBehindCount,
    completedBooks,
    daysRemaining,
    expectedBooks,
    goal: sanitizedGoal,
    paceStatus,
    percentComplete,
    year,
  };
};
