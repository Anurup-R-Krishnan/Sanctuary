import { describe, it, expect } from "bun:test";

import type { ReaderAnnotation } from "@/types/reader";

import { exportAnnotationsAsMarkdown, exportAnnotationsAsJson } from "./annotationExport";

describe("annotationExport utility", () => {
  const sampleAnnotations: ReaderAnnotation[] = [
    {
      id: "ann-1",
      bookId: "book-1",
      cfiRange: "/6/2[chapter1]!/4/2/10,/4/2/30",
      text: "Call me Ishmael.",
      type: "highlight",
      color: "#FFD54F",
      chapterLabel: "Loomings",
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
      href: "text/ch01.xhtml",
      note: "Iconic opening line",
    },
    {
      id: "ann-2",
      bookId: "book-1",
      cfiRange: "/6/4[chapter2]!/4/2/5,/4/2/25",
      text: "It was a dark and stormy night.",
      type: "underline",
      color: "#4CAF50",
      chapterLabel: "The Carpet-Bag",
      createdAt: 1700000100000,
      updatedAt: 1700000100000,
      href: "text/ch02.xhtml",
      note: "",
    },
  ];

  it("exports annotations to structured Markdown with blockquotes and notes", () => {
    const md = exportAnnotationsAsMarkdown("Moby Dick", "Herman Melville", sampleAnnotations);
    expect(md).toContain("# Highlights & Notes: Moby Dick");
    expect(md).toContain("*By Herman Melville*");
    expect(md).toContain("## Loomings");
    expect(md).toContain("> Call me Ishmael.");
    expect(md).toContain("- **Note**: Iconic opening line");
    expect(md).toContain("## The Carpet-Bag");
    expect(md).toContain("> It was a dark and stormy night.");
  });

  it("exports annotations to structured JSON with ISO dates", () => {
    const jsonStr = exportAnnotationsAsJson("Moby Dick", "Herman Melville", sampleAnnotations);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.bookTitle).toBe("Moby Dick");
    expect(parsed.count).toBe(2);
    expect(parsed.annotations[0].text).toBe("Call me Ishmael.");
    expect(parsed.annotations[0].note).toBe("Iconic opening line");
    expect(parsed.annotations[1].text).toBe("It was a dark and stormy night.");
  });

  it("handles empty annotations gracefully", () => {
    const md = exportAnnotationsAsMarkdown("Empty Book", "Author", []);
    expect(md).toContain("No highlights or notes recorded");
    const jsonStr = exportAnnotationsAsJson("Empty Book", "Author", []);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.count).toBe(0);
    expect(parsed.annotations).toEqual([]);
  });
});
