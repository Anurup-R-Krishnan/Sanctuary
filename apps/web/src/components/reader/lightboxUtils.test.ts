import { describe, expect, it } from "bun:test";

import { calculateZoomIn, calculateZoomOut, sanitizeDownloadFilename, isTinyInlineImage } from "./lightboxUtils";

describe("Lightbox Utilities", () => {
  describe("calculateZoomIn", () => {
    it("increments zoom by 0.25", () => {
      expect(calculateZoomIn(1)).toBe(1.25);
      expect(calculateZoomIn(1.25)).toBe(1.5);
      expect(calculateZoomIn(2)).toBe(2.25);
    });

    it("clamps zoom to maximum of 5", () => {
      expect(calculateZoomIn(4.75)).toBe(5);
      expect(calculateZoomIn(4.9)).toBe(5);
      expect(calculateZoomIn(5)).toBe(5);
    });

    it("maintains precision with toFixed", () => {
      expect(calculateZoomIn(1.1)).toBe(1.35);
    });
  });

  describe("calculateZoomOut", () => {
    it("decrements zoom by 0.25", () => {
      expect(calculateZoomOut(2)).toEqual([1.75, false]);
      expect(calculateZoomOut(1.5)).toEqual([1.25, false]);
      expect(calculateZoomOut(1.25)).toEqual([1, true]);
    });

    it("clamps zoom to minimum of 0.5", () => {
      expect(calculateZoomOut(0.75)).toEqual([0.5, true]);
      expect(calculateZoomOut(0.5)).toEqual([0.5, true]);
      expect(calculateZoomOut(0.1)).toEqual([0.5, true]);
    });

    it("returns resetPosition true when zoom drops to or below 1", () => {
      const [, shouldResetAt125] = calculateZoomOut(1.25);
      expect(shouldResetAt125).toBe(true);
      const [, shouldResetAt1] = calculateZoomOut(1);
      expect(shouldResetAt1).toBe(true);
      const [, shouldNotResetAt15] = calculateZoomOut(1.5);
      expect(shouldNotResetAt15).toBe(false);
      const [, shouldNotResetAt2] = calculateZoomOut(2);
      expect(shouldNotResetAt2).toBe(false);
    });

    it("maintains precision with toFixed", () => {
      expect(calculateZoomOut(1.4)).toEqual([1.15, false]);
    });
  });

  describe("sanitizeDownloadFilename", () => {
    it("uses title when provided", () => {
      expect(sanitizeDownloadFilename("My Image", null)).toBe("my_image.png");
      expect(sanitizeDownloadFilename("My Image", "alt text")).toBe("my_image.png");
    });

    it("falls back to alt when title is not provided", () => {
      expect(sanitizeDownloadFilename(null, "Alternative Text")).toBe("alternative_text.png");
      expect(sanitizeDownloadFilename(undefined, "Alternative Text")).toBe("alternative_text.png");
    });

    it("defaults to book-image when neither title nor alt provided", () => {
      expect(sanitizeDownloadFilename(null, null)).toBe("book-image.png");
      expect(sanitizeDownloadFilename(undefined, undefined)).toBe("book-image.png");
      expect(sanitizeDownloadFilename("", "")).toBe("book-image.png");
    });

    it("removes special characters and converts to lowercase", () => {
      expect(sanitizeDownloadFilename("Image (1) - Final!", null)).toBe("image__1__-_final_.png");
      expect(sanitizeDownloadFilename("UPPERCASE IMAGE", null)).toBe("uppercase_image.png");
      expect(sanitizeDownloadFilename("Image/With\\Slashes", null)).toBe("image_with_slashes.png");
    });

    it("preserves hyphens and underscores", () => {
      expect(sanitizeDownloadFilename("image-with-hyphens", null)).toBe("image-with-hyphens.png");
      expect(sanitizeDownloadFilename("image_with_underscores", null)).toBe("image_with_underscores.png");
      expect(sanitizeDownloadFilename("mix-ed_chars", null)).toBe("mix-ed_chars.png");
    });

    it("handles edge cases with numbers", () => {
      expect(sanitizeDownloadFilename("Image123", null)).toBe("image123.png");
      expect(sanitizeDownloadFilename("123 Image", null)).toBe("123_image.png");
    });
  });

  describe("isTinyInlineImage", () => {
    it("identifies images at boundary 0 (width must be > 0)", () => {
      expect(isTinyInlineImage(0, 16)).toBe(false);
      expect(isTinyInlineImage(1, 16)).toBe(true);
    });

    it("identifies images at boundary 28 (both dimensions <= 28)", () => {
      expect(isTinyInlineImage(28, 28)).toBe(true);
      expect(isTinyInlineImage(28, 24)).toBe(true);
      expect(isTinyInlineImage(24, 28)).toBe(true);
    });

    it("excludes images at boundary 29 (exceeds 28px limit)", () => {
      expect(isTinyInlineImage(29, 28)).toBe(false);
      expect(isTinyInlineImage(28, 29)).toBe(false);
      expect(isTinyInlineImage(29, 29)).toBe(false);
    });

    it("returns true for small typical icon sizes", () => {
      expect(isTinyInlineImage(16, 16)).toBe(true);
      expect(isTinyInlineImage(24, 24)).toBe(true);
      expect(isTinyInlineImage(20, 20)).toBe(true);
    });

    it("returns false for one dimension tiny and other larger", () => {
      expect(isTinyInlineImage(1, 100)).toBe(false);
      expect(isTinyInlineImage(100, 1)).toBe(false);
      expect(isTinyInlineImage(20, 100)).toBe(false);
    });

    it("returns false for normal image sizes", () => {
      expect(isTinyInlineImage(32, 32)).toBe(false);
      expect(isTinyInlineImage(100, 100)).toBe(false);
      expect(isTinyInlineImage(800, 600)).toBe(false);
    });
  });
});
