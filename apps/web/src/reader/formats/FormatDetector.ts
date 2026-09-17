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

const ZIP_DECODER = new TextDecoder();

function sniffZipFormat(bytes: Uint8Array): BookFormat {
  let offset = 0;
  const filenames: string[] = [];

  while (offset + 30 <= bytes.length) {
    // Local file header signature: PK\x03\x04
    if (
      bytes[offset] === 0x50 &&
      bytes[offset + 1] === 0x4b &&
      bytes[offset + 2] === 0x03 &&
      bytes[offset + 3] === 0x04
    ) {
      const compressedSize =
        bytes[offset + 18] |
        (bytes[offset + 19] << 8) |
        (bytes[offset + 20] << 16) |
        (bytes[offset + 21] << 24);
      const nameLen = bytes[offset + 26] | (bytes[offset + 27] << 8);
      const extraLen = bytes[offset + 28] | (bytes[offset + 29] << 8);
      const nameStart = offset + 30;
      const nameEnd = nameStart + nameLen;

      if (nameEnd <= bytes.length) {
        const name = ZIP_DECODER.decode(bytes.slice(nameStart, nameEnd)).toLowerCase();
        filenames.push(name);
      }
      // Advance past this entry: fixed header (30) + nameLen + extraLen + compressedSize
      offset = nameStart + nameLen + extraLen + Math.max(0, compressedSize);
    } else {
      // Not a local file header — advance one byte to keep scanning
      // (handles data descriptors, alignment padding, central directory, etc.)
      offset += 1;
      // Once we're past a reasonable scan window, stop
      if (offset > 65536) break;
    }
  }

  for (const name of filenames) {
    if (name.includes("comicinfo.xml") || COMIC_IMAGE_EXTS.some((ext) => name.endsWith(ext))) {
      return "cbz";
    }
    if (name.endsWith(".fb2")) {
      return "fb2";
    }
    if (name.includes("meta-inf/container.xml") || name === "mimetype") {
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

  // MOBI / AZW3: PalmDOC with BOOKMOBI at offset 60
  // Read the actual MOBI version field to distinguish legacy MOBI (v1-7) from KF8 (v8+)
  if (bytes.length >= 68) {
    const magic = String.fromCharCode(
      bytes[60], bytes[61], bytes[62], bytes[63],
      bytes[64], bytes[65], bytes[66], bytes[67]
    );
    if (magic === "BOOKMOBI") {
      // PalmDOC header: record list starts at byte 32.
      // Record 0 offset is stored as a big-endian uint32 at bytes[32..35].
      const rec0Offset =
        (bytes[32] << 24) | (bytes[33] << 16) | (bytes[34] << 8) | bytes[35];
      // MOBI header type (version) field is at rec0Offset + 36, big-endian uint32
      const versionOffset = rec0Offset + 36;
      if (versionOffset + 4 <= bytes.length) {
        const mobiVersion =
          (bytes[versionOffset] << 24) |
          (bytes[versionOffset + 1] << 16) |
          (bytes[versionOffset + 2] << 8) |
          bytes[versionOffset + 3];
        if (mobiVersion >= 8) return "azw3";
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
