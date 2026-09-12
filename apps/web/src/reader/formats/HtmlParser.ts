/**
 * HTML / XHTML Document Parser for Sanctuary.
 * Normalizes standalone HTML and XHTML documents into a BookDocument compatible with Foliate.
 */

import type { RawFoliateBook, RawFoliateSection, RawFoliateTocItem } from "./TxtParser";

export async function parseHtmlToBook(
  source: string | ArrayBuffer | Blob,
  fallbackTitle: string = "Untitled Document"
): Promise<RawFoliateBook> {
  let content = "";
  if (typeof source === "string") {
    content = source;
  } else if (source instanceof Blob) {
    content = await source.text();
  } else if (source instanceof ArrayBuffer) {
    content = new TextDecoder().decode(source);
  }

  const parser = new DOMParser();
  let doc = parser.parseFromString(content, "application/xhtml+xml");

  // Fallback to text/html if XHTML parse error occurred
  if (doc.querySelector("parsererror") || !doc.body) {
    doc = parser.parseFromString(content, "text/html");
  }

  // Extract Metadata
  const title =
    doc.querySelector("title")?.textContent?.trim() ||
    doc.querySelector("h1")?.textContent?.trim() ||
    fallbackTitle;

  const author =
    doc.querySelector("meta[name='author']")?.getAttribute("content")?.trim() ||
    "Unknown Author";

  const lang = doc.documentElement.getAttribute("lang") || "en";
  const dir = (doc.documentElement.getAttribute("dir") as "ltr" | "rtl") || "ltr";

  // Build Table of Contents from headings
  const headings = Array.from(doc.querySelectorAll("h1, h2, h3"));
  const toc: RawFoliateTocItem[] = [];

  headings.forEach((heading, idx) => {
    const text = heading.textContent?.trim() || `Section ${idx + 1}`;
    if (!heading.id) {
      heading.id = `toc-heading-${idx}`;
    }
    toc.push({
      id: heading.id,
      label: text,
      href: `0#${heading.id}`,
    });
  });

  if (toc.length === 0) {
    toc.push({
      id: "toc-0",
      label: title,
      href: "0",
    });
  }

  // Ensure base styling if missing
  if (!doc.head.querySelector("style")) {
    const styleEl = doc.createElement("style");
    styleEl.textContent = `
      body {
        margin: 0;
        padding: 2em;
        line-height: 1.6;
        font-family: serif;
      }
      img {
        max-width: 100%;
        height: auto;
      }
    `;
    doc.head.appendChild(styleEl);
  }

  const serializer = new XMLSerializer();
  const serialized = serializer.serializeToString(doc);
  const blob = new Blob([serialized], { type: "application/xhtml+xml" });
  const url = URL.createObjectURL(blob);

  const sections: RawFoliateSection[] = [
    {
      id: 0,
      href: "index.xhtml",
      title,
      load: () => url,
      createDocument: () => {
        return new DOMParser().parseFromString(serialized, "application/xhtml+xml");
      },
      size: blob.size,
      linear: "yes",
    },
  ];

  return {
    metadata: {
      title,
      author,
      creator: author,
      language: lang,
      direction: dir,
    },
    dir,
    sections,
    toc,
    resolveHref: (href: string) => {
      const [, anchorId] = href.split("#");
      return {
        index: 0,
        anchor: (d: Document) => (anchorId ? d.getElementById(anchorId) : d.body),
      };
    },
    splitTOCHref: () => [0],
    getTOCFragment: (d: Document, id: string) => d.getElementById(id) || d.body,
    getCover: async () => null,
    destroy: () => {
      URL.revokeObjectURL(url);
    },
  };
}
