import { beforeEach, describe, expect, it, mock } from "bun:test";

// Mock the db module before importing service
mock.module("@/utils/db", () => ({
  deleteVocabWord: mock(async () => {}),
  getAllVocabWords: mock(async () => []),
  getVocabWord: mock(async () => null),
  putVocabWord: mock(async () => {}),
}));

import type { VocabularyItem } from "@/types";

import * as db from "@/utils/db";

import {
  calculateNextReview,
  getDueVocabularyWords,
  getWordMasteryStats,
  LEITNER_INTERVALS,
  lookupWord,
  normalizeWord,
  removeVocabularyWord,
  reviewVocabularyWord,
  saveVocabularyWord,
} from "./dictionaryService";

describe("dictionaryService — vocabulary lookup & Leitner spaced repetition", () => {
  beforeEach(() => {
    (db.getAllVocabWords as ReturnType<typeof mock>).mockResolvedValue([]);
    (db.getVocabWord as ReturnType<typeof mock>).mockResolvedValue(null);
    (db.putVocabWord as ReturnType<typeof mock>).mockResolvedValue(undefined);
    (db.deleteVocabWord as ReturnType<typeof mock>).mockResolvedValue(undefined);
  });

  describe("normalizeWord", () => {
    it("strips whitespace, casing, and surrounding punctuation", () => {
      expect(normalizeWord("  \"Luminous\"! ")).toBe("luminous");
      expect(normalizeWord("—serendipity—")).toBe("serendipity");
      expect(normalizeWord("Ethereal...")).toBe("ethereal");
    });
  });

  describe("calculateNextReview", () => {
    const fixedNow = new Date("2026-05-01T12:00:00.000Z");

    it("resets to level 0 (1 day interval) on 'again'", () => {
      const result = calculateNextReview(3, "again", fixedNow);
      expect(result.repetitionLevel).toBe(0);
      expect(result.intervalDays).toBe(1);
      const expectedDate = new Date(fixedNow.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString();
      expect(result.nextReviewAt).toBe(expectedDate);
    });

    it("advances by 1 level on 'good'", () => {
      const result = calculateNextReview(1, "good", fixedNow);
      expect(result.repetitionLevel).toBe(2);
      expect(result.intervalDays).toBe(LEITNER_INTERVALS[2]); // 7 days
    });

    it("advances by 2 levels on 'easy'", () => {
      const result = calculateNextReview(1, "easy", fixedNow);
      expect(result.repetitionLevel).toBe(3);
      expect(result.intervalDays).toBe(LEITNER_INTERVALS[3]); // 14 days
    });

    it("caps repetition level at maximum Leitner interval", () => {
      const result = calculateNextReview(4, "good", fixedNow);
      expect(result.repetitionLevel).toBe(4);
      expect(result.intervalDays).toBe(30);
    });
  });

  describe("lookupWord", () => {
    it("returns cached word from DB if found", async () => {
      const cachedItem: VocabularyItem = {
        createdAt: "2026-05-01T00:00:00.000Z",
        definition: "Producing or reflecting bright light.",
        id: "luminous",
        intervalDays: 1,
        nextReviewAt: "2026-05-02T00:00:00.000Z",
        partOfSpeech: "adjective",
        phonetic: "/ˈluːmɪnəs/",
        repetitionLevel: 0,
        word: "luminous",
      };

      (db.getVocabWord as ReturnType<typeof mock>).mockResolvedValue(cachedItem);

      const res = await lookupWord("Luminous");
      expect(res).not.toBeNull();
      expect(res?.word).toBe("luminous");
      expect(res?.definition).toBe("Producing or reflecting bright light.");
    });

    it("fetches from dictionary API when not in DB", async () => {
      const mockApiResponse = [
        {
          meanings: [
            {
              definitions: [
                {
                  definition: "Extremely delicate and light in a way that seems too perfect for this world.",
                  example: "Her ethereal beauty captivated everyone.",
                },
              ],
              partOfSpeech: "adjective",
            },
          ],
          phonetic: "/ɪˈθɪəri.əl/",
          phonetics: [
            {
              audio: "https://api.dictionaryapi.dev/media/pronunciations/en/ethereal-us.mp3",
            },
          ],
          word: "ethereal",
        },
      ];

      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(async () => ({
        json: async () => mockApiResponse,
        ok: true,
      })) as unknown as typeof fetch;

      try {
        const res = await lookupWord("ethereal");
        expect(res).not.toBeNull();
        expect(res?.word).toBe("ethereal");
        expect(res?.definition).toContain("Extremely delicate");
        expect(res?.partOfSpeech).toBe("adjective");
        expect(res?.audioUrl).toBe("https://api.dictionaryapi.dev/media/pronunciations/en/ethereal-us.mp3");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("returns null when dictionary API fails or word not found", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(async () => ({
        json: async () => ({ title: "No Definitions Found" }),
        ok: false,
      })) as unknown as typeof fetch;

      try {
        const res = await lookupWord("unknownsuperword123");
        expect(res).toBeNull();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("saveVocabularyWord and reviewVocabularyWord", () => {
    it("saves a word at Leitner level 0, immediately due for its first review", async () => {
      const saved = await saveVocabularyWord({
        bookId: "book-123",
        bookTitle: "Moby Dick",
        contextSentence: "Call me Ishmael.",
        definition: "A biblical outcast or wanderer.",
        word: "Ishmael",
      });

      expect(saved.id).toBe("ishmael");
      expect(saved.word).toBe("ishmael");
      expect(saved.repetitionLevel).toBe(0);
      expect(saved.intervalDays).toBe(0);
      expect(new Date(saved.nextReviewAt).getTime()).toBeLessThanOrEqual(Date.now());
      expect(db.putVocabWord).toHaveBeenCalled();
    });

    it("surfaces a just-saved word in the due queue right away", async () => {
      const saved = await saveVocabularyWord({
        definition: "Present participle of see.",
        word: "seeing",
      });

      (db.getAllVocabWords as ReturnType<typeof mock>).mockResolvedValue([saved]);

      const dueWords = await getDueVocabularyWords();
      expect(dueWords.map((w) => w.id)).toContain("seeing");
    });

    it("advances Leitner level on successful review", async () => {
      const existing: VocabularyItem = {
        createdAt: "2026-05-01T00:00:00.000Z",
        definition: "Test definition",
        id: "test",
        intervalDays: 1,
        nextReviewAt: "2026-05-02T00:00:00.000Z",
        repetitionLevel: 0,
        word: "test",
      };

      (db.getVocabWord as ReturnType<typeof mock>).mockResolvedValue(existing);

      const updated = await reviewVocabularyWord("test", "good");
      expect(updated).not.toBeNull();
      expect(updated?.repetitionLevel).toBe(1);
      expect(updated?.intervalDays).toBe(3);
      expect(db.putVocabWord).toHaveBeenCalled();
    });
  });

  describe("getDueVocabularyWords and getWordMasteryStats", () => {
    it("filters due words correctly based on nextReviewAt timestamp", async () => {
      const past = new Date(Date.now() - 3600 * 1000).toISOString();
      const future = new Date(Date.now() + 3600 * 1000 * 24).toISOString();

      const items: VocabularyItem[] = [
        {
          createdAt: "2026-05-01T00:00:00.000Z",
          definition: "Due word",
          id: "due",
          intervalDays: 1,
          nextReviewAt: past,
          repetitionLevel: 1,
          word: "due",
        },
        {
          createdAt: "2026-05-01T00:00:00.000Z",
          definition: "Future word",
          id: "future",
          intervalDays: 7,
          nextReviewAt: future,
          repetitionLevel: 2,
          word: "future",
        },
      ];

      (db.getAllVocabWords as ReturnType<typeof mock>).mockResolvedValue(items);

      const dueWords = await getDueVocabularyWords();
      expect(dueWords.length).toBe(1);
      expect(dueWords[0].id).toBe("due");

      const stats = await getWordMasteryStats();
      expect(stats.total).toBe(2);
      expect(stats.dueCount).toBe(1);
      expect(stats.masteredCount).toBe(0);
      expect(stats.learningCount).toBe(2);
    });

    it("deletes a word via removeVocabularyWord", async () => {
      await removeVocabularyWord("luminous");
      expect(db.deleteVocabWord).toHaveBeenCalledWith("luminous");
    });
  });

  describe("saveVocabularyWord — preserve schedule for existing words", () => {
    it("creates a new word with current date and immediate review", async () => {
      (db.getVocabWord as ReturnType<typeof mock>).mockResolvedValue(null);

      const result = await saveVocabularyWord({
        word: "ethereal",
        definition: "Extremely delicate or light.",
        example: "The ethereal quality of her voice.",
        partOfSpeech: "adjective",
      });

      expect(result.word).toBe("ethereal");
      expect(result.repetitionLevel).toBe(0);
      expect(result.intervalDays).toBe(0);
      expect(db.putVocabWord).toHaveBeenCalled();

      const savedItem = (db.putVocabWord as ReturnType<typeof mock>).mock.calls[0]?.[0] as VocabularyItem;
      expect(savedItem.createdAt).toBeTruthy();
      // nextReviewAt should be approximately now (within 1 second)
      expect(Math.abs(new Date(savedItem.nextReviewAt).getTime() - Date.now())).toBeLessThan(1000);
    });

    it("preserves existing schedule, mastery level, and createdAt when updating a word", async () => {
      const existingWord: VocabularyItem = {
        audioUrl: "old-audio.mp3",
        bookId: "book-123",
        bookTitle: "Old Book",
        createdAt: "2026-04-01T00:00:00.000Z",
        definition: "Old definition",
        example: "Old example",
        id: "ethereal",
        intervalDays: 7,
        lastReviewedAt: "2026-04-15T00:00:00.000Z",
        nextReviewAt: "2026-04-22T00:00:00.000Z",
        partOfSpeech: "adjective",
        repetitionLevel: 3,
        word: "ethereal",
      };

      (db.getVocabWord as ReturnType<typeof mock>).mockResolvedValue(existingWord);

      const result = await saveVocabularyWord({
        word: "ethereal",
        definition: "New definition with fresh wording.",
        example: "A new example sentence.",
        partOfSpeech: "adjective",
        bookId: "new-book",
        bookTitle: "New Book",
      });

      // Schedule and mastery should be preserved
      expect(result.repetitionLevel).toBe(3);
      expect(result.intervalDays).toBe(7);
      expect(result.nextReviewAt).toBe("2026-04-22T00:00:00.000Z");
      expect(result.createdAt).toBe("2026-04-01T00:00:00.000Z");
      expect(result.lastReviewedAt).toBe("2026-04-15T00:00:00.000Z");

      // But definition and source should be updated
      expect(result.definition).toBe("New definition with fresh wording.");
      expect(result.example).toBe("A new example sentence.");
      expect(result.bookTitle).toBe("New Book");
      expect(result.bookId).toBe("new-book");

      expect(db.putVocabWord).toHaveBeenCalled();
    });
  });
});
