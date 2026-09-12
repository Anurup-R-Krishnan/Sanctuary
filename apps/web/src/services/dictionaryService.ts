/**
 * Dictionary & Vocabulary Learning Service for Sanctuary.
 * Handles online definition lookup with IndexedDB caching and Leitner spaced-repetition tracking.
 */

import type { VocabularyDefinition, VocabularyItem } from "@/types";

import {
  deleteVocabWord,
  getAllVocabWords,
  getVocabWord,
  putVocabWord,
} from "@/utils/db";

export const LEITNER_INTERVALS = [1, 3, 7, 14, 30] as const;

export interface SaveWordParams {
  audioUrl?: string;
  bookId?: string;
  bookTitle?: string;
  cfi?: string;
  contextSentence?: string;
  definition: string;
  example?: string;
  partOfSpeech?: string;
  phonetic?: string;
  word: string;
}

export function normalizeWord(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^[^a-z0-9]+/i, "")
    .replace(/[^a-z0-9]+$/i, "");
}

export function calculateNextReview(
  currentLevel: number,
  rating: "again" | "easy" | "good",
  now: Date = new Date()
): { intervalDays: number; nextReviewAt: string; repetitionLevel: number } {
  let repetitionLevel = currentLevel;

  switch (rating) {
    case "again":
      repetitionLevel = 0;
      break;
    case "good":
      repetitionLevel = Math.min(currentLevel + 1, LEITNER_INTERVALS.length - 1);
      break;
    case "easy":
      repetitionLevel = Math.min(currentLevel + 2, LEITNER_INTERVALS.length - 1);
      break;
  }

  const intervalDays = LEITNER_INTERVALS[repetitionLevel];
  const nextDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

  return {
    intervalDays,
    nextReviewAt: nextDate.toISOString(),
    repetitionLevel,
  };
}

/**
 * Looks up word definition via local cache or Free Dictionary API.
 */
export async function lookupWord(term: string): Promise<VocabularyDefinition | null> {
  const normalized = normalizeWord(term);
  if (!normalized) return null;

  // 1. Check local IndexedDB cache first
  try {
    const cached = await getVocabWord(normalized);
    if (cached) {
      return {
        audioUrl: cached.audioUrl,
        definition: cached.definition,
        example: cached.example,
        partOfSpeech: cached.partOfSpeech,
        phonetic: cached.phonetic,
        word: cached.word,
      };
    }
  } catch {
    // Continue to network lookup if DB read fails
  }

  // 2. Query Free Dictionary REST API
  try {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalized)}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const entry = data[0];
    const meaning = entry.meanings?.[0];
    const defObj = meaning?.definitions?.[0];

    const audioUrl = entry.phonetics?.find(
      (p: { audio?: string }) => p.audio && p.audio.trim().length > 0
    )?.audio;

    const phonetic =
      entry.phonetic ||
      entry.phonetics?.find((p: { text?: string }) => p.text)?.text;

    return {
      audioUrl,
      definition: defObj?.definition || "No definition found.",
      example: defObj?.example,
      partOfSpeech: meaning?.partOfSpeech,
      phonetic,
      word: entry.word || normalized,
    };
  } catch {
    return null;
  }
}

/**
 * Saves a word into user's vocabulary collection with initial Leitner schedule.
 */
export async function saveVocabularyWord(params: SaveWordParams): Promise<VocabularyItem> {
  const normalized = normalizeWord(params.word);
  const now = new Date();
  const schedule = calculateNextReview(0, "again", now);

  const item: VocabularyItem = {
    audioUrl: params.audioUrl,
    bookId: params.bookId,
    bookTitle: params.bookTitle,
    cfi: params.cfi,
    contextSentence: params.contextSentence,
    createdAt: now.toISOString(),
    definition: params.definition,
    example: params.example,
    id: normalized,
    intervalDays: schedule.intervalDays,
    nextReviewAt: schedule.nextReviewAt,
    partOfSpeech: params.partOfSpeech,
    phonetic: params.phonetic,
    repetitionLevel: 0,
    word: normalized,
  };

  await putVocabWord(item);
  return item;
}

/**
 * Reviews a saved vocabulary item and updates its Leitner spaced repetition interval.
 */
export async function reviewVocabularyWord(
  id: string,
  rating: "again" | "easy" | "good"
): Promise<VocabularyItem | null> {
  const normalized = normalizeWord(id);
  const item = await getVocabWord(normalized);
  if (!item) return null;

  const now = new Date();
  const schedule = calculateNextReview(item.repetitionLevel, rating, now);

  const updated: VocabularyItem = {
    ...item,
    intervalDays: schedule.intervalDays,
    lastReviewedAt: now.toISOString(),
    nextReviewAt: schedule.nextReviewAt,
    repetitionLevel: schedule.repetitionLevel,
  };

  await putVocabWord(updated);
  return updated;
}

/**
 * Returns all vocabulary words that are currently due for review.
 */
export async function getDueVocabularyWords(): Promise<VocabularyItem[]> {
  const all = await getAllVocabWords();
  const now = Date.now();
  return all.filter((item) => new Date(item.nextReviewAt).getTime() <= now);
}

export interface WordMasteryStats {
  dueCount: number;
  learningCount: number;
  masteredCount: number;
  total: number;
}

/**
 * Returns summary statistics for the user's vocabulary collection.
 */
export async function getWordMasteryStats(): Promise<WordMasteryStats> {
  const all = await getAllVocabWords();
  const now = Date.now();
  let dueCount = 0;
  let masteredCount = 0;
  let learningCount = 0;

  for (const item of all) {
    if (new Date(item.nextReviewAt).getTime() <= now) {
      dueCount++;
    }
    if (item.repetitionLevel >= 4) {
      masteredCount++;
    } else {
      learningCount++;
    }
  }

  return {
    dueCount,
    learningCount,
    masteredCount,
    total: all.length,
  };
}

/**
 * Removes a word from the user's vocabulary store.
 */
export async function removeVocabularyWord(id: string): Promise<void> {
  const normalized = normalizeWord(id);
  await deleteVocabWord(normalized);
}
