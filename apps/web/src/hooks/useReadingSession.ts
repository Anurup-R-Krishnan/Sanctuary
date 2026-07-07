import { useCallback } from "react";

import { libraryService } from "@/services/LibraryService";
import { statsService } from "@/services/StatsService";
import { useBookStore } from "@/store/useBookStore";
import { useReaderProgressStore } from "@/store/useReaderProgressStore";
import { useUIStore } from "@/store/useUIStore";
import { View, type Book, type Bookmark } from "@/types";

export function useReadingSession(
  getToken: () => Promise<string | null>,
  isPersistent: boolean,
  flushPendingProgress: () => Promise<void>
) {
  const setView = useUIStore((state) => state.setView);
  const books = useBookStore((state) => state.books);

  const startSession = useCallback((book: Book) => {
    // Clear any stale progress from a previous session before starting a new one
    useReaderProgressStore.getState().clearActiveBook();
    useReaderProgressStore.getState().setActiveBook(book.id, book.progress, book.lastLocation);
    setView(View.READER);
    statsService.startSession(book.id, book.progress);
  }, [setView]);

  const endSession = useCallback(async () => {
    const activeProgress = useReaderProgressStore.getState().active;
    await flushPendingProgress();

    // endSession is fire-and-forget; the optimistic update in syncBookUpdate
    // already keeps the store current so a full loadBooks() re-fetch is unnecessary.
    void statsService.endSession(books, getToken, isPersistent, activeProgress?.progress);
    useReaderProgressStore.getState().clearActiveBook();

    setView(View.LIBRARY);
  }, [books, getToken, isPersistent, flushPendingProgress, setView]);

  const addBookmark = useCallback((bookId: string, bookmark: Omit<Bookmark, "id" | "createdAt">) => {
    const next: Bookmark = {
      ...bookmark,
      id: `${bookId}:${encodeURIComponent(bookmark.cfi)}`,
      createdAt: new Date().toISOString(),
    };
    libraryService.addBookmark(bookId, next, getToken, isPersistent);
  }, [getToken, isPersistent]);

  const removeBookmark = useCallback((bookId: string, bookmarkId: string) => {
    libraryService.removeBookmark(bookId, bookmarkId, getToken, isPersistent);
  }, [getToken, isPersistent]);

  return { startSession, endSession, addBookmark, removeBookmark };
}
