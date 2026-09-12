import { beforeAll, describe, expect, it } from "bun:test";
import * as fs from "fs";

import { FoliateDocumentAdapter } from "../foliate/FoliateDocumentAdapter";
import { FoliateRendition } from "../foliate/FoliateRendition";
import { ensureTestDom } from "../foliate/testEnv";
import { detectBookFormat, isSupportedExtension } from "./FormatDetector";
import { parseHtmlToBook } from "./HtmlParser";
import { parseMarkdownToBook } from "./MarkdownParser";
import { parseTxtToBook } from "./TxtParser";

beforeAll(() => {
  ensureTestDom();
});

describe("Multi-Format Pipeline & Decoders", () => {
  describe("FormatDetector", () => {
    it("recognizes all supported file extensions", () => {
      expect(isSupportedExtension("book.epub")).toBe(true);
      expect(isSupportedExtension("book.fb2")).toBe(true);
      expect(isSupportedExtension("book.fbz")).toBe(true);
      expect(isSupportedExtension("book.mobi")).toBe(true);
      expect(isSupportedExtension("book.azw")).toBe(true);
      expect(isSupportedExtension("book.azw3")).toBe(true);
      expect(isSupportedExtension("book.txt")).toBe(true);
      expect(isSupportedExtension("book.html")).toBe(true);
      expect(isSupportedExtension("book.xhtml")).toBe(true);
      expect(isSupportedExtension("book.md")).toBe(true);
      expect(isSupportedExtension("book.markdown")).toBe(true);
      expect(isSupportedExtension("image.png")).toBe(false);
      expect(isSupportedExtension("doc.pdf")).toBe(false);
    });

    it("detects formats from file names and magic bytes", async () => {
      // Filename based
      expect(await detectBookFormat(new Blob(), "story.txt")).toBe("txt");
      expect(await detectBookFormat(new Blob(), "guide.md")).toBe("markdown");
      expect(await detectBookFormat(new Blob(), "manual.html")).toBe("html");
      expect(await detectBookFormat(new Blob(), "doc.xhtml")).toBe("xhtml");
      expect(await detectBookFormat(new Blob(), "novel.fb2")).toBe("fb2");
      expect(await detectBookFormat(new Blob(), "novel.mobi")).toBe("mobi");
      expect(await detectBookFormat(new Blob(), "novel.azw3")).toBe("azw3");

      // ZIP magic byte
      const zipBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
      expect(await detectBookFormat(zipBytes)).toBe("epub");

      // MOBI magic byte at offset 60
      const mobiBytes = new Uint8Array(80);
      const mobiMagic = "BOOKMOBI";
      for (let i = 0; i < mobiMagic.length; i++) {
        mobiBytes[60 + i] = mobiMagic.charCodeAt(i);
      }
      expect(await detectBookFormat(mobiBytes)).toBe("mobi");

      // FB2 XML snippet
      const fb2Bytes = new TextEncoder().encode("<?xml version=\"1.0\"?><FictionBook>...</FictionBook>");
      expect(await detectBookFormat(fb2Bytes)).toBe("fb2");

      // HTML snippet
      const htmlBytes = new TextEncoder().encode("<!DOCTYPE html><html><head></head><body></body></html>");
      expect(await detectBookFormat(htmlBytes)).toBe("html");

      // Markdown snippet
      const mdBytes = new TextEncoder().encode("# Title of the Book\n\nIntro paragraph");
      expect(await detectBookFormat(mdBytes)).toBe("markdown");
    });
  });

  describe("TxtParser", () => {
    it("parses plain text with chapters into structured sections and TOC", async () => {
      const sampleText = `The Great Adventure
By John Doe

Chapter 1: The Beginning
It was a dark and stormy night. The wind howled through the trees.

The traveller walked along the quiet path.

Chapter 2: The Discovery
Morning brought clear skies and warm sunlight.
A strange artifact lay half-buried near the riverbank.`;

      const book = await parseTxtToBook(sampleText);
      expect(book.metadata.title).toBe("The Great Adventure");
      expect(book.sections.length).toBeGreaterThanOrEqual(2);
      expect(book.toc.some((t) => t.label.includes("Chapter 1"))).toBe(true);
      expect(book.toc.some((t) => t.label.includes("Chapter 2"))).toBe(true);

      // Validate section loading
      const sec0Url = await book.sections[0].load();
      expect(sec0Url).toMatch(/^blob:/);

      const nav = book.resolveHref("1");
      expect(nav?.index).toBe(1);

      book.destroy?.();
    });
  });

  describe("MarkdownParser", () => {
    it("parses Markdown with frontmatter, headings, and formatting", async () => {
      const sampleMd = `---
title: The Markdown Chronicle
author: Jane Smith
---

# Chapter 1: Awakening
Welcome to the *digital* world.

Here is a list of features:
- **Fast** performance
- Responsive layout
- \`code snippets\`

> Reading should be effortless and enjoyable.

# Chapter 2: Voyage
We set sail at dawn.
## Section 2.1: The Harbor
The waters were calm.`;

      const book = await parseMarkdownToBook(sampleMd);
      expect(book.metadata.title).toBe("The Markdown Chronicle");
      expect(book.metadata.author).toBe("Jane Smith");
      expect(book.sections.length).toBe(2);
      expect(book.toc.length).toBe(2);

      // Verify subitems in TOC
      expect(book.toc[1].subitems?.length).toBeGreaterThan(0);
      expect(book.toc[1].subitems?.[0].label).toContain("Section 2.1");

      const nav = book.resolveHref("0");
      expect(nav?.index).toBe(0);

      book.destroy?.();
    });
  });

  describe("HtmlParser", () => {
    it("parses standalone HTML documents into BookDocument structure", async () => {
      const sampleHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>The Single Page Odyssey</title>
  <meta name="author" content="Captain Nemo"/>
</head>
<body>
  <h1>The Single Page Odyssey</h1>
  <p>The sea is everything.</p>
  <h2 id="coral-caves">The Coral Caves</h2>
  <p>Sunlight filtered through 50 fathoms of crystal water.</p>
</body>
</html>`;

      const book = await parseHtmlToBook(sampleHtml);
      expect(book.metadata.title).toBe("The Single Page Odyssey");
      expect(book.metadata.author).toBe("Captain Nemo");
      expect(book.sections.length).toBe(1);
      expect(book.toc.length).toBeGreaterThanOrEqual(2);

      const secUrl = await book.sections[0].load();
      expect(secUrl).toMatch(/^blob:/);

      const resolved = book.resolveHref("0#coral-caves");
      expect(resolved?.index).toBe(0);

      book.destroy?.();
    });
  });

  describe("FoliateDocumentAdapter Multi-Format End-to-End", () => {
    it("renders FB2 XML through FoliateDocumentAdapter and FoliateRendition", async () => {
      const fb2Xml = `<?xml version="1.0" encoding="utf-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0">
  <description>
    <title-info>
      <genre>detective</genre>
      <author><first-name>Sherlock</first-name><last-name>Holmes</last-name></author>
      <book-title>The Sign of Four</book-title>
      <lang>en</lang>
    </title-info>
  </description>
  <body>
    <title><p>The Sign of Four</p></title>
    <section id="c1">
      <title><p>Chapter I</p></title>
      <p>Sherlock Holmes took his bottle from the corner of the mantelpiece.</p>
    </section>
  </body>
</FictionBook>`;

      const blob = new Blob([fb2Xml], { type: "application/x-fictionbook+xml" });
      const file = new File([blob], "signoffour.fb2", { type: "application/x-fictionbook+xml" });
      const adapter = await FoliateDocumentAdapter.create(file);

      expect(adapter.format).toBe("fb2");
      expect(adapter.metadata.title).toBe("The Sign of Four");
      expect(adapter.metadata.author).toContain("Sherlock Holmes");
      expect(adapter.sections.length).toBeGreaterThan(0);
      expect(adapter.toc.length).toBeGreaterThan(0);

      const container = document.getElementById("reader-container") as HTMLDivElement;
      const rendition = await FoliateRendition.create(
        container,
        adapter,
        { continuous: false, spread: false, themeStyles: {} },
        "#ffffff"
      );

      expect(rendition).toBeDefined();

      rendition.destroy();
      adapter.destroy();
    });

    it("renders Markdown book through FoliateDocumentAdapter and FoliateRendition", async () => {
      const mdContent = `# The Cosmic Engine\n\nChapter content here.\n\n# Chapter Two\n\nMore deep space exploration.`;
      const file = new File([mdContent], "cosmos.md", { type: "text/markdown" });
      const adapter = await FoliateDocumentAdapter.create(file);

      expect(adapter.format).toBe("markdown");
      expect(adapter.metadata.title).toBe("The Cosmic Engine");
      expect(adapter.sections.length).toBe(2);

      const container = document.getElementById("reader-container") as HTMLDivElement;
      const rendition = await FoliateRendition.create(
        container,
        adapter,
        { continuous: true, spread: false, themeStyles: {} },
        "#ffffff"
      );

      expect(rendition).toBeDefined();

      rendition.destroy();
      adapter.destroy();
    });

    it("renders EPUB file through FoliateDocumentAdapter", async () => {
      const buffer = fs.readFileSync("mobydick.epub");
      const file = new File([buffer], "mobydick.epub", { type: "application/epub+zip" });
      const adapter = await FoliateDocumentAdapter.create(file);

      expect(adapter.format).toBe("epub");
      expect(adapter.metadata.title.toLowerCase()).toContain("moby");
      expect(adapter.sections.length).toBeGreaterThan(0);

      adapter.destroy();
    });
  });
});
