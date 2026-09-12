import { v4 as uuidv4 } from "uuid";

import type { Book, Bookmark } from "@/types";

import { FoliateEpubAdapter } from "@/reader/foliate/FoliateEpubAdapter";
import { isSupportedExtension } from "@/reader/formats/FormatDetector";
import { BookContentError, getVerifiedBookContent, saveBookContent, verifyBookContent } from "@/services/bookContentRepository";
import { bookService } from "@/services/bookService";
import { logErrorOnce, HttpError } from "@/services/http";
import { syncQueue } from "@/services/SyncQueue";
import { useBookStore } from "@/store/useBookStore";
import { calculateEpubHash } from "@/utils/crypto";
import { deleteBook as deleteBookFromDb, deleteBookContent, getAllBooks, putBook as putBookInDb } from "@/utils/db";
import { extractCoverBlobFromEpubSource } from "@/utils/epub";

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
  const nextBooks = updater(useBookStore.getState().books);
  useBookStore.getState().setBooks(nextBooks);
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
  await putBookInDb({ ...book, epubBlob: null }).catch((error) => {
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
    await putBookInDb({ ...nextBook, epubBlob: null });
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
      await Promise.all([deleteBookFromDb(id), deleteBookContent(id)]).catch(console.error);
    } else {
      console.error("Failed to persist remote book update:", error);
      revertLocalBookState(id, previousBook, previousMeta);
      await putBookInDb({ ...previousBook, epubBlob: null }).catch((rollbackError) => {
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

import type { SanctuaryApiClient } from "@sanctuary/core";

export const libraryService = {
  cleanupAllObjectUrls() {
    for (const url of coverObjectUrlByBookId.values()) {
      URL.revokeObjectURL(url);
    }
    coverObjectUrlByBookId.clear();
  },

  async loadBooks(api: SanctuaryApiClient, isPersistent: boolean) {
    if (!isPersistent) {
      useBookStore.getState().setIsLoading(true);
      try {
        const rawLocalBooks = await getAllBooks().catch(() => [] as Book[]);
        const localDbBooks = await Promise.all(rawLocalBooks.map(async (book) => {
          if (book.coverBlob) {
             book.coverUrl = trackCoverBlobForBook(book.id, book.coverBlob);
          }
          try {
            const verified = await getVerifiedBookContent(book.id);
            if (!verified) throw new BookContentError("BOOK_CONTENT_MISSING", `No EPUB content is stored for book ${book.id}.`);
            book.epubBlob = verified.blob;
            book.contentStatus = "available";
          } catch (error) {
            book.contentStatus = error instanceof BookContentError && error.code === "BOOK_CONTENT_MISSING"
              ? "missing"
              : "invalid";
            console.warn(`Local EPUB integrity check failed for ${book.id}:`, error);
          }
          return book;
        }));
        reconcileTrackedCoverUrls(localDbBooks);
        useBookStore.getState().setBooks(localDbBooks);
      } catch (error) {
        console.error("Failed to load local books in guest mode:", error);
      } finally {
        useBookStore.getState().setIsLoading(false);
      }
      return;
    }

    useBookStore.getState().setIsLoading(true);
    try {
      const [stored, localDbBooks] = await Promise.all([
        api.getLibrary().catch(() => []),
        getAllBooks().catch(() => [] as Book[]),
      ]);
      const localById = new Map(localDbBooks.map((book) => [book.id, book]));
      
      const hydrated: Book[] = stored.map((s): Book => {
        const local = localById.get(s.id);
        const syncMeta = syncMetaByBookId.get(s.id);
        const localCoverUrl = local?.coverBlob
            ? trackCoverBlobForBook(s.id, local.coverBlob) 
            : (s.coverUrl || local?.coverUrl || "");

        const remoteBook: Book = {
          ...s,
          coverUrl: localCoverUrl || "",
          coverBlob: local?.coverBlob || null,
          progress: s.progressPercent || 0,
          epubBlob: null,
          contentHash: "",
          syncStatus: "synced",
          addedAt: s.updatedAt,
          lastOpenedAt: s.updatedAt,
          readingList: s.status,
          isFavorite: s.favorite || false,
          lastLocation: s.lastLocation || "",
          bookmarks: (s.bookmarks || []).map((b: { cfi: string; title?: string }) => ({
            id: `${s.id}:${encodeURIComponent(b.cfi)}`,
            cfi: b.cfi,
            title: b.title || "",
            createdAt: new Date().toISOString(),
          })),
          locationHistory: []
        };
        if (syncMeta) {
          syncMetaByBookId.set(s.id, {
            ...syncMeta,
            serverUpdatedAt: s.updatedAt || syncMeta.serverUpdatedAt,
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

      const remoteIds = new Set(stored.map((b) => b.id));
      const postSyncBooks = await getAllBooks().catch(() => [] as Book[]);
      const unmappedLocalBooks = postSyncBooks.map(book => {
          if (book.coverBlob && !remoteIds.has(book.id)) {
              book.coverUrl = trackCoverBlobForBook(book.id, book.coverBlob);
          }
          return book;
      });
      for (const localBook of unmappedLocalBooks) {
        if (!remoteIds.has(localBook.id) && !inFlightMutations.has(localBook.id)) {
          // INV-SYNC-001: Shield guest books ("pending") from GC.
          // The MigrationDialog handles migrating them explicitly.
          if (localBook.syncStatus !== "pending") {
            await Promise.all([deleteBookFromDb(localBook.id), deleteBookContent(localBook.id)]).catch((err) => {
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

  async _migrateBook(file: File, localBook: Book, api: SanctuaryApiClient) {
    const result = await bookService.addBook(file, localBook, api, localBook.coverBlob);
    const persistedBook = { 
      ...localBook, 
      syncStatus: "synced" as const, 
      ...(result.coverUrl ? { coverUrl: result.coverUrl } : {}) 
    };
    replaceBookInStore(localBook.id, () => persistedBook);
    await saveBookToDb(persistedBook, "Failed to persist synced book:");
    return persistedBook;
  },

  async replaceBookContent(id: string, file: File, api: SanctuaryApiClient, isPersistent: boolean) {
    const existing = useBookStore.getState().books.find((book) => book.id === id);
    if (!existing) throw new Error("This book is no longer in your library.");
    if (!isSupportedExtension(file.name)) throw new Error("Unsupported format for book replacement.");

    let adapter: FoliateEpubAdapter | null = null;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const contentHash = await calculateEpubHash(arrayBuffer);
      const epubBlob = new Blob([arrayBuffer], { type: file.type || "application/octet-stream" });
      await verifyBookContent(id, epubBlob, contentHash, file.name);

      adapter = await FoliateEpubAdapter.create(epubBlob, file.name);
      const title = adapter.metadata.title || existing.title;
      const author = adapter.metadata.author || existing.author;
      const coverBlob = await adapter.getCoverBlob();
      const coverUrl = coverBlob ? trackCoverBlobForBook(id, coverBlob) : existing.coverUrl;
      const repairedBook: Book = {
        ...existing,
        author,
        contentHash,
        contentStatus: "available",
        coverBlob: coverBlob || existing.coverBlob || null,
        coverUrl,
        epubBlob,
        format: adapter.format,
        title,
      };

      await saveBookContent(repairedBook);
      replaceBookInStore(id, () => repairedBook);

      if (isPersistent) {
        try {
          await bookService.addBook(file, repairedBook, api, coverBlob);
        } catch (error) {
          console.warn("Repaired local EPUB could not be uploaded; keeping the local copy:", error);
        }
      }
    } finally {
      adapter?.destroy();
    }
  },

  async addBook(file: File, api: SanctuaryApiClient, isPersistent: boolean) {
    const bookId = uuidv4();
    let adapter: FoliateEpubAdapter | null = null;

    let importKey: string | null = null;
    try {
      const epubArrayBuffer = await file.arrayBuffer();

      const contentHash = await calculateEpubHash(epubArrayBuffer);

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

      const epubBlob = new Blob([epubArrayBuffer], { type: file.type || "application/octet-stream" });
      adapter = await FoliateEpubAdapter.create(epubBlob, file.name);

      const title = adapter.metadata.title ?? "Untitled";
      const author = adapter.metadata.author || "Unknown";
      const coverBlob = await adapter.getCoverBlob();

      const displayCoverUrl = coverBlob ? trackCoverBlobForBook(bookId, coverBlob) : "";

      const newBook: Book = {
        id: bookId,
        title,
        author,
        coverUrl: displayCoverUrl,
        epubBlob,
        coverBlob: coverBlob || null,
        contentHash,
        contentStatus: "available",
        format: adapter.format,
        syncStatus: isPersistent ? "synced" : "local-only",
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
        await saveBookContent(newBook);
      } catch (error) {
        revertLocalBookAddition(newBook.id);
        throw error;
      }

      if (!isPersistent) return;

      try {
        const result = await bookService.addBook(file, newBook, api, coverBlob);
        if (result.coverUrl && result.coverUrl !== newBook.coverUrl) {
          revokeTrackedCoverUrl(newBook.id);
          const persistedBook = { ...newBook, coverUrl: result.coverUrl };
          replaceBookInStore(newBook.id, () => persistedBook);
          await saveBookToDb(persistedBook, "Failed to persist server cover URL locally:");
        }
      } catch (error) {
        console.error("Backend upload failed:", error);
        console.error("Backend upload failed; keeping the local desktop copy:", error);
        syncMetaByBookId.set(newBook.id, {
          ...getInitialSyncMeta(),
          dirty: true,
          localRevision: 1,
          lastAckRevision: 0,
          syncInFlight: false,
        });
        return;
      }
    } catch (error) {
      console.error("Error adding book:", error);
      if (error instanceof Error && error.message.includes("already in your library")) throw error;
      if (error instanceof Error && error.message.includes("currently being imported")) throw error;
      throw new Error(`Failed to import book file: ${error instanceof Error ? error.message : "Invalid format"}`);
    } finally {
      adapter?.destroy();
      if (importKey) pendingImports.delete(importKey);
    }
  },

  async updateBookProgress(id: string, progress: number, lastLocation: string, api: SanctuaryApiClient, isPersistent: boolean) {
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
        await api.patchLibraryItem(id, { progress, lastLocation });
      },
      isPersistent
    );
  },

  async updateBook(id: string, updates: Partial<Book>, api: SanctuaryApiClient, isPersistent: boolean) {
    await syncBookUpdate(
      id,
      (book) => ({ ...book, ...updates }),
      async (nextBook) => {
        await api.patchLibraryItem(id, {
          title: nextBook.title,
          author: nextBook.author,
          coverUrl: nextBook.coverUrl,
          progress: nextBook.progress,
          totalPages: nextBook.totalPages,
          lastLocation: nextBook.lastLocation,
          favorite: nextBook.isFavorite,
          bookmarks: nextBook.bookmarks?.map(b => ({ cfi: b.cfi, title: b.title })),
        });
      },
      isPersistent
    );
  },

  toggleFavorite(id: string, api: SanctuaryApiClient, isPersistent: boolean) {
    const book = useBookStore.getState().books.find((item) => item.id === id);
    if (!book) return;
    void this.updateBook(id, { isFavorite: !book.isFavorite }, api, isPersistent);
  },

  addBookmark(bookId: string, bookmark: Bookmark, api: SanctuaryApiClient, isPersistent: boolean) {
    const book = useBookStore.getState().books.find((item) => item.id === bookId);
    if (!book) return;
    void this.updateBook(bookId, { bookmarks: [...(book.bookmarks || []), bookmark] }, api, isPersistent);
  },

  removeBookmark(bookId: string, bookmarkId: string, api: SanctuaryApiClient, isPersistent: boolean) {
    const book = useBookStore.getState().books.find((item) => item.id === bookId);
    if (!book) return;
    void this.updateBook(bookId, { bookmarks: (book.bookmarks || []).filter((b) => b.id !== bookmarkId) }, api, isPersistent);
  },

  async deleteBook(id: string, api: SanctuaryApiClient, isPersistent: boolean) {
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
            await Promise.all([deleteBookFromDb(id), deleteBookContent(id)]);

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

  async getBookContent(id: string, api: SanctuaryApiClient, isPersistent: boolean): Promise<Blob> {
    const existing = useBookStore.getState().books.find((item) => item.id === id);
    if (existing?.epubBlob) {
      try {
        return (await verifyBookContent(id, existing.epubBlob, existing.contentHash)).blob;
      } catch (error) {
        console.warn("In-memory EPUB failed verification; checking durable storage:", error);
      }
    }

    const local = await getVerifiedBookContent(id).catch((error) => {
      if (error instanceof BookContentError) throw error;
      throw new BookContentError("BOOK_CONTENT_READ_FAILED", `The local EPUB for book ${id} could not be loaded.`, error);
    });
    if (local) {
      replaceBookInStore(id, (book) => ({ ...book, epubBlob: local.blob }));
      return local.blob;
    }

    const blob = await bookService.getBookContent(id, api);
    await verifyBookContent(id, blob);

    const updatedBook = replaceBookInStore(id, (book) => ({ ...book, epubBlob: blob, contentStatus: "available" }));

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
              const durableCoverUrl = await bookService.uploadBookCover(id, generatedCover, api);
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
