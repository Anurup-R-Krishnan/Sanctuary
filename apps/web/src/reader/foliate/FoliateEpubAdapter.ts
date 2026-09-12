/**
 * Foliate-js EPUB Document Adapter.
 * Adapts foliate-js book structures into Sanctuary's format-agnostic BookDocument interface.
 */

import type {
  BookDocument,
  BookFormat,
  DocumentMetadata,
  DocumentSection,
  DocumentTocItem,
} from "../contracts/document";

interface FoliateRawSection {
  createDocument?(): Promise<Document>;
  href?: string;
  id?: string;
  linear?: string;
  load(): Promise<string>;
  size?: number;
  unload?(): void;
}

interface FoliateRawTocItem {
  href?: string;
  id?: string;
  label?: string;
  subitems?: FoliateRawTocItem[];
}

interface FoliateRawBook {
  destroy?(): void;
  dir?: "ltr" | "rtl";
  getCover?(): Promise<Blob | null>;
  metadata?: Record<string, unknown>;
  resolveHref(href: string): { index: number; anchor?: (doc: Document) => Element | Range | null } | null;
  sections: FoliateRawSection[];
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

export class FoliateEpubAdapter implements BookDocument {
  public readonly format: BookFormat = "epub";
  public readonly metadata: DocumentMetadata;
  public readonly sections: DocumentSection[];
  public readonly toc: DocumentTocItem[];
  public readonly rawBook: FoliateRawBook;

  private constructor(rawBook: FoliateRawBook) {
    this.rawBook = rawBook;

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
      const id = sec.id || `sec-${index}`;
      const href = sec.href || sec.id || `section-${index}.xhtml`;
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

  public static async create(source: Blob | File | ArrayBuffer): Promise<FoliateEpubAdapter> {
    let fileInput: File;
    if (source instanceof File) {
      fileInput = source;
    } else if (source instanceof Blob) {
      fileInput = new File([source], "book.epub", { type: source.type || "application/epub+zip" });
    } else {
      fileInput = new File([source], "book.epub", { type: "application/epub+zip" });
    }

    const { makeBook } = await import("foliate-js/view.js");
    const rawBook = await makeBook(fileInput);
    if (!rawBook) {
      throw new Error("Foliate could not parse EPUB book structure.");
    }

    return new FoliateEpubAdapter(rawBook as unknown as FoliateRawBook);
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
    const res = this.rawBook.resolveHref(href);
    if (res && typeof res.index === "number") {
      const sec = this.sections[res.index];
      return sec ? sec.href : href;
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
