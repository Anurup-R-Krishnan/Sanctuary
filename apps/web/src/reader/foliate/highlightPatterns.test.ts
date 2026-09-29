import { describe, expect, it } from "bun:test";

import { ANNOTATION_COLORS } from "../../config/annotationConfig";
import { drawPatternedHighlight, HIGHLIGHT_PATTERNS, highlightPatternFor } from "./highlightPatterns";
import { ensureTestDom } from "./testEnv";

ensureTestDom();

describe("highlight patterns", () => {
  it("gives every highlight colour its own line pattern", () => {
    const patterns = ANNOTATION_COLORS.map((c) => highlightPatternFor(c.value));
    expect(new Set(patterns).size).toBe(Math.min(ANNOTATION_COLORS.length, HIGHLIGHT_PATTERNS.length));
  });

  it("draws a fill and a patterned underline per rectangle", () => {
    const g = drawPatternedHighlight([{ height: 10, left: 0, top: 0, width: 50 } as DOMRect], { color: "#10b981", pattern: "dashed" });
    expect(g.querySelectorAll("rect")).toHaveLength(1);
    expect(g.querySelector("line")?.getAttribute("stroke-dasharray")).toBe("6 3");
    expect(drawPatternedHighlight([{ height: 10, left: 0, top: 0, width: 50 } as DOMRect], { pattern: "double" }).querySelectorAll("line")).toHaveLength(2);
  });
});
