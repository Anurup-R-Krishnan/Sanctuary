import { beforeAll, describe, expect, it } from "bun:test";
import * as fs from "fs";
import path from "path";

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
      expect(isSupportedExtension("doc.pdf")).toBe(true);
      expect(isSupportedExtension("manga.cbz")).toBe(true);
      expect(isSupportedExtension("comic.cbr")).toBe(true);
      expect(isSupportedExtension("image.png")).toBe(false);
      expect(isSupportedExtension("executable.bin")).toBe(false);
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
      expect(await detectBookFormat(new Blob(), "document.pdf")).toBe("pdf");
      expect(await detectBookFormat(new Blob(), "manga.cbz")).toBe("cbz");
      expect(await detectBookFormat(new Blob(), "comic.cbr")).toBe("cbr");

      // ZIP magic byte
      const zipBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
      expect(await detectBookFormat(zipBytes)).toBe("epub");

      // PDF magic bytes
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
      expect(await detectBookFormat(pdfBytes)).toBe("pdf");

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
      expect(book.sections.length).toBe(1);
      expect(book.toc.length).toBe(1);

      // Verify subitems in TOC
      expect(book.toc[0].subitems?.length).toBeGreaterThan(0);
      expect(book.toc[0].subitems?.[0].label).toContain("Section 2.1");

      const nav = book.resolveHref("0");
      expect(nav?.index).toBe(0);

      book.destroy?.();
    });

    it("keeps Markdown formatting when the filename is unavailable after persistence", async () => {
      const adapter = await FoliateDocumentAdapter.create(
        new Blob(["A **bold** paragraph without a document heading."]),
        "markdown"
      );

      expect(adapter.format).toBe("markdown");
      const loadedSection = await adapter.sections[0].load();
      const rendered = typeof loadedSection === "string"
        ? loadedSection
        : "documentElement" in loadedSection
          ? loadedSection.documentElement.outerHTML
          : loadedSection.outerHTML;
      expect(rendered).toContain("<strong>bold</strong>");
      adapter.destroy();
    });

    it("renders Obsidian-style callouts, heading links, and GFM reading blocks", async () => {
      const book = await parseMarkdownToBook(`
# Reader Notes

> [!tip] Read actively
> Capture one useful idea per chapter.

Jump [[#Reader Notes|back to the heading]].

Footnote reference[^1].

| Feature | Ready |
| --- | :---: |
| Tables | ✓ |

- [x] Keep this note

[^1]: A reader footnote.
`);
      const document = await book.sections[0].createDocument();

      expect(document.querySelector("aside.callout-tip .callout-title")?.textContent ?? "").toContain("Read actively");
      expect(document.querySelector("a.wiki-link")?.getAttribute("href")).toBe("#heading-reader-notes");
      expect(document.querySelector("table")).not.toBeNull();
      expect(document.querySelector("input[type='checkbox']")?.getAttribute("checked")).not.toBeNull();
      expect(document.querySelector(".footnotes")).not.toBeNull();
      book.destroy?.();
    });

    it("renders sanitized HTML from notebook exports with typographic attribute quotes", async () => {
      const book = await parseMarkdownToBook(`
<div class=“cell markdown”>

Train the GAN and Inspect Output

</div>

<div class=“cell code” data-execution_count=“9” data-collapsed=“false”>
Code output
</div>

<script>alert("never run")</script>
`);
      const document = await book.sections[0].createDocument();

      expect(document.querySelectorAll("div.cell")).toHaveLength(2);
      expect(document.querySelector("div.cell.markdown")?.textContent).toContain("Train the GAN");
      expect(document.querySelector("script")).toBeNull();
      book.destroy?.();
    });

    it("renders rich syntax highlighting and Jupyter notebook cell containers", async () => {
      const book = await parseMarkdownToBook(`
<div class="cell markdown">
## Training GANs
</div>

<div class="cell code" data-execution_count="7">
\`\`\`python
def vae_loss(x: tf.Tensor):
    # Calculate loss
    return x * 0.5
\`\`\`
</div>
`);
      const document = await book.sections[0].createDocument();

      // Heading normalized and parsed
      expect(document.querySelector("h2")?.textContent).toContain("Training GANs");

      // Cell container and execution count
      const codeCell = document.querySelector("div.cell.code");
      expect(codeCell).not.toBeNull();
      expect(codeCell?.getAttribute("data-execution_count")).toBe("7");

      // Code card language badge
      const pre = document.querySelector("pre");
      expect(pre?.getAttribute("data-language")).toBe("PYTHON");

      // Multi-language syntax tokens (Shiki / rehype-pretty-code)
      expect(document.querySelector("pre code span[style*='--shiki-dark']")).not.toBeNull();
      
      const codeText = document.querySelector("pre code")?.textContent || "";
      expect(codeText).toContain("def vae_loss(x: tf.Tensor):");
      expect(codeText).toContain("Calculate loss");

      book.destroy?.();
    });

    it("renders LaTeX mathematics via KaTeX into MathML and HTML", async () => {
      const book = await parseMarkdownToBook(`
# Advanced Mathematics

Here is Einstein's mass-energy equation: $E = mc^2$.

And the summation formula:
$$
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
$$
`);
      const document = await book.sections[0].createDocument();
      expect(document.querySelector("parsererror")).toBeNull();

      // Math elements compiled by KaTeX
      const mathElements = document.querySelectorAll(".katex");
      expect(mathElements.length).toBeGreaterThanOrEqual(2);

      // Contains MathML semantics and annotations
      const mathMl = document.querySelectorAll("math");
      expect(mathMl.length).toBeGreaterThanOrEqual(2);
      expect(document.querySelector("annotation[encoding='application/x-tex']")?.textContent).toContain("E = mc^2");

      book.destroy?.();
    });

    it("renders Obsidian highlight marks, wikilinks, and collapsible callout details", async () => {
      const book = await parseMarkdownToBook(`
# Cognitive Study

Remember this ==crucial hypothesis== during evaluation.

> [!tip]+ Expandable Secret
> Click to reveal this tip.

> [!warning]- Hidden Caution
> This warning starts collapsed.
`);
      const document = await book.sections[0].createDocument();
      expect(document.querySelector("parsererror")).toBeNull();

      // Obsidian mark syntax ==text==
      const mark = document.querySelector("mark");
      expect(mark).not.toBeNull();
      expect(mark?.textContent).toBe("crucial hypothesis");

      // Collapsible callout [+] -> details[open]
      const openCallout = document.querySelector("details.callout-tip");
      expect(openCallout).not.toBeNull();
      expect(openCallout?.getAttribute("open")).not.toBeNull();
      expect(openCallout?.querySelector("summary.callout-title svg.callout-icon")).not.toBeNull();

      // Collapsible callout [-] -> details without open
      const closedCallout = document.querySelector("details.callout-warning");
      expect(closedCallout).not.toBeNull();
      expect(closedCallout?.getAttribute("open")).toBeNull();

      book.destroy?.();
    });

    it("extracts comprehensive YAML frontmatter metadata and renders document banner", async () => {
      const book = await parseMarkdownToBook(`---
title: Quantum Computing Principles
author: Dr. Erwin Schrödinger
date: 2026-09-17
tags: [physics, quantum, algorithms]
description: A gentle introduction to qubits and superposition
---

# Introduction to Qubits
The quantum world behaves differently.
`);
      expect(book.metadata.title).toBe("Quantum Computing Principles");
      expect(book.metadata.author).toBe("Dr. Erwin Schrödinger");
      expect(book.rendition?.layout).toBe("scrolled");

      const document = await book.sections[0].createDocument();
      expect(document.querySelector("parsererror")).toBeNull();

      const metadataHeader = document.querySelector("header.document-metadata");
      expect(metadataHeader).not.toBeNull();
      expect(metadataHeader?.textContent).toContain("Dr. Erwin Schrödinger");
      expect(metadataHeader?.textContent).toContain("2026-09-17");

      const tagPills = document.querySelectorAll(".tag-pill");
      expect(tagPills.length).toBe(3);
      expect(tagPills[0].textContent).toBe("#physics");

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
      expect(adapter.sections.length).toBe(1);

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
      const buffer = fs.readFileSync(path.join(import.meta.dir, "../../../public/mobydick.epub"));
      const file = new File([buffer], "mobydick.epub", { type: "application/epub+zip" });
      const adapter = await FoliateDocumentAdapter.create(file);

      expect(adapter.format).toBe("epub");
      expect(adapter.metadata.title.toLowerCase()).toContain("moby");
      expect(adapter.sections.length).toBeGreaterThan(0);

      adapter.destroy();
    });
  });

  describe("Multi-Format Pipeline Edge Cases & Resilience", () => {
    it("strips UTF-8 BOM from plain text without corrupting title", async () => {
      const bomText = "\uFEFFClean Title\n\nThis is the first chapter after BOM.";
      const book = await parseTxtToBook(bomText);
      expect(book.metadata.title).toBe("Clean Title");
      expect(book.sections.length).toBeGreaterThan(0);
      book.destroy?.();
    });

    it("strips UTF-8 BOM from Markdown with frontmatter", async () => {
      const bomMd = "\uFEFF---\ntitle: BOM Book\nauthor: Test Author\n---\n\n# Heading 1\nContent.";
      const book = await parseMarkdownToBook(bomMd);
      expect(book.metadata.title).toBe("BOM Book");
      expect(book.metadata.author).toBe("Test Author");
      book.destroy?.();
    });

    it("handles headless HTML snippets gracefully", async () => {
      const headlessHtml = `<h2>Fragment Title</h2><p>A standalone snippet without html doctype.</p>`;
      const book = await parseHtmlToBook(headlessHtml, "Fallback Fragment");
      expect(book.sections.length).toBe(1);
      expect(book.toc.length).toBeGreaterThan(0);
      expect(book.toc[0].label).toContain("Fragment Title");
      book.destroy?.();
    });

    it("handles empty and whitespace-only documents safely", async () => {
      const emptyTxt = "    \n\n   ";
      const bookTxt = await parseTxtToBook(emptyTxt, "Empty Doc");
      expect(bookTxt.metadata.title).toBe("Empty Doc");
      expect(bookTxt.sections.length).toBe(1);
      bookTxt.destroy?.();

      const emptyMd = "";
      const bookMd = await parseMarkdownToBook(emptyMd, "Empty MD");
      expect(bookMd.metadata.title).toBe("Empty MD");
      expect(bookMd.sections.length).toBe(1);
      bookMd.destroy?.();
    });
  });
});
