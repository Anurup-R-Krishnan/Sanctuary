import { describe, expect, it, mock, beforeEach } from "bun:test";

// Mock the db module before importing service
mock.module("@/utils/db", () => ({
  deleteBookContent: mock(async () => {}),
  getAllBooks: mock(async () => []),
  getBookContent: mock(async () => null),
}));

import type { StorageBreakdown } from "@/services/storageService";
import type { Book } from "@/types";

import { estimateStorageUsage, pruneUnopenedBookBlobs } from "@/services/storageService";
import * as db from "@/utils/db";

// Minimal mock book factory
const makeBook = (id: string, lastOpenedAt?: string, coverUrl?: string): Book => ({
  author: "Author",
  collections: [],
  epubBlob: null,
  id,
  isFavorite: false,
  lastLocation: "",
  lastOpenedAt: lastOpenedAt ?? undefined,
  progress: 0,
  title: `Book ${id}`,
  ...(coverUrl ? { coverUrl } : {}),
});

describe("storageService — storage estimation and blob pruning", () => {
  beforeEach(() => {
    (db.getAllBooks as ReturnType<typeof mock>).mockResolvedValue([]);
    (db.getBookContent as ReturnType<typeof mock>).mockResolvedValue(null);
    (db.deleteBookContent as ReturnType<typeof mock>).mockResolvedValue(undefined);
  });

  it("returns zero usage and quota when navigator.storage is unavailable", async () => {
    const result: StorageBreakdown = await estimateStorageUsage();
    expect(result.usageBytes).toBe(0);
    expect(result.quotaBytes).toBe(0);
    expect(result.usageFraction).toBe(0);
  });

  it("calculates coverArtBytes as 50 KB per book that has a coverUrl", async () => {
    const books = [makeBook("a", undefined, "blob:cover-a"), makeBook("b")];
    (db.getAllBooks as ReturnType<typeof mock>).mockResolvedValue(books);
    const result = await estimateStorageUsage();
    expect(result.coverArtBytes).toBe(50 * 1024);
  });

  it("sums bookBlobBytes from book_contents blobs", async () => {
    const books = [makeBook("a"), makeBook("b")];
    (db.getAllBooks as ReturnType<typeof mock>).mockResolvedValue(books);
    // Use a keyed mock so parallel calls can be matched by bookId
    const contentMap: Record<string, { bookId: string; blob: Blob; storedAt: string } | null> = {
      a: { bookId: "a", blob: new Blob(["x".repeat(200_000)]), storedAt: "2026-01-01" },
      b: { bookId: "b", blob: new Blob(["y".repeat(300_000)]), storedAt: "2026-01-01" },
    };
    (db.getBookContent as ReturnType<typeof mock>).mockImplementation(
      async (id: string) => contentMap[id] ?? null
    );
    const result = await estimateStorageUsage();
    expect(result.bookBlobBytes).toBe(500_000);
  });

  it("generates human-readable labels — zero bytes renders as '0 B'", async () => {
    const result = await estimateStorageUsage();
    expect(result.usageLabel).toBe("0 B");
    expect(result.quotaLabel).toBe("0 B");
  });

  it("pruneUnopenedBookBlobs removes blobs for books beyond the keep window", async () => {
    const books = [
      makeBook("recent-1", "2026-09-10T00:00:00Z"),
      makeBook("recent-2", "2026-09-09T00:00:00Z"),
      makeBook("old-1", "2026-01-01T00:00:00Z"),
    ];
    (db.getAllBooks as ReturnType<typeof mock>).mockResolvedValue(books);
    // Only old-1 has a stored blob
    const contentMap: Record<string, { bookId: string; blob: Blob; storedAt: string } | null> = {
      "old-1": { bookId: "old-1", blob: new Blob(["x".repeat(1_000_000)]), storedAt: "2026-01-01" },
    };
    (db.getBookContent as ReturnType<typeof mock>).mockImplementation(
      async (id: string) => contentMap[id] ?? null
    );

    const result = await pruneUnopenedBookBlobs(2);
    expect(result.removed).toBe(1);
    expect(result.freedBytes).toBe(1_000_000);
  });

  it("pruneUnopenedBookBlobs returns zero when all books are within the keep window", async () => {
    const books = [makeBook("a", "2026-09-12T00:00:00Z"), makeBook("b", "2026-09-11T00:00:00Z")];
    (db.getAllBooks as ReturnType<typeof mock>).mockResolvedValue(books);
    const result = await pruneUnopenedBookBlobs(10);
    expect(result.removed).toBe(0);
    expect(result.freedBytes).toBe(0);
  });
});
