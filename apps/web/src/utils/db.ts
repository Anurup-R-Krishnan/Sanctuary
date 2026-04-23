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

export async function putBook(book: Book): Promise<void> {
  return dbPut(BOOKS_STORE, book);
}

export async function getBookById(id: string): Promise<Book | null> {
  return dbGet<Book>(BOOKS_STORE, id);
}

export async function deleteBook(id: string): Promise<void> {
  return dbDelete(BOOKS_STORE, id);
}
