import { describe, expect, it } from "bun:test";

import { COVER_PALETTES, getCoverPalette, hashString, isUnknownAuthor, splitTitleForSvg } from "./generativeCover";

describe("generativeCover", () => {
  it("hashes deterministically", () => {
    expect(hashString("Dune")).toBe(hashString("Dune"));
    expect(hashString("Dune")).not.toBe(hashString("Emma"));
  });

  it("picks the same palette for the same book and spreads books across palettes", () => {
    expect(getCoverPalette("The Odyssey", "Homer").id).toBe(getCoverPalette("The Odyssey", "Homer").id);
    const titles = ["Emma", "Dune", "Ulysses", "Beloved", "Middlemarch", "Walden", "Dracula", "Persuasion", "Moby Dick", "Hamlet"];
    expect(new Set(titles.map((t) => getCoverPalette(t).id)).size).toBeGreaterThanOrEqual(3);
    for (const palette of COVER_PALETTES) expect(palette.cloth).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it("splits titles into at most four lines", () => {
    expect(splitTitleForSvg("Dune")).toEqual(["Dune"]);
    expect(splitTitleForSvg("The Count of Monte Cristo").join(" ")).toBe("The Count of Monte Cristo");
    const long = splitTitleForSvg("A very long title that keeps on going and going well past what fits on a cover", 12);
    expect(long).toHaveLength(4);
    expect(long[3]!.endsWith("…")).toBe(true);
    expect(splitTitleForSvg("")).toEqual(["Untitled"]);
  });

  it("recognises placeholder authors", () => {
    expect(isUnknownAuthor("Unknown Author")).toBe(true);
    expect(isUnknownAuthor(" ")).toBe(true);
    expect(isUnknownAuthor("Homer")).toBe(false);
  });
});
