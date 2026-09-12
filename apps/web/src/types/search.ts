/**
 * Cross-Book Library Full-Text Search Type Definitions for Sanctuary.
 */

export interface IndexedSection {
  cfi?: string;
  sectionIndex: number;
  text: string;
  title?: string;
}

export interface IndexedBookRecord {
  bookId: string;
  indexedAt: string;
  sections: IndexedSection[];
  totalWords: number;
}

export interface SearchMatchSnippet {
  cfi?: string;
  matchScore: number;
  sectionIndex: number;
  sectionTitle?: string;
  snippet: string;
}

export interface BookSearchResult {
  author?: string;
  bookId: string;
  coverUrl?: string;
  matches: SearchMatchSnippet[];
  title: string;
  totalMatches: number;
}
