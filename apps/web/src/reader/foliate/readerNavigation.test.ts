import { beforeAll, describe, expect, it } from "bun:test";
import * as fs from "fs";
import path from "path";

import { FoliateEpubAdapter } from "./FoliateEpubAdapter";
import { FoliateRendition } from "./FoliateRendition";
import { ensureTestDom } from "./testEnv";

beforeAll(() => {
  ensureTestDom();
});

describe("Foliate Reader Navigation & TOC", () => {
  it("extracts TOC hierarchy and navigates section anchors", async () => {
    const buffer = fs.readFileSync(path.join(import.meta.dir, "../../../public/mobydick.epub"));
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

    // Update layout flow with RTL direction and CJK vertical writing mode
    await rendition.setFlow({
      continuous: false,
      direction: "rtl",
      spread: false,
      themeStyles: { body: { "font-size": "18px" } },
      writingMode: "vertical-rl",
    });

    // 4. Spread and column count verification
    // When spread is false, resize must set max-column-count to 1 even if container is wide
    rendition.resize(1600, 1000);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderer = (rendition as any).view?.renderer;
    expect(renderer?.getAttribute("max-column-count")).toBe("1");

    // When spread is true and container is wide (>= 700), it sets max-column-count to 2
    await rendition.setFlow({
      continuous: false,
      spread: true,
      themeStyles: { body: { "font-size": "18px" } },
    });
    rendition.resize(1200, 800);
    expect(renderer?.getAttribute("max-column-count")).toBe("2");

    // When spread is true but width is narrow (< 700), fallback to 1 column
    rendition.resize(500, 800);
    expect(renderer?.getAttribute("max-column-count")).toBe("1");

    // 5. Deselect emits selected: null
    let selectedEventValue: unknown = "not-called";
    rendition.on("selected", (val) => {
      selectedEventValue = val;
    });
    rendition.deselect();
    expect(selectedEventValue).toBeNull();

    // 6. setStyles strips accidental !important to prevent syntax errors
    rendition.setStyles({
      body: {
        color: "#222222 !important",
        "font-size": "20px",
      },
    });

    // 7. Verify readingMode options: paginated, scrolled, and continuous
    await rendition.setFlow({
      continuous: false,
      readingMode: "paginated",
      spread: false,
      themeStyles: {},
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((rendition as any).scrollContinuity.getMode()).toBe("paginated");
    expect(renderer?.getAttribute("flow")).toBe("paginated");

    await rendition.setFlow({
      continuous: true,
      readingMode: "scrolled",
      spread: false,
      themeStyles: {},
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((rendition as any).scrollContinuity.getMode()).toBe("scrolled");
    expect(renderer?.getAttribute("flow")).toBe("scrolled");

    await rendition.setFlow({
      continuous: true,
      readingMode: "continuous",
      spread: false,
      themeStyles: {},
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((rendition as any).scrollContinuity.getMode()).toBe("continuous");
    expect(renderer?.getAttribute("flow")).toBe("scrolled");

    rendition.destroy();
    adapter.destroy();
  });
});

