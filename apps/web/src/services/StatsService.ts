import type { ReadingStats, Book, ReadingSession, SessionAggregates } from "@/types";
import { settingsService } from "@/services/settingsService";
import { useStatsStore } from "@/store/useStatsStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { 
  createEmptyAggregates, 
  applySessionToAggregates, 
  calculateStats, 
  toLocalDateKey 
} from "@/utils/stats";

const SESSIONS_KEY = "sanctuary_reading_sessions";
const REMOTE_SESSIONS_KEY = "readingSessions";

export class StatsService {
  private getToken: () => Promise<string | null>;
  private isPersistent: boolean;
  private aggregates = createEmptyAggregates();
  private sessionIndex = new Map<string, ReadingSession>();
  private currentSessionStart: number | null = null;
  private currentSessionStartTime: string | null = null;
  private currentSessionBook: string | null = null;
  private currentSessionStartProgress: number = 0;

  constructor(getToken: () => Promise<string | null>, isPersistent: boolean) {
    this.getToken = getToken;
    this.isPersistent = isPersistent;
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
        applySessionToAggregates(this.aggregates, addedSession);
      }
    } else {
      this.aggregates = createEmptyAggregates();
      for (const session of sessions) {
        applySessionToAggregates(this.aggregates, session);
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
        date: toLocalDateKey(now),
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
    const dailyGoal = useSettingsStore?.getState()?.dailyGoal || 30;
    return calculateStats(books, this.aggregates, dailyGoal);
  }
}
