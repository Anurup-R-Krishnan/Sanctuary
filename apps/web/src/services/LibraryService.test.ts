import type { SanctuaryApiClient } from "@sanctuary/core";

import { beforeEach, describe, expect, it, mock } from "bun:test";

import type { Book } from "@/types";

const stored = new Map<string, Book>();
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
  saveBookContent: async () => undefined,
  verifyBookContent: async () => undefined,
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
