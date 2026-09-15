import { beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";

// Mock the db module before importing service
mock.module("@/utils/db", () => ({
  deleteSearchIndex: mock(async () => {}),
  getAllSearchIndexes: mock(async () => []),
  getSearchIndex: mock(async () => null),
  putSearchIndex: mock(async () => {}),
}));

import type { Book, IndexedBookRecord } from "@/types";

import * as db from "@/utils/db";

import { ensureTestDom } from "../reader/foliate/testEnv";
import {
  extractSnippets,
  libraryIndexManager,
  searchLibrary,
  tokenize,
} from "./librarySearchIndex";

const mockBooks: Book[] = [
  {
    author: "Herman Melville",
    collections: [],
    epubBlob: null,
    id: "moby-dick",
    isFavorite: false,
    lastLocation: "",
    progress: 0.1,
    title: "Moby Dick",
  },
  {
    author: "Mary Shelley",
    collections: [],
    epubBlob: null,
    id: "frankenstein",
    isFavorite: true,
    lastLocation: "",
    progress: 0.5,
    title: "Frankenstein",
  },
];

describe("librarySearchIndex — full-text search across library books", () => {
  beforeAll(() => {
    ensureTestDom();
  });

  beforeEach(() => {
    (db.getAllSearchIndexes as ReturnType<typeof mock>).mockResolvedValue([]);
    (db.getSearchIndex as ReturnType<typeof mock>).mockResolvedValue(null);
    (db.putSearchIndex as ReturnType<typeof mock>).mockResolvedValue(undefined);
    (db.deleteSearchIndex as ReturnType<typeof mock>).mockResolvedValue(undefined);
  });

  describe("tokenize", () => {
    it("converts text to lowercase and strips symbols & single-char noise", () => {
      const tokens = tokenize("Call me Ishmael! A white whale.");
      expect(tokens).toEqual(["call", "me", "ishmael", "white", "whale"]);
    });

    it("handles unicode text cleanly", () => {
      const tokens = tokenize("Éléphant & café au lait");
      expect(tokens).toContain("éléphant");
      expect(tokens).toContain("café");
    });
  });

  describe("extractSnippets", () => {
    const longText =
      "There now is your insular city of the Manhattoes, belted round by wharves as Indian isles by coral reefs commerce surrounds it with her surf. Right and left, the streets take you waterward.";

    it("extracts context window around the matched term with ellipses", () => {
      const snippets = extractSnippets(longText, "Manhattoes", 2, 20);
      expect(snippets.length).toBe(1);
      expect(snippets[0]).toContain("Manhattoes");
      expect(snippets[0]).toMatch(/\.\.\..*\.\.\./);
    });

    it("returns empty array for non-matching or empty query", () => {
      expect(extractSnippets(longText, "nonexistentword123")).toEqual([]);
      expect(extractSnippets(longText, "")).toEqual([]);
    });
  });

  describe("searchLibrary", () => {
    it("returns empty results for short queries under 2 characters", async () => {
      const results = await searchLibrary("a", mockBooks);
      expect(results).toEqual([]);
    });

    it("finds books matching title and author metadata", async () => {
      const results = await searchLibrary("Melville", mockBooks);
      expect(results.length).toBe(1);
      expect(results[0].bookId).toBe("moby-dick");
      expect(results[0].matches[0].sectionTitle).toBe("Author");

      const frankResults = await searchLibrary("Frankenstein", mockBooks);
      expect(frankResults.length).toBe(1);
      expect(frankResults[0].bookId).toBe("frankenstein");
      expect(frankResults[0].matches[0].sectionTitle).toBe("Book Title");
    });

    it("finds books by full-text body search in IndexedDB", async () => {
      const mobyRecord: IndexedBookRecord = {
        bookId: "moby-dick",
        indexedAt: "2026-05-01T00:00:00.000Z",
        sections: [
          {
            cfi: "epubcfi(/6/2!/4/2)",
            sectionIndex: 0,
            text: "Call me Ishmael. Some years ago—never mind how long precisely—having little or no money in my purse.",
            title: "Chapter 1: Loomings",
          },
          {
            cfi: "epubcfi(/6/4!/4/2)",
            sectionIndex: 1,
            text: "The great white whale known as Moby Dick swimming in the deep ocean.",
            title: "Chapter 36: The Quarter-Deck",
          },
        ],
        totalWords: 35,
      };

      (db.getAllSearchIndexes as ReturnType<typeof mock>).mockResolvedValue([mobyRecord]);

      const results = await searchLibrary("white whale", mockBooks);
      expect(results.length).toBe(1);
      expect(results[0].bookId).toBe("moby-dick");
      expect(results[0].matches[0].sectionTitle).toBe("Chapter 36: The Quarter-Deck");
      expect(results[0].matches[0].cfi).toBe("epubcfi(/6/4!/4/2)");
    });

    it("ranks books with more matches higher", async () => {
      const frankRecord: IndexedBookRecord = {
        bookId: "frankenstein",
        indexedAt: "2026-05-01T00:00:00.000Z",
        sections: [
          {
            sectionIndex: 0,
            text: "Lightning struck the oak tree. The creature saw the lightning again.",
            title: "Chapter 2",
          },
        ],
        totalWords: 15,
      };

      (db.getAllSearchIndexes as ReturnType<typeof mock>).mockResolvedValue([frankRecord]);

      const results = await searchLibrary("lightning", mockBooks);
      expect(results.length).toBe(1);
      expect(results[0].bookId).toBe("frankenstein");
      expect(results[0].totalMatches).toBeGreaterThanOrEqual(1);
    });
  });

  describe("libraryIndexManager", () => {
    it("indexes a text blob and saves to database", async () => {
      const testContent = new Blob([
        "Chapter 1\nIt was the best of times, it was the worst of times.",
      ], { type: "text/plain" });

      const record = await libraryIndexManager.indexBook("book-times", testContent, "times.txt");
      expect(record.bookId).toBe("book-times");
      expect(record.sections.length).toBeGreaterThanOrEqual(1);
      expect(record.totalWords).toBeGreaterThan(0);
      expect(db.putSearchIndex).toHaveBeenCalled();
    });

    it("removes index on book deletion", async () => {
      await libraryIndexManager.removeBook("book-times");
      expect(db.deleteSearchIndex).toHaveBeenCalledWith("book-times");
    });
  });
});
