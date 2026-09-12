/**
 * Cross-Book Library Full-Text Search Engine for Sanctuary.
 * Handles client-side indexing, snippet extraction, and ranking.
 */

import type { Book, BookSearchResult, IndexedBookRecord, IndexedSection, SearchMatchSnippet } from "@/types";

import { deleteSearchIndex, getAllSearchIndexes, getSearchIndex, putSearchIndex } from "@/utils/db";

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

export function extractSnippets(
  text: string,
  query: string,
  maxSnippets = 3,
  radius = 60
): string[] {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return [];

  const lowerText = text.toLowerCase();
  const snippets: string[] = [];
  let startIndex = 0;

  while (snippets.length < maxSnippets) {
    const foundIndex = lowerText.indexOf(cleanQuery, startIndex);
    if (foundIndex === -1) break;

    const start = Math.max(0, foundIndex - radius);
    const end = Math.min(text.length, foundIndex + cleanQuery.length + radius);

    let snippet = text.slice(start, end).trim();
    if (start > 0) snippet = "..." + snippet;
    if (end < text.length) snippet = snippet + "...";

    snippets.push(snippet);
    startIndex = foundIndex + cleanQuery.length + radius;
  }

  return snippets;
}

export async function extractBookSections(
  blob: Blob,
  fileName = ""
): Promise<IndexedSection[]> {
  try {
    const { FoliateDocumentAdapter } = await import(
      "@/reader/foliate/FoliateDocumentAdapter"
    );
    const book = await FoliateDocumentAdapter.create(blob, fileName);
    const sections: IndexedSection[] = [];

    const count = book.sections?.length ?? 0;
    for (let i = 0; i < count; i++) {
      const sec = book.sections[i];
      let text = "";
      try {
        const loaded = await sec.load();
        if (loaded && typeof loaded === "object" && "body" in loaded) {
          text = (loaded as Document).body?.textContent || "";
        } else if (typeof loaded === "string") {
          text = loaded;
        }
      } catch {
        // Skip unloaded section
      }

      const cleanText = text.replace(/\s+/g, " ").trim();
      if (cleanText) {
        sections.push({
          cfi: sec.href || sec.id || `section-${i}`,
          sectionIndex: i,
          text: cleanText,
          title: `Section ${i + 1}`,
        });
      }
    }
    return sections;
  } catch {
    // Fallback to text decoding
    try {
      const raw = await blob.text();
      const text = raw
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return [
        {
          sectionIndex: 0,
          text,
          title: fileName || "Main Content",
        },
      ];
    } catch {
      return [];
    }
  }
}

export async function searchLibrary(
  query: string,
  books: Book[],
  options?: { maxMatchesPerBook?: number }
): Promise<BookSearchResult[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (cleanQuery.length < 2) return [];

  const maxMatches = options?.maxMatchesPerBook ?? 3;
  const bookMap = new Map<string, Book>(books.map((b) => [b.id, b]));
  const results: BookSearchResult[] = [];

  // 1. Check metadata matches (Title & Author)
  const metadataMatchedIds = new Set<string>();
  for (const book of books) {
    const titleMatch = book.title.toLowerCase().includes(cleanQuery);
    const authorMatch = book.author?.toLowerCase().includes(cleanQuery);

    if (titleMatch || authorMatch) {
      metadataMatchedIds.add(book.id);
      const matches: SearchMatchSnippet[] = [];

      if (titleMatch) {
        matches.push({
          matchScore: 50,
          sectionIndex: 0,
          sectionTitle: "Book Title",
          snippet: book.title,
        });
      }

      if (authorMatch && book.author) {
        matches.push({
          matchScore: 30,
          sectionIndex: 0,
          sectionTitle: "Author",
          snippet: book.author,
        });
      }

      results.push({
        author: book.author,
        bookId: book.id,
        coverUrl: book.coverUrl,
        matches,
        title: book.title,
        totalMatches: matches.length,
      });
    }
  }

  // 2. Query IndexedDB full-text index
  try {
    const indexes = await getAllSearchIndexes();
    for (const record of indexes) {
      const book = bookMap.get(record.bookId);
      if (!book) continue;

      const contentMatches: SearchMatchSnippet[] = [];
      let totalFoundInBook = 0;

      for (const section of record.sections) {
        const snippets = extractSnippets(section.text, cleanQuery, maxMatches);
        if (snippets.length > 0) {
          totalFoundInBook += snippets.length;
          for (const snippet of snippets) {
            if (contentMatches.length < maxMatches) {
              contentMatches.push({
                cfi: section.cfi,
                matchScore: 10,
                sectionIndex: section.sectionIndex,
                sectionTitle: section.title,
                snippet,
              });
            }
          }
        }
      }

      if (contentMatches.length > 0) {
        const existing = results.find((r) => r.bookId === record.bookId);
        if (existing) {
          existing.matches = [...existing.matches, ...contentMatches];
          existing.totalMatches += totalFoundInBook;
        } else {
          results.push({
            author: book.author,
            bookId: book.id,
            coverUrl: book.coverUrl,
            matches: contentMatches,
            title: book.title,
            totalMatches: totalFoundInBook,
          });
        }
      }
    }
  } catch {
    // If index query fails, return metadata results
  }

  // Rank results: higher total matches and score first
  return results.sort((a, b) => b.totalMatches - a.totalMatches);
}

export class LibraryIndexManager {
  private indexingQueue: Set<string> = new Set();
  private isProcessing = false;

  public async isBookIndexed(bookId: string): Promise<boolean> {
    const existing = await getSearchIndex(bookId);
    return !!existing;
  }

  public queueBook(
    bookId: string,
    getBlob: (id: string) => Promise<Blob | null>
  ): void {
    if (this.indexingQueue.has(bookId)) return;
    this.indexingQueue.add(bookId);
    this.processNext(getBlob);
  }

  public async indexBook(
    bookId: string,
    blob: Blob,
    fileName = ""
  ): Promise<IndexedBookRecord> {
    const sections = await extractBookSections(blob, fileName);
    let totalWords = 0;
    for (const sec of sections) {
      totalWords += sec.text.split(/\s+/).filter(Boolean).length;
    }

    const record: IndexedBookRecord = {
      bookId,
      indexedAt: new Date().toISOString(),
      sections,
      totalWords,
    };

    await putSearchIndex(record);
    return record;
  }

  public async removeBook(bookId: string): Promise<void> {
    this.indexingQueue.delete(bookId);
    await deleteSearchIndex(bookId);
  }

  private processNext(getBlob: (id: string) => Promise<Blob | null>): void {
    if (this.isProcessing || this.indexingQueue.size === 0) return;

    const nextId = Array.from(this.indexingQueue)[0];
    this.indexingQueue.delete(nextId);
    this.isProcessing = true;

    const run = async () => {
      try {
        const isIndexed = await this.isBookIndexed(nextId);
        if (!isIndexed) {
          const blob = await getBlob(nextId);
          if (blob) {
            await this.indexBook(nextId, blob);
          }
        }
      } catch {
        // Fallback gracefully
      } finally {
        this.isProcessing = false;
        if (this.indexingQueue.size > 0) {
          this.processNext(getBlob);
        }
      }
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      (
        window as unknown as { requestIdleCallback: (cb: () => void) => void }
      ).requestIdleCallback(run);
    } else {
      setTimeout(run, 100);
    }
  }
}

export const libraryIndexManager = new LibraryIndexManager();
