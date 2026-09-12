import { beforeAll, describe, expect, it } from "bun:test";
import * as fs from "fs";

import { FoliateEpubAdapter } from "./FoliateEpubAdapter";
import { FoliateRendition } from "./FoliateRendition";
import { ensureTestDom } from "./testEnv";

beforeAll(() => {
  ensureTestDom();
});

describe("Foliate Reader Navigation & TOC", () => {
  it("extracts TOC hierarchy and navigates section anchors", async () => {
    const buffer = fs.readFileSync("mobydick.epub");
    const file = new File([buffer], "mobydick.epub", { type: "application/epub+zip" });
    const adapter = await FoliateEpubAdapter.create(file);

    // 1. Validate TOC extraction
    expect(adapter.toc.length).toBeGreaterThan(0);
    const firstItem = adapter.toc[0];
    expect(firstItem.id).toBeDefined();
    expect(firstItem.label).toContain("MOBY-DICK");
    expect(firstItem.href).toBeDefined();

    // 2. Validate section href resolution
    const sec0 = adapter.getSectionByIndex(0);
    expect(sec0).toBeDefined();
    expect(sec0?.href).toBe("OEBPS/wrap0000.xhtml");

    const resolved = adapter.getSectionByHref("OEBPS/wrap0000.xhtml");
    expect(resolved?.index).toBe(0);

    // Normalized lookup with leading ./ and hash fragment
    const resolvedNormalized = adapter.getSectionByHref("./OEBPS/wrap0000.xhtml#heading");
    expect(resolvedNormalized?.index).toBe(0);

    // 3. Section weights and progress calculations
    expect(adapter.sections.length).toBe(12);
    for (const sec of adapter.sections) {
      expect(sec.weight).toBeGreaterThan(0);
      expect(sec.linear).toBe(true);
    }

    adapter.destroy();
  });

  it("manages reader flow options and background transitions", async () => {
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
        themeStyles: { body: { "font-size": "16px" } },
      },
      "#fdf6e2"
    );

    expect(rendition).toBeDefined();

    // Update background
    rendition.updateBackground("#121212");
    expect(container.style.backgroundColor).toBe("rgb(18, 18, 18)");

    // Update layout flow without destroying book
    await rendition.setFlow({
      continuous: true,
      spread: false,
      themeStyles: { body: { "font-size": "18px", color: "#e0e0e0" } },
    });

    rendition.destroy();
    adapter.destroy();
  });
});
