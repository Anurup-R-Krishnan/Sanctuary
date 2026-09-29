import { ANNOTATION_COLORS } from "../../config/annotationConfig";

const SVG_NS = "http://www.w3.org/2000/svg";

export const HIGHLIGHT_PATTERNS = ["solid", "dashed", "dotted", "double", "dashdot"] as const;
export type HighlightPattern = (typeof HIGHLIGHT_PATTERNS)[number];

const DASHES: Record<HighlightPattern, string | null> = {
  dashdot: "8 3 2 3",
  dashed: "6 3",
  dotted: "1.5 3",
  double: null,
  solid: null,
};

export function highlightPatternFor(color: string): HighlightPattern {
  const normalized = color.toLowerCase();
  const index = ANNOTATION_COLORS.findIndex((c) => c.value.toLowerCase() === normalized || c.id === normalized);
  return HIGHLIGHT_PATTERNS[index >= 0 ? index % HIGHLIGHT_PATTERNS.length : 0]!;
}

export function drawPatternedHighlight(rects: DOMRect[], options: { color?: string; pattern?: HighlightPattern } = {}): SVGGElement {
  const { color = "#f59e0b", pattern = "solid" } = options;
  const g = document.createElementNS(SVG_NS, "g");
  g.setAttribute("fill", color);
  g.setAttribute("data-pattern", pattern);
  for (const { height, left, top, width } of rects) {
    const fill = document.createElementNS(SVG_NS, "rect");
    fill.setAttribute("x", String(left));
    fill.setAttribute("y", String(top));
    fill.setAttribute("width", String(width));
    fill.setAttribute("height", String(height));
    fill.setAttribute("opacity", "0.25");
    g.append(fill);

    const lines = pattern === "double" ? [top + height - 3, top + height] : [top + height - 1];
    for (const y of lines) {
      const line = document.createElementNS(SVG_NS, "line");
      line.setAttribute("x1", String(left));
      line.setAttribute("x2", String(left + width));
      line.setAttribute("y1", String(y));
      line.setAttribute("y2", String(y));
      line.setAttribute("stroke", color);
      line.setAttribute("stroke-width", pattern === "double" ? "1.5" : "2.5");
      const dash = DASHES[pattern];
      if (dash) line.setAttribute("stroke-dasharray", dash);
      g.append(line);
    }
  }
  return g;
}
