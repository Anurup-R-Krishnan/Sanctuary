import type { Book } from "@/types";

const DB_NAME = "SanctuaryReaderDB";
const DB_VERSION = 7;
const BOOKS_STORE = "books";
const BOOK_CONTENTS_STORE = "book_contents";
const VOCAB_STORE = "vocabulary";
const SESSIONS_STORE = "sessions";
const MUTATIONS_STORE = "mutations";
const READER_CACHE_STORE = "reader_cache";
const ANNOTATIONS_STORE = "annotations";

let db: IDBDatabase | undefined;
let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (db) return Promise.resolve(db);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => {
      dbPromise = null;
      reject(new Error("Database error: " + request.error?.message));
    };
    request.onblocked = () => {
      dbPromise = null;
      reject(new Error("Database open blocked by another connection"));
    };
    request.onsuccess = () => {
      db = request.result;
      db.onversionchange = () => {
        if (db) {
          db.close();
          db = undefined;
        }
      };
      dbPromise = null;
      resolve(db);
    };
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;

      // Force a clean reset for production readiness if migrating from prototype versions
      if (oldVersion < 5) {
        if (database.objectStoreNames.contains(BOOKS_STORE)) database.deleteObjectStore(BOOKS_STORE);
        if (database.objectStoreNames.contains(VOCAB_STORE)) database.deleteObjectStore(VOCAB_STORE);
        if (database.objectStoreNames.contains(SESSIONS_STORE)) database.deleteObjectStore(SESSIONS_STORE);
        if (database.objectStoreNames.contains(MUTATIONS_STORE)) database.deleteObjectStore(MUTATIONS_STORE);
      }

      if (!database.objectStoreNames.contains(BOOKS_STORE)) {
        const booksStore = database.createObjectStore(BOOKS_STORE, { keyPath: "id" });
        booksStore.createIndex("syncStatus", "syncStatus", { unique: false });
      }
      if (!database.objectStoreNames.contains(BOOK_CONTENTS_STORE)) {
        database.createObjectStore(BOOK_CONTENTS_STORE, { keyPath: "bookId" });
      }
      if (!database.objectStoreNames.contains(VOCAB_STORE)) {
        database.createObjectStore(VOCAB_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(SESSIONS_STORE)) {
        database.createObjectStore(SESSIONS_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(MUTATIONS_STORE)) {
        database.createObjectStore(MUTATIONS_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(READER_CACHE_STORE)) {
        database.createObjectStore(READER_CACHE_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(ANNOTATIONS_STORE)) {
        const annStore = database.createObjectStore(ANNOTATIONS_STORE, { keyPath: "id" });
        annStore.createIndex("bookId", "bookId", { unique: false });
      }
    };
  });

  return dbPromise;
}

function bindTxFailure(tx: IDBTransaction, reject: (reason?: unknown) => void, message: string) {
  tx.onerror = () => reject(new Error(`${message}: ${tx.error?.message || "transaction failed"}`));
  tx.onabort = () => reject(new Error(`${message}: ${tx.error?.message || "transaction aborted"}`));
}

async function dbGet<T>(store: string, key: string): Promise<T | null> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(store, "readonly");
    bindTxFailure(tx, reject, `Failed to get from ${store}`);
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
    req.onerror = () => reject(new Error(`Failed to get from ${store}: ${req.error?.message}`));
  });
}

async function dbPut<T>(store: string, value: T): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(store, "readwrite");
    bindTxFailure(tx, reject, `Failed to save to ${store}`);
    const req = tx.objectStore(store).put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(new Error(`Failed to save to ${store}: ${req.error?.message}`));
  });
}

async function dbDelete(store: string, key: string): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(store, "readwrite");
    bindTxFailure(tx, reject, `Failed to delete from ${store}`);
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(new Error(`Failed to delete from ${store}: ${req.error?.message}`));
  });
}

async function dbGetAll<T>(store: string): Promise<T[]> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(store, "readonly");
    bindTxFailure(tx, reject, `Failed to get all from ${store}`);
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve((req.result as T[]) || []);
    req.onerror = () => reject(new Error(`Failed to get all from ${store}: ${req.error?.message}`));
  });
}

async function dbClear(store: string): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(store, "readwrite");
    bindTxFailure(tx, reject, `Failed to clear ${store}`);
    const req = tx.objectStore(store).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(new Error(`Failed to clear ${store}: ${req.error?.message}`));
  });
}

export async function putBook(book: Book): Promise<void> {
  return dbPut(BOOKS_STORE, book);
}

export async function getBookById(id: string): Promise<Book | null> {
  return dbGet<Book>(BOOKS_STORE, id);
}

export async function deleteBook(id: string): Promise<void> {
  return dbDelete(BOOKS_STORE, id);
}

export async function getAllBooks(): Promise<Book[]> {
  return dbGetAll<Book>(BOOKS_STORE);
}

export async function clearBooks(): Promise<void> {
  return dbClear(BOOKS_STORE);
}

export interface StoredBookContent {
  blob: Blob;
  bookId: string;
  contentHash?: string;
  storedAt: string;
}

export async function putBookContent(content: StoredBookContent): Promise<void> {
  return dbPut(BOOK_CONTENTS_STORE, content);
}

export async function getBookContent(bookId: string): Promise<StoredBookContent | null> {
  return dbGet<StoredBookContent>(BOOK_CONTENTS_STORE, bookId);
}

export async function deleteBookContent(bookId: string): Promise<void> {
  return dbDelete(BOOK_CONTENTS_STORE, bookId);
}

async function dbPutAll<T>(store: string, values: T[]): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(store, "readwrite");
    bindTxFailure(tx, reject, `Failed to save multiple to ${store}`);
    const objStore = tx.objectStore(store);
    values.forEach(value => objStore.put(value));
    tx.oncomplete = () => resolve();
  });
}

// Session store helpers
import type { ReadingSession } from "@/types";

export async function putSession(session: ReadingSession): Promise<void> {
  return dbPut(SESSIONS_STORE, session);
}

export async function putSessions(sessions: ReadingSession[]): Promise<void> {
  return dbPutAll(SESSIONS_STORE, sessions);
}

export async function getAllSessions(): Promise<ReadingSession[]> {
  return dbGetAll<ReadingSession>(SESSIONS_STORE);
}


// Mutations store helpers
export interface SyncMutation {
  createdAt: number;
  id: string; // uuid
  payload: unknown;
  type:
    | "DELETE_ANNOTATION"
    | "DELETE_LIBRARY"
    | "PATCH_LIBRARY"
    | "SAVE_ANNOTATION"
    | "SAVE_SESSION"
    | "SAVE_SETTINGS";
}

export async function putMutation(mutation: SyncMutation): Promise<void> {
  return dbPut(MUTATIONS_STORE, mutation);
}

export async function getAllMutations(): Promise<SyncMutation[]> {
  return dbGetAll<SyncMutation>(MUTATIONS_STORE);
}

export async function deleteMutation(id: string): Promise<void> {
  return dbDelete(MUTATIONS_STORE, id);
}


// Annotations helpers
import type { ReaderAnnotation } from "@/types/reader";

export async function putAnnotation(annotation: ReaderAnnotation): Promise<void> {
  return dbPut(ANNOTATIONS_STORE, annotation);
}

export async function getAnnotationsByBook(bookId: string): Promise<ReaderAnnotation[]> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(ANNOTATIONS_STORE, "readonly");
    bindTxFailure(tx, reject, `Failed to get annotations for book ${bookId}`);
    const req = tx.objectStore(ANNOTATIONS_STORE).index("bookId").getAll(bookId);
    req.onsuccess = () => resolve((req.result as ReaderAnnotation[]) || []);
    req.onerror = () => reject(new Error(`Failed to get annotations for book ${bookId}: ${req.error?.message}`));
  });
}

export async function deleteAnnotation(id: string): Promise<void> {
  return dbDelete(ANNOTATIONS_STORE, id);
}
