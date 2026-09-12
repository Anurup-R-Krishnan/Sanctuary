/**
 * Native Comic & Manga Archive (CBZ/CBR) Document Parser for Sanctuary.
 * Unpacks sequential image archives, extracts ComicInfo metadata,
 * and compiles them into pre-paginated fixed-layout BookDocument sections.
 */

import type { RawFoliateBook, RawFoliateSection, RawFoliateTocItem } from "./TxtParser";

const SUPPORTED_IMAGE_EXTENSIONS = [
  ".avif",
  ".bmp",
  ".gif",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".webp",
] as const;

export interface ComicInfoMetadata {
  author?: string;
  description?: string;
  direction?: "ltr" | "rtl";
  pageCount: number;
  published?: string;
  series?: string;
  title: string;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Natural sort collation for file paths.
 * Guarantees that "page_2.jpg" comes before "page_10.jpg".
 */
export function naturalSortFilenames(files: string[]): string[] {
  return [...files].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
  );
}

/**
 * Parses ComicInfo.xml text into structured metadata.
 */
export function parseComicInfoXml(xmlText: string, fallbackTitle: string): ComicInfoMetadata {
  const getTagValue = (tagName: string): string | undefined => {
    const match = xmlText.match(new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, "i"));
    return match ? match[1].trim() : undefined;
  };

  const title = getTagValue("Title") || fallbackTitle;
  const series = getTagValue("Series");
  const number = getTagValue("Number");
  const writer = getTagValue("Writer");
  const penciller = getTagValue("Penciller");
  const summary = getTagValue("Summary");
  const year = getTagValue("Year");
  const month = getTagValue("Month");
  const manga = getTagValue("Manga");

  const authors = [writer, penciller].filter(Boolean).join(", ");

  let published: string | undefined;
  if (year) {
    published = month ? `${year}-${month.padStart(2, "0")}` : year;
  }

  const direction: "ltr" | "rtl" =
    manga && manga.toLowerCase().includes("righttoleft") ? "rtl" : "ltr";

  const fullTitle = series && number ? `${series} #${number}: ${title}` : title;

  return {
    author: authors || undefined,
    description: summary,
    direction,
    pageCount: 0,
    published,
    series,
    title: fullTitle,
  };
}

export async function parseComicToBook(
  source: Blob | File | ArrayBuffer | Uint8Array,
  fileName: string = "comic.cbz"
): Promise<RawFoliateBook> {
  const fileBlob =
    source instanceof Blob
      ? source
      : new Blob([source instanceof Uint8Array ? source : new Uint8Array(source)]);

  const { BlobReader, BlobWriter, TextWriter, ZipReader, configure } = await import(
    "foliate-js/vendor/zip.js"
  );
  configure({ useWebWorkers: false });

  const reader = new ZipReader(new BlobReader(fileBlob));
  const entries = await reader.getEntries();

  // Filter image files and sort naturally
  const imageEntries = entries.filter((entry) => {
    const lower = entry.filename.toLowerCase();
    // Exclude MacOS metadata or hidden files
    if (lower.startsWith("__macosx/") || lower.startsWith(".")) return false;
    return SUPPORTED_IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
  });

  if (imageEntries.length === 0) {
    throw new Error("No supported image files found in comic archive.");
  }

  // Naturally sort the image entries by filename
  imageEntries.sort((a, b) =>
    a.filename.localeCompare(b.filename, undefined, { numeric: true, sensitivity: "base" })
  );

  const fallbackTitle = fileName.replace(/\.(cbz|cbr|zip)$/i, "").replace(/[-_]/g, " ").trim() || "Untitled Comic";

  // Check for ComicInfo.xml
  let metadata: ComicInfoMetadata = {
    direction: "ltr",
    pageCount: imageEntries.length,
    title: fallbackTitle,
  };

  const comicInfoEntry = entries.find(
    (e) => e.filename.toLowerCase() === "comicinfo.xml" || e.filename.toLowerCase().endsWith("/comicinfo.xml")
  );

  if (comicInfoEntry) {
    try {
      const xmlText = await comicInfoEntry.getData(new TextWriter());
      metadata = {
        ...parseComicInfoXml(xmlText, fallbackTitle),
        pageCount: imageEntries.length,
      };
    } catch {
      // Ignore XML parse errors, use fallback metadata
    }
  }

  const createdUrls: string[] = [];

  const sections: RawFoliateSection[] = imageEntries.map((entry, index) => {
    let pageObjectUrl: string | null = null;
    let imageObjectUrl: string | null = null;

    return {
      href: entry.filename,
      id: entry.filename,
      load: async () => {
        if (pageObjectUrl) return pageObjectUrl;

        const imageBlob = await entry.getData(new BlobWriter());
        imageObjectUrl = URL.createObjectURL(imageBlob);
        createdUrls.push(imageObjectUrl);

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeXml(entry.filename)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      display: block;
    }
  </style>
</head>
<body>
  <img src="${imageObjectUrl}" alt="Page ${index + 1}"/>
</body>
</html>`;

        const htmlBlob = new Blob([html], { type: "text/html" });
        pageObjectUrl = URL.createObjectURL(htmlBlob);
        createdUrls.push(pageObjectUrl);
        return pageObjectUrl;
      },
      size: entry.uncompressedSize || 1000,
      title: `Page ${index + 1}`,
      unload: () => {
        if (pageObjectUrl) {
          URL.revokeObjectURL(pageObjectUrl);
          pageObjectUrl = null;
        }
        if (imageObjectUrl) {
          URL.revokeObjectURL(imageObjectUrl);
          imageObjectUrl = null;
        }
      },
    };
  });

  const toc: RawFoliateTocItem[] = imageEntries.map((entry, index) => ({
    href: entry.filename,
    id: entry.filename,
    label: `Page ${index + 1}`,
  }));

  const book: RawFoliateBook = {
    destroy: () => {
      for (const url of createdUrls) {
        URL.revokeObjectURL(url);
      }
      createdUrls.length = 0;
    },
    dir: metadata.direction,
    getCover: async () => {
      if (imageEntries.length === 0) return null;
      return imageEntries[0].getData(new BlobWriter());
    },
    metadata: {
      author: metadata.author,
      description: metadata.description,
      direction: metadata.direction,
      title: metadata.title,
    },
    rendition: { layout: "pre-paginated" },
    resolveHref: (href: string) => {
      const cleanHref = href.replace(/^#/, "");
      const index = sections.findIndex(
        (s) => s.href === cleanHref || s.id === cleanHref
      );
      if (index === -1) return null;
      return { index };
    },
    sections,
    toc,
  };

  return book;
}
