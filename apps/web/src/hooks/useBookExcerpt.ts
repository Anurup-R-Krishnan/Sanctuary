import { useEffect, useState } from "react";

import type { Book } from "@/types";

import { FoliateDocumentAdapter } from "@/reader/foliate/FoliateDocumentAdapter";
import { getVerifiedBookContent } from "@/services/bookContentRepository";
import { type BookExcerpt, extractExcerpt } from "@/utils/bookExcerpt";

const MAX_SECTIONS = 15;
const STORAGE_PREFIX = "sanctuary.excerpt.";
const memory = new Map<string, Promise<BookExcerpt | null>>();

function readStored(bookId: string): BookExcerpt | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + bookId);
    if (raw === null) return undefined;
    const parsed = JSON.parse(raw) as BookExcerpt | null;
    return parsed ?? undefined;
  } catch {
    return undefined;
  }
}

function writeStored(bookId: string, excerpt: BookExcerpt) {
  try {
    localStorage.setItem(STORAGE_PREFIX + bookId, JSON.stringify(excerpt));
  } catch {
    return;
  }
}

export function forgetBookExcerpt(bookId: string): void {
  memory.delete(bookId);
  try {
    localStorage.removeItem(STORAGE_PREFIX + bookId);
  } catch {
    return;
  }
}

async function sectionDocument(section: FoliateDocumentAdapter["rawBook"]["sections"][number]): Promise<Document | null> {
  if (typeof section.createDocument === "function") return section.createDocument();
  const url = await section.load();
  if (typeof url !== "string") return null;
  const markup = await (await fetch(url)).text();
  return new DOMParser().parseFromString(markup, "text/html");
}

async function loadExcerpt(book: Book): Promise<BookExcerpt | null> {
  const content = await getVerifiedBookContent(book.id).catch(() => null);
  if (!content) return null;
  const adapter = await FoliateDocumentAdapter.create(content.blob, `${book.title}.${book.format ?? "epub"}`);
  try {
    const sections = adapter.rawBook.sections.filter((section) => section.linear !== "no").slice(0, MAX_SECTIONS);
    for (const section of sections) {
      const doc = await sectionDocument(section).catch(() => null);
      const excerpt = doc ? extractExcerpt(doc) : null;
      if (excerpt) return excerpt;
    }
    return null;
  } finally {
    adapter.rawBook.destroy?.();
  }
}

export function useBookExcerpt(book: Book | null): BookExcerpt | null {
  const [excerpt, setExcerpt] = useState<BookExcerpt | null>(() => (book ? readStored(book.id) ?? null : null));

  useEffect(() => {
    if (!book) {
      setExcerpt(null);
      return;
    }
    const stored = readStored(book.id);
    if (stored !== undefined) {
      setExcerpt(stored);
      return;
    }
    let cancelled = false;
    let pending = memory.get(book.id);
    if (!pending) {
      pending = loadExcerpt(book).catch(() => null);
      memory.set(book.id, pending);
      void pending.then((value) => {
        if (value) writeStored(book.id, value);
        else memory.delete(book.id);
      });
    }
    void pending.then((value) => {
      if (!cancelled) setExcerpt(value);
    });
    return () => {
      cancelled = true;
    };
  }, [book]);

  return excerpt;
}
