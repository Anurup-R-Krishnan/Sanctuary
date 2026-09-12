/**
 * Plain Text (TXT) Document Parser for Sanctuary.
 * Converts plain text into a paginated, structured BookDocument compatible with Foliate.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export interface RawFoliateSection {
  createDocument?(): Promise<Document> | Document;
  href?: string;
  id: string | number;
  linear?: string;
  load(): Promise<string> | string;
  size?: number;
  title?: string;
  unload?(): void;
}

export interface RawFoliateTocItem {
  href?: string;
  id?: string;
  label?: string;
  subitems?: RawFoliateTocItem[];
}

export interface RawFoliateBook {
  destroy?(): void;
  dir?: "ltr" | "rtl";
  getCover?(): Promise<Blob | null>;
  getTOCFragment?(doc: Document, id: string): Element | null;
  metadata: {
    author?: string;
    creator?: string;
    description?: string;
    direction?: "ltr" | "rtl";
    language?: string;
    title?: string;
  };
  resolveHref(href: string): { index: number; anchor?: (doc: Document) => Element | Range | null } | null;
  sections: RawFoliateSection[];
  splitTOCHref?(href: string): number[];
  toc: RawFoliateTocItem[];
}

export async function parseTxtToBook(
  source: string | ArrayBuffer | Blob,
  fallbackTitle: string = "Untitled Document"
): Promise<RawFoliateBook> {
  let text = "";
  if (typeof source === "string") {
    text = source;
  } else if (source instanceof Blob) {
    text = await source.text();
  } else if (source instanceof ArrayBuffer) {
    text = new TextDecoder().decode(source);
  }

  const lines = text.split(/\r?\n/);
  const firstNonEmpty = lines.find((l) => l.trim().length > 0)?.trim() || fallbackTitle;
  const title = firstNonEmpty.length < 80 ? firstNonEmpty : fallbackTitle;

  // Split into sections by chapter patterns or chunk by paragraphs
  const rawParagraphs = text.split(/\r?\n\s*\r?\n/).map((p) => p.trim()).filter(Boolean);
  const chapterRegex = /^(?:chapter|part|book|section|act|scene)\s+[0-9ivxlcdm]+/i;

  interface ChapterChunk {
    paragraphs: string[];
    title: string;
  }

  const chapters: ChapterChunk[] = [];
  let currentChapter: ChapterChunk | null = null;

  for (const p of rawParagraphs) {
    const firstLine = p.split("\n")[0].trim();
    if (chapterRegex.test(firstLine)) {
      if (currentChapter && currentChapter.paragraphs.length > 0) {
        chapters.push(currentChapter);
      }
      currentChapter = { title: firstLine, paragraphs: [p.slice(firstLine.length).trim()].filter(Boolean) };
    } else {
      if (!currentChapter) {
        currentChapter = { title: "Title Page", paragraphs: [] };
      }
      currentChapter.paragraphs.push(p);
    }
  }
  if (currentChapter && currentChapter.paragraphs.length > 0) {
    chapters.push(currentChapter);
  }

  // If no chapters detected, chunk into blocks of 40 paragraphs
  if (chapters.length <= 1) {
    chapters.length = 0;
    const chunkSize = 40;
    for (let i = 0; i < rawParagraphs.length; i += chunkSize) {
      const slice = rawParagraphs.slice(i, i + chunkSize);
      const chapterNum = Math.floor(i / chunkSize) + 1;
      chapters.push({
        title: rawParagraphs.length > chunkSize ? `Section ${chapterNum}` : title,
        paragraphs: slice,
      });
    }
  }

  if (chapters.length === 0) {
    chapters.push({ title, paragraphs: [""] });
  }

  const objectUrls: string[] = [];

  const sections: RawFoliateSection[] = chapters.map((chap, idx) => {
    const bodyContent = chap.paragraphs
      .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
      .join("\n");

    const xhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(chap.title)}</title>
  <style>
    body {
      font-family: serif;
      margin: 0;
      padding: 2em;
      line-height: 1.6;
    }
    h2 {
      font-size: 1.4em;
      margin-top: 1em;
      margin-bottom: 0.8em;
    }
    p {
      margin: 0 0 1em 0;
      text-indent: 1.5em;
    }
  </style>
</head>
<body>
  <h2>${escapeHtml(chap.title)}</h2>
  ${bodyContent}
</body>
</html>`;

    const blob = new Blob([xhtml], { type: "application/xhtml+xml" });
    const url = URL.createObjectURL(blob);
    objectUrls.push(url);

    return {
      id: idx,
      href: `sec-${idx}.xhtml`,
      title: chap.title,
      load: () => url,
      createDocument: () => {
        const parser = new DOMParser();
        return parser.parseFromString(xhtml, "application/xhtml+xml");
      },
      size: blob.size,
      linear: "yes",
    };
  });

  const toc: RawFoliateTocItem[] = chapters.map((chap, idx) => ({
    id: `toc-${idx}`,
    label: chap.title,
    href: `${idx}`,
  }));

  return {
    metadata: {
      title,
      author: "Unknown Author",
      creator: "Unknown Author",
      language: "en",
      direction: "ltr",
    },
    dir: "ltr",
    sections,
    toc,
    resolveHref: (href: string) => {
      const idx = Number(href.split("#")[0]);
      const validIndex = !isNaN(idx) && idx >= 0 && idx < sections.length ? idx : 0;
      return { index: validIndex, anchor: (doc: Document) => doc.body };
    },
    splitTOCHref: (href: string) => [Number(href.split("#")[0]) || 0],
    getTOCFragment: (doc: Document) => doc.body,
    getCover: async () => null,
    destroy: () => {
      for (const url of objectUrls) {
        URL.revokeObjectURL(url);
      }
    },
  };
}
