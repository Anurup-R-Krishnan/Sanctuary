import { useState, useEffect, useCallback, useMemo } from "react";
import type { Book } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { useStatsStore } from "@/store/useStatsStore";
import { StatsService } from "@/services/StatsService";

type UseReadingStatsOptions = {
  compute?: boolean;
};

export function useReadingStats(books: Book[], persistent = true, options: UseReadingStatsOptions = {}) {
  const { getToken } = useAuth();
  const shouldCompute = options.compute ?? true;
  
  const stats = useStatsStore((state) => state.stats);
  const setStats = useStatsStore((state) => state.setStats);
  const sessions = useStatsStore((state) => state.sessions);
  const addSession = useStatsStore((state) => state.addSession);

  const statsService = useMemo(() => new StatsService(getToken, persistent), [getToken, persistent]);

  const [currentSessionStart, setCurrentSessionStart] = useState<number | null>(null);
  const [currentSessionStartTime, setCurrentSessionStartTime] = useState<string | null>(null);
  const [currentSessionBook, setCurrentSessionBook] = useState<string | null>(null);
  const [currentSessionStartProgress, setCurrentSessionStartProgress] = useState<number>(0);

  useEffect(() => {
    statsService.loadSessions();
  }, [statsService]);

  useEffect(() => {
    if (sessions.length > 0) {
      statsService.saveSessions(sessions);
    }
  }, [sessions, statsService]);

  useEffect(() => {
    if (!shouldCompute) return;
    statsService.rebuildAggregates(sessions);
    const newStats = statsService.computeStats(books);
    setStats(newStats);
  }, [books, sessions, shouldCompute, statsService, setStats]);

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

    const newSession = {
      id: crypto.randomUUID(),
      bookId: currentSessionBook,
      bookTitle: book?.title || "Unknown",
      date: sessionStartTime.slice(0, 10), // Assuming ISO string YYYY-MM-DD
      startTime: sessionStartTime,
      localStartHour,
      duration,
      pagesRead,
    };

    addSession(newSession);
  }, [currentSessionStart, currentSessionStartTime, currentSessionBook, currentSessionStartProgress, books, addSession]);

  return {
    stats,
    startSession,
    endSession,
  };
}
