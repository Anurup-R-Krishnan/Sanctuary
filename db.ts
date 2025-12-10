import { Book, Highlight, Bookmark, VocabWord } from "./types";

const DB_NAME = "SanctuaryReaderDB";
const DB_VERSION = 2;
const BOOKS_STORE = "books";
const VOCAB_STORE = "vocabulary";

let db: IDBDatabase;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject("Database error");
    request.onsuccess = () => { db = request.result; resolve(db); };
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
}

export async function addBook(book: Book): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(BOOKS_STORE, "readwrite");
    const req = tx.objectStore(BOOKS_STORE).add(book);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getBooks(): Promise<unknown[]> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(BOOKS_STORE, "readonly");
    const req = tx.objectStore(BOOKS_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function updateBookProgress(id: string, progress: number, lastLocation: string): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(BOOKS_STORE, "readwrite");
    const store = tx.objectStore(BOOKS_STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const book = getReq.result;
      if (book) {
        book.progress = progress;
        book.lastLocation = lastLocation;
        book.lastOpenedAt = new Date().toISOString();
        const putReq = store.put(book);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      } else reject("Book not found");
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function updateBook(id: string, updates: Partial<Book>): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(BOOKS_STORE, "readwrite");
    const store = tx.objectStore(BOOKS_STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const book = getReq.result;
      if (book) {
        Object.assign(book, updates);
        const putReq = store.put(book);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      } else reject("Book not found");
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function deleteBook(id: string): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(BOOKS_STORE, "readwrite");
    const req = tx.objectStore(BOOKS_STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Vocabulary
export async function addVocabWord(word: VocabWord): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(VOCAB_STORE, "readwrite");
    const req = tx.objectStore(VOCAB_STORE).add(word);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getVocabWords(): Promise<VocabWord[]> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(VOCAB_STORE, "readonly");
    const req = tx.objectStore(VOCAB_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteVocabWord(id: string): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(VOCAB_STORE, "readwrite");
    const req = tx.objectStore(VOCAB_STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
