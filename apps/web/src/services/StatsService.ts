import type { SanctuaryApiClient } from "@sanctuary/core";

import type { ReadingStats, Book, ReadingSession, ReadingGoals } from "@/types";

import { syncQueue } from "@/services/SyncQueue";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useStatsStore } from "@/store/useStatsStore";
import { getAllSessions, putSessions, putSession } from "@/utils/db";
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
          ...(typeof row.startedAt === "string" ? { startedAt: row.startedAt } : typeof row.startTime === "string" ? { startedAt: row.startTime } : {}),
          ...(typeof row.localStartHour === "number" ? { localStartHour: row.localStartHour } : {}),
          duration: Math.max(0, Math.min(row.duration, 86400)), // max 24h
          pagesRead: Math.max(0, row.pagesRead),
        };
        return normalized;
      })
      .filter((row): row is ReadingSession => row !== null);
  },

  async loadSessions(api: SanctuaryApiClient, isPersistent: boolean) {
    // 1. One-time migration from localStorage
    const legacySaved = localStorage.getItem(SESSIONS_KEY);
    if (legacySaved) {
      const legacySessions = this.normalizeSessions(JSON.parse(legacySaved));
      if (legacySessions.length > 0) {
        await putSessions(legacySessions);
      }
      localStorage.removeItem(SESSIONS_KEY);
    }

    // 2. Load from IndexedDB
    const localSessions = await getAllSessions();
    
    if (localSessions.length > 0) {
      localSessions.sort((a, b) => new Date(b.startedAt || b.date).getTime() - new Date(a.startedAt || a.date).getTime());
      useStatsStore.getState().setSessions(localSessions);
      this.rebuildAggregates(localSessions);
    }

    if (!isPersistent) return;

    try {
      const remote = await api.getSessions();
      
      if (Array.isArray(remote)) {
        const remoteSessions = this.normalizeSessions(remote);
        
        // Merge and deduplicate, preferring remote for overlapping IDs
        const mergedMap = new Map<string, ReadingSession>(localSessions.map((s) => [s.id, s]));
        const remoteIds = new Set(remoteSessions.map((s) => s.id));
        
        for (const s of remoteSessions) {
          mergedMap.set(s.id, s);
        }
        
        // Push any local sessions to the server if the server doesn't have them
        for (const localSession of localSessions) {
          if (!remoteIds.has(localSession.id)) {
            syncQueue.enqueue("SAVE_SESSION", {
              id: localSession.id,
              bookId: localSession.bookId,
              bookTitle: localSession.bookTitle,
              startedAt: localSession.startedAt,
              date: localSession.date,
              durationSec: localSession.duration,
              pagesAdvanced: localSession.pagesRead,
              device: localSession.device || "web",
              localStartHour: localSession.localStartHour
            });
          }
        }
        
        const merged = Array.from(mergedMap.values());
        merged.sort((a, b) => new Date(b.startedAt || b.date).getTime() - new Date(a.startedAt || a.date).getTime());
        
        useStatsStore.getState().setSessions(merged);
        this.rebuildAggregates(merged);
        await putSessions(merged);
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

  async endSession(books: Book[], api: SanctuaryApiClient, isPersistent: boolean, endProgressOverride?: number) {
    if (!currentSessionStart || !currentSessionBook) return;

    let duration = Math.round((Date.now() - currentSessionStart) / 1000);
    if (duration < 0) duration = 0;
    if (duration > 86400) duration = 86400; // clamp to 24h maximum per session

    const book = books.find((item) => item.id === currentSessionBook);
    const endProgressSource = endProgressOverride ?? book?.progress ?? 0;
    const endProgress = Math.max(0, Math.min(100, endProgressSource));
    const startProgress = Math.max(0, Math.min(100, currentSessionStartProgress));
    // progress values are percentages (0-100); convert delta back to page count
    const totalPages = Math.max(1, book?.totalPages ?? 100);
    const pagesRead = Math.max(0, Math.round((endProgress - startProgress) / 100 * totalPages));

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
        localStartHour: normalizedStartHour,
        duration,
        pagesRead,
        device: "web"
      };

      const currentSessions = useStatsStore.getState().sessions;
      // Deduplicate by id before writing — guards against StrictMode double-invocation
      const mergedMap = new Map(currentSessions.map((s) => [s.id, s]));
      mergedMap.set(newSession.id, newSession);

      useStatsStore.getState().addSession(newSession);
      await putSession(newSession);

      if (isPersistent) {
        syncQueue.enqueue("SAVE_SESSION", {
          id: newSession.id,
          bookId: newSession.bookId,
          bookTitle: newSession.bookTitle,
          startedAt: newSession.startedAt,
          date: newSession.date,
          durationSec: newSession.duration,
          pagesAdvanced: newSession.pagesRead,
          device: newSession.device,
          localStartHour: newSession.localStartHour
        });
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

  async fetchGoals(api: SanctuaryApiClient, isPersistent: boolean) {
    if (!isPersistent) return;
    try {
      const goals = await api.getGoals();
      useStatsStore.getState().setGoals(goals as unknown as ReadingGoals);
    } catch (error) {
      console.warn("Failed to fetch goals", error);
    }
  }
};
