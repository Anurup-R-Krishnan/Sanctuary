/**
 * Format Detector for Sanctuary Reader.
 * Identifies book format by file extension and magic byte signatures.
 */

import type { BookFormat } from "../contracts/document";

export const SUPPORTED_EXTENSIONS = [
  ".epub",
  ".fb2",
  ".fbz",
  ".mobi",
  ".azw",
  ".azw3",
  ".kf8",
  ".txt",
  ".text",
  ".html",
  ".htm",
  ".xhtml",
  ".md",
  ".markdown",
  ".pdf",
  ".cbz",
  ".cbr",
] as const;

export const SUPPORTED_FILE_ACCEPT = SUPPORTED_EXTENSIONS.join(",");

export function isSupportedExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

const COMIC_IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"];

function sniffZipFormat(bytes: Uint8Array): BookFormat {
  let offset = 0;
  const filenames: string[] = [];

  while (offset + 30 <= bytes.length) {
    if (
      bytes[offset] === 0x50 &&
      bytes[offset + 1] === 0x4b &&
      bytes[offset + 2] === 0x03 &&
      bytes[offset + 3] === 0x04
    ) {
      const nameLen = bytes[offset + 26] | (bytes[offset + 27] << 8);
      const extraLen = bytes[offset + 28] | (bytes[offset + 29] << 8);
      const start = offset + 30;
      const end = start + nameLen;

      if (end <= bytes.length) {
        const name = new TextDecoder().decode(bytes.slice(start, end)).toLowerCase();
        filenames.push(name);
      }
      offset = end + extraLen;
    } else {
      break;
    }
  }

  for (const name of filenames) {
    if (name.includes("comicinfo.xml") || COMIC_IMAGE_EXTS.some((ext) => name.endsWith(ext))) {
      return "cbz";
    }
    if (name.endsWith(".fb2")) {
      return "fb2";
    }
    if (name.includes("meta-inf/container.xml") || name.startsWith("mimetype")) {
      return "epub";
    }
  }

  return "epub";
}

export async function detectBookFormat(
  source: Blob | File | ArrayBuffer | Uint8Array,
  fileName?: string
): Promise<BookFormat> {
  const name = fileName || (source instanceof File ? source.name : "");
  const lowerName = name.toLowerCase();

  // 1. Explicit extension detection
  if (lowerName.endsWith(".epub")) return "epub";
  if (lowerName.endsWith(".fb2") || lowerName.endsWith(".fbz") || lowerName.endsWith(".fb2.zip")) return "fb2";
  if (lowerName.endsWith(".mobi")) return "mobi";
  if (lowerName.endsWith(".azw")) return "azw";
  if (lowerName.endsWith(".azw3") || lowerName.endsWith(".kf8")) return "azw3";
  if (lowerName.endsWith(".txt") || lowerName.endsWith(".text")) return "txt";
  if (lowerName === "md" || lowerName === "markdown" || lowerName.endsWith(".md") || lowerName.endsWith(".markdown")) return "markdown";
  if (lowerName.endsWith(".xhtml")) return "xhtml";
  if (lowerName.endsWith(".html") || lowerName.endsWith(".htm")) return "html";
  if (lowerName.endsWith(".pdf")) return "pdf";
  if (lowerName.endsWith(".cbz")) return "cbz";
  if (lowerName.endsWith(".cbr")) return "cbr";

  // 2. Read first 4096 bytes for signature sniffing
  let bytes: Uint8Array;
  if (source instanceof Uint8Array) {
    bytes = source.slice(0, 4096);
  } else if (source instanceof ArrayBuffer) {
    bytes = new Uint8Array(source.slice(0, 4096));
  } else if (source instanceof Blob) {
    const head = await source.slice(0, 4096).arrayBuffer();
    bytes = new Uint8Array(head);
  } else {
    return "txt";
  }

  // PDF header: %PDF- (0x25 0x50 0x44 0x46)
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return "pdf";
  }

  // RAR header for CBR: Rar!\x1a\x07 (0x52 0x61 0x72 0x21 0x1a 0x07)
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x61 &&
    bytes[2] === 0x72 &&
    bytes[3] === 0x21 &&
    bytes[4] === 0x1a &&
    bytes[5] === 0x07
  ) {
    return "cbr";
  }

  // ZIP header: PK\x03\x04
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  ) {
    return sniffZipFormat(bytes);
  }

  // MOBI / AZW3 header: BOOKMOBI at offset 60
  if (bytes.length >= 68) {
    const magic = String.fromCharCode(...bytes.slice(60, 68));
    if (magic === "BOOKMOBI") {
      const headText = new TextDecoder().decode(bytes);
      if (headText.includes("KF8") || headText.includes("BOUNDARY")) {
        return "azw3";
      }
      return "mobi";
    }
  }

  // Text decoding for XML/HTML/Markdown sniffing
  try {
    const snippet = new TextDecoder().decode(bytes).trimStart();
    if (snippet.startsWith("<?xml") || snippet.startsWith("<FictionBook")) {
      if (snippet.includes("<FictionBook") || snippet.includes("fictionbook")) {
        return "fb2";
      }
    }

    const lowerSnippet = snippet.toLowerCase();
    if (lowerSnippet.startsWith("<!doctype html") || lowerSnippet.startsWith("<html")) {
      return snippet.includes("xmlns=\"http://www.w3.org/1999/xhtml\"") ? "xhtml" : "html";
    }

    const isMarkdown =
      snippet.startsWith("#") ||
      snippet.startsWith("---\n") ||
      snippet.startsWith("---\r\n") ||
      snippet.startsWith("> [!") ||
      snippet.startsWith("- [ ]") ||
      snippet.startsWith("- [x]") ||
      snippet.startsWith("```") ||
      (snippet.includes("\n|") && (snippet.includes("|---") || snippet.includes("|:---")));

    if (isMarkdown) {
      return "markdown";
    }
  } catch {
    // Non-text content fallback
  }

  return "txt";
}
