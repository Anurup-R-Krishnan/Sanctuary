import { beforeAll, describe, expect, it } from "bun:test";

import { ensureTestDom } from "../reader/foliate/testEnv";
import {
  applyBionicReading,
  calculateFixation,
  formatBionicHtml,
  getFixationCount,
} from "./bionicReading";

beforeAll(() => {
  ensureTestDom();
});

describe("bionicReading — Saccade Acceleration & Fixation Engine", () => {
  describe("getFixationCount", () => {
    it("returns 0 for empty or negative lengths", () => {
      expect(getFixationCount(0)).toBe(0);
      expect(getFixationCount(-5)).toBe(0);
    });

    it("calculates accurate fixation proportions for small words", () => {
      expect(getFixationCount(1)).toBe(1); // "I" -> "I"
      expect(getFixationCount(2)).toBe(1); // "in" -> "i"
      expect(getFixationCount(3)).toBe(1); // "the" -> "t"
      expect(getFixationCount(4)).toBe(2); // "read" -> "re"
    });

    it("calculates accurate fixation proportions for medium and long words", () => {
      expect(getFixationCount(5)).toBe(2); // "books" -> "bo"
      expect(getFixationCount(6)).toBe(3); // "reader" -> "rea"
      expect(getFixationCount(10)).toBe(5); // "comprehend" -> "compr"
      expect(getFixationCount(14)).toBe(7); // "accessibility" -> "accessi"
    });
  });

  describe("calculateFixation", () => {
    it("splits single-letter words cleanly", () => {
      expect(calculateFixation("a")).toEqual({ bold: "a", rest: "" });
    });

    it("splits short and medium words accurately", () => {
      expect(calculateFixation("the")).toEqual({ bold: "t", rest: "he" });
      expect(calculateFixation("book")).toEqual({ bold: "bo", rest: "ok" });
      expect(calculateFixation("reader")).toEqual({ bold: "rea", rest: "der" });
    });

    it("preserves leading and trailing punctuation", () => {
      const fix1 = calculateFixation('"Hello,"');
      expect(fix1.bold).toBe('"He');
      expect(fix1.rest).toBe('llo,"');

      const fix2 = calculateFixation("(clarity)");
      expect(fix2.bold).toBe("(cla");
      expect(fix2.rest).toBe("rity)");
    });

    it("handles accented unicode characters", () => {
      const fix = calculateFixation("über");
      expect(fix.bold).toBe("üb");
      expect(fix.rest).toBe("er");
    });
  });

  describe("formatBionicHtml", () => {
    it("wraps word fixations in bold tags while preserving spaces", () => {
      const html = formatBionicHtml("The quick reader");
      expect(html).toContain('<b class="bionic-fixation">T</b>he');
      expect(html).toContain('<b class="bionic-fixation">qu</b>ick');
      expect(html).toContain('<b class="bionic-fixation">rea</b>der');
    });

    it("handles empty or whitespace strings safely", () => {
      expect(formatBionicHtml("")).toBe("");
      expect(formatBionicHtml("   ")).toBe("   ");
    });
  });

  describe("applyBionicReading", () => {
    it("transforms DOM paragraphs and reverts losslessly upon cleanup", () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <p>Focus and clarity in deep reading.</p>
        <pre><code>const code = 42;</code></pre>
      `;

      const originalHtml = container.innerHTML;

      // Apply Bionic Reading
      const revert = applyBionicReading(container);

      const p = container.querySelector("p");
      expect(p?.getAttribute("data-bionic")).toBe("true");
      expect(p?.querySelectorAll("b.bionic-fixation").length).toBeGreaterThanOrEqual(4);

      // Code block should be untouched
      const code = container.querySelector("code");
      expect(code?.querySelectorAll("b.bionic-fixation").length).toBe(0);

      // Revert Bionic Reading
      revert();

      expect(p?.hasAttribute("data-bionic")).toBe(false);
      expect(container.querySelectorAll("b.bionic-fixation").length).toBe(0);
      expect(container.innerHTML).toBe(originalHtml);
    });
  });
});
