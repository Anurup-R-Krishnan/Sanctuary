import { useCallback } from "react";
import { useUIStore } from "@/store/useUIStore";
import { useBookStore } from "@/store/useBookStore";
import { useReaderProgressStore } from "@/store/useReaderProgressStore";
import { statsService } from "@/services/StatsService";
import { libraryService } from "@/services/LibraryService";
import { View, type Book, type Bookmark } from "@/types";

export function useReadingSession(
  getToken: () => Promise<string | null>,
  isPersistent: boolean,
  flushPendingProgress: () => Promise<void>
) {
  const setView = useUIStore((state) => state.setView);
  const setSelectedBookId = useUIStore((state) => state.setSelectedBookId);
  const books = useBookStore((state) => state.books);

  const startSession = useCallback((book: Book) => {
    useReaderProgressStore.getState().setActiveBook(book.id, book.progress, book.lastLocation);
    setSelectedBookId(book.id);
    setView(View.READER);
    statsService.startSession(book.id, book.progress);
  }, [setSelectedBookId, setView]);

  const endSession = useCallback(async () => {
    const activeProgress = useReaderProgressStore.getState().active;
    await flushPendingProgress();
    
    statsService.endSession(books, getToken, isPersistent, activeProgress?.progress);
    useReaderProgressStore.getState().clearActiveBook();
    
    setView(View.LIBRARY);
    setSelectedBookId(null);
    await libraryService.loadBooks(getToken, isPersistent);
  }, [books, getToken, isPersistent, flushPendingProgress, setView, setSelectedBookId]);

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
