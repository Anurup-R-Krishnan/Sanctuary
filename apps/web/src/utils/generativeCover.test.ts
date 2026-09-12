import { describe, expect, it } from "bun:test";

import {
  COVER_PALETTES,
  generateCoverDataUri,
  generateCoverSvgString,
  getGenerativeCoverStyle,
  hashString,
  splitTitleForSvg,
} from "./generativeCover";

describe("generativeCover — Fallback Typographic SVG Book Covers", () => {
  describe("hashString", () => {
    it("returns consistent positive integer for identical string", () => {
      const h1 = hashString("Pride and Prejudice");
      const h2 = hashString("Pride and Prejudice");
      expect(h1).toBe(h2);
      expect(h1).toBeGreaterThanOrEqual(0);
    });

    it("differentiates distinct strings", () => {
      const h1 = hashString("Moby Dick");
      const h2 = hashString("Great Expectations");
      expect(h1).not.toBe(h2);
    });
  });

  describe("getGenerativeCoverStyle", () => {
    it("is strictly deterministic for title and author pairs", () => {
      const style1 = getGenerativeCoverStyle("The Odyssey", "Homer");
      const style2 = getGenerativeCoverStyle("The Odyssey", "Homer");

      expect(style1.palette.id).toBe(style2.palette.id);
      expect(style1.motif).toBe(style2.motif);
    });

    it("distributes books across configured color palettes", () => {
      const books = [
        { author: "Marcus Aurelius", title: "Meditations" },
        { author: "Frank Herbert", title: "Dune" },
        { author: "Herman Melville", title: "Moby Dick" },
        { author: "Fyodor Dostoevsky", title: "Crime and Punishment" },
        { author: "George Orwell", title: "1984" },
        { author: "Mary Shelley", title: "Frankenstein" },
      ];

      const paletteIds = new Set(
        books.map((b) => getGenerativeCoverStyle(b.title, b.author).palette.id)
      );

      // At least 3 different palettes across 6 distinct books
      expect(paletteIds.size).toBeGreaterThanOrEqual(3);
    });

    it("provides valid palette colors and styles", () => {
      const { palette } = getGenerativeCoverStyle("Test Book");
      expect(palette.bgTop).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(palette.bgBottom).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(palette.foil).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(COVER_PALETTES.map((p) => p.id)).toContain(palette.id);
    });
  });

  describe("splitTitleForSvg", () => {
    it("handles short titles on a single line", () => {
      expect(splitTitleForSvg("Dune")).toEqual(["Dune"]);
    });

    it("splits long titles across multiple lines safely", () => {
      const lines = splitTitleForSvg("The Count of Monte Cristo");
      expect(lines.length).toBeGreaterThan(1);
      expect(lines.join(" ")).toBe("The Count of Monte Cristo");
    });

    it("caps line count to maximum 4 lines", () => {
      const lines = splitTitleForSvg(
        "A Very Long Title That Contains Far Too Many Words To Comfortably Fit On A Standard Cover Without Excessive Wrapping"
      );
      expect(lines.length).toBeLessThanOrEqual(4);
    });

    it("handles empty title fallback", () => {
      expect(splitTitleForSvg("")).toEqual(["Untitled"]);
    });
  });

  describe("generateCoverSvgString & generateCoverDataUri", () => {
    it("generates valid SVG document with correct dimensions and markup", () => {
      const svg = generateCoverSvgString("War and Peace", "Leo Tolstoy");

      expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('viewBox="0 0 400 600"');
      expect(svg).toContain("War and Peace");
      expect(svg).toContain("LEO TOLSTOY");
      expect(svg).toContain("SANCTUARY");
      expect(svg).toContain("</svg>");
    });

    it("escapes special XML characters safely", () => {
      const svg = generateCoverSvgString("Romeo & Juliet <Special Edition>", "Shakespeare & Co.");
      expect(svg).toContain("Romeo &amp; Juliet");
      expect(svg).toContain("&lt;Special Edition&gt;");
      expect(svg).toContain("SHAKESPEARE &amp; CO.");
      expect(svg).not.toContain("<Special Edition>");
    });

    it("produces valid SVG Data URI", () => {
      const uri = generateCoverDataUri("The Hobbit", "J.R.R. Tolkien");
      expect(uri.startsWith("data:image/svg+xml;utf8,")).toBe(true);
      expect(uri).toContain("The%20Hobbit");
    });
  });
});
