import type { Book } from "@/types";

const DB_NAME = "SanctuaryReaderDB";
const DB_VERSION = 2;
const BOOKS_STORE = "books";
const VOCAB_STORE = "vocabulary";

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
        db.close();
        // Allow reopening after a schema upgrade from another tab/session.
        db = undefined;
      };
      dbPromise = null;
      resolve(db);
    };
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(BOOKS_STORE)) {
        database.createObjectStore(BOOKS_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(VOCAB_STORE)) {
        database.createObjectStore(VOCAB_STORE, { keyPath: "id" });
      }
    };
  });

  return dbPromise;
}

function bindTxFailure(tx: IDBTransaction, reject: (reason?: unknown) => void, message: string) {
  tx.onerror = () => reject(new Error(`${message}: ${tx.error?.message || "transaction failed"}`));
  tx.onabort = () => reject(new Error(`${message}: ${tx.error?.message || "transaction aborted"}`));
}

export async function putBook(book: Book): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(BOOKS_STORE, "readwrite");
    bindTxFailure(tx, reject, "Failed to save book");
    const req = tx.objectStore(BOOKS_STORE).put(book);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(new Error("Failed to save book: " + req.error?.message));
  });
}

export async function getBookById(id: string): Promise<Book | null> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(BOOKS_STORE, "readonly");
    bindTxFailure(tx, reject, "Failed to get book");
    const req = tx.objectStore(BOOKS_STORE).get(id);
    req.onsuccess = () => resolve((req.result as Book | undefined) ?? null);
    req.onerror = () => reject(new Error("Failed to get book: " + req.error?.message));
  });
}

export async function deleteBook(id: string): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(BOOKS_STORE, "readwrite");
    bindTxFailure(tx, reject, "Failed to delete book");
    const req = tx.objectStore(BOOKS_STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(new Error("Failed to delete book: " + req.error?.message));
  });
}
