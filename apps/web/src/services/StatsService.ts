import type { ReadingStats, Book, ReadingSession, SessionAggregates } from "@/types";
import { DEFAULT_PERSONALITY, DEFAULT_BADGES } from "@/types";
import { settingsService } from "@/services/settingsService";
import { useStatsStore } from "@/store/useStatsStore";
import { useSettingsStore } from "@/store/useSettingsStore";

export const SESSIONS_KEY = "sanctuary_reading_sessions";
export const REMOTE_SESSIONS_KEY = "readingSessions";



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
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
};

export class StatsService {
  private getToken: () => Promise<string | null>;
  private isPersistent: boolean;
  private aggregates = this.createEmptyAggregates();
  private sessionIndex = new Map<string, ReadingSession>();
  private currentSessionStart: number | null = null;
  private currentSessionStartTime: string | null = null;
  private currentSessionBook: string | null = null;
  private currentSessionStartProgress: number = 0;

  constructor(getToken: () => Promise<string | null>, isPersistent: boolean) {
    this.getToken = getToken;
    this.isPersistent = isPersistent;
  }

  private createEmptyAggregates(): SessionAggregates {
    return {
      totalReadingTime: 0,
      totalPagesRead: 0,
      nightOwlUnlocked: false,
      earlyBirdUnlocked: false,
      sessionDates: new Set<string>(),
      dayTotals: new Map<string, { pages: number; minutes: number }>(),
      monthMinutes: new Map<string, number>(),
      sessionCount: 0,
    };
  }

  private applySessionToAggregates(aggregates: SessionAggregates, session: ReadingSession) {
    aggregates.totalReadingTime += session.duration;
    aggregates.totalPagesRead += session.pagesRead;
    aggregates.sessionCount += 1;

    aggregates.sessionDates.add(session.date);

    const dayAgg = aggregates.dayTotals.get(session.date) || { pages: 0, minutes: 0 };
    dayAgg.pages += session.pagesRead;
    dayAgg.minutes += session.duration;
    aggregates.dayTotals.set(session.date, dayAgg);

    const sessionHour = typeof session.localStartHour === "number"
      ? session.localStartHour
      : (typeof session.startTime === "string" ? new Date(session.startTime).getHours() : NaN);

    if (!Number.isNaN(sessionHour)) {
      if (sessionHour >= 0 && sessionHour < 5) aggregates.nightOwlUnlocked = true;
      if (sessionHour >= 5 && sessionHour < 7) aggregates.earlyBirdUnlocked = true;
    }

    const monthKey = session.date.slice(0, 7);
    aggregates.monthMinutes.set(monthKey, (aggregates.monthMinutes.get(monthKey) || 0) + session.duration);
  }

  public normalizeSessions(input: unknown): ReadingSession[] {
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
          ...(typeof row.startTime === "string" ? { startTime: row.startTime } : {}),
          ...(typeof row.localStartHour === "number" ? { localStartHour: row.localStartHour } : {}),
          duration: row.duration,
          pagesRead: row.pagesRead,
        };
        return normalized;
      })
      .filter((row): row is ReadingSession => row !== null);
  }

  public async loadSessions() {
    const savedSessions = localStorage.getItem(SESSIONS_KEY);
    const localSessions = savedSessions ? this.normalizeSessions(JSON.parse(savedSessions)) : [];
    
    if (localSessions.length > 0) {
      useStatsStore.getState().setSessions(localSessions);
      this.rebuildAggregates(localSessions);
    }

    if (!this.isPersistent) return;

    try {
      const token = await this.getToken();
      const remote = await settingsService.getItem<ReadingSession[]>(REMOTE_SESSIONS_KEY, token || undefined);
      if (Array.isArray(remote)) {
        const remoteSessions = this.normalizeSessions(remote);
        useStatsStore.getState().setSessions(remoteSessions);
        this.rebuildAggregates(remoteSessions);
      }
    } catch (error) {
      console.warn("Failed to hydrate remote reading sessions", error);
    }
  }

  public rebuildAggregates(sessions: ReadingSession[]) {
    const currentIndex = new Map<string, ReadingSession>(sessions.map((s) => [s.id, s]));
    
    const addedIds: string[] = [];
    const removedIds: string[] = [];
    for (const id of currentIndex.keys()) {
      if (!this.sessionIndex.has(id)) addedIds.push(id);
    }
    for (const id of this.sessionIndex.keys()) {
      if (!currentIndex.has(id)) removedIds.push(id);
    }

    const isPureAppend = removedIds.length === 0 && addedIds.length === 1 && currentIndex.size === this.sessionIndex.size + 1;

    if (isPureAppend && addedIds[0]) {
      const addedSession = currentIndex.get(addedIds[0]);
      if (addedSession) {
        this.applySessionToAggregates(this.aggregates, addedSession);
      }
    } else {
      this.aggregates = this.createEmptyAggregates();
      for (const session of sessions) {
        this.applySessionToAggregates(this.aggregates, session);
      }
    }

    this.sessionIndex = currentIndex;
  }

  public async saveSessions(sessions: ReadingSession[]) {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    if (!this.isPersistent || sessions.length === 0) return;
    try {
      const token = await this.getToken();
      await settingsService.setItem(REMOTE_SESSIONS_KEY, sessions, token || undefined);
    } catch (error) {
      console.warn("Failed to persist remote reading sessions", error);
    }
  }

  public startSession(bookId: string, startProgress = 0) {
    const now = Date.now();
    this.currentSessionStart = now;
    this.currentSessionStartTime = new Date(now).toISOString();
    this.currentSessionBook = bookId;
    this.currentSessionStartProgress = Math.max(0, startProgress);
  }

  public endSession(books: Book[], endProgressOverride?: number) {
    if (!this.currentSessionStart || !this.currentSessionBook) return;

    const duration = Math.round((Date.now() - this.currentSessionStart) / 60000);
    const book = books.find((item) => item.id === this.currentSessionBook);
    const endProgressSource = endProgressOverride ?? book?.progress ?? 0;
    const endProgress = Math.max(0, endProgressSource);
    const pagesRead = Math.max(0, endProgress - this.currentSessionStartProgress);

    if (duration >= 1 || pagesRead > 0) {
      const now = new Date();
      const localStartHour = now.getHours() - Math.floor(duration / 60);
      const normalizedStartHour = ((localStartHour % 24) + 24) % 24;

      const newSession: ReadingSession = {
        id: crypto.randomUUID(),
        bookId: this.currentSessionBook,
        bookTitle: book?.title || "Unknown Book",
        date: now.toISOString().substring(0, 10),
        ...(this.currentSessionStartTime ? { startTime: this.currentSessionStartTime } : {}),
        localStartHour: normalizedStartHour,
        duration,
        pagesRead,
      };

      const currentSessions = useStatsStore.getState().sessions;
      useStatsStore.getState().addSession(newSession);
      this.saveSessions([...currentSessions, newSession]);
    }

    this.currentSessionStart = null;
    this.currentSessionStartTime = null;
    this.currentSessionBook = null;
    this.currentSessionStartProgress = 0;
  }

  public computeStats(books: Book[]): ReadingStats {
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

    const dailyGoal = useSettingsStore?.getState()?.dailyGoal || 30;

    const {
      sessionDates,
      dayTotals,
      monthMinutes,
      totalReadingTime,
      totalPagesRead,
      nightOwlUnlocked,
      earlyBirdUnlocked,
      sessionCount
    } = this.aggregates;

    const dailyProgress = dayTotals.get(today)?.pages || 0;
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
        const prevDay = dateKeyToEpochDay(sortedDatesAsc[i - 1] as string);
        const currDay = dateKeyToEpochDay(sortedDatesAsc[i] as string);
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
    const monthlyData: { month: string; hours: number; books: number }[] = Array.from({ length: 6 }, (_, i) => {
      const date = new Date(now);
      date.setMonth(date.getMonth() - (5 - i));
      const monthKey = toLocalMonthKey(date);
      return {
        month: monthNames[date.getMonth()] as string,
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

    const colors = ["#c7a77b", "#8b7355", "#d4b58b", "#a08060", "#e8d5b7", "#6b5344"];
    const genreDistribution: { genre: string; count: number; color: string }[] = Array.from(genreMap.entries()).map(([genre, count], i) => ({
      genre,
      count,
      color: colors[i % colors.length] as string,
    }));

    const authorNetwork = Array.from(authorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([author, booksCount]) => ({ author, books: booksCount }));

    const badges = DEFAULT_BADGES.map((badge) => {
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
  }
}
