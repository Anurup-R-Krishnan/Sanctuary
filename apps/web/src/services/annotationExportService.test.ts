import { describe, expect, it } from "bun:test";

import type { Book, Bookmark, Highlight } from "@/types";

import {
  exportAnnotationsAsCsv,
  formatBatchAnnotationsAsMarkdown,
  formatBookAnnotationsAsMarkdown,
  triggerFileDownload,
} from "./annotationExportService";

const mockHighlights: Highlight[] = [
  {
    cfi: "epubcfi(/6/2[chapter1]!/4/2/10)",
    color: "yellow",
    createdAt: "2026-05-01T10:00:00.000Z",
    id: "hl-1",
    note: "Key thesis of the entire book.",
    text: "Call me Ishmael. Some years ago—never mind how long precisely.",
  },
  {
    cfi: "epubcfi(/6/4[chapter2]!/4/2/20)",
    color: "pink",
    createdAt: "2026-05-02T14:30:00.000Z",
    id: "hl-2",
    text: "There now is your insular city of the Manhattoes.",
  },
];

const mockBookmarks: Bookmark[] = [
  {
    cfi: "epubcfi(/6/6[chapter3]!/4/1)",
    createdAt: "2026-05-03T16:00:00.000Z",
    id: "bm-1",
    note: "Starting Chapter 3",
    title: "The Spouter-Inn",
  },
];

const mockBook: Book = {
  author: "Herman Melville",
  bookmarks: mockBookmarks,
  epubBlob: null,
  highlights: mockHighlights,
  id: "book-1",
  lastLocation: "",
  progress: 0,
  title: "Moby Dick",
};

describe("Annotation Knowledge Export & Markdown Sync Service", () => {
  describe("formatBookAnnotationsAsMarkdown", () => {
    it("generates valid YAML frontmatter with book metadata", () => {
      const md = formatBookAnnotationsAsMarkdown(mockBook);

      expect(md).toContain("---");
      expect(md).toContain('title: "Moby Dick"');
      expect(md).toContain('author: "Herman Melville"');
      expect(md).toContain("totalHighlights: 2");
      expect(md).toContain("totalBookmarks: 1");
      expect(md).toContain("source: Sanctuary Book Reader");
    });

    it("formats highlights with Obsidian callout blocks and color tags", () => {
      const md = formatBookAnnotationsAsMarkdown(mockBook);

      expect(md).toContain("> [!quote] Yellow");
      expect(md).toContain("> Call me Ishmael");
      expect(md).toContain("> **Note**: Key thesis of the entire book.");
      expect(md).toContain("<!-- cfi: epubcfi(/6/2[chapter1]!/4/2/10) -->");
    });

    it("formats bookmarks under dedicated section", () => {
      const md = formatBookAnnotationsAsMarkdown(mockBook);

      expect(md).toContain("## Bookmarks");
      expect(md).toContain("- **The Spouter-Inn**");
      expect(md).toContain("  - Note: Starting Chapter 3");
      expect(md).toContain("  - Location: `epubcfi(/6/6[chapter3]!/4/1)`");
    });

    it("supports non-callout standard blockquotes when configured", () => {
      const md = formatBookAnnotationsAsMarkdown(mockBook, { obsidianCallouts: false });

      expect(md).not.toContain("[!quote]");
      expect(md).toContain("> Call me Ishmael");
      expect(md).toContain("- **Note**: Key thesis of the entire book.");
    });

    it("handles books with zero annotations gracefully", () => {
      const emptyBook: Book = {
        author: "Unknown",
        epubBlob: null,
        id: "empty",
        lastLocation: "",
        progress: 0,
        title: "Empty Book",
      };

      const md = formatBookAnnotationsAsMarkdown(emptyBook);
      expect(md).toContain("*No annotations or bookmarks found for this book.*");
    });
  });

  describe("formatBatchAnnotationsAsMarkdown", () => {
    it("compiles multi-book reading digest with Table of Contents", () => {
      const secondBook: Book = {
        author: "Mary Shelley",
        epubBlob: null,
        highlights: [
          {
            cfi: "epubcfi(/6/2!/4)",
            color: "green",
            createdAt: "2026-06-01T00:00:00.000Z",
            id: "hl-3",
            text: "Beware; for I am fearless, and therefore powerful.",
          },
        ],
        id: "book-2",
        lastLocation: "",
        progress: 0,
        title: "Frankenstein",
      };

      const batchMd = formatBatchAnnotationsAsMarkdown([mockBook, secondBook]);

      expect(batchMd).toContain('title: "Sanctuary Library Reading Notes"');
      expect(batchMd).toContain("totalBooks: 2");
      expect(batchMd).toContain("totalHighlights: 3");
      expect(batchMd).toContain("totalBookmarks: 1");
      expect(batchMd).toContain("## Table of Contents");
      expect(batchMd).toContain("- [Moby Dick](#moby_dick)");
      expect(batchMd).toContain("- [Frankenstein](#frankenstein)");
      expect(batchMd).toContain("Beware; for I am fearless");
    });
  });

  describe("exportAnnotationsAsCsv", () => {
    it("generates structured CSV with headers and escaped excerpts", () => {
      const csv = exportAnnotationsAsCsv([mockBook]);
      const lines = csv.split("\n");

      expect(lines[0]).toBe(
        "Book Title,Author,Type,Color,Text / Excerpt,Note,Location (CFI),Created At"
      );
      expect(csv).toContain('"Moby Dick","Herman Melville","Highlight","yellow"');
      expect(csv).toContain('"Key thesis of the entire book."');
      expect(csv).toContain('"The Spouter-Inn"');
    });
  });

  describe("triggerFileDownload", () => {
    it("executes safely without error in non-browser environments", () => {
      expect(() => {
        triggerFileDownload("test content", "test.md", "text/markdown");
      }).not.toThrow();
    });
  });
});
