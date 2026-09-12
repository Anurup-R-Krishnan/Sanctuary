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
] as const;

export const SUPPORTED_FILE_ACCEPT = SUPPORTED_EXTENSIONS.join(",");

export function isSupportedExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
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
  if (lowerName.endsWith(".md") || lowerName.endsWith(".markdown")) return "markdown";
  if (lowerName.endsWith(".xhtml")) return "xhtml";
  if (lowerName.endsWith(".html") || lowerName.endsWith(".htm")) return "html";

  // 2. Read first 1024 bytes for signature sniffing
  let bytes: Uint8Array;
  if (source instanceof Uint8Array) {
    bytes = source.slice(0, 1024);
  } else if (source instanceof ArrayBuffer) {
    bytes = new Uint8Array(source.slice(0, 1024));
  } else if (source instanceof Blob) {
    const head = await source.slice(0, 1024).arrayBuffer();
    bytes = new Uint8Array(head);
  } else {
    return "txt";
  }

  // ZIP header: PK\x03\x04
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  ) {
    return "epub";
  }

  // MOBI header: BOOKMOBI at offset 60
  if (bytes.length >= 68) {
    const magic = String.fromCharCode(...bytes.slice(60, 68));
    if (magic === "BOOKMOBI") return "mobi";
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

    if (snippet.startsWith("# ") || snippet.startsWith("---\n")) {
      return "markdown";
    }
  } catch {
    // Non-text content fallback
  }

  return "txt";
}
