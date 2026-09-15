import { CheckCircle2, RotateCw, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";

import type { VocabularyItem } from "@/types";

import {
  getDueVocabularyWords,
  reviewVocabularyWord,
} from "@/services/dictionaryService";

interface VocabularyReviewCardProps {
  onRefreshStats?: () => void;
}

export function VocabularyReviewCard({ onRefreshStats }: VocabularyReviewCardProps) {
  const [dueWords, setDueWords] = useState<VocabularyItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadWords = async () => {
    setIsLoading(true);
    try {
      const words = await getDueVocabularyWords();
      setDueWords(words);
      setCurrentIndex(0);
      setIsRevealed(false);
    } catch {
      setDueWords([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWords();
  }, []);

  const currentWord = dueWords[currentIndex];

  const handleRate = async (rating: "again" | "easy" | "good") => {
    if (!currentWord) return;
    try {
      await reviewVocabularyWord(currentWord.id, rating);
      if (currentIndex + 1 < dueWords.length) {
        setCurrentIndex((i) => i + 1);
        setIsRevealed(false);
      } else {
        // Finished deck
        await loadWords();
        onRefreshStats?.();
      }
    } catch {
      // Ignore rating error
    }
  };

  const handlePlayAudio = () => {
    if (currentWord?.audioUrl) {
      new Audio(currentWord.audioUrl).play().catch(() => {});
    } else if (typeof window !== "undefined" && "speechSynthesis" in window && currentWord) {
      const u = new SpeechSynthesisUtterance(currentWord.word);
      window.speechSynthesis.speak(u);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center rounded-2xl bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border shadow-sm">
        <div className="w-6 h-6 border-2 border-light-accent dark:border-dark-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-light-text-muted dark:text-dark-text-muted">Loading vocabulary queue…</p>
      </div>
    );
  }

  if (!currentWord) {
    return (
      <div className="p-8 text-center rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
        <h3 className="font-semibold text-light-text dark:text-dark-text text-base">All Caught Up!</h3>
        <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-1 max-w-sm mx-auto">
          You have reviewed all due vocabulary flashcards. Encounter new words in your books to expand your deck!
        </p>
        <button
          className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-light-primary dark:bg-dark-primary border border-light-border dark:border-dark-border text-light-text dark:text-dark-text hover:bg-light-border/40 dark:hover:bg-dark-border/40 transition-colors"
          onClick={loadWords}
         type="button"

         >          <RotateCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border shadow-sm overflow-hidden p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-light-accent dark:text-dark-accent">
          Vocabulary Card {currentIndex + 1} of {dueWords.length}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-light-border/60 dark:bg-dark-border/60 border border-light-border dark:border-dark-border text-light-text-muted dark:text-dark-text-muted font-mono">
          Level {currentWord.repetitionLevel}
        </span>
      </div>

      <div className="text-center py-6">
        <div className="inline-flex items-center gap-2">
          <h2 className="text-3xl font-serif font-bold text-light-text dark:text-dark-text capitalize">
            {currentWord.word}
          </h2>
          <button
            aria-label="Pronounce word"
            className="p-1.5 rounded-full text-light-accent dark:text-dark-accent hover:bg-light-accent/15 dark:hover:bg-dark-accent/15 transition-colors focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
            onClick={handlePlayAudio}
           type="button"

           >            <Volume2 className="w-5 h-5" />
          </button>
        </div>

        {currentWord.phonetic && (
          <p className="text-sm text-light-text-muted dark:text-dark-text-muted font-mono mt-1">
            {currentWord.phonetic}
          </p>
        )}

        {isRevealed ? (
          <div className="mt-6 p-4 rounded-xl bg-light-surface/60 dark:bg-dark-surface/60 text-left border border-light-border dark:border-dark-border space-y-2 animate-fadeIn">
            {currentWord.partOfSpeech && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-light-accent/15 dark:bg-dark-accent/15 text-light-accent dark:text-dark-accent font-medium">
                {currentWord.partOfSpeech}
              </span>
            )}
            <p className="text-sm text-light-text dark:text-dark-text leading-relaxed">
              {currentWord.definition}
            </p>
            {currentWord.example && (
              <p className="text-xs italic text-light-text-muted dark:text-dark-text-muted border-l-2 border-light-accent/50 dark:border-dark-accent/50 pl-2">
                &ldquo;{currentWord.example}&rdquo;
              </p>
            )}
            {currentWord.bookTitle && (
              <p className="text-[11px] text-light-text-muted dark:text-dark-text-muted mt-2">
                Source: {currentWord.bookTitle}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-8">
            <button
              className="px-5 py-2.5 rounded-xl text-sm font-medium bg-light-primary dark:bg-dark-primary border border-light-border dark:border-dark-border text-light-text dark:text-dark-text hover:bg-light-border/40 dark:hover:bg-dark-border/40 transition-colors focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
              onClick={() => setIsRevealed(true)}
            >
              Show Definition
            </button>
          </div>
        )}
      </div>

      {isRevealed && (
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-light-border dark:border-dark-border animate-fadeIn">
          <button
            className="py-2.5 rounded-xl text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
            onClick={() => handleRate("again")}
          >
            Again (&lt; 1d)
          </button>
          <button
            className="py-2.5 rounded-xl text-xs font-semibold bg-light-accent/15 dark:bg-dark-accent/15 text-light-accent dark:text-dark-accent hover:bg-light-accent/25 dark:hover:bg-dark-accent/25 transition-colors focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
            onClick={() => handleRate("good")}
          >
            Good (3d)
          </button>
          <button
            className="py-2.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
            onClick={() => handleRate("easy")}
          >
            Easy (7d)
          </button>
        </div>
      )}
    </div>
  );
}
