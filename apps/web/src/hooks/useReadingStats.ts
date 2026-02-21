import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { ReadingStats, Badge, Book } from "@/types";
import { useSettingsShallow } from "@/context/SettingsContext";
import { settingsService } from "@/services/settingsService";
import { useAuth } from "@/hooks/useAuth";
import { useStatsStore } from "@/store/useStatsStore";

const SESSIONS_KEY = "sanctuary_reading_sessions";
const REMOTE_SESSIONS_KEY = "readingSessions";

interface ReadingSession {
  id: string;
  bookId: string;
  bookTitle: string;
  date: string;
  startTime?: string;
  localStartHour?: number;
  duration: number;
  pagesRead: number;
}

type SessionAggregates = {
  totalReadingTime: number;
  totalPagesRead: number;
  nightOwlUnlocked: boolean;
  earlyBirdUnlocked: boolean;
  nightOwlCount: number;
  earlyBirdCount: number;
  sessionDates: Set<string>;
  dayTotals: Map<string, { pages: number; minutes: number }>;
  monthMinutes: Map<string, number>;
  sessionCount: number;
};

const defaultBadges: Badge[] = [
  { id: "first_book", name: "First Steps", icon: "📖", description: "Complete your first book", unlocked: false, progress: 0, target: 1 },
  { id: "bookworm", name: "Bookworm", icon: "📚", description: "Complete 5 books", unlocked: false, progress: 0, target: 5 },
  { id: "librarian", name: "Librarian", icon: "🏛️", description: "Complete 25 books", unlocked: false, progress: 0, target: 25 },
  { id: "streak_3", name: "Getting Started", icon: "🔥", description: "3 day reading streak", unlocked: false, progress: 0, target: 3 },
  { id: "streak_7", name: "Week Warrior", icon: "⚡", description: "7 day reading streak", unlocked: false, progress: 0, target: 7 },
  { id: "streak_30", name: "Monthly Master", icon: "👑", description: "30 day reading streak", unlocked: false, progress: 0, target: 30 },
  { id: "hour_1", name: "Time Flies", icon: "⏱️", description: "Read for 1 hour total", unlocked: false, progress: 0, target: 60 },
  { id: "hour_10", name: "Dedicated", icon: "🎯", description: "Read for 10 hours total", unlocked: false, progress: 0, target: 600 },
  { id: "pages_100", name: "Page Turner", icon: "📄", description: "Read 100 pages", unlocked: false, progress: 0, target: 100 },
  { id: "pages_1000", name: "Thousand Club", icon: "📑", description: "Read 1000 pages", unlocked: false, progress: 0, target: 1000 },
  { id: "night_owl", name: "Night Owl", icon: "🦉", description: "Read after midnight", unlocked: false },
  { id: "early_bird", name: "Early Bird", icon: "🌅", description: "Read before 6 AM", unlocked: false },
];

const toLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toLocalMonthKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const dateKeyToEpochDay = (dateKey: string): number | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (year < 1970 || year > 2100) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
};

const createEmptyAggregates = (): SessionAggregates => ({
  totalReadingTime: 0,
  totalPagesRead: 0,
  nightOwlUnlocked: false,
  earlyBirdUnlocked: false,
  nightOwlCount: 0,
  earlyBirdCount: 0,
  sessionDates: new Set<string>(),
  dayTotals: new Map<string, { pages: number; minutes: number }>(),
  monthMinutes: new Map<string, number>(),
  sessionCount: 0,
});

const getSessionStartHour = (session: ReadingSession): number | null => {
  if (typeof session.localStartHour === "number" && session.localStartHour >= 0 && session.localStartHour <= 23) {
    return session.localStartHour;
  }
  if (typeof session.startTime === "string") {
    const parsed = new Date(session.startTime);
    if (!Number.isNaN(parsed.getTime())) return parsed.getHours();
  }
  return null;
};

const applySessionToAggregates = (aggregates: SessionAggregates, session: ReadingSession) => {
  aggregates.totalReadingTime += session.duration;
  aggregates.totalPagesRead += session.pagesRead;
  aggregates.sessionCount += 1;

  aggregates.sessionDates.add(session.date);

  const dayAgg = aggregates.dayTotals.get(session.date) || { pages: 0, minutes: 0 };
  dayAgg.pages += session.pagesRead;
  dayAgg.minutes += session.duration;
  aggregates.dayTotals.set(session.date, dayAgg);

  const sessionHour = getSessionStartHour(session);
  if (sessionHour !== null) {
    if (sessionHour >= 0 && sessionHour < 5) aggregates.nightOwlCount += 1;
    if (sessionHour >= 5 && sessionHour < 7) aggregates.earlyBirdCount += 1;
  }
  aggregates.nightOwlUnlocked = aggregates.nightOwlCount > 0;
  aggregates.earlyBirdUnlocked = aggregates.earlyBirdCount > 0;

  const monthKey = session.date.slice(0, 7);
  aggregates.monthMinutes.set(monthKey, (aggregates.monthMinutes.get(monthKey) || 0) + session.duration);
};

const colorForGenre = (genre: string, index: number): string => {
  // Deterministic hue from label + index avoids indistinguishable repeated 6-color cycles.
  let hash = 0;
  for (let i = 0; i < genre.length; i++) {
    hash = (hash * 31 + genre.charCodeAt(i)) >>> 0;
  }
  const hue = (hash + index * 37) % 360;
  return `hsl(${hue} 46% 56%)`;
};

const removeSessionFromAggregates = (aggregates: SessionAggregates, session: ReadingSession) => {
  aggregates.totalReadingTime = Math.max(0, aggregates.totalReadingTime - session.duration);
  aggregates.totalPagesRead = Math.max(0, aggregates.totalPagesRead - session.pagesRead);
  aggregates.sessionCount = Math.max(0, aggregates.sessionCount - 1);

  const dayAgg = aggregates.dayTotals.get(session.date);
  if (dayAgg) {
    dayAgg.pages = Math.max(0, dayAgg.pages - session.pagesRead);
    dayAgg.minutes = Math.max(0, dayAgg.minutes - session.duration);
    if (dayAgg.pages === 0 && dayAgg.minutes === 0) {
      aggregates.dayTotals.delete(session.date);
      aggregates.sessionDates.delete(session.date);
    } else {
      aggregates.dayTotals.set(session.date, dayAgg);
      aggregates.sessionDates.add(session.date);
    }
  }

  const sessionHour = getSessionStartHour(session);
  if (sessionHour !== null) {
    if (sessionHour >= 0 && sessionHour < 5) aggregates.nightOwlCount = Math.max(0, aggregates.nightOwlCount - 1);
    if (sessionHour >= 5 && sessionHour < 7) aggregates.earlyBirdCount = Math.max(0, aggregates.earlyBirdCount - 1);
  }
  aggregates.nightOwlUnlocked = aggregates.nightOwlCount > 0;
  aggregates.earlyBirdUnlocked = aggregates.earlyBirdCount > 0;

  const monthKey = session.date.slice(0, 7);
  const currentMonthMinutes = aggregates.monthMinutes.get(monthKey);
  if (typeof currentMonthMinutes === "number") {
    const next = Math.max(0, currentMonthMinutes - session.duration);
    if (next === 0) aggregates.monthMinutes.delete(monthKey);
    else aggregates.monthMinutes.set(monthKey, next);
  }
};

const sessionsEquivalent = (a: ReadingSession, b: ReadingSession): boolean =>
  a.date === b.date &&
  a.duration === b.duration &&
  a.pagesRead === b.pagesRead &&
  a.startTime === b.startTime &&
  a.localStartHour === b.localStartHour;

type UseReadingStatsOptions = {
  compute?: boolean;
};

const emptyStats = (dailyGoal: number): ReadingStats => ({
  currentStreak: 0,
  longestStreak: 0,
  totalBooksRead: 0,
  totalBooksInLibrary: 0,
  totalPagesRead: 0,
  totalReadingTime: 0,
  averageReadingSpeed: 0,
  dailyProgress: 0,
  dailyGoal,
  booksCompletedThisMonth: 0,
  weeklyData: [
    { day: "Mon", pages: 0, minutes: 0 },
    { day: "Tue", pages: 0, minutes: 0 },
    { day: "Wed", pages: 0, minutes: 0 },
    { day: "Thu", pages: 0, minutes: 0 },
    { day: "Fri", pages: 0, minutes: 0 },
    { day: "Sat", pages: 0, minutes: 0 },
    { day: "Sun", pages: 0, minutes: 0 },
  ],
  monthlyData: [],
  heatmapData: [],
  genreDistribution: [],
  authorNetwork: [],
  badges: defaultBadges,
  readingPersonality: "Explorer",
  personalityDescription: "You're just getting started on your reading journey!",
});

export function useReadingStats(books: Book[], persistent = true, options: UseReadingStatsOptions = {}) {
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [currentSessionStart, setCurrentSessionStart] = useState<number | null>(null);
  const [currentSessionStartTime, setCurrentSessionStartTime] = useState<string | null>(null);
  const [currentSessionBook, setCurrentSessionBook] = useState<string | null>(null);
  const [currentSessionStartProgress, setCurrentSessionStartProgress] = useState<number>(0);
  const [aggregateVersion, setAggregateVersion] = useState(0);
  const { getToken } = useAuth();
  const sessionsRef = useRef<ReadingSession[]>([]);
  const aggregateRef = useRef<SessionAggregates>(createEmptyAggregates());
  const sessionIndexRef = useRef<Map<string, ReadingSession>>(new Map());

  const { dailyGoal } = useSettingsShallow((state) => ({
    dailyGoal: state.dailyGoal,
  }));
  const shouldCompute = options.compute ?? true;
  const setStatsSnapshot = useStatsStore((state) => state.setStats);

  const normalizeSessions = useCallback((input: unknown): ReadingSession[] => {
    if (!Array.isArray(input)) return [];

    return input
      .filter((item): item is Partial<ReadingSession> & Record<string, unknown> => !!item && typeof item === "object")
      .map((row) => {
        if (
          typeof row.id !== "string" ||
          typeof row.bookId !== "string" ||
          typeof row.bookTitle !== "string" ||
          typeof row.date !== "string" ||
          typeof row.duration !== "number" ||
          typeof row.pagesRead !== "number"
        ) {
          return null;
        }

        const normalized: ReadingSession = {
          id: row.id,
          bookId: row.bookId,
          bookTitle: row.bookTitle,
          date: row.date,
          startTime: typeof row.startTime === "string" ? row.startTime : undefined,
          localStartHour: typeof row.localStartHour === "number" ? row.localStartHour : undefined,
          duration: row.duration,
          pagesRead: row.pagesRead,
        };
        return normalized;
      })
      .filter((row): row is ReadingSession => row !== null);
  }, []);

  useEffect(() => {
    const savedSessions = localStorage.getItem(SESSIONS_KEY);
    const localSessions = savedSessions ? normalizeSessions(JSON.parse(savedSessions)) : [];
    if (localSessions.length > 0) {
      setSessions(localSessions);
    }

    if (!persistent) return;

    let cancelled = false;
    void (async () => {
      try {
        const token = await getToken();
        const remote = await settingsService.getItem<ReadingSession[]>(REMOTE_SESSIONS_KEY, token || undefined);
        if (cancelled || !Array.isArray(remote)) return;
        const remoteSessions = normalizeSessions(remote);
        // Remote is authoritative when available, including empty array deletions.
        setSessions(remoteSessions);
      } catch (error) {
        console.warn("Failed to hydrate remote reading sessions", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getToken, normalizeSessions, persistent]);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    const previousIndex = sessionIndexRef.current;
    const currentIndex = new Map<string, ReadingSession>(sessions.map((session) => [session.id, session]));

    const addedIds: string[] = [];
    const removedIds: string[] = [];
    const changedIds: string[] = [];
    for (const id of currentIndex.keys()) {
      if (!previousIndex.has(id)) {
        addedIds.push(id);
      } else {
        const prev = previousIndex.get(id);
        const next = currentIndex.get(id);
        if (prev && next && !sessionsEquivalent(prev, next)) {
          changedIds.push(id);
        }
      }
    }
    for (const id of previousIndex.keys()) {
      if (!currentIndex.has(id)) removedIds.push(id);
    }

    const next = aggregateRef.current;
    for (const id of removedIds) {
      const previous = previousIndex.get(id);
      if (previous) removeSessionFromAggregates(next, previous);
    }
    for (const id of changedIds) {
      const previous = previousIndex.get(id);
      const current = currentIndex.get(id);
      if (previous) removeSessionFromAggregates(next, previous);
      if (current) applySessionToAggregates(next, current);
    }
    for (const id of addedIds) {
      const current = currentIndex.get(id);
      if (current) applySessionToAggregates(next, current);
    }
    aggregateRef.current = next;

    sessionIndexRef.current = currentIndex;
    setAggregateVersion((v) => v + 1);
  }, [sessions]);

  useEffect(() => {
    if (!persistent || sessions.length === 0) return;
    void (async () => {
      try {
        const token = await getToken();
        await settingsService.setItem(REMOTE_SESSIONS_KEY, sessions, token || undefined);
      } catch (error) {
        console.warn("Failed to persist remote reading sessions", error);
      }
    })();
  }, [sessions, getToken, persistent]);

  useEffect(() => {
    if (!persistent) return;

    const flushSessions = () => {
      const snapshot = sessionsRef.current;
      try {
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(snapshot));
      } catch {
        // no-op
      }
      void (async () => {
        try {
          const token = await getToken();
          await settingsService.setItem(REMOTE_SESSIONS_KEY, snapshot, token || undefined);
          await settingsService.flushPendingWrites(token || undefined);
        } catch {
          // no-op
        }
      })();
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushSessions();
    };

    window.addEventListener("beforeunload", flushSessions);
    window.addEventListener("pagehide", flushSessions);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", flushSessions);
      window.removeEventListener("pagehide", flushSessions);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [getToken, persistent]);

  const startSession = useCallback((bookId: string, startProgress = 0) => {
    const now = Date.now();
    setCurrentSessionStart(now);
    setCurrentSessionStartTime(new Date(now).toISOString());
    setCurrentSessionBook(bookId);
    setCurrentSessionStartProgress(Math.max(0, startProgress));
  }, []);

  const endSession = useCallback((endProgressOverride?: number) => {
    if (!currentSessionStart || !currentSessionBook) return;

    const duration = Math.round((Date.now() - currentSessionStart) / 60000);
    const book = books.find((item) => item.id === currentSessionBook);
    const endProgressSource = endProgressOverride ?? book?.progress ?? 0;
    const endProgress = Math.max(0, endProgressSource);
    const pagesRead = Math.max(0, endProgress - currentSessionStartProgress);

    const sessionStartTime = currentSessionStartTime || new Date(currentSessionStart).toISOString();
    const localStartHour = new Date(currentSessionStart).getHours();

    setCurrentSessionStart(null);
    setCurrentSessionStartTime(null);
    setCurrentSessionBook(null);
    setCurrentSessionStartProgress(0);

    if (duration < 1) return;

    const newSession: ReadingSession = {
      id: crypto.randomUUID(),
      bookId: currentSessionBook,
      bookTitle: book?.title || "Unknown",
      date: toLocalDateKey(new Date(sessionStartTime)),
      startTime: sessionStartTime,
      localStartHour,
      duration,
      pagesRead,
    };

    setSessions((prev) => [...prev, newSession]);
  }, [currentSessionStart, currentSessionStartTime, currentSessionBook, currentSessionStartProgress, books]);

  const stats: ReadingStats = useMemo(() => {
    if (!shouldCompute) {
      return {
        ...emptyStats(dailyGoal),
        totalBooksInLibrary: books.length,
      };
    }

    void aggregateVersion;
    const now = new Date();
    const today = toLocalDateKey(now);
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
    const aggregates = aggregateRef.current;
    const sessionDates = aggregates.sessionDates;
    const dayTotals = aggregates.dayTotals;
    const monthMinutes = aggregates.monthMinutes;
    const totalReadingTime = aggregates.totalReadingTime;
    const totalPagesRead = aggregates.totalPagesRead;
    const dailyProgress = dayTotals.get(today)?.pages || 0;
    const nightOwlUnlocked = aggregates.nightOwlUnlocked;
    const earlyBirdUnlocked = aggregates.earlyBirdUnlocked;

    const uniqueDates = Array.from(sessionDates).sort().reverse();

    let currentStreak = 0;
    const streakProbe = new Date(now);
    for (let i = 0; i < 365; i++) {
      const dateStr = toLocalDateKey(streakProbe);
      if (sessionDates.has(dateStr)) {
        currentStreak++;
        streakProbe.setDate(streakProbe.getDate() - 1);
      } else if (i === 0) {
        streakProbe.setDate(streakProbe.getDate() - 1);
      } else {
        break;
      }
    }

    let longestStreak = 0;
    let tempStreak = 0;
    const sortedDatesAsc = [...uniqueDates].sort();
    for (let i = 0; i < sortedDatesAsc.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDay = dateKeyToEpochDay(sortedDatesAsc[i - 1]);
        const currDay = dateKeyToEpochDay(sortedDatesAsc[i]);
        const diffDays = prevDay !== null && currDay !== null ? currDay - prevDay : 0;
        tempStreak = diffDays === 1 ? tempStreak + 1 : 1;
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const weeklyData = weekDays.map((day, i) => {
      const date = new Date(now);
      const currentDay = (date.getDay() + 6) % 7;
      date.setDate(date.getDate() - (currentDay - i));
      const dateStr = toLocalDateKey(date);
      const totals = dayTotals.get(dateStr) || { pages: 0, minutes: 0 };
      return {
        day,
        pages: totals.pages,
        minutes: totals.minutes,
      };
    });

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyData = Array.from({ length: 6 }, (_, i) => {
      const date = new Date(now);
      date.setMonth(date.getMonth() - (5 - i));
      const monthKey = toLocalMonthKey(date);
      return {
        month: monthNames[date.getMonth()],
        hours: Math.round((monthMinutes.get(monthKey) || 0) / 60),
        books: completedBooksByMonth.get(monthKey) || 0,
      };
    });

    const MIN_HEATMAP_WEEKS = 14;
    const MAX_HEATMAP_WEEKS = 52;
    const todayEpochDay = dateKeyToEpochDay(today);
    let earliestEpochDay = todayEpochDay;
    for (const dateKey of dayTotals.keys()) {
      const epochDay = dateKeyToEpochDay(dateKey);
      if (epochDay === null) continue;
      if (earliestEpochDay === null || epochDay < earliestEpochDay) {
        earliestEpochDay = epochDay;
      }
    }
    const computedWeeks = earliestEpochDay !== null && todayEpochDay !== null
      ? Math.ceil((todayEpochDay - earliestEpochDay + 1) / 7)
      : MIN_HEATMAP_WEEKS;
    const heatmapWeeks = Math.max(MIN_HEATMAP_WEEKS, Math.min(MAX_HEATMAP_WEEKS, computedWeeks));

    const heatmapData: number[][] = [];
    for (let week = heatmapWeeks - 1; week >= 0; week--) {
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
      color: colorForGenre(genre, i),
    }));

    const authorNetwork = Array.from(authorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([author, booksCount]) => ({ author, books: booksCount }));

    const badges = defaultBadges.map((badge) => {
      const updatedBadge = { ...badge };
      switch (badge.id) {
        case "first_book":
          updatedBadge.progress = completedBooksCount;
          updatedBadge.unlocked = completedBooksCount >= 1;
          break;
        case "bookworm":
          updatedBadge.progress = completedBooksCount;
          updatedBadge.unlocked = completedBooksCount >= 5;
          break;
        case "librarian":
          updatedBadge.progress = completedBooksCount;
          updatedBadge.unlocked = completedBooksCount >= 25;
          break;
        case "streak_3":
          updatedBadge.progress = currentStreak;
          updatedBadge.unlocked = longestStreak >= 3;
          break;
        case "streak_7":
          updatedBadge.progress = currentStreak;
          updatedBadge.unlocked = longestStreak >= 7;
          break;
        case "streak_30":
          updatedBadge.progress = currentStreak;
          updatedBadge.unlocked = longestStreak >= 30;
          break;
        case "hour_1":
          updatedBadge.progress = totalReadingTime;
          updatedBadge.unlocked = totalReadingTime >= 60;
          break;
        case "hour_10":
          updatedBadge.progress = totalReadingTime;
          updatedBadge.unlocked = totalReadingTime >= 600;
          break;
        case "pages_100":
          updatedBadge.progress = totalPagesRead;
          updatedBadge.unlocked = totalPagesRead >= 100;
          break;
        case "pages_1000":
          updatedBadge.progress = totalPagesRead;
          updatedBadge.unlocked = totalPagesRead >= 1000;
          break;
        case "night_owl":
          updatedBadge.unlocked = nightOwlUnlocked;
          break;
        case "early_bird":
          updatedBadge.unlocked = earlyBirdUnlocked;
          break;
      }
      return updatedBadge;
    });

    const avgSessionLength = aggregates.sessionCount > 0 ? totalReadingTime / aggregates.sessionCount : 0;
    let readingPersonality = "Explorer";
    let personalityDescription = "You're just getting started on your reading journey!";

    if (aggregates.sessionCount >= 10) {
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

    const nextStats: ReadingStats = {
      currentStreak,
      longestStreak,
      totalBooksRead: completedBooksCount,
      totalBooksInLibrary: books.length,
      totalPagesRead,
      totalReadingTime,
      averageReadingSpeed: totalReadingTime > 0 ? Math.round(totalPagesRead / (totalReadingTime / 60)) : 0,
      dailyProgress,
      dailyGoal,
      booksCompletedThisMonth: monthlyData[5]?.books || 0,
      weeklyData,
      monthlyData,
      heatmapData,
      genreDistribution,
      authorNetwork,
      badges,
      readingPersonality,
      personalityDescription,
    };
    return nextStats;
  }, [books, dailyGoal, aggregateVersion, shouldCompute]);

  useEffect(() => {
    setStatsSnapshot(stats);
  }, [stats, setStatsSnapshot]);

  return {
    stats,
    startSession,
    endSession,
  };
}
