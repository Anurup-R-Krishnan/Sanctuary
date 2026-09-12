import { beforeAll, describe, expect, it } from "bun:test";
import * as fs from "fs";

import { FoliateEpubAdapter } from "./FoliateEpubAdapter";
import { FoliateRendition } from "./FoliateRendition";
import { ensureTestDom } from "./testEnv";

beforeAll(() => {
  ensureTestDom();
});

describe("Foliate Annotations API", () => {
  it("provides highlight, underline, and remove operations", async () => {
    const buffer = fs.readFileSync("mobydick.epub");
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

    expect(rendition.annotations).toBeDefined();
    const annotations = rendition.annotations!;

    // Test adding a highlight
    const sampleCfi = "epubcfi(/6/2[wrap0000]!/4/2/10/1:0,/4/2/10/1:10)";
    expect(() => {
      annotations.highlight(sampleCfi, { color: "#fef08a" });
    }).not.toThrow();

    // Test adding an underline
    expect(() => {
      annotations.underline(sampleCfi, { color: "#38bdf8" });
    }).not.toThrow();

    // Test removing annotation
    expect(() => {
      annotations.remove(sampleCfi);
    }).not.toThrow();

    // Test clear
    expect(() => {
      annotations.clear();
    }).not.toThrow();

    rendition.destroy();
    adapter.destroy();
  });
});
