import { beforeAll, describe, expect, it } from "bun:test";

import type { FoliateRawBook } from "../reader/foliate/FoliateDocumentAdapter";

import { ensureTestDom } from "../reader/foliate/testEnv";
import {
  cleanFootnoteContent,
  isFootnoteLink,
  resolveFootnote,
} from "./footnoteResolver";

beforeAll(() => {
  ensureTestDom();
});

describe("footnoteResolver — In-Reader Footnote & Endnote Instant Popover Engine", () => {
  describe("isFootnoteLink", () => {
    it("recognizes epub:type='noteref' links", () => {
      const a = document.createElement("a");
      a.setAttribute("href", "#fn1");
      a.setAttribute("epub:type", "noteref");
      expect(isFootnoteLink(a, "#fn1")).toBe(true);
    });

    it("recognizes role='doc-noteref' links", () => {
      const a = document.createElement("a");
      a.setAttribute("href", "notes.xhtml#note-42");
      a.setAttribute("role", "doc-noteref");
      expect(isFootnoteLink(a, "notes.xhtml#note-42")).toBe(true);
    });

    it("recognizes common footnote class names", () => {
      const a = document.createElement("a");
      a.setAttribute("href", "#ref-1");
      a.className = "footnote-ref custom-class";
      expect(isFootnoteLink(a, "#ref-1")).toBe(true);
    });

    it("recognizes superscript links pointing to anchor fragments", () => {
      const sup = document.createElement("sup");
      const a = document.createElement("a");
      a.setAttribute("href", "#source-1");
      a.textContent = "1";
      sup.appendChild(a);
      expect(isFootnoteLink(a, "#source-1")).toBe(true);
    });

    it("recognizes fragment patterns with fn, footnote, and note in href", () => {
      expect(isFootnoteLink(null, "chapter.xhtml#fn_001")).toBe(true);
      expect(isFootnoteLink(null, "text.xhtml#footnote-intro")).toBe(true);
      expect(isFootnoteLink(null, "#endnote-12")).toBe(true);
    });

    it("rejects non-footnote regular navigation links and external URLs", () => {
      expect(isFootnoteLink(null, "https://google.com")).toBe(false);
      expect(isFootnoteLink(null, "chapter2.xhtml")).toBe(false);
      expect(isFootnoteLink(null, "toc.xhtml#chapter-3")).toBe(false);
    });

    it("rejects backlink returns to prevent infinite popovers", () => {
      const a = document.createElement("a");
      a.setAttribute("href", "#backlink-1");
      expect(isFootnoteLink(a, "#backlink-1")).toBe(false);
    });
  });

  describe("cleanFootnoteContent", () => {
    it("strips return backlink symbols and cleans HTML", () => {
      const el = document.createElement("div");
      el.id = "fn1";
      el.innerHTML = `
        <p>
          <span class="footnote-label">1.</span>
          This is an illuminating philosophical explanation.
          <a href="#ref1" epub:type="backlink">↩</a>
        </p>
      `;

      const cleaned = cleanFootnoteContent(el);
      expect(cleaned.title).toBe("1");
      expect(cleaned.contentText).toContain("This is an illuminating philosophical explanation.");
      expect(cleaned.contentHtml).not.toContain("↩");
      expect(cleaned.contentHtml).not.toContain('epub:type="backlink"');
    });

    it("extracts leading bracketed numbers as title", () => {
      const el = document.createElement("li");
      el.id = "note-2";
      el.innerHTML = `[2] Historical context regarding the text. <a href="#src">back</a>`;

      const cleaned = cleanFootnoteContent(el);
      expect(cleaned.title).toBe("Note 2");
      expect(cleaned.contentText).toContain("Historical context regarding the text.");
      expect(cleaned.contentHtml).not.toContain("back");
    });
  });

  describe("resolveFootnote", () => {
    it("resolves footnote within the same document", async () => {
      const doc = document.implementation.createHTMLDocument("Test Document");
      const note = doc.createElement("aside");
      note.id = "fn-local";
      note.setAttribute("epub:type", "footnote");
      note.innerHTML = `<p>Immediate in-chapter clarification.</p>`;
      doc.body.appendChild(note);

      const resolved = await resolveFootnote(null, doc, "#fn-local");
      expect(resolved).not.toBeNull();
      expect(resolved?.id).toBe("fn-local");
      expect(resolved?.contentText).toBe("Immediate in-chapter clarification.");
    });

    it("resolves footnote across external rawBook sections", async () => {
      const extDoc = document.implementation.createHTMLDocument("Notes Section");
      const extNote = extDoc.createElement("div");
      extNote.id = "note-distant";
      extNote.innerHTML = `
        <span class="fn-label">Note 42.</span>
        Deep archival reference discovered in another section.
        <a href="#origin">↑</a>
      `;
      extDoc.body.appendChild(extNote);

      const mockRawBook = {
        sections: [
          {
            createDocument: async () => extDoc,
            href: "notes.xhtml",
            load: async () => "",
          },
        ],
        resolveHref: () => ({
          anchor: (d: Document) => d.getElementById("note-distant"),
          index: 0,
        }),
      };

      const resolved = await resolveFootnote(mockRawBook as unknown as FoliateRawBook, null, "notes.xhtml#note-distant");
      expect(resolved).not.toBeNull();
      expect(resolved?.title).toBe("Note 42");
      expect(resolved?.contentText).toContain("Deep archival reference discovered in another section.");
      expect(resolved?.contentHtml).not.toContain("↑");
    });

    it("returns null gracefully when footnote target does not exist", async () => {
      const doc = document.implementation.createHTMLDocument("Empty Document");
      const resolved = await resolveFootnote(null, doc, "#missing-fn");
      expect(resolved).toBeNull();
    });
  });
});
