import type { ReadingStats, Book, ReadingSession } from "@/types";

import { settingsService } from "@/services/settingsService";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useStatsStore } from "@/store/useStatsStore";
import { 
  createEmptyAggregates, 
  applySessionToAggregates, 
  calculateStats, 
  toLocalDateKey 
} from "@/utils/stats";

const SESSIONS_KEY = "sanctuary_reading_sessions";
const REMOTE_SESSIONS_KEY = "readingSessions";

// Internal State (Module Level)
let aggregates = createEmptyAggregates();
let sessionIndex = new Map<string, ReadingSession>();
let currentSessionStart: number | null = null;
let currentSessionStartTime: string | null = null;
let currentSessionBook: string | null = null;
let currentSessionStartProgress: number = 0;

export const statsService = {
  normalizeSessions(input: unknown): ReadingSession[] {
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
  },

  async loadSessions(getToken: () => Promise<string | null>, isPersistent: boolean) {
    const savedSessions = localStorage.getItem(SESSIONS_KEY);
    const localSessions = savedSessions ? this.normalizeSessions(JSON.parse(savedSessions)) : [];
    
    if (localSessions.length > 0) {
      useStatsStore.getState().setSessions(localSessions);
      this.rebuildAggregates(localSessions);
    }

    if (!isPersistent) return;

    try {
      const token = await getToken();
      const remote = await settingsService.getItem<ReadingSession[]>(REMOTE_SESSIONS_KEY, token || undefined);
      if (Array.isArray(remote)) {
        const remoteSessions = this.normalizeSessions(remote);
        useStatsStore.getState().setSessions(remoteSessions);
        this.rebuildAggregates(remoteSessions);
      }
    } catch (error) {
      console.warn("Failed to hydrate remote reading sessions", error);
    }
  },

  rebuildAggregates(sessions: ReadingSession[]) {
    const currentIndex = new Map<string, ReadingSession>(sessions.map((s) => [s.id, s]));
    
    const addedIds: string[] = [];
    const removedIds: string[] = [];
    for (const id of currentIndex.keys()) {
      if (!sessionIndex.has(id)) addedIds.push(id);
    }
    for (const id of sessionIndex.keys()) {
      if (!currentIndex.has(id)) removedIds.push(id);
    }

    const isPureAppend = removedIds.length === 0 && addedIds.length === 1 && currentIndex.size === sessionIndex.size + 1;

    if (isPureAppend && addedIds[0]) {
      const addedSession = currentIndex.get(addedIds[0]);
      if (addedSession) {
        applySessionToAggregates(aggregates, addedSession);
      }
    } else {
      aggregates = createEmptyAggregates();
      for (const session of sessions) {
        applySessionToAggregates(aggregates, session);
      }
    }

    sessionIndex = currentIndex;
  },

  async saveSessions(sessions: ReadingSession[], getToken: () => Promise<string | null>, isPersistent: boolean) {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    if (!isPersistent || sessions.length === 0) return;
    try {
      const token = await getToken();
      await settingsService.setItem(REMOTE_SESSIONS_KEY, sessions, token || undefined);
    } catch (error) {
      console.warn("Failed to persist remote reading sessions", error);
    }
  },

  startSession(bookId: string, startProgress = 0) {
    const now = Date.now();
    currentSessionStart = now;
    currentSessionStartTime = new Date(now).toISOString();
    currentSessionBook = bookId;
    currentSessionStartProgress = Math.max(0, startProgress);
  },

  endSession(books: Book[], getToken: () => Promise<string | null>, isPersistent: boolean, endProgressOverride?: number) {
    if (!currentSessionStart || !currentSessionBook) return;

    const duration = Math.round((Date.now() - currentSessionStart) / 1000);
    const book = books.find((item) => item.id === currentSessionBook);
    const endProgressSource = endProgressOverride ?? book?.progress ?? 0;
    const endProgress = Math.max(0, endProgressSource);
    const pagesRead = Math.max(0, endProgress - currentSessionStartProgress);

    if (duration >= 5 || pagesRead > 0) {
      const now = new Date();
      const localStartHour = now.getHours() - Math.floor(duration / 3600);
      const normalizedStartHour = ((localStartHour % 24) + 24) % 24;

      const newSession: ReadingSession = {
        id: crypto.randomUUID(),
        bookId: currentSessionBook,
        bookTitle: book?.title || "Unknown Book",
        date: toLocalDateKey(now),
        startedAt: currentSessionStartTime || now.toISOString(),
        startTime: currentSessionStartTime || now.toISOString(),
        localStartHour: normalizedStartHour,
        duration,
        pagesRead,
        device: "web"
      };

      const currentSessions = useStatsStore.getState().sessions;
      useStatsStore.getState().addSession(newSession);
      this.saveSessions([...currentSessions, newSession], getToken, isPersistent);
    }

    currentSessionStart = null;
    currentSessionStartTime = null;
    currentSessionBook = null;
    currentSessionStartProgress = 0;
  },

  computeStats(books: Book[]): ReadingStats {
    const dailyGoal = useSettingsStore?.getState()?.dailyGoal || 30;
    return calculateStats(books, aggregates, dailyGoal);
  },

  async fetchGoals(getToken: () => Promise<string | null>) {
    try {
      const token = await getToken();
      const response = await fetch("/api/goals", {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (response.ok) {
        const goals = await response.json();
        useStatsStore.getState().setGoals(goals);
      }
    } catch (error) {
      console.warn("Failed to fetch goals", error);
    }
  }
};
