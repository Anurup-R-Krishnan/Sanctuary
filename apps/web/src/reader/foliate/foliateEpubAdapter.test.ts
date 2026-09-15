import { beforeAll, describe, expect, it } from "bun:test";
import * as fs from "fs";
import path from "path";

import { FoliateEpubAdapter } from "./FoliateEpubAdapter";
import { ensureTestDom } from "./testEnv";

beforeAll(() => {
  ensureTestDom();
});

describe("FoliateEpubAdapter", () => {
  it("parses an EPUB file into a valid BookDocument model", async () => {
    const buffer = fs.readFileSync(path.join(import.meta.dir, "../../../public/mobydick.epub"));
    const file = new File([buffer], "mobydick.epub", { type: "application/epub+zip" });

    const doc = await FoliateEpubAdapter.create(file);

    // Format & Metadata
    expect(doc.format).toBe("epub");
    expect(doc.metadata.title).toContain("Moby Dick");
    expect(doc.metadata.author).toContain("Herman Melville");
    expect(doc.metadata.direction).toBe("ltr");
    expect(doc.metadata.language).toBe("en");

    // Sections
    expect(doc.sections.length).toBe(12);
    const firstSec = doc.getSectionByIndex(0);
    expect(firstSec).toBeDefined();
    expect(firstSec?.index).toBe(0);
    expect(firstSec?.href).toBe("OEBPS/wrap0000.xhtml");

    // Lookup by exact href and normalized href
    const foundSec = doc.getSectionByHref("OEBPS/wrap0000.xhtml");
    expect(foundSec).toBeDefined();
    expect(foundSec?.index).toBe(0);

    const foundSecNormalized = doc.getSectionByHref("./OEBPS/wrap0000.xhtml#anchor");
    expect(foundSecNormalized).toBeDefined();
    expect(foundSecNormalized?.index).toBe(0);

    // Table of Contents
    expect(doc.toc.length).toBe(141);
    expect(doc.toc[0].label).toContain("MOBY-DICK");
    expect(doc.toc[0].href).toBeDefined();

    // Cover extraction
    const coverBlob = await doc.getCoverBlob();
    if (coverBlob) {
      expect(coverBlob.size).toBeGreaterThan(0);
    }

    doc.destroy();
  });
});
