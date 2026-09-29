import { describe, expect, it } from "bun:test";

import { formatForContentType, isValidBookFile, resolveBookContentType, toLibraryItem } from "./_shared";

describe("book file handling", () => {
  it("accepts PDFs and XML-prologue HTML", async () => {
    expect(await isValidBookFile(new File(["%PDF-1.7\n..."], "paper.pdf"))).toBe(true);
    expect(await isValidBookFile(new File(['<?xml version="1.0"?>\n<html><body>x</body></html>'], "page"))).toBe(true);
    expect(await isValidBookFile(new File(["\u0000\u0001garbage"], "bin"))).toBe(false);
  });

  it("stores each format under its own content type", () => {
    expect(resolveBookContentType(new File(["x"], "paper.pdf"))).toBe("application/pdf");
    expect(resolveBookContentType(new File(["x"], "comic.cbz", { type: "application/zip" }))).toBe("application/vnd.comicbook+zip");
    expect(resolveBookContentType(new File(["x"], "notes.md"))).toBe("text/markdown");
    expect(resolveBookContentType(new File(["x"], "blob", { type: "text/javascript" }))).toBe("application/epub+zip");
  });

  it("reports format and hash back to clients", () => {
    expect(formatForContentType("application/pdf")).toBe("pdf");
    expect(formatForContentType(null)).toBe("epub");
    const item = toLibraryItem({
      author: "A", bookmarks_json: "[]", content_hash: "abc", content_type: "application/vnd.comicbook+zip", cover_url: null,
      id: "1", is_favorite: 0, last_location: null, progress: 0, title: "T", total_pages: 10, updated_at: "2026-01-01",
    });
    expect(item.format).toBe("cbz");
    expect(item.contentHash).toBe("abc");
  });
});
