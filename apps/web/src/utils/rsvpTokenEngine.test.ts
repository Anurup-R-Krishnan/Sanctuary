import { beforeAll, describe, expect, it } from "bun:test";

import { ensureTestDom } from "../reader/foliate/testEnv";
import {
  calculateDurationMultiplier,
  calculateOrpIndex,
  calculateTokenDuration,
  estimateRsvpDurationMs,
  extractTextFromDocument,
  formatDuration,
  splitRsvpToken,
  tokenizeRsvpText,
} from "./rsvpTokenEngine";

beforeAll(() => {
  ensureTestDom();
});

describe("rsvpTokenEngine", () => {
  describe("calculateOrpIndex", () => {
    it("returns 0 for length 0 and 1", () => {
      expect(calculateOrpIndex(0)).toBe(0);
      expect(calculateOrpIndex(1)).toBe(0);
    });

    it("returns 1 for lengths 2 through 5", () => {
      expect(calculateOrpIndex(2)).toBe(1);
      expect(calculateOrpIndex(3)).toBe(1);
      expect(calculateOrpIndex(4)).toBe(1);
      expect(calculateOrpIndex(5)).toBe(1);
    });

    it("returns 2 for lengths 6 through 9", () => {
      expect(calculateOrpIndex(6)).toBe(2);
      expect(calculateOrpIndex(7)).toBe(2);
      expect(calculateOrpIndex(8)).toBe(2);
      expect(calculateOrpIndex(9)).toBe(2);
    });

    it("returns 3 for lengths 10 through 13", () => {
      expect(calculateOrpIndex(10)).toBe(3);
      expect(calculateOrpIndex(11)).toBe(3);
      expect(calculateOrpIndex(12)).toBe(3);
      expect(calculateOrpIndex(13)).toBe(3);
    });

    it("returns 4 for lengths 14 and higher", () => {
      expect(calculateOrpIndex(14)).toBe(4);
      expect(calculateOrpIndex(20)).toBe(4);
    });
  });

  describe("splitRsvpToken", () => {
    it("splits a single letter word", () => {
      const token = splitRsvpToken("A", 0);
      expect(token.raw).toBe("A");
      expect(token.left).toBe("");
      expect(token.orp).toBe("A");
      expect(token.right).toBe("");
      expect(token.left + token.orp + token.right).toBe("A");
    });

    it("splits a standard word with correct ORP fixation", () => {
      const token = splitRsvpToken("read", 1);
      // "read" length 4 -> ORP index 1 ('e')
      expect(token.coreWord).toBe("read");
      expect(token.left).toBe("r");
      expect(token.orp).toBe("e");
      expect(token.right).toBe("ad");
      expect(token.left + token.orp + token.right).toBe("read");
    });

    it("preserves leading and trailing punctuation", () => {
      const token = splitRsvpToken('"(Sanctuary!)"', 2);
      expect(token.coreWord).toBe("Sanctuary");
      // "Sanctuary" length 9 -> ORP index 2 ('n')
      // leading: '"('; left: '"(' + 'Sa' = '"(Sa'
      // orp: 'n'
      // right: 'ctuary' + '!)"' = 'ctuary!)"'
      expect(token.left).toBe('"(Sa');
      expect(token.orp).toBe("n");
      expect(token.right).toBe('ctuary!)"');
      expect(token.left + token.orp + token.right).toBe('"(Sanctuary!)"');
    });

    it("handles empty and whitespace strings gracefully", () => {
      const token = splitRsvpToken("   ", 0);
      expect(token.raw).toBe("");
      expect(token.orp).toBe("");
    });
  });

  describe("calculateDurationMultiplier", () => {
    it("calculates base multiplier for plain short words", () => {
      expect(calculateDurationMultiplier("hello", "hello")).toBe(1.0);
    });

    it("adds 100% pause for sentence terminators", () => {
      expect(calculateDurationMultiplier("finished.", "finished")).toBe(2.0);
      expect(calculateDurationMultiplier("really?", "really")).toBe(2.0);
      expect(calculateDurationMultiplier('stop!"', "stop")).toBe(2.0);
    });

    it("adds 50% pause for clause punctuation", () => {
      expect(calculateDurationMultiplier("however,", "however")).toBe(1.5);
      expect(calculateDurationMultiplier("moreover;", "moreover")).toBe(1.5);
      expect(calculateDurationMultiplier("pause:", "pause")).toBe(1.5);
    });

    it("adds 25% pause for long words (> 10 characters)", () => {
      expect(
        calculateDurationMultiplier("comprehension", "comprehension")
      ).toBe(1.25);
    });

    it("combines long words with sentence terminators", () => {
      expect(
        calculateDurationMultiplier("comprehension.", "comprehension")
      ).toBe(2.25);
    });

    it("adds paragraph break pause", () => {
      expect(
        calculateDurationMultiplier("conclusion.", "conclusion", true)
      ).toBe(2.5);
    });
  });

  describe("calculateTokenDuration & estimateRsvpDurationMs", () => {
    it("computes accurate milliseconds per word", () => {
      // 300 WPM = 200 ms per standard word (60000 / 300)
      expect(calculateTokenDuration(1.0, 300)).toBe(200);
      expect(calculateTokenDuration(2.0, 300)).toBe(400);
      // 600 WPM = 100 ms per standard word
      expect(calculateTokenDuration(1.0, 600)).toBe(100);
    });

    it("estimates total duration for token sequences", () => {
      const tokens = tokenizeRsvpText("First sentence. Second sentence.");
      const durationMs = estimateRsvpDurationMs(tokens, 300);
      expect(durationMs).toBeGreaterThan(0);
    });

    it("formats duration strings clearly", () => {
      expect(formatDuration(45000)).toBe("45s");
      expect(formatDuration(125000)).toBe("2m 05s");
    });
  });

  describe("tokenizeRsvpText", () => {
    it("tokenizes multi-sentence paragraphs", () => {
      const text = "Sanctuary is fast.\n\nIt enables effortless reading.";
      const tokens = tokenizeRsvpText(text);

      expect(tokens.length).toBe(7);
      expect(tokens[0].raw).toBe("Sanctuary");
      expect(tokens[2].raw).toBe("fast.");
      expect(tokens[2].isParagraphBreak).toBe(true);
      expect(tokens[6].raw).toBe("reading.");
      expect(tokens[6].isParagraphBreak).toBe(false);
    });

    it("returns empty array for invalid input", () => {
      expect(tokenizeRsvpText("")).toEqual([]);
      expect(tokenizeRsvpText(null as unknown as string)).toEqual([]);
    });
  });

  describe("extractTextFromDocument", () => {
    it("extracts text while skipping script and style elements", () => {
      const doc = document.implementation.createHTMLDocument("Test");
      doc.body.innerHTML = `
        <style>.ignored { color: red; }</style>
        <h1>Chapter Title</h1>
        <p>This is the first paragraph with <em>emphasis</em>.</p>
        <script>console.log("bad");</script>
      `;

      const text = extractTextFromDocument(doc);
      expect(text).toContain("Chapter Title");
      expect(text).toContain("first paragraph with emphasis");
      expect(text).not.toContain(".ignored");
      expect(text).not.toContain("console.log");
    });

    it("handles null or empty documents gracefully", () => {
      expect(extractTextFromDocument(null)).toBe("");
    });
  });
});
