import type { ReadingStats, Book, ReadingSession } from "@/types";

import { API } from "@/services/api";
import { buildAuthHeaders, readJsonSafely } from "@/services/http";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useStatsStore } from "@/store/useStatsStore";
import { 
  createEmptyAggregates, 
  applySessionToAggregates, 
  calculateStats, 
  toLocalDateKey 
} from "@/utils/stats";

const SESSIONS_KEY = "sanctuary_reading_sessions";

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
      const headers = buildAuthHeaders(token || undefined);
      const res = await fetch(API.SESSIONS, { headers });
      const remote = await readJsonSafely<ReadingSession[]>(res, "Failed to fetch sessions");
      
      if (Array.isArray(remote)) {
        const remoteSessions = this.normalizeSessions(remote);
        
        // Merge and deduplicate, preferring remote for overlapping IDs
        const mergedMap = new Map(localSessions.map((s) => [s.id, s]));
        for (const s of remoteSessions) {
          mergedMap.set(s.id, s);
        }
        
        const merged = Array.from(mergedMap.values());
        merged.sort((a, b) => new Date(b.startTime || b.date).getTime() - new Date(a.startTime || a.date).getTime());
        
        useStatsStore.getState().setSessions(merged);
        this.rebuildAggregates(merged);
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(merged));
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

  startSession(bookId: string, startProgress = 0) {
    const now = Date.now();
    currentSessionStart = now;
    currentSessionStartTime = new Date(now).toISOString();
    currentSessionBook = bookId;
    currentSessionStartProgress = Math.max(0, startProgress);
  },

  async endSession(books: Book[], getToken: () => Promise<string | null>, isPersistent: boolean, endProgressOverride?: number) {
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
      const startedAt = currentSessionStartTime || now.toISOString();

      const newSession: ReadingSession = {
        id: crypto.randomUUID(),
        bookId: currentSessionBook,
        bookTitle: book?.title || "Unknown Book",
        date: toLocalDateKey(now),
        startedAt,
        startTime: startedAt,
        localStartHour: normalizedStartHour,
        duration,
        pagesRead,
        device: "web"
      };

      const currentSessions = useStatsStore.getState().sessions;
      const updatedSessions = [...currentSessions, newSession];
      
      useStatsStore.getState().addSession(newSession);
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(updatedSessions));

      if (isPersistent) {
        try {
          const token = await getToken();
          const headers = { ...buildAuthHeaders(token || undefined), "Content-Type": "application/json" };
          
          await fetch(API.SESSIONS, {
            method: "POST",
            headers,
            body: JSON.stringify({
              id: newSession.id,
              bookId: newSession.bookId,
              bookTitle: newSession.bookTitle,
              startedAt: newSession.startTime,
              date: newSession.date,
              durationSec: newSession.duration,
              pagesAdvanced: newSession.pagesRead,
              device: newSession.device,
              localStartHour: newSession.localStartHour
            }),
          });
        } catch (error) {
          console.warn("Failed to persist session to backend", error);
        }
      }
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
      const response = await fetch(API.GOALS, {
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
