import { describe, expect, it } from "bun:test";

import {
  QUOTE_CARD_RATIOS,
  THEME_CONFIGS,
  calculateQuoteFontSize,
  renderQuoteCardToCanvas,
  wrapText,
} from "./quoteCardCanvas";

describe("quoteCardCanvas — Typographic Quote Card Generation", () => {
  describe("calculateQuoteFontSize", () => {
    it("returns large font for short impactful sentences", () => {
      const size = calculateQuoteFontSize(50, 1200);
      expect(size).toBe(52);
    });

    it("returns medium font for moderate quotes", () => {
      const size = calculateQuoteFontSize(120, 1200);
      expect(size).toBe(44);
    });

    it("returns compact font for long paragraphs", () => {
      const size = calculateQuoteFontSize(350, 1200);
      expect(size).toBe(30);
    });

    it("scales proportionally when card width changes", () => {
      const sizeStandard = calculateQuoteFontSize(50, 1200);
      const sizeMobile = calculateQuoteFontSize(50, 600);
      expect(sizeMobile).toBe(Math.round(sizeStandard / 2));
    });

    it("applies font size preference multiplier when specified", () => {
      const regular = calculateQuoteFontSize(50, 1200, "regular");
      const large = calculateQuoteFontSize(50, 1200, "large");
      const xlarge = calculateQuoteFontSize(50, 1200, "xlarge");

      expect(regular).toBe(52);
      expect(large).toBe(Math.round(52 * 1.15));
      expect(xlarge).toBe(Math.round(52 * 1.35));
      expect(large).toBeGreaterThan(regular);
      expect(xlarge).toBeGreaterThan(large);
    });
  });

  describe("wrapText", () => {
    it("returns empty array for empty or whitespace text", () => {
      const mockCtx = {
        measureText: () => ({ width: 50 }),
      } as unknown as CanvasRenderingContext2D;

      expect(wrapText(mockCtx, "", 200)).toEqual([]);
      expect(wrapText(mockCtx, "   ", 200)).toEqual([]);
    });

    it("keeps short sentences on a single line when within maxWidth", () => {
      const mockCtx = {
        measureText: (text: string) => ({ width: text.length * 10 }),
      } as unknown as CanvasRenderingContext2D;

      const lines = wrapText(mockCtx, "A short quote.", 500);
      expect(lines).toEqual(["A short quote."]);
    });

    it("wraps words onto subsequent lines when exceeding maxWidth", () => {
      const mockCtx = {
        measureText: (text: string) => ({ width: text.length * 10 }),
      } as unknown as CanvasRenderingContext2D;

      // "One two three four" -> length 18 -> width 180. If max width is 100:
      const lines = wrapText(mockCtx, "One two three four", 100);
      expect(lines.length).toBeGreaterThan(1);
      expect(lines.join(" ")).toBe("One two three four");
    });
  });

  describe("Presets & Ratio Dimensions", () => {
    it("provides standard social media aspect ratio dimensions", () => {
      expect(QUOTE_CARD_RATIOS.square).toEqual({ height: 1200, width: 1200 });
      expect(QUOTE_CARD_RATIOS.portrait).toEqual({ height: 1500, width: 1200 });
      expect(QUOTE_CARD_RATIOS.story).toEqual({ height: 1920, width: 1080 });
    });

    it("configures all four distinctive typographic themes", () => {
      const themes = Object.keys(THEME_CONFIGS);
      expect(themes).toContain("editorial");
      expect(themes).toContain("obsidian");
      expect(themes).toContain("parchment");
      expect(themes).toContain("swiss");

      for (const themeKey of themes as Array<keyof typeof THEME_CONFIGS>) {
        const theme = THEME_CONFIGS[themeKey];
        expect(theme.text).toBeDefined();
        expect(theme.accent).toBeDefined();
        expect(theme.backgroundTop).toBeDefined();
        expect(theme.backgroundBottom).toBeDefined();
        expect(theme.fontFamily).toBeDefined();
      }
    });
  });

  describe("renderQuoteCardToCanvas", () => {
    it("configures canvas dimensions and invokes 2D drawing pipeline", () => {
      const fillRectCalls: unknown[] = [];
      const fillTextCalls: unknown[] = [];
      const strokeRectCalls: unknown[] = [];

      const mockCanvas = {
        getContext: () => ({
          beginPath: () => {},
          createLinearGradient: () => ({ addColorStop: () => {} }),
          fillRect: (...args: unknown[]) => fillRectCalls.push(args),
          fillText: (...args: unknown[]) => fillTextCalls.push(args),
          lineTo: () => {},
          measureText: (text: string) => ({ width: text.length * 8 }),
          moveTo: () => {},
          restore: () => {},
          save: () => {},
          stroke: () => {},
          strokeRect: (...args: unknown[]) => strokeRectCalls.push(args),
        }),
        height: 0,
        width: 0,
      } as unknown as HTMLCanvasElement;

      renderQuoteCardToCanvas(
        {
          aspectRatio: "portrait",
          bookAuthor: "Marcus Aurelius",
          bookTitle: "Meditations",
          chapterLabel: "Book IV",
          quote: "The happiness of your life depends upon the quality of your thoughts.",
          theme: "editorial",
        },
        mockCanvas
      );

      expect(mockCanvas.width).toBe(1200);
      expect(mockCanvas.height).toBe(1500);
      expect(fillRectCalls.length).toBeGreaterThanOrEqual(1);
      expect(fillTextCalls.length).toBeGreaterThan(0);
      expect(strokeRectCalls.length).toBe(1);
    });
  });
});
