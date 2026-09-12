/**
 * Lightweight Native PDF Document Parser for Sanctuary.
 * Parses PDF binary structures, extracts metadata, pages, and text streams,
 * and compiles them into a pre-paginated fixed-layout BookDocument.
 */

import type { RawFoliateBook, RawFoliateSection, RawFoliateTocItem } from "./TxtParser";

async function decompressFlate(bytes: Uint8Array): Promise<Uint8Array | null> {
  try {
    const fflate = await import("foliate-js/vendor/fflate.js");
    return fflate.unzlibSync(bytes);
  } catch {
    return null;
  }
}

function decodePdfString(raw: string): string {
  if (raw.startsWith("<") && raw.endsWith(">")) {
    const hex = raw.slice(1, -1).trim();
    let str = "";
    for (let i = 0; i < hex.length; i += 2) {
      const code = parseInt(hex.substring(i, i + 2), 16);
      if (!isNaN(code)) str += String.fromCharCode(code);
    }
    return str;
  }
  if (raw.startsWith("(") && raw.endsWith(")")) {
    return raw
      .slice(1, -1)
      .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\([()\\])/g, "$1");
  }
  return raw;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export interface PdfParsedMetadata {
  author: string;
  creator: string;
  pageCount: number;
  title: string;
}

export function extractPdfInfo(bytes: Uint8Array, fileName: string): PdfParsedMetadata {
  const text = new TextDecoder("latin1").decode(bytes);

  // Fallback title from filename without .pdf
  const fallbackTitle = fileName.replace(/\.pdf$/i, "").replace(/[-_]/g, " ").trim() || "Untitled Document";

  let title = fallbackTitle;
  let author = "Unknown Author";

  const titleMatch = text.match(/\/Title\s*(\([^)]+\)|<[0-9a-fA-F]+>)/);
  if (titleMatch) {
    const parsedTitle = decodePdfString(titleMatch[1]).trim();
    if (parsedTitle) title = parsedTitle;
  }

  const authorMatch = text.match(/\/Author\s*(\([^)]+\)|<[0-9a-fA-F]+>)/);
  if (authorMatch) {
    const parsedAuthor = decodePdfString(authorMatch[1]).trim();
    if (parsedAuthor) author = parsedAuthor;
  }

  // Detect page count
  let pageCount = 0;
  const countMatch = text.match(/\/Type\s*\/Pages[\s\S]*?\/Count\s+(\d+)/);
  if (countMatch) {
    pageCount = parseInt(countMatch[1], 10);
  }

  if (!pageCount || isNaN(pageCount) || pageCount <= 0) {
    // Count /Type /Page occurrences (page objects)
    const pageMatches = text.match(/\/Type\s*\/Page\b/g);
    pageCount = pageMatches ? pageMatches.length : 1;
  }

  return {
    author,
    creator: author,
    pageCount: Math.max(1, pageCount),
    title,
  };
}

export async function extractPdfTextStreams(bytes: Uint8Array): Promise<string[]> {
  const binaryString = new TextDecoder("latin1").decode(bytes);
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  const pageTexts: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = streamRegex.exec(binaryString)) !== null) {
    const streamContentIndex = match.index + match[0].indexOf("\n") + 1;
    const streamLength = match[1].length;
    const streamBytes = bytes.subarray(streamContentIndex, streamContentIndex + streamLength);

    // Look back in dictionary before stream for filter
    const dictSlice = binaryString.slice(Math.max(0, match.index - 300), match.index);
    const isFlate = dictSlice.includes("/FlateDecode") || dictSlice.includes("/Fl");

    let decompressed: Uint8Array | null = null;
    if (isFlate) {
      decompressed = await decompressFlate(streamBytes);
    }

    const payload = decompressed
      ? new TextDecoder("latin1").decode(decompressed)
      : match[1];

    // Extract text operators between BT and ET
    const btEtRegex = /BT([\s\S]*?)ET/g;
    let btMatch: RegExpExecArray | null;
    const chunks: string[] = [];

    while ((btMatch = btEtRegex.exec(payload)) !== null) {
      const block = btMatch[1];
      // Match (text) Tj
      const tjRegex = /\(([^)]*)\)\s*Tj/g;
      let tjMatch: RegExpExecArray | null;
      while ((tjMatch = tjRegex.exec(block)) !== null) {
        chunks.push(decodePdfString(`(${tjMatch[1]})`));
      }

      // Match [(text) -10 (more text)] TJ
      const arrayTjRegex = /\[([^\]]*)\]\s*TJ/g;
      let atjMatch: RegExpExecArray | null;
      while ((atjMatch = arrayTjRegex.exec(block)) !== null) {
        const inner = atjMatch[1];
        const innerItems = inner.match(/\(([^)]*)\)/g);
        if (innerItems) {
          chunks.push(innerItems.map((item) => decodePdfString(item)).join(""));
        }
      }
    }

    if (chunks.length > 0) {
      pageTexts.push(chunks.join(" ").trim());
    }
  }

  return pageTexts;
}

export async function parsePdfToBook(
  source: Blob | File | ArrayBuffer | Uint8Array,
  fileName: string = "document.pdf"
): Promise<RawFoliateBook> {
  let bytes: Uint8Array;
  if (source instanceof Uint8Array) {
    bytes = source;
  } else if (source instanceof ArrayBuffer) {
    bytes = new Uint8Array(source);
  } else if (source instanceof Blob) {
    bytes = new Uint8Array(await source.arrayBuffer());
  } else {
    throw new Error("Invalid PDF source payload.");
  }

  // Validate %PDF- magic signature
  if (
    bytes.length < 4 ||
    bytes[0] !== 0x25 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x44 ||
    bytes[3] !== 0x46
  ) {
    throw new Error("Invalid PDF document: missing %PDF- header.");
  }

  const { title, author, pageCount } = extractPdfInfo(bytes, fileName);
  const textStreams = await extractPdfTextStreams(bytes);

  const objectUrls: string[] = [];

  const sections: RawFoliateSection[] = [];
  for (let i = 0; i < pageCount; i++) {
    const pageNum = i + 1;
    const pageText = textStreams[i] || (textStreams.length === 1 && i === 0 ? textStreams[0] : "");
    const pageBodyHtml = pageText
      ? `<p>${escapeHtml(pageText).replace(/\n/g, "<br/>")}</p>`
      : `<div class="pdf-placeholder"><p>Page ${pageNum}</p></div>`;

    const xhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=800, height=1100"/>
  <title>Page ${pageNum}</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: transparent;
    }
    .pdf-page-container {
      width: 100%;
      max-width: 800px;
      min-height: 1000px;
      margin: 0 auto;
      box-sizing: border-box;
      padding: 48px 40px;
      background: var(--bg-color, inherit);
      color: var(--text-color, inherit);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .pdf-page-header {
      font-size: 0.85em;
      opacity: 0.6;
      border-bottom: 1px solid rgba(128, 128, 128, 0.2);
      padding-bottom: 8px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
    }
    .pdf-page-body {
      font-size: 1.05em;
      line-height: 1.65;
      flex-grow: 1;
    }
    .pdf-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 300px;
      color: rgba(128, 128, 128, 0.5);
      font-size: 1.2em;
    }
    .pdf-page-footer {
      margin-top: 32px;
      text-align: center;
      font-size: 0.8em;
      opacity: 0.5;
      border-top: 1px solid rgba(128, 128, 128, 0.15);
      padding-top: 8px;
    }
  </style>
</head>
<body>
  <div class="pdf-page-container">
    <div class="pdf-page-header">
      <span>${escapeHtml(title)}</span>
      <span>Page ${pageNum} of ${pageCount}</span>
    </div>
    <div class="pdf-page-body">
      ${pageBodyHtml}
    </div>
    <div class="pdf-page-footer">
      - ${pageNum} -
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([xhtml], { type: "application/xhtml+xml" });
    const url = URL.createObjectURL(blob);
    objectUrls.push(url);

    sections.push({
      createDocument: () => {
        const parser = new DOMParser();
        return parser.parseFromString(xhtml, "application/xhtml+xml");
      },
      href: `page-${pageNum}.xhtml`,
      id: i,
      linear: "yes",
      load: () => url,
      size: blob.size,
      title: `Page ${pageNum}`,
    });
  }

  const toc: RawFoliateTocItem[] = sections.map((sec, idx) => ({
    href: `${idx}`,
    id: `toc-page-${idx + 1}`,
    label: `Page ${idx + 1}`,
  }));

  return {
    destroy: () => {
      for (const url of objectUrls) {
        URL.revokeObjectURL(url);
      }
    },
    dir: "ltr",
    getCover: async () => null,
    getTOCFragment: (doc: Document) => doc.body,
    metadata: {
      author,
      creator: author,
      direction: "ltr",
      language: "en",
      title,
    },
    rendition: { layout: "pre-paginated" },
    resolveHref: (href: string) => {
      const idx = Number(href.split("#")[0]);
      const validIndex = !isNaN(idx) && idx >= 0 && idx < sections.length ? idx : 0;
      return { anchor: (doc: Document) => doc.body, index: validIndex };
    },
    sections,
    splitTOCHref: (href: string) => [Number(href.split("#")[0]) || 0],
    toc,
  };
}
