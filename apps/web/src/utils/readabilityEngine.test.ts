import { describe, expect, it } from "bun:test";

import {
  analyzeReadability,
  countSyllables,
  extractSentences,
  extractWords,
  interpretFleschScore,
} from "./readabilityEngine";

describe("readabilityEngine", () => {
  describe("countSyllables", () => {
    it("handles empty or non-alphabetic inputs safely", () => {
      expect(countSyllables("")).toBe(0);
      expect(countSyllables("12345")).toBe(0);
      expect(countSyllables("!@#$%")).toBe(0);
    });

    it("counts single-syllable words accurately", () => {
      expect(countSyllables("a")).toBe(1);
      expect(countSyllables("the")).toBe(1);
      expect(countSyllables("cat")).toBe(1);
      expect(countSyllables("dog")).toBe(1);
      expect(countSyllables("books")).toBe(1);
      expect(countSyllables("tree")).toBe(1);
      expect(countSyllables("see")).toBe(1);
    });

    it("handles silent trailing 'e' and consonant+le endings", () => {
      // Silent e
      expect(countSyllables("game")).toBe(1);
      expect(countSyllables("make")).toBe(1);
      expect(countSyllables("plate")).toBe(1);
      expect(countSyllables("time")).toBe(1);

      // Consonant + le is syllabic
      expect(countSyllables("table")).toBe(2);
      expect(countSyllables("bottle")).toBe(2);
      expect(countSyllables("little")).toBe(2);
      expect(countSyllables("subtle")).toBe(2);
    });

    it("handles past tense -ed and plural -es morphology correctly", () => {
      // -ed preceded by t or d counts as separate syllable
      expect(countSyllables("wanted")).toBe(2);
      expect(countSyllables("started")).toBe(2);
      expect(countSyllables("needed")).toBe(2);

      // other -ed do not add a syllable
      expect(countSyllables("walked")).toBe(1);
      expect(countSyllables("talked")).toBe(1);
      expect(countSyllables("jumped")).toBe(1);

      // -es preceded by s, z, ch, sh, x counts as separate syllable
      expect(countSyllables("boxes")).toBe(2);
      expect(countSyllables("kisses")).toBe(2);
      expect(countSyllables("matches")).toBe(2);

      // other -es do not add extra vowel
      expect(countSyllables("makes")).toBe(1);
      expect(countSyllables("takes")).toBe(1);
    });

    it("counts polysyllabic complex vocabulary accurately", () => {
      expect(countSyllables("beautiful")).toBe(3);
      expect(countSyllables("syllable")).toBe(3);
      expect(countSyllables("simplicity")).toBe(4);
      expect(countSyllables("understanding")).toBe(4);
      expect(countSyllables("extraordinary")).toBeGreaterThanOrEqual(5);
      expect(countSyllables("unbelievable")).toBe(5);
      expect(countSyllables("communication")).toBe(5);
    });
  });

  describe("extractSentences", () => {
    it("handles empty or invalid inputs", () => {
      expect(extractSentences("")).toEqual([]);
      expect(extractSentences("   ")).toEqual([]);
    });

    it("splits standard prose by punctuation marks", () => {
      const text = "First sentence here. Second sentence! Is this the third? Yes, it is.";
      const sentences = extractSentences(text);
      expect(sentences).toHaveLength(4);
      expect(sentences[0]).toBe("First sentence here");
      expect(sentences[1]).toBe("Second sentence");
      expect(sentences[2]).toBe("Is this the third");
      expect(sentences[3]).toBe("Yes, it is");
    });

    it("does not prematurely split on common honorific abbreviations", () => {
      const text = "Dr. Watson met Mr. Holmes at Baker St. They solved the crime.";
      const sentences = extractSentences(text);
      expect(sentences.length).toBeLessThanOrEqual(3);
      expect(sentences[0]).toContain("Dr. Watson met Mr. Holmes");
    });

    it("handles ellipses without producing empty sentences", () => {
      const text = "She waited... but no one answered. Then she left.";
      const sentences = extractSentences(text);
      expect(sentences).toHaveLength(2);
      expect(sentences[0]).toContain("She waited...");
    });
  });

  describe("extractWords", () => {
    it("extracts words with apostrophes and normalizes to lowercase", () => {
      const text = "Don't judge a book's cover, it's wonderful!";
      const words = extractWords(text);
      expect(words).toContain("don't");
      expect(words).toContain("book's");
      expect(words).toContain("it's");
      expect(words).toContain("wonderful");
    });
  });

  describe("interpretFleschScore", () => {
    it("maps scores to correct educational difficulty bands", () => {
      expect(interpretFleschScore(95).difficultyBand).toBe("easy");
      expect(interpretFleschScore(95).label).toBe("Very Easy");

      expect(interpretFleschScore(82).difficultyBand).toBe("easy");
      expect(interpretFleschScore(82).label).toBe("Easy");

      expect(interpretFleschScore(74).difficultyBand).toBe("easy");
      expect(interpretFleschScore(74).label).toBe("Fairly Easy");

      expect(interpretFleschScore(65).difficultyBand).toBe("standard");
      expect(interpretFleschScore(65).label).toBe("Standard");

      expect(interpretFleschScore(55).difficultyBand).toBe("fairly-difficult");
      expect(interpretFleschScore(55).label).toBe("Fairly Difficult");

      expect(interpretFleschScore(42).difficultyBand).toBe("difficult");
      expect(interpretFleschScore(42).label).toBe("Difficult");

      expect(interpretFleschScore(20).difficultyBand).toBe("very-difficult");
      expect(interpretFleschScore(20).label).toBe("Very Difficult");
    });
  });

  describe("analyzeReadability", () => {
    it("returns safe zero metrics for empty text", () => {
      const metrics = analyzeReadability("");
      expect(metrics.totalWords).toBe(0);
      expect(metrics.sentenceCount).toBe(0);
      expect(metrics.fleschReadingEase).toBe(100);
      expect(metrics.fleschKincaidGradeLevel).toBe(0);
      expect(metrics.gunningFogIndex).toBe(0);
      expect(metrics.polysyllabicWords).toEqual([]);
    });

    it("evaluates simple children's prose as highly readable", () => {
      const text =
        "The cat sat on the green mat. The dog saw the cat. They ran and played in the big yard all day.";
      const metrics = analyzeReadability(text, 200);

      expect(metrics.totalWords).toBeGreaterThan(15);
      expect(metrics.sentenceCount).toBe(3);
      expect(metrics.fleschReadingEase).toBeGreaterThan(80);
      expect(metrics.fleschKincaidGradeLevel).toBeLessThan(6);
      expect(metrics.interpretation.difficultyBand).toBe("easy");
      expect(metrics.complexWordCount).toBe(0);
    });

    it("evaluates complex philosophical/academic text with high grade level and low reading ease", () => {
      const denseText = `
        Epistemological solipsism posits that synthetic propositional knowledge necessitates
        phenomenological corroboration through empirical observation. Metaphysical indeterminacy
        frequently obfuscates comprehensive ontological taxonomy, rendering hermeneutical
        reconciliation extraordinarily problematic for interdisciplinary contemporary epistemologists.
      `;
      const metrics = analyzeReadability(denseText, 250);

      expect(metrics.totalWords).toBeGreaterThan(20);
      expect(metrics.fleschReadingEase).toBeLessThan(40);
      expect(metrics.fleschKincaidGradeLevel).toBeGreaterThan(12);
      expect(metrics.gunningFogIndex).toBeGreaterThan(12);
      expect(metrics.polysyllabicWords.length).toBeGreaterThan(0);
      expect(["difficult", "very-difficult"]).toContain(
        metrics.interpretation.difficultyBand
      );
    });

    it("calculates lexical diversity, hapax legomena, and reading time", () => {
      const text = "A red fox saw another fox. One fox was red and quick.";
      const metrics = analyzeReadability(text, 100);

      expect(metrics.totalWords).toBe(12);
      expect(metrics.uniqueWordCount).toBeLessThan(12);
      expect(metrics.typeTokenRatio).toBeGreaterThan(0);
      expect(metrics.hapaxCount).toBeGreaterThan(0);
      expect(metrics.estimatedReadingMinutes).toBe(1);
    });

    it("ranks polysyllabic words by syllables then frequency", () => {
      const text = `
        Communication requires understanding and consideration.
        Understanding is essential. Extraordinary communication brings understanding.
      `;
      const metrics = analyzeReadability(text);

      expect(metrics.polysyllabicWords.length).toBeGreaterThanOrEqual(3);
      // Top word should have the highest syllables (extraordinary or communication)
      expect(metrics.polysyllabicWords[0].syllables).toBeGreaterThanOrEqual(4);
    });
  });
});
