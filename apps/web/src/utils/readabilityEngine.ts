/**
 * Text readability calculations: Flesch Reading Ease, Flesch-Kincaid, and Gunning Fog.
 */

export interface ChapterReadabilityMetrics {
  averageSentenceLength: number;
  averageSyllablesPerWord: number;
  complexWordCount: number;
  complexWordPercentage: number;
  estimatedReadingMinutes: number;
  fleschKincaidGradeLevel: number;
  fleschReadingEase: number;
  gunningFogIndex: number;
  hapaxCount: number;
  hapaxPercentage: number;
  interpretation: ReadabilityInterpretation;
  polysyllabicWords: PolysyllabicWord[];
  sentenceCount: number;
  syllableCount: number;
  totalWords: number;
  typeTokenRatio: number;
  uniqueWordCount: number;
}

export interface PolysyllabicWord {
  frequency: number;
  syllables: number;
  word: string;
}

export interface ReadabilityInterpretation {
  colorBand: "amber" | "emerald" | "indigo" | "rose" | "sky";
  description: string;
  difficultyBand:
    | "difficult"
    | "easy"
    | "fairly-difficult"
    | "standard"
    | "very-difficult";
  gradeLevelEquivalent: string;
  label: string;
}

/**
 * Estimates syllables in a word.
 */
export function countSyllables(rawWord: string): number {
  if (!rawWord) return 0;
  const word = rawWord.toLowerCase().replace(/[^a-z]/g, "");
  if (!word) return 0;
  if (word.length <= 2) return 1;

  let working = word;
  const isLeEnding = /(?:[^aeiouy])le$/.test(working);

  // Silent 'e' at end (not preceded by another 'e' and not ending with consonant+le)
  if (working.endsWith("e") && !working.endsWith("ee") && !isLeEnding) {
    working = working.slice(0, -1);
  } else if (working.endsWith("ed") && !/(?:[td])ed$/.test(working)) {
    working = working.slice(0, -2);
  } else if (
    working.endsWith("es") &&
    !/(?:[sz]|ch|sh|x)es$/.test(working)
  ) {
    working = working.slice(0, -2);
  }

  // Count vowel groups
  const vowelGroups = working.match(/[aeiouy]+/g);
  let count = vowelGroups ? vowelGroups.length : 0;

  // Words ending in consonant+le when le was trimmed or not picked up
  if (isLeEnding && !working.endsWith("le")) {
    count += 1;
  }

  return Math.max(1, count);
}

/**
 * Splits prose text into sentences, ignoring common abbreviations.
 */
export function extractSentences(text: string): string[] {
  if (!text || typeof text !== "string") return [];

  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\.{3,}/g, "…")
    .replace(
      /(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|e\.g|i\.e)\./gi,
      (m) => m.replace(/\./g, "@dot@")
    );

  const rawSentences = normalized.split(/[.!?]+(?:\s+|$)/);
  return rawSentences
    .map((s) => s.replace(/@dot@/g, ".").replace(/…/g, "...").trim())
    .filter((s) => s.length > 0 && /[a-zA-Z0-9]/.test(s));
}

/**
 * Extracts normalized word tokens from text.
 */
export function extractWords(text: string): string[] {
  if (!text || typeof text !== "string") return [];
  const matches = text.match(/\b[a-zA-Z]+(?:'[a-zA-Z]+)?\b/g);
  if (!matches) return [];
  return matches.map((w) => w.toLowerCase());
}

/**
 * Interprets a Flesch Reading Ease score into qualitative bands.
 */
export function interpretFleschScore(score: number): ReadabilityInterpretation {
  if (score >= 90) {
    return {
      colorBand: "emerald",
      description: "Very conversational text easily understood by an average 5th-grade student.",
      difficultyBand: "easy",
      gradeLevelEquivalent: "5th Grade",
      label: "Very Easy",
    };
  }
  if (score >= 80) {
    return {
      colorBand: "emerald",
      description: "Conversational English suitable for standard 6th-grade readers.",
      difficultyBand: "easy",
      gradeLevelEquivalent: "6th Grade",
      label: "Easy",
    };
  }
  if (score >= 70) {
    return {
      colorBand: "sky",
      description: "Accessible prose readable by typical 7th-grade students.",
      difficultyBand: "easy",
      gradeLevelEquivalent: "7th Grade",
      label: "Fairly Easy",
    };
  }
  if (score >= 60) {
    return {
      colorBand: "sky",
      description: "Standard literary prose accessible to 8th and 9th grade students.",
      difficultyBand: "standard",
      gradeLevelEquivalent: "8th-9th Grade",
      label: "Standard",
    };
  }
  if (score >= 50) {
    return {
      colorBand: "amber",
      description: "Substantive prose typical of high school reading materials (10th-12th grade).",
      difficultyBand: "fairly-difficult",
      gradeLevelEquivalent: "10th-12th Grade",
      label: "Fairly Difficult",
    };
  }
  if (score >= 30) {
    return {
      colorBand: "indigo",
      description: "Complex and dense prose comparable to college-level and scholarly texts.",
      difficultyBand: "difficult",
      gradeLevelEquivalent: "College Level",
      label: "Difficult",
    };
  }
  return {
    colorBand: "rose",
    description: "Highly academic, dense, or technical prose requiring graduate-level comprehension.",
    difficultyBand: "very-difficult",
    gradeLevelEquivalent: "Graduate / Academic",
    label: "Very Difficult",
  };
}

/**
 * Computes comprehensive readability and cognitive complexity metrics.
 */
export function analyzeReadability(
  text: string,
  wpm = 250
): ChapterReadabilityMetrics {
  const words = extractWords(text);
  const sentences = extractSentences(text);

  const totalWords = words.length;
  const sentenceCount = Math.max(1, sentences.length);

  if (totalWords === 0) {
    return {
      averageSentenceLength: 0,
      averageSyllablesPerWord: 0,
      complexWordCount: 0,
      complexWordPercentage: 0,
      estimatedReadingMinutes: 0,
      fleschKincaidGradeLevel: 0,
      fleschReadingEase: 100,
      gunningFogIndex: 0,
      hapaxCount: 0,
      hapaxPercentage: 0,
      interpretation: interpretFleschScore(100),
      polysyllabicWords: [],
      sentenceCount: 0,
      syllableCount: 0,
      totalWords: 0,
      typeTokenRatio: 0,
      uniqueWordCount: 0,
    };
  }

  const wordFrequencyMap = new Map<string, number>();
  const wordSyllableMap = new Map<string, number>();
  let syllableCount = 0;
  let complexWordCount = 0;

  for (const word of words) {
    const freq = (wordFrequencyMap.get(word) || 0) + 1;
    wordFrequencyMap.set(word, freq);

    let syllables = wordSyllableMap.get(word);
    if (syllables === undefined) {
      syllables = countSyllables(word);
      wordSyllableMap.set(word, syllables);
    }

    syllableCount += syllables;
    if (syllables >= 3) {
      complexWordCount += 1;
    }
  }

  const uniqueWordCount = wordFrequencyMap.size;
  let hapaxCount = 0;
  for (const freq of wordFrequencyMap.values()) {
    if (freq === 1) {
      hapaxCount += 1;
    }
  }

  // Polysyllabic words list (unique words with >= 3 syllables, ranked by frequency then syllables)
  const polysyllabicWords: PolysyllabicWord[] = [];
  for (const [word, freq] of wordFrequencyMap.entries()) {
    const syllables = wordSyllableMap.get(word) || 0;
    if (syllables >= 3) {
      polysyllabicWords.push({
        frequency: freq,
        syllables,
        word,
      });
    }
  }
  polysyllabicWords.sort((a, b) => {
    if (b.syllables !== a.syllables) {
      return b.syllables - a.syllables;
    }
    return b.frequency - a.frequency;
  });

  const averageSentenceLength = totalWords / sentenceCount;
  const averageSyllablesPerWord = syllableCount / totalWords;
  const complexWordPercentage = (complexWordCount / totalWords) * 100;
  const typeTokenRatio = (uniqueWordCount / totalWords) * 100;
  const hapaxPercentage = (hapaxCount / totalWords) * 100;

  // Flesch Reading Ease = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)
  const rawFre =
    206.835 -
    1.015 * averageSentenceLength -
    84.6 * averageSyllablesPerWord;
  const fleschReadingEase = Math.max(0, Math.min(100, Math.round(rawFre * 10) / 10));

  // Flesch-Kincaid Grade Level = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59
  const rawFkgl =
    0.39 * averageSentenceLength +
    11.8 * averageSyllablesPerWord -
    15.59;
  const fleschKincaidGradeLevel = Math.max(0, Math.round(rawFkgl * 10) / 10);

  // Gunning Fog Index = 0.4 * ((words / sentences) + 100 * (complexWords / words))
  const rawGunningFog = 0.4 * (averageSentenceLength + complexWordPercentage);
  const gunningFogIndex = Math.max(0, Math.round(rawGunningFog * 10) / 10);

  const safeWpm = Math.max(50, wpm);
  const estimatedReadingMinutes = Math.max(1, Math.ceil(totalWords / safeWpm));

  return {
    averageSentenceLength: Math.round(averageSentenceLength * 10) / 10,
    averageSyllablesPerWord: Math.round(averageSyllablesPerWord * 100) / 100,
    complexWordCount,
    complexWordPercentage: Math.round(complexWordPercentage * 10) / 10,
    estimatedReadingMinutes,
    fleschKincaidGradeLevel,
    fleschReadingEase,
    gunningFogIndex,
    hapaxCount,
    hapaxPercentage: Math.round(hapaxPercentage * 10) / 10,
    interpretation: interpretFleschScore(fleschReadingEase),
    polysyllabicWords: polysyllabicWords.slice(0, 30),
    sentenceCount,
    syllableCount,
    totalWords,
    typeTokenRatio: Math.round(typeTokenRatio * 10) / 10,
    uniqueWordCount,
  };
}
