import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import ePub from "epubjs";
import { v4 as uuidv4 } from "uuid";
import type { Book, Bookmark, SortOption, FilterOption } from "@/types";
import { bookService } from "@/services/bookService";
import { useAuth } from "@/hooks/useAuth";
import { ApiError, logError, logErrorOnce } from "@/services/http";
import { putBook as putBookInDb, deleteBook as deleteBookFromDb } from "@/utils/db";
import { useBookStore } from "@/store/useBookStore";

type UseBookLibraryOptions = { persistent?: boolean };

type EpubMetadata = {
  title?: string;
  creator?: string | string[];
};

type EpubBookHandle = {
  ready: Promise<unknown>;
  loaded: { metadata: Promise<EpubMetadata> };
  coverUrl: () => Promise<string>;
  destroy?: () => void;
};

type BookSyncMeta = {
  dirty: boolean;
  localRevision: number;
  lastAckRevision: number;
  syncInFlight: boolean;
  serverUpdatedAt?: string;
};

const RECENT_BOOKS_LIMIT = 10;
// epubjs cover extraction is unreliable for some EPUBs (replaceCss/resources errors).
// Keep uploads stable by skipping extraction unless this is deliberately re-enabled.
const ENABLE_EPUB_COVER_EXTRACTION = false;

async function extractCoverBlobFromEpubSource(source: ArrayBuffer): Promise<Blob | null> {
  let bookData: EpubBookHandle | null = null;
  let coverHref: string | null = null;
  try {
    bookData = ePub(source) as unknown as EpubBookHandle;
    await bookData.ready;
    coverHref = await bookData.coverUrl();
    if (!coverHref) return null;
    const response = await fetch(coverHref);
    return await response.blob();
  } catch {
    return null;
  } finally {
    if (coverHref?.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(coverHref);
      } catch {
        // no-op
      }
    }
    bookData?.destroy?.();
  }
}

export function useBookLibrary(options: UseBookLibraryOptions = {}) {
  const { persistent = true } = options;
  const { getToken } = useAuth();

  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(persistent);
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const setBookSnapshot = useBookStore((state) => state.setSnapshot);
  const bindBookHandlers = useBookStore((state) => state.bindHandlers);

  const booksRef = useRef<Book[]>([]);
  const handlerOwnerIdRef = useRef(`book-library-${uuidv4()}`);
  const isMountedRef = useRef(true);
  const loadRequestIdRef = useRef(0);
  const coverObjectUrlByBookIdRef = useRef<Map<string, string>>(new Map());
  const inFlightMutationsRef = useRef<Set<string>>(new Set());
  const syncMetaByBookIdRef = useRef<Map<string, BookSyncMeta>>(new Map());

  useEffect(() => {
    booksRef.current = books;
  }, [books]);

  const revokeTrackedCoverUrl = useCallback((bookId: string) => {
    const url = coverObjectUrlByBookIdRef.current.get(bookId);
    if (!url) return;
    URL.revokeObjectURL(url);
    coverObjectUrlByBookIdRef.current.delete(bookId);
  }, []);

  const setTrackedCoverUrl = useCallback((bookId: string, url: string) => {
    const prev = coverObjectUrlByBookIdRef.current.get(bookId);
    if (prev && prev !== url) {
      URL.revokeObjectURL(prev);
    }
    coverObjectUrlByBookIdRef.current.set(bookId, url);
  }, []);

  const trackCoverBlobForBook = useCallback((bookId: string, blob: Blob): string => {
    if (!isMountedRef.current) return "";
    const url = URL.createObjectURL(blob);
    setTrackedCoverUrl(bookId, url);
    return url;
  }, [setTrackedCoverUrl]);

  const reconcileTrackedCoverUrls = useCallback((nextBooks: Book[]) => {
    const nextCoverById = new Map(nextBooks.map((book) => [book.id, book.coverUrl]));
    for (const [bookId, trackedUrl] of coverObjectUrlByBookIdRef.current.entries()) {
      const nextCover = nextCoverById.get(bookId);
      if (!nextCover || nextCover !== trackedUrl) {
        URL.revokeObjectURL(trackedUrl);
        coverObjectUrlByBookIdRef.current.delete(bookId);
      }
    }
  }, []);

  const cleanupAllObjectUrls = useCallback(() => {
    for (const url of coverObjectUrlByBookIdRef.current.values()) {
      URL.revokeObjectURL(url);
    }
    coverObjectUrlByBookIdRef.current.clear();
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanupAllObjectUrls();
    };
  }, [cleanupAllObjectUrls]);

  const loadBooks = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current;
    if (!persistent) {
      cleanupAllObjectUrls();
      if (requestId === loadRequestIdRef.current && isMountedRef.current) {
        setBooks([]);
        setIsLoading(false);
      }
      return;
    }

    if (isMountedRef.current) {
      setIsLoading(true);
    }
    try {
      const token = await getToken();
      const stored = await bookService.getBooks(token || undefined);
      if (requestId !== loadRequestIdRef.current || !isMountedRef.current) return;
      const localById = new Map(booksRef.current.map((book) => [book.id, book]));
      // Keep library state metadata-only; content blobs are loaded lazily by ReaderView.
      const hydrated: Book[] = stored.map((s): Book => {
        const local = localById.get(s.id);
        const syncMeta = syncMetaByBookIdRef.current.get(s.id);
        const remoteBook: Book = {
          ...s,
          coverUrl: s.coverUrl,
          epubBlob: null,
        };
        if (syncMeta) {
          syncMetaByBookIdRef.current.set(s.id, {
            ...syncMeta,
            serverUpdatedAt: s.lastOpenedAt || s.addedAt || syncMeta.serverUpdatedAt,
          });
        }

        if (!local) return remoteBook;
        const hasUnsyncedLocal = !!syncMeta?.dirty || (syncMeta?.localRevision || 0) > (syncMeta?.lastAckRevision || 0);
        if (!hasUnsyncedLocal && !inFlightMutationsRef.current.has(s.id)) return remoteBook;

        // Preserve local mutation fields while sync is in-flight.
        return {
          ...remoteBook,
          progress: local.progress,
          lastLocation: local.lastLocation,
          lastOpenedAt: local.lastOpenedAt,
          locationHistory: local.locationHistory,
          bookmarks: local.bookmarks,
          isFavorite: local.isFavorite,
          readingList: local.readingList,
          completedAt: local.completedAt,
        };
      });

      reconcileTrackedCoverUrls(hydrated);
      if (requestId === loadRequestIdRef.current && isMountedRef.current) {
        setBooks(hydrated);
      }
    } catch (error) {
      if (requestId === loadRequestIdRef.current) {
        logErrorOnce("books-load", "Failed to load books:", error);
      }
    } finally {
      if (requestId === loadRequestIdRef.current && isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [cleanupAllObjectUrls, persistent, getToken, reconcileTrackedCoverUrls]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const syncBookUpdate = useCallback(async (
    id: string,
    updater: (book: Book) => Book,
    remoteSync: (next: Book) => Promise<void>
  ): Promise<boolean> => {
    let previousBook: Book | null = null;
    let nextBook: Book | null = null;

    setBooks((prev) => prev.map((book) => {
      if (book.id !== id) return book;
      previousBook = book;
      nextBook = updater(book);
      return nextBook;
    }));

    if (!nextBook || !previousBook) return false;
    inFlightMutationsRef.current.add(id);
    const previousMeta = syncMetaByBookIdRef.current.get(id) || {
      dirty: false,
      localRevision: 0,
      lastAckRevision: 0,
      syncInFlight: false,
    };
    const currentRevision = previousMeta.localRevision + 1;
    syncMetaByBookIdRef.current.set(id, {
      ...previousMeta,
      dirty: true,
      localRevision: currentRevision,
      syncInFlight: true,
    });

    try {
      await putBookInDb(nextBook);
    } catch (error) {
      logError("Failed to persist local book update:", error);
      setBooks((prev) => prev.map((book) => (book.id === id ? previousBook! : book)));
      syncMetaByBookIdRef.current.set(id, {
        ...previousMeta,
        syncInFlight: false,
      });
      inFlightMutationsRef.current.delete(id);
      return false;
    }

    if (!persistent) {
      syncMetaByBookIdRef.current.set(id, {
        ...previousMeta,
        dirty: false,
        localRevision: currentRevision,
        lastAckRevision: currentRevision,
        syncInFlight: false,
      });
      inFlightMutationsRef.current.delete(id);
      return true;
    }

    try {
      await remoteSync(nextBook);
      const latestMeta = syncMetaByBookIdRef.current.get(id);
      if (latestMeta && latestMeta.localRevision === currentRevision) {
        syncMetaByBookIdRef.current.set(id, {
          ...latestMeta,
          dirty: false,
          lastAckRevision: currentRevision,
          syncInFlight: false,
        });
      } else if (latestMeta) {
        syncMetaByBookIdRef.current.set(id, {
          ...latestMeta,
          syncInFlight: false,
        });
      }
    } catch (error) {
      logError("Failed to persist remote book update:", error);
      setBooks((prev) => prev.map((book) => (book.id === id ? previousBook! : book)));
      await putBookInDb(previousBook).catch((rollbackError) => {
        logError("Failed to rollback local book update:", rollbackError);
      });
      const latestMeta = syncMetaByBookIdRef.current.get(id);
      if (latestMeta) {
        syncMetaByBookIdRef.current.set(id, {
          ...latestMeta,
          dirty: true,
          syncInFlight: false,
        });
      }
      return false;
    } finally {
      inFlightMutationsRef.current.delete(id);
    }
    return true;
  }, [persistent]);

  const addBook = useCallback(async (file: File) => {
    const bookId = uuidv4();
    let bookData: EpubBookHandle | null = null;

    try {
      const epubArrayBuffer = await file.arrayBuffer();
      bookData = ePub(epubArrayBuffer) as unknown as EpubBookHandle;
      await bookData.ready;

      const metadata = await bookData.loaded.metadata;
      const title = metadata.title ?? "Untitled";
      const author = Array.isArray(metadata.creator)
        ? metadata.creator.join(", ") || "Unknown"
        : metadata.creator || "Unknown";

      const coverBlob = ENABLE_EPUB_COVER_EXTRACTION
        ? await extractCoverBlobFromEpubSource(epubArrayBuffer)
        : null;

      const displayCoverUrl = coverBlob ? trackCoverBlobForBook(bookId, coverBlob) : "";
      const epubBlob = new Blob([epubArrayBuffer], { type: "application/epub+zip" });

      const newBook: Book = {
        id: bookId,
        title,
        author,
        coverUrl: displayCoverUrl,
        epubBlob,
        progress: 0,
        lastLocation: "",
        addedAt: new Date().toISOString(),
        lastOpenedAt: new Date().toISOString(),
        readingList: "to-read",
        highlights: [],
        bookmarks: [],
        locationHistory: [],
      };

      setBooks((prev) => [...prev, newBook]);

      try {
        await putBookInDb(newBook);
      } catch (error) {
        setBooks((prev) => prev.filter((book) => book.id !== newBook.id));
        revokeTrackedCoverUrl(newBook.id);
        throw error;
      }

      if (!persistent) return;

      try {
        const token = await getToken();
        const result = await bookService.addBook(file, newBook, token || undefined, coverBlob);
        if (result.coverUrl && result.coverUrl !== newBook.coverUrl) {
          revokeTrackedCoverUrl(newBook.id);
          const persistedBook = { ...newBook, coverUrl: result.coverUrl };
          setBooks((prev) => prev.map((book) => (book.id === newBook.id ? persistedBook : book)));
          await putBookInDb(persistedBook).catch((dbError) => {
            logError("Failed to persist server cover URL locally:", dbError);
          });
        }
      } catch (error) {
        logError("Backend upload failed:", error);
        setBooks((prev) => prev.filter((book) => book.id !== newBook.id));
        revokeTrackedCoverUrl(newBook.id);
        await deleteBookFromDb(newBook.id).catch((dbError) => {
          logError("Failed to rollback local EPUB after backend upload failure:", dbError);
        });
        if (error instanceof ApiError && error.status === 409) {
          throw new Error("You already uploaded this book.");
        }
        throw error;
      }
    } catch (error) {
      logError("Error adding book:", error);
      throw error;
    } finally {
      bookData?.destroy?.();
    }
  }, [persistent, getToken, trackCoverBlobForBook, revokeTrackedCoverUrl]);

  const updateBookProgress = useCallback(async (id: string, progress: number, lastLocation: string) => {
    await syncBookUpdate(
      id,
      (book) => {
        const history = [...(book.locationHistory || [])];
        if (book.lastLocation && book.lastLocation !== lastLocation) {
          history.push(book.lastLocation);
          if (history.length > 10) history.shift();
        }
        return {
          ...book,
          progress,
          lastLocation,
          lastOpenedAt: new Date().toISOString(),
          locationHistory: history,
        };
      },
      async () => {
        const token = await getToken();
        await bookService.updateBookProgress(id, progress, lastLocation, token || undefined);
      }
    );
  }, [syncBookUpdate, getToken]);

  const updateBook = useCallback(async (id: string, updates: Partial<Book>): Promise<boolean> => {
    return await syncBookUpdate(
      id,
      (book) => ({ ...book, ...updates }),
      async (nextBook) => {
        const token = await getToken();
        await bookService.updateBook(id, nextBook, token || undefined);
      }
    );
  }, [syncBookUpdate, getToken]);

  const toggleFavorite = useCallback((id: string) => {
    const book = booksRef.current.find((item) => item.id === id);
    if (!book) return;
    void updateBook(id, { isFavorite: !book.isFavorite });
  }, [updateBook]);

  const addBookmark = useCallback(async (bookId: string, bookmark: Bookmark): Promise<void> => {
    const book = booksRef.current.find((item) => item.id === bookId);
    if (!book) return;
    const success = await updateBook(bookId, { bookmarks: [...(book.bookmarks || []), bookmark] });
    if (!success) throw new Error("Failed to save bookmark");
  }, [updateBook]);

  const removeBookmark = useCallback(async (bookId: string, bookmarkId: string): Promise<void> => {
    const book = booksRef.current.find((item) => item.id === bookId);
    if (!book) return;
    const success = await updateBook(bookId, { bookmarks: (book.bookmarks || []).filter((bookmark) => bookmark.id !== bookmarkId) });
    if (!success) throw new Error("Failed to remove bookmark");
  }, [updateBook]);

  const getBookContent = useCallback(async (id: string): Promise<Blob> => {
    const existing = booksRef.current.find((item) => item.id === id);
    if (existing?.epubBlob) return existing.epubBlob;

    const token = await getToken();
    const blob = await bookService.getBookContent(id, token || undefined);

    let updatedBook: Book | null = null;
    setBooks((prev) => prev.map((book) => {
      if (book.id !== id) return book;
      updatedBook = { ...book, epubBlob: blob };
      return updatedBook;
    }));

    if (updatedBook) {
      await putBookInDb(updatedBook).catch((error) => {
        logError("Failed to cache hydrated book content locally:", error);
      });

      if (ENABLE_EPUB_COVER_EXTRACTION && !updatedBook.coverUrl) {
        const blobBuffer = await blob.arrayBuffer();
        const generatedCover = await extractCoverBlobFromEpubSource(blobBuffer);
        if (generatedCover) {
          const localCoverUrl = trackCoverBlobForBook(id, generatedCover);
          let localBookWithCover: Book | null = null;
          setBooks((prev) => prev.map((book) => {
            if (book.id !== id) return book;
            localBookWithCover = { ...book, coverUrl: localCoverUrl };
            return localBookWithCover;
          }));
          if (localBookWithCover) {
            await putBookInDb(localBookWithCover).catch((error) => {
              logError("Failed to cache regenerated cover locally:", error);
            });
          }

          if (persistent) {
            try {
              const token = await getToken();
              const durableCoverUrl = await bookService.uploadBookCover(id, generatedCover, token || undefined);
              revokeTrackedCoverUrl(id);
              let serverBookWithCover: Book | null = null;
              setBooks((prev) => prev.map((book) => {
                if (book.id !== id) return book;
                serverBookWithCover = { ...book, coverUrl: durableCoverUrl };
                return serverBookWithCover;
              }));
              if (serverBookWithCover) {
                await putBookInDb(serverBookWithCover).catch((error) => {
                  logError("Failed to persist durable cover URL locally:", error);
                });
              }
            } catch (error) {
              logError("Failed to sync regenerated cover to backend:", error);
            }
          }
        }
      }
    }

    return blob;
  }, [getToken, persistent, revokeTrackedCoverUrl, trackCoverBlobForBook]);

  const recentBooks = useMemo(() =>
    [...books]
      .filter((book) => !book.isIncognito)
      .sort((a, b) => new Date(b.lastOpenedAt || 0).getTime() - new Date(a.lastOpenedAt || 0).getTime())
      .slice(0, RECENT_BOOKS_LIMIT),
    [books]
  );

  const favoriteBooks = useMemo(() => books.filter((book) => book.isFavorite), [books]);

  const sortedBooks = useMemo(() => {
    const filtered = books.filter((book) => {
      if (filterBy === "favorites") return !!book.isFavorite;
      if (filterBy === "all") return true;
      return book.readingList === filterBy;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title);
        case "author":
          return a.author.localeCompare(b.author);
        case "progress":
          return b.progress - a.progress;
        case "added":
          return new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime();
        case "recent":
        default:
          return new Date(b.lastOpenedAt || 0).getTime() - new Date(a.lastOpenedAt || 0).getTime();
      }
    });
  }, [books, sortBy, filterBy]);

  const seriesGroups = useMemo(() => {
    const groups: Record<string, Book[]> = {};
    books
      .filter((book) => book.series)
      .forEach((book) => {
        if (!groups[book.series!]) groups[book.series!] = [];
        groups[book.series!].push(book);
      });

    Object.values(groups).forEach((group) => {
      group.sort((a, b) => (a.seriesIndex || 0) - (b.seriesIndex || 0));
    });

    return groups;
  }, [books]);

  useEffect(() => {
    setBookSnapshot({
      books,
      sortedBooks,
      recentBooks,
      favoriteBooks,
      seriesGroups,
      isLoading,
      sortBy,
      filterBy,
    });
  }, [
    books,
    sortedBooks,
    recentBooks,
    favoriteBooks,
    seriesGroups,
    isLoading,
    sortBy,
    filterBy,
    setBookSnapshot,
  ]);

  useEffect(() => {
    bindBookHandlers({
      addBook,
      updateBookProgress,
      toggleFavorite,
      addBookmark,
      removeBookmark,
      getBookContent,
      reloadBooks: loadBooks,
      setSortBy,
      setFilterBy,
    }, handlerOwnerIdRef.current);
  }, [
    addBook,
    updateBookProgress,
    toggleFavorite,
    addBookmark,
    removeBookmark,
    getBookContent,
    loadBooks,
    setSortBy,
    setFilterBy,
    bindBookHandlers,
  ]);

  return {
    books,
    sortedBooks,
    recentBooks,
    favoriteBooks,
    seriesGroups,
    addBook,
    updateBookProgress,
    toggleFavorite,
    addBookmark,
    removeBookmark,
    getBookContent,
    sortBy,
    setSortBy,
    filterBy,
    setFilterBy,
    isLoading,
    isPersistent: persistent,
    reloadBooks: loadBooks,
  };
}
