import { beforeAll, describe, expect, it } from "bun:test";
import * as fs from "fs";
import path from "path";

import { FoliateEpubAdapter } from "./FoliateEpubAdapter";
import { FoliateRendition } from "./FoliateRendition";
import { ensureTestDom } from "./testEnv";

beforeAll(() => {
  ensureTestDom();
});

describe("Foliate In-Book Search", () => {
  it("searches across book chapters and produces matching excerpts with CFIs", async () => {
    const buffer = fs.readFileSync(path.join(import.meta.dir, "../../../public/mobydick.epub"));
    const file = new File([buffer], "mobydick.epub", { type: "application/epub+zip" });
    const adapter = await FoliateEpubAdapter.create(file);
    const container = document.getElementById("reader-container") as HTMLDivElement;

    const rendition = await FoliateRendition.create(
      container,
      adapter,
      {
        continuous: false,
        spread: false,
        themeStyles: {},
      },
      "#ffffff"
    );

    // Perform full-text search
    const results = await rendition.search("Ishmael");
    expect(results.length).toBeGreaterThan(0);

    const firstMatch = results[0];
    expect(firstMatch.cfi).toBeDefined();
    expect(firstMatch.cfi).toContain("epubcfi(");
    expect(firstMatch.excerpt.toLowerCase()).toContain("ishmael");
    expect(firstMatch.chapterLabel).toBeDefined();

    // Verify active search result highlighting
    rendition.highlightSearchResult(firstMatch.cfi);
    expect(rendition.getActiveSearchCfi()).toBe(firstMatch.cfi);

    // Verify search with a different query
    const whaleResults = await rendition.search("whale");
    expect(whaleResults.length).toBeGreaterThan(5);

    // Clear search and verify active search state resets
    rendition.clearSearch();
    expect(rendition.getActiveSearchCfi()).toBeNull();

    rendition.destroy();
    adapter.destroy();
  }, 15000);
});
