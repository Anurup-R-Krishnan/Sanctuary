/**
 * Vocabulary & Dictionary Type Definitions for Sanctuary.
 */

export interface VocabularyDefinition {
  audioUrl?: string;
  definition: string;
  example?: string;
  partOfSpeech?: string;
  phonetic?: string;
  word: string;
}

export interface VocabularyItem {
  audioUrl?: string;
  bookId?: string;
  bookTitle?: string;
  cfi?: string;
  contextSentence?: string;
  createdAt: string;
  definition: string;
  example?: string;
  id: string;
  intervalDays: number;
  lastReviewedAt?: string;
  nextReviewAt: string;
  partOfSpeech?: string;
  phonetic?: string;
  repetitionLevel: number;
  word: string;
}
