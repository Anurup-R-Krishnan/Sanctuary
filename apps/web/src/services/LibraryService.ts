import { v4 as uuidv4 } from "uuid";

import type { Book, Bookmark } from "@/types";
import type { EpubBookHandle } from "@/utils/epub";

import { bookService } from "@/services/bookService";
import { logErrorOnce, HttpError } from "@/services/http";
import { useBookStore } from "@/store/useBookStore";
import { putBook as putBookInDb, deleteBook as deleteBookFromDb, getAllBooks } from "@/utils/db";
import { extractCoverBlobFromEpubSource, openEpub } from "@/utils/epub";

type BookSyncMeta = {
  dirty: boolean;
  localRevision: number;
  lastAckRevision: number;
  syncInFlight: boolean;
  serverUpdatedAt?: string | undefined;
};

const coverObjectUrlByBookId = new Map<string, string>();
const syncMetaByBookId = new Map<string, BookSyncMeta>();
const inFlightMutations = new Set<string>();
const pendingImports = new Set<string>();
const pendingDeletions = new Set<string>();

const getInitialSyncMeta = (): BookSyncMeta => ({
  dirty: false,
  localRevision: 0,
  lastAckRevision: 0,
  syncInFlight: false,
});

const setBooks = (updater: (books: Book[]) => Book[]) => {
  useBookStore.setState((state) => {
    const books = updater(state.books);
    state.updateDerivedState(books);
    return { books };
  });
};

const replaceBookInStore = (id: string, updater: (book: Book) => Book): Book | null => {
  let nextBook: Book | null = null;
  setBooks((books) => books.map((book) => {
    if (book.id !== id) return book;
    nextBook = updater(book);
    return nextBook;
  }));
  return nextBook;
};

const saveBookToDb = async (book: Book, message: string) => {
  await putBookInDb(book).catch((error) => {
    console.error(message, error);
  });
};

const revokeTrackedCoverUrl = (bookId: string) => {
  const url = coverObjectUrlByBookId.get(bookId);
  if (!url) return;
  URL.revokeObjectURL(url);
  coverObjectUrlByBookId.delete(bookId);
};

const setTrackedCoverUrl = (bookId: string, url: string) => {
  const prev = coverObjectUrlByBookId.get(bookId);
  if (prev && prev !== url) {
    URL.revokeObjectURL(prev);
  }
  coverObjectUrlByBookId.set(bookId, url);
};

const trackCoverBlobForBook = (bookId: string, blob: Blob): string => {
  const url = URL.createObjectURL(blob);
  setTrackedCoverUrl(bookId, url);
  return url;
};

const reconcileTrackedCoverUrls = (nextBooks: Book[]) => {
  const nextCoverById = new Map(nextBooks.map((book) => [book.id, book.coverUrl]));
  for (const [bookId, trackedUrl] of coverObjectUrlByBookId.entries()) {
    const nextCover = nextCoverById.get(bookId);
    if (!nextCover || nextCover !== trackedUrl) {
      URL.revokeObjectURL(trackedUrl);
      coverObjectUrlByBookId.delete(bookId);
    }
  }
};

const revertLocalBookState = (id: string, previousBook: Book, meta: BookSyncMeta) => {
  setBooks((books) => books.map((book) => (book.id === id ? previousBook : book)));
  syncMetaByBookId.set(id, {
    ...meta,
    syncInFlight: false,
  });
  inFlightMutations.delete(id);
};

const revertLocalBookAddition = (id: string) => {
  setBooks((books) => books.filter((book) => book.id !== id));
  revokeTrackedCoverUrl(id);
};

const syncBookUpdate = async (
  id: string,
  updater: (book: Book) => Book,
  remoteSync: (next: Book) => Promise<void>,
  isPersistent: boolean
) => {
  let previousBook: Book | null = null;

  const nextBook = replaceBookInStore(id, (book) => {
    previousBook = book;
    return updater(book);
  });

  if (!nextBook || !previousBook) return;
  inFlightMutations.add(id);
  const previousMeta = syncMetaByBookId.get(id) || getInitialSyncMeta();
  const currentRevision = previousMeta.localRevision + 1;
  syncMetaByBookId.set(id, {
    ...previousMeta,
    dirty: true,
    localRevision: currentRevision,
    syncInFlight: true,
  });

  try {
    await putBookInDb(nextBook);
  } catch (error) {
    console.error("Failed to persist local book update:", error);
    revertLocalBookState(id, previousBook, previousMeta);
    return;
  }

  if (!isPersistent) {
    syncMetaByBookId.set(id, {
      ...previousMeta,
      dirty: false,
      localRevision: currentRevision,
      lastAckRevision: currentRevision,
      syncInFlight: false,
    });
    inFlightMutations.delete(id);
    return;
  }

  try {
    await remoteSync(nextBook);
    const latestMeta = syncMetaByBookId.get(id);
    if (latestMeta && latestMeta.localRevision === currentRevision) {
      syncMetaByBookId.set(id, {
        ...latestMeta,
        dirty: false,
        lastAckRevision: currentRevision,
        syncInFlight: false,
      });
    } else if (latestMeta) {
      syncMetaByBookId.set(id, {
        ...latestMeta,
        syncInFlight: false,
      });
    }
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      console.warn(`Book ${id} not found on server (404). Purging local cache.`);
      revertLocalBookAddition(id);
      await deleteBookFromDb(id).catch(console.error);
    } else {
      console.error("Failed to persist remote book update:", error);
      revertLocalBookState(id, previousBook, previousMeta);
      await putBookInDb(previousBook).catch((rollbackError) => {
        console.error("Failed to rollback local book update:", rollbackError);
      });
      const latestMeta = syncMetaByBookId.get(id);
      if (latestMeta) {
        syncMetaByBookId.set(id, {
          ...latestMeta,
          dirty: true,
          syncInFlight: false,
        });
      }
    }
  } finally {
    inFlightMutations.delete(id);
  }
};

export const libraryService = {
  cleanupAllObjectUrls() {
    for (const url of coverObjectUrlByBookId.values()) {
      URL.revokeObjectURL(url);
    }
    coverObjectUrlByBookId.clear();
  },

  async loadBooks(getToken: () => Promise<string | null>, isPersistent: boolean) {
    if (!isPersistent) {
      this.cleanupAllObjectUrls();
      useBookStore.getState().setBooks([]);
      useBookStore.getState().setIsLoading(false);
      return;
    }

    useBookStore.getState().setIsLoading(true);
    try {
      const token = await getToken();
      const stored = await bookService.getBooks(token || undefined);
      const booksRef = useBookStore.getState().books;
      const localById = new Map(booksRef.map((book) => [book.id, book]));
      
      const hydrated: Book[] = stored.map((s): Book => {
        const local = localById.get(s.id);
        const syncMeta = syncMetaByBookId.get(s.id);
        const remoteBook: Book = {
          ...s,
          coverUrl: s.coverUrl,
          epubBlob: null,
        };
        if (syncMeta) {
          syncMetaByBookId.set(s.id, {
            ...syncMeta,
            serverUpdatedAt: s.lastOpenedAt || s.addedAt || syncMeta.serverUpdatedAt,
          });
        }

        if (!local) return remoteBook;
        const hasUnsyncedLocal = !!syncMeta?.dirty || (syncMeta?.localRevision || 0) > (syncMeta?.lastAckRevision || 0);
        if (!hasUnsyncedLocal && !inFlightMutations.has(s.id)) return remoteBook;

        return {
          ...remoteBook,
          ...(local.progress !== undefined ? { progress: local.progress } : {}),
          ...(local.lastLocation !== undefined ? { lastLocation: local.lastLocation } : {}),
          ...(local.lastOpenedAt !== undefined ? { lastOpenedAt: local.lastOpenedAt } : {}),
          ...(local.locationHistory !== undefined ? { locationHistory: local.locationHistory } : {}),
          ...(local.bookmarks !== undefined ? { bookmarks: local.bookmarks } : {}),
          ...(local.isFavorite !== undefined ? { isFavorite: local.isFavorite } : {}),
          ...(local.readingList !== undefined ? { readingList: local.readingList } : {}),
          ...(local.completedAt !== undefined ? { completedAt: local.completedAt } : {}),
          ...(local.tags !== undefined ? { tags: local.tags } : {}),
          ...(local.totalPages !== undefined ? { totalPages: local.totalPages } : {}),
        };
      });

      reconcileTrackedCoverUrls(hydrated);
      useBookStore.getState().setBooks(hydrated);

      const localDbBooks = await getAllBooks().catch(() => [] as Book[]);
      const remoteIds = new Set(stored.map((b) => b.id));
      for (const localBook of localDbBooks) {
        if (!remoteIds.has(localBook.id) && !inFlightMutations.has(localBook.id)) {
          // INV-SYNC-001: Shield guest books ("pending") from GC and push to cloud.
          if (localBook.syncStatus === "pending") {
            console.log(`Transitioning guest book to auth: ${localBook.title}`);
            const epubFile = new File([localBook.epubBlob!], `${localBook.id}.epub`, { type: "application/epub+zip" });
            bookService.addBook(epubFile, localBook, token || undefined, localBook.coverBlob)
              .then(result => {
                const persistedBook = { ...localBook, syncStatus: "synced" as const, ...(result.coverUrl ? { coverUrl: result.coverUrl } : {}) };
                replaceBookInStore(localBook.id, () => persistedBook);
                saveBookToDb(persistedBook, "Failed to persist synced book:");
              })
              .catch(e => console.error("Failed to sync guest book to cloud:", e));
          } else {
            await deleteBookFromDb(localBook.id).catch((err) => {
              console.error(`Failed to garbage collect orphaned local book ${localBook.id}:`, err);
            });
            revokeTrackedCoverUrl(localBook.id);
          }
        }
      }
    } catch (error) {
      logErrorOnce("books-load", "Failed to load books:", error);
    } finally {
      useBookStore.getState().setIsLoading(false);
    }
  },

  async addBook(file: File, getToken: () => Promise<string | null>, isPersistent: boolean) {
    const bookId = uuidv4();
    let bookData: EpubBookHandle | null = null;

    let importKey: string | null = null;
    try {
      const epubArrayBuffer = await file.arrayBuffer();

      const hashBuffer = await crypto.subtle.digest("SHA-256", epubArrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const contentHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      importKey = contentHash;
      if (pendingImports.has(importKey)) {
        throw new Error(`The file "${file.name}" is currently being imported.`);
      }
      pendingImports.add(importKey);

      const existingBooks = useBookStore.getState().books;
      const isDuplicate = existingBooks.some(b => b.contentHash === contentHash);
      if (isDuplicate) {
        throw new Error(`The exact file "${file.name}" is already in your library.`);
      }

      bookData = openEpub(epubArrayBuffer);
      await bookData.ready;

      const metadata = await bookData.loaded.metadata;
      const title = metadata.title ?? "Untitled";
      const author = Array.isArray(metadata.creator)
        ? metadata.creator.join(", ") || "Unknown"
        : metadata.creator || "Unknown";

      const coverBlob = await extractCoverBlobFromEpubSource(epubArrayBuffer);

      const displayCoverUrl = coverBlob ? trackCoverBlobForBook(bookId, coverBlob) : "";
      const epubBlob = new Blob([epubArrayBuffer], { type: "application/epub+zip" });

      const newBook: Book = {
        id: bookId,
        title,
        author,
        coverUrl: displayCoverUrl,
        epubBlob,
        coverBlob: coverBlob || null,
        contentHash,
        syncStatus: isPersistent ? "synced" : "pending",
        progress: 0,
        lastLocation: "",
        addedAt: new Date().toISOString(),
        lastOpenedAt: new Date().toISOString(),
        readingList: "to-read",
        highlights: [],
        bookmarks: [],
        locationHistory: [],
      };

      setBooks((books) => [...books, newBook]);

      try {
        await putBookInDb(newBook);
      } catch (error) {
        revertLocalBookAddition(newBook.id);
        throw error;
      }

      if (!isPersistent) return;

      try {
        const token = await getToken();
        const result = await bookService.addBook(file, newBook, token || undefined, coverBlob);
        if (result.coverUrl && result.coverUrl !== newBook.coverUrl) {
          revokeTrackedCoverUrl(newBook.id);
          const persistedBook = { ...newBook, coverUrl: result.coverUrl };
          replaceBookInStore(newBook.id, () => persistedBook);
          await saveBookToDb(persistedBook, "Failed to persist server cover URL locally:");
        }
      } catch (error) {
        console.error("Backend upload failed:", error);
        revertLocalBookAddition(newBook.id);
        await deleteBookFromDb(newBook.id).catch((dbError) => {
          console.error("Failed to rollback local EPUB after backend upload failure:", dbError);
        });
        throw error;
      }
    } catch (error) {
      console.error("Error adding book:", error);
      if (error instanceof Error && error.message.includes("already in your library")) throw error;
      if (error instanceof Error && error.message.includes("currently being imported")) throw error;
      throw new Error(`Failed to import EPUB file: ${error instanceof Error ? error.message : "Invalid format"}`);
    } finally {
      bookData?.destroy?.();
      if (importKey) pendingImports.delete(importKey);
    }
  },

  async updateBookProgress(id: string, progress: number, lastLocation: string, getToken: () => Promise<string | null>, isPersistent: boolean) {
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
        await bookService.updateBookProgress(id, progress, lastLocation);
      },
      isPersistent
    );
  },

  async updateBook(id: string, updates: Partial<Book>, getToken: () => Promise<string | null>, isPersistent: boolean) {
    await syncBookUpdate(
      id,
      (book) => ({ ...book, ...updates }),
      async (nextBook) => {
        await bookService.updateBook(id, nextBook);
      },
      isPersistent
    );
  },

  toggleFavorite(id: string, getToken: () => Promise<string | null>, isPersistent: boolean) {
    const book = useBookStore.getState().books.find((item) => item.id === id);
    if (!book) return;
    void this.updateBook(id, { isFavorite: !book.isFavorite }, getToken, isPersistent);
  },

  addBookmark(bookId: string, bookmark: Bookmark, getToken: () => Promise<string | null>, isPersistent: boolean) {
    const book = useBookStore.getState().books.find((item) => item.id === bookId);
    if (!book) return;
    void this.updateBook(bookId, { bookmarks: [...(book.bookmarks || []), bookmark] }, getToken, isPersistent);
  },

  removeBookmark(bookId: string, bookmarkId: string, getToken: () => Promise<string | null>, isPersistent: boolean) {
    const book = useBookStore.getState().books.find((item) => item.id === bookId);
    if (!book) return;
    void this.updateBook(bookId, { bookmarks: (book.bookmarks || []).filter((b) => b.id !== bookmarkId) }, getToken, isPersistent);
  },

  async deleteBook(id: string, getToken: () => Promise<string | null>, isPersistent: boolean) {
    if (pendingDeletions.has(id)) return;
    pendingDeletions.add(id);

    try {
      const book = useBookStore.getState().books.find((item) => item.id === id);
      if (!book) return;

      // Optimistically remove from UI
      useBookStore.getState().setBooks(useBookStore.getState().books.filter((b) => b.id !== id));

      // Cleanup Object URLs to free memory
      if (book.coverUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(book.coverUrl);
      }
      revokeTrackedCoverUrl(id);

      try {
        // 1. Remove from local IndexedDB
        await deleteBookFromDb(id);

        // 2. Remove remote if persistent
        if (isPersistent) {
          await syncQueue.enqueue("DELETE_LIBRARY", { id });
        }
      } catch (error) {
        // Rollback UI
        console.error("Failed to delete book:", error);
        useBookStore.getState().setBooks([...useBookStore.getState().books, book]);
        throw error;
      }
    } finally {
      pendingDeletions.delete(id);
    }
  },

  async getBookContent(id: string, getToken: () => Promise<string | null>, isPersistent: boolean): Promise<Blob> {
    const existing = useBookStore.getState().books.find((item) => item.id === id);
    if (existing?.epubBlob) return existing.epubBlob;

    const token = await getToken();
    const blob = await bookService.getBookContent(id, token || undefined);

    const updatedBook = replaceBookInStore(id, (book) => ({ ...book, epubBlob: blob }));

    if (updatedBook) {
      await saveBookToDb(updatedBook, "Failed to cache hydrated book content locally:");

      if (!updatedBook.coverUrl) {
        const blobBuffer = await blob.arrayBuffer();
        const generatedCover = await extractCoverBlobFromEpubSource(blobBuffer);
        if (generatedCover) {
          const localCoverUrl = trackCoverBlobForBook(id, generatedCover);
          const localBookWithCover = replaceBookInStore(id, (book) => ({ ...book, coverUrl: localCoverUrl }));
          
          if (localBookWithCover) {
            await saveBookToDb(localBookWithCover, "Failed to cache regenerated cover locally:");
          }

          if (isPersistent) {
            try {
              const token = await getToken();
              const durableCoverUrl = await bookService.uploadBookCover(id, generatedCover, token || undefined);
              revokeTrackedCoverUrl(id);
              const serverBookWithCover = replaceBookInStore(id, (book) => ({ ...book, coverUrl: durableCoverUrl }));
              
              if (serverBookWithCover) {
                await saveBookToDb(serverBookWithCover, "Failed to persist durable cover URL locally:");
              }
            } catch (error) {
              console.error("Failed to sync regenerated cover to backend:", error);
            }
          }
        }
      }
    }

    return blob;
  }
};
