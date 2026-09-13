import type { ReadingSession, SessionAggregates, Book, ReadingStats } from "@/types";

import { GENRE_PALETTE } from "@/config/readerConfig";
import { DEFAULT_BADGES, DEFAULT_PERSONALITY } from "@/types";
import { calculateAnnualChallenge } from "@/utils/challenge";
import { calculateSmartStreak } from "@/utils/streakEngine";

export const toLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toLocalMonthKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

export const createEmptyAggregates = (): SessionAggregates => ({
  totalReadingTime: 0,
  totalPagesRead: 0,
  nightOwlUnlocked: false,
  earlyBirdUnlocked: false,
  sessionDates: new Set<string>(),
  dayTotals: new Map<string, { pages: number; minutes: number }>(),
  monthMinutes: new Map<string, number>(),
  sessionCount: 0,
});

export const applySessionToAggregates = (aggregates: SessionAggregates, session: ReadingSession): void => {
  const durationMin = session.duration / 60;
  aggregates.totalReadingTime += durationMin;
  aggregates.totalPagesRead += session.pagesRead;
  aggregates.sessionCount += 1;

  aggregates.sessionDates.add(session.date);

  const dayAgg = aggregates.dayTotals.get(session.date) || { pages: 0, minutes: 0 };
  dayAgg.pages += session.pagesRead;
  dayAgg.minutes += durationMin;
  aggregates.dayTotals.set(session.date, dayAgg);

  const sessionHour = typeof session.localStartHour === "number"
    ? session.localStartHour
    : (typeof session.startedAt === "string" ? new Date(session.startedAt).getHours() : NaN);

  if (!Number.isNaN(sessionHour)) {
    if (sessionHour >= 0 && sessionHour < 5) aggregates.nightOwlUnlocked = true;
    if (sessionHour >= 5 && sessionHour < 7) aggregates.earlyBirdUnlocked = true;
  }

  const monthKey = session.date.slice(0, 7);
  aggregates.monthMinutes.set(monthKey, (aggregates.monthMinutes.get(monthKey) || 0) + durationMin);
};

const calculateStreak = (sessionDates: Set<string>, now: Date): { current: number; longest: number } => {
  const result = calculateSmartStreak(sessionDates, { now });
  return { current: result.currentStreak, longest: result.longestStreak };
};

export const calculateStats = (
  books: Book[],
  aggregates: SessionAggregates,
  dailyGoal: number,
  annualGoal = 20,
  annualGoalYear?: number
): ReadingStats => {
  const now = new Date();
  const today = toLocalDateKey(now);
  const annualChallenge = calculateAnnualChallenge(books, annualGoal, now, annualGoalYear);
  let completedBooksCount = 0;
  const completedBooksByMonth = new Map<string, number>();
  const genreMap = new Map<string, number>();
  const authorMap = new Map<string, number>();

  for (const book of books) {
    const genre = book.genre || "Uncategorized";
    genreMap.set(genre, (genreMap.get(genre) || 0) + 1);
    authorMap.set(book.author, (authorMap.get(book.author) || 0) + 1);

    if (book.progress >= 100) {
      completedBooksCount++;
      if (book.completedAt) {
        const completedDate = new Date(book.completedAt);
        if (!Number.isNaN(completedDate.getTime())) {
          const key = toLocalMonthKey(completedDate);
          completedBooksByMonth.set(key, (completedBooksByMonth.get(key) || 0) + 1);
        }
      }
    }
  }

  const {
    sessionDates,
    dayTotals,
    monthMinutes,
    totalReadingTime,
    totalPagesRead,
    sessionCount
  } = aggregates;

  const dailyProgress = dayTotals.get(today)?.pages || 0;
  const { current: currentStreak, longest: longestStreak } = calculateStreak(sessionDates, now);

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeklyData = weekDays.map((day, i) => {
    const date = new Date(now);
    const currentDay = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - (currentDay - i));
    const dateStr = toLocalDateKey(date);
    const totals = dayTotals.get(dateStr) || { pages: 0, minutes: 0 };
    return { day, pages: totals.pages, minutes: totals.minutes };
  });

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(now);
    date.setMonth(date.getMonth() - (5 - i));
    const monthKey = toLocalMonthKey(date);
    return {
      month: monthNames[date.getMonth()]!,
      hours: Math.round((monthMinutes.get(monthKey) || 0) / 60),
      books: completedBooksByMonth.get(monthKey) || 0,
    };
  });

  const heatmapData: number[][] = [];
  for (let week = 13; week >= 0; week--) {
    const row: number[] = [];
    for (let day = 0; day < 7; day++) {
      const date = new Date(now);
      date.setDate(date.getDate() - (week * 7 + (6 - day)));
      const dateStr = toLocalDateKey(date);
      const dayMinutes = dayTotals.get(dateStr)?.minutes || 0;
      row.push(dayMinutes === 0 ? 0 : dayMinutes < 15 ? 1 : dayMinutes < 30 ? 2 : 3);
    }
    heatmapData.push(row);
  }

  const genreDistribution = Array.from(genreMap.entries()).map(([genre, count], i) => ({
    genre,
    count,
    color: GENRE_PALETTE[i % GENRE_PALETTE.length]!,
  }));

  const authorNetwork = Array.from(authorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([author, booksCount]) => ({ author, books: booksCount }));

  const avgSessionLength = sessionCount > 0 ? totalReadingTime / sessionCount : 0;
  let readingPersonality = DEFAULT_PERSONALITY.personality;
  let personalityDescription = DEFAULT_PERSONALITY.description;

  if (sessionCount >= 10) {
    if (avgSessionLength > 45) {
      readingPersonality = "Binge Reader";
      personalityDescription = "You love diving deep, often reading for hours at a time.";
    } else if (currentStreak >= 7) {
      readingPersonality = "Consistent Reader";
      personalityDescription = "You read regularly, building strong habits.";
    } else if (totalPagesRead / Math.max(1, completedBooksCount) > 300) {
      readingPersonality = "Epic Adventurer";
      personalityDescription = "You prefer long, immersive stories.";
    } else {
      readingPersonality = "Quick Reader";
      personalityDescription = "You enjoy shorter, focused reading sessions.";
    }
  }

  return {
    annualChallenge,
    authorNetwork,
    averageReadingSpeed: totalReadingTime > 0 ? Math.round(totalPagesRead / (totalReadingTime / 60)) : 0,
    badges: DEFAULT_BADGES,
    booksCompletedThisMonth: monthlyData[5]?.books || 0,
    currentStreak,
    dailyGoal,
    dailyProgress,
    genreDistribution,
    heatmapData,
    longestStreak,
    monthlyData,
    personalityDescription,
    readingPersonality,
    totalBooksInLibrary: books.length,
    totalBooksRead: completedBooksCount,
    totalPagesRead,
    totalReadingTime,
    weeklyData,
  };
};
