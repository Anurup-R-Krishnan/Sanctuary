import type { Book } from "@/types";

import { calculateEpubHash } from "@/utils/crypto";
import { getBookById, getBookContent, putBook, putBookContent } from "@/utils/db";

import { recordReaderDiagnostic } from "./readerDiagnostics";

export type BookContentErrorCode =
  | "BOOK_CONTENT_MISSING"
  | "BOOK_CONTENT_EMPTY"
  | "BOOK_CONTENT_INVALID"
  | "BOOK_CONTENT_READ_FAILED";

export class BookContentError extends Error {
  constructor(
    public readonly code: BookContentErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "BookContentError";
  }
}

export interface VerifiedBookContent {
  blob: Blob;
  byteLength: number;
  contentHash?: string;
}

function isZipHeader(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b &&
    ((bytes[2] === 0x03 && bytes[3] === 0x04) ||
      (bytes[2] === 0x05 && bytes[3] === 0x06) ||
      (bytes[2] === 0x07 && bytes[3] === 0x08));
}

function isValidBookHeader(bytes: Uint8Array, formatOrFileName?: string): boolean {
  if (isZipHeader(bytes)) return true;
  if (bytes.length >= 68) {
    const magic = String.fromCharCode(...bytes.slice(60, 68));
    if (magic === "BOOKMOBI") return true;
  }
  try {
    const snippet = new TextDecoder().decode(bytes.slice(0, 1024)).trimStart().toLowerCase();
    if (snippet.includes("<fictionbook")) return true;
    if (snippet.startsWith("<!doctype html") || snippet.startsWith("<html")) return true;
  } catch {
    // ignore
  }
  if (formatOrFileName) {
    const lower = formatOrFileName.toLowerCase();
    if (
      lower.endsWith(".txt") ||
      lower.endsWith(".text") ||
      lower.endsWith(".md") ||
      lower.endsWith(".markdown") ||
      lower === "txt" ||
      lower === "text" ||
      lower === "md" ||
      lower === "markdown"
    ) {
      return true;
    }
  }
  return false;
}

export async function verifyBookContent(
  bookId: string,
  blob: Blob | null | undefined,
  expectedHash?: string,
  formatOrFileName?: string
): Promise<VerifiedBookContent> {
  if (!blob) {
    recordReaderDiagnostic({ bookId, stage: "content-verification", error: "EPUB content is missing." });
    throw new BookContentError("BOOK_CONTENT_MISSING", `No EPUB content is stored for book ${bookId}.`);
  }
  if (blob.size === 0) {
    recordReaderDiagnostic({ bookId, stage: "content-verification", error: "EPUB content is empty." });
    throw new BookContentError("BOOK_CONTENT_EMPTY", `The stored EPUB for book ${bookId} is empty.`);
  }

  let buffer: ArrayBuffer;
  try {
    buffer = await blob.arrayBuffer();
  } catch (error) {
    recordReaderDiagnostic({ bookId, stage: "content-verification", error: error instanceof Error ? error.message : "EPUB content could not be read." });
    throw new BookContentError("BOOK_CONTENT_READ_FAILED", `The stored EPUB for book ${bookId} could not be read.`, error);
  }

  const bytes = new Uint8Array(buffer);
  if (!isValidBookHeader(bytes, formatOrFileName)) {
    recordReaderDiagnostic({ bookId, stage: "content-verification", error: "EPUB does not have a ZIP header.", details: { byteLength: blob.size, mimeType: blob.type } });
    throw new BookContentError("BOOK_CONTENT_INVALID", `The stored file for book ${bookId} is not a valid EPUB archive.`);
  }

  const contentHash = await calculateEpubHash(buffer);
  if (expectedHash && contentHash !== expectedHash) {
    recordReaderDiagnostic({ bookId, stage: "content-verification", error: "EPUB hash does not match metadata.", details: { actualHash: contentHash, expectedHash } });
    throw new BookContentError("BOOK_CONTENT_INVALID", `The stored EPUB for book ${bookId} does not match its recorded content.`, {
      expectedHash,
      actualHash: contentHash,
    });
  }

  return { blob, byteLength: blob.size, contentHash };
}

export async function getVerifiedBookContent(bookId: string): Promise<VerifiedBookContent | null> {
  const book = await getBookById(bookId).catch(() => null);
  if (!book) return null;
  const stored = await getBookContent(bookId).catch(() => null);
  return verifyBookContent(bookId, stored?.blob ?? book.epubBlob, stored?.contentHash ?? book.contentHash, book.format);
}

export async function saveBookContent(book: Book): Promise<void> {
  if (!book.epubBlob) {
    throw new BookContentError("BOOK_CONTENT_MISSING", `Cannot save book ${book.id} without EPUB content.`);
  }
  await verifyBookContent(book.id, book.epubBlob, book.contentHash, book.format);
  await putBookContent({
    bookId: book.id,
    blob: book.epubBlob,
    contentHash: book.contentHash,
    storedAt: new Date().toISOString(),
  });
  // Keep the metadata record small. Legacy records may still contain an
  // embedded blob, and getVerifiedBookContent() intentionally supports them.
  await putBook({ ...book, epubBlob: null });
}
