import type { SanctuaryApiClient } from "@sanctuary/core";

import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

import type { Book } from "@/types";

const stored = new Map<string, Book>();
const savedContent: string[] = [];
const deleted: string[] = [];

const realDb = await import("@/utils/db");
const realContent = await import("@/services/bookContentRepository");

mock.module("@/utils/db", () => ({
  ...realDb,
  deleteBook: async (id: string) => {
    deleted.push(id);
    stored.delete(id);
  },
  deleteBookContent: async () => undefined,
  getAllBooks: async () => [...stored.values()],
  putBook: async (book: Book) => {
    stored.set(book.id, book);
  },
}));

mock.module("@/services/bookContentRepository", () => ({
  ...realContent,
  getVerifiedBookContent: async () => null,
  saveBookContent: async (book: Book) => {
    savedContent.push(book.id);
  },
}));

const { httpStatusOf, libraryService } = await import("./LibraryService");
const { useBookStore } = await import("@/store/useBookStore");

function makeBook(id: string, syncStatus: Book["syncStatus"]): Book {
  return {
    author: "Author",
    epubBlob: null,
    id,
    lastLocation: "",
    progress: 0,
    syncStatus,
    title: `Book ${id}`,
  } as Book;
}

function makeApi(getLibrary: () => Promise<unknown[]>): SanctuaryApiClient {
  return { getLibrary } as unknown as SanctuaryApiClient;
}

beforeEach(() => {
  stored.clear();
  deleted.length = 0;
  savedContent.length = 0;
  useBookStore.getState().setBooks([]);
});

describe("libraryService.loadBooks (signed in)", () => {
  it("keeps every local book when the library request fails", async () => {
    stored.set("a", makeBook("a", "synced"));
    stored.set("b", makeBook("b", "local-only"));
    await libraryService.loadBooks(makeApi(async () => { throw new Error("Request to /api/library failed (503)"); }), true);
    expect(deleted).toEqual([]);
    expect(useBookStore.getState().books.map((b) => b.id).sort()).toEqual(["a", "b"]);
  });

  it("keeps unsynced local books that the server does not list", async () => {
    stored.set("guest", makeBook("guest", "local-only"));
    stored.set("upload", makeBook("upload", "pending"));
    await libraryService.loadBooks(makeApi(async () => []), true);
    expect(deleted).toEqual([]);
    expect(useBookStore.getState().books.map((b) => b.id).sort()).toEqual(["guest", "upload"]);
  });

  it("removes synced books that were deleted on the server", async () => {
    stored.set("gone", makeBook("gone", "synced"));
    await libraryService.loadBooks(makeApi(async () => []), true);
    expect(deleted).toEqual(["gone"]);
  });
});

describe("httpStatusOf", () => {
  it("reads the status from API client errors", () => {
    expect(httpStatusOf(new Error("Request to /api/library/x failed (404)"))).toBe(404);
    expect(httpStatusOf(new Error("Failed to fetch"))).toBeNull();
  });
});

describe("libraryService.getBookContent", () => {
  it("downloads with the signed-in client and keeps the file on this device", async () => {
    const book = makeBook("remote", "synced");
    stored.set("remote", book);
    useBookStore.getState().setBooks([book]);
    const requested: string[] = [];
    const api = {
      fetchRaw: async (path: string) => {
        requested.push(path);
        return new Response(new Blob(["PK\u0003\u0004data"]), { status: 200 });
      },
      getLibrary: async () => [],
    } as unknown as SanctuaryApiClient;
    const blob = await libraryService.getBookContent("remote", api, true);
    expect(blob.size).toBeGreaterThan(0);
    expect(requested).toEqual(["/api/content/remote?download=1"]);
    expect(savedContent).toEqual(["remote"]);
  });
});

afterAll(() => {
  mock.module("@/services/bookContentRepository", () => ({
    BookContentError: realContent.BookContentError,
    getVerifiedBookContent: realContent.getVerifiedBookContent,
    saveBookContent: realContent.saveBookContent,
    verifyBookContent: realContent.verifyBookContent,
  }));
  mock.module("@/utils/db", () => ({
    ...realDb,
  }));
});
