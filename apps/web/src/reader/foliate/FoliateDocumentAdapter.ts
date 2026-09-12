/**
 * Unified Foliate Document Adapter.
 * Adapts all 8 supported e-book and text formats into Sanctuary's format-agnostic BookDocument model:
 * - EPUB
 * - FB2 / FBZ
 * - MOBI / AZW / AZW3
 * - Plain Text (TXT)
 * - HTML / XHTML
 * - Markdown
 */

import type {
  BookDocument,
  BookFormat,
  DocumentMetadata,
  DocumentSection,
  DocumentTocItem,
} from "../contracts/document";

import { detectBookFormat } from "../formats/FormatDetector";
import { parseHtmlToBook } from "../formats/HtmlParser";
import { parseMarkdownToBook } from "../formats/MarkdownParser";
import { parsePdfToBook } from "../formats/PdfParser";
import { parseTxtToBook } from "../formats/TxtParser";

export interface FoliateRawSection {
  createDocument?(): Promise<Document> | Document;
  href?: string;
  id?: string | number;
  linear?: string;
  load(): Promise<string> | string;
  size?: number;
  title?: string;
  unload?(): void;
}

export interface FoliateRawTocItem {
  href?: string;
  id?: string;
  label?: string;
  subitems?: FoliateRawTocItem[];
}

export interface FoliateRawBook {
  destroy?(): void;
  dir?: "ltr" | "rtl";
  getCover?(): Promise<Blob | null>;
  metadata?: Record<string, unknown>;
  rendition?: { layout?: string };
  resolveHref(href: string): { index: number; anchor?: (doc: Document) => Element | Range | null } | null;
  sections: FoliateRawSection[];
  splitTOCHref?(href: string): number[];
  toc?: FoliateRawTocItem[];
}

function normalizeTitle(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") {
    const firstVal = Object.values(raw)[0];
    if (typeof firstVal === "string") return firstVal;
  }
  return "Untitled";
}

function normalizeAuthor(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    return raw.map(normalizeAuthor).filter(Boolean).join(", ");
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.name === "string") return obj.name;
    const firstVal = Object.values(obj)[0];
    if (typeof firstVal === "string") return firstVal;
  }
  return "Unknown Author";
}

function mapToc(items: FoliateRawTocItem[] | undefined): DocumentTocItem[] {
  if (!items || !Array.isArray(items)) return [];
  return items.map((item, index) => {
    const href = typeof item.href === "string" ? item.href : "";
    const id = item.id || href || `toc-${index}`;
    const label = typeof item.label === "string" ? item.label.trim() : `Section ${index + 1}`;
    const subitems = item.subitems && item.subitems.length > 0 ? mapToc(item.subitems) : undefined;
    return { id, label, href, subitems };
  });
}

export class FoliateDocumentAdapter implements BookDocument {
  public readonly format: BookFormat;
  public readonly metadata: DocumentMetadata;
  public readonly sections: DocumentSection[];
  public readonly toc: DocumentTocItem[];
  public readonly rawBook: FoliateRawBook;

  public constructor(rawBook: FoliateRawBook, format: BookFormat = "epub") {
    this.rawBook = rawBook;
    this.format = format;

    // Normalize Metadata
    const rawMeta = rawBook.metadata ?? {};
    const title = normalizeTitle(rawMeta.title);
    const author = normalizeAuthor(rawMeta.author ?? rawMeta.creator);

    this.metadata = {
      title,
      author,
      creator: author,
      language: typeof rawMeta.language === "string" ? rawMeta.language : "en",
      direction: rawBook.dir === "rtl" ? "rtl" : "ltr",
      identifier: typeof rawMeta.identifier === "string" ? rawMeta.identifier : undefined,
      description: typeof rawMeta.description === "string" ? rawMeta.description : undefined,
      publisher: typeof rawMeta.publisher === "string" ? rawMeta.publisher : undefined,
    };

    // Normalize Sections
    const rawSections = Array.isArray(rawBook.sections) ? rawBook.sections : [];
    this.sections = rawSections.map((sec, index) => {
      const id = String(sec.id ?? `sec-${index}`);
      const href = sec.href || String(sec.id) || `section-${index}.xhtml`;
      const linear = sec.linear !== "no";
      const weight = typeof sec.size === "number" && sec.size > 0 ? sec.size : 1024;

      return {
        id,
        index,
        href,
        linear,
        weight,
        load: async () => {
          if (typeof sec.createDocument === "function") {
            const doc = await sec.createDocument();
            if (doc) return doc;
          }
          const loadedUrl = await sec.load();
          return loadedUrl;
        },
        unload: () => {
          sec.unload?.();
        },
      };
    });

    // Normalize TOC
    this.toc = mapToc(rawBook.toc);
  }

  public static async create(
    source: Blob | File | ArrayBuffer,
    fileNameOrHint?: string
  ): Promise<FoliateDocumentAdapter> {
    const fileName = fileNameOrHint || (source instanceof File ? source.name : "book.epub");
    const format = await detectBookFormat(source, fileName);

    let rawBook: FoliateRawBook;

    switch (format) {
      case "epub": {
        let fileInput: File;
        if (source instanceof File && source.name.toLowerCase().endsWith(".epub")) {
          fileInput = source;
        } else {
          const blob = source instanceof Blob ? source : new Blob([source], { type: "application/epub+zip" });
          fileInput = new File([blob], fileName.endsWith(".epub") ? fileName : `${fileName}.epub`, {
            type: "application/epub+zip",
          });
        }
        const { makeBook } = await import("foliate-js/view.js");
        rawBook = (await makeBook(fileInput)) as unknown as FoliateRawBook;
        break;
      }

      case "fb2": {
        const isArchive = fileName.toLowerCase().endsWith(".fbz") || fileName.toLowerCase().endsWith(".fb2.zip");
        if (isArchive) {
          const { makeBook } = await import("foliate-js/view.js");
          const fileInput = source instanceof File
            ? source
            : new File([source instanceof Blob ? source : new Blob([source])], fileName);
          rawBook = (await makeBook(fileInput)) as unknown as FoliateRawBook;
        } else {
          const { makeFB2 } = await import("foliate-js/fb2.js");
          const blob = source instanceof Blob ? source : new Blob([source], { type: "application/x-fictionbook+xml" });
          rawBook = (await makeFB2(blob)) as unknown as FoliateRawBook;
        }
        break;
      }

      case "mobi":
      case "azw":
      case "azw3": {
        const fileInput = source instanceof File
          ? source
          : new File([source instanceof Blob ? source : new Blob([source])], fileName);
        const { MOBI } = await import("foliate-js/mobi.js");
        const fflate = await import("foliate-js/vendor/fflate.js");
        rawBook = (await new MOBI({ unzlib: fflate.unzlibSync }).open(fileInput)) as unknown as FoliateRawBook;
        break;
      }

      case "txt": {
        rawBook = await parseTxtToBook(source, fileName);
        break;
      }

      case "markdown": {
        rawBook = await parseMarkdownToBook(source, fileName);
        break;
      }

      case "html":
      case "xhtml": {
        rawBook = await parseHtmlToBook(source, fileName);
        break;
      }

      case "pdf": {
        rawBook = await parsePdfToBook(source, fileName);
        break;
      }

      case "cbz":
      case "cbr": {
        const { parseComicToBook } = await import("../formats/ComicParser");
        rawBook = (await parseComicToBook(source, fileName)) as unknown as FoliateRawBook;
        break;
      }

      default: {
        rawBook = await parseTxtToBook(source, fileName);
        break;
      }
    }

    if (!rawBook) {
      throw new Error(`Foliate could not parse book format: ${format}`);
    }

    return new FoliateDocumentAdapter(rawBook, format);
  }

  public getSectionByHref(href: string): DocumentSection | undefined {
    const cleanHref = href.split("#")[0].replace(/^\.?\//, "");
    return this.sections.find((sec) => {
      const secClean = sec.href.split("#")[0].replace(/^\.?\//, "");
      return secClean === cleanHref;
    });
  }

  public getSectionByIndex(index: number): DocumentSection | undefined {
    return this.sections[index];
  }

  public resolveHref(href: string): string {
    if (typeof this.rawBook.resolveHref === "function") {
      const res = this.rawBook.resolveHref(href);
      if (res && typeof res.index === "number") {
        const sec = this.sections[res.index];
        return sec ? sec.href : href;
      }
    }
    return href;
  }

  public async getCoverBlob(): Promise<Blob | null> {
    if (typeof this.rawBook.getCover === "function") {
      try {
        const blob = await this.rawBook.getCover();
        if (blob && blob.size > 0) return blob;
      } catch (err) {
        console.warn("Foliate cover extraction failed:", err);
      }
    }
    return null;
  }

  public destroy(): void {
    this.sections.forEach((sec) => sec.unload?.());
    this.rawBook.destroy?.();
  }
}

export const FoliateEpubAdapter = FoliateDocumentAdapter;
export type FoliateEpubAdapter = FoliateDocumentAdapter;
