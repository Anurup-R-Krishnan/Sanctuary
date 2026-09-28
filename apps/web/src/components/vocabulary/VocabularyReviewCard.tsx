import { CheckCircle2, RotateCw, Volume2, Trash2, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";

import type { VocabularyItem } from "@/types";

import {
  getDueVocabularyWords,
  reviewVocabularyWord,
} from "@/services/dictionaryService";
import { getAllVocabWords, deleteVocabWord } from "@/utils/db";

interface VocabularyReviewCardProps {
  onRefreshStats?: () => void;
}

type TabType = "review" | "all";

export function VocabularyReviewCard({ onRefreshStats }: VocabularyReviewCardProps) {
  const [activeTab, setActiveTab] = useState<TabType>("review");
  const [dueWords, setDueWords] = useState<VocabularyItem[]>([]);
  const [allWords, setAllWords] = useState<VocabularyItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadWords = async () => {
    setIsLoading(true);
    try {
      const words = await getDueVocabularyWords();
      setDueWords(words);
      const allWordsData = await getAllVocabWords();
      setAllWords(allWordsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setCurrentIndex(0);
      setIsRevealed(false);
    } catch {
      setDueWords([]);
      setAllWords([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWords();
  }, []);

  const handleDeleteWord = async (id: string) => {
    try {
      await deleteVocabWord(id);
      setAllWords((prev) => prev.filter((w) => w.id !== id));
      const deletedIndex = dueWords.findIndex((w) => w.id === id);
      const remaining = dueWords.filter((w) => w.id !== id);
      setDueWords(remaining);
      if (deletedIndex !== -1) {
        // Keep the same card in view: removing one before it shifts it left.
        const next = deletedIndex < currentIndex ? currentIndex - 1 : currentIndex;
        setCurrentIndex(Math.min(next, Math.max(0, remaining.length - 1)));
      }
      setDeleteConfirmId(null);
      onRefreshStats?.();
    } catch {
      // Ignore delete error
    }
  };

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
      // Pronunciation the user asked to hear (spoken content like read-aloud), not a sound effect.
      // eslint-disable-next-line no-restricted-syntax
      new Audio(currentWord.audioUrl).play().catch(() => {});
    } else if (typeof window !== "undefined" && "speechSynthesis" in window && currentWord) {
      const u = new SpeechSynthesisUtterance(currentWord.word);
      window.speechSynthesis.speak(u);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center rounded-xl bg-surface border border-line shadow-sm">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-fg-muted">Loading vocabulary…</p>
      </div>
    );
  }

  // Render tabs
  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-line">
        <button
          onClick={() => setActiveTab("review")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "review"
              ? "border-accent text-accent"
              : "border-transparent text-fg-muted hover:text-fg"
          }`}
          type="button"
        >
          Review {dueWords.length > 0 && `(${dueWords.length})`}
        </button>
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "all"
              ? "border-accent text-accent"
              : "border-transparent text-fg-muted hover:text-fg"
          }`}
          type="button"
        >
          All Words {allWords.length > 0 && `(${allWords.length})`}
        </button>
      </div>

      {/* Review Tab */}
      {activeTab === "review" && renderReviewContent()}

      {/* All Words Tab */}
      {activeTab === "all" && renderAllWordsContent()}
    </div>
  );

  function renderReviewContent() {
    const currentWord = dueWords[currentIndex];

    if (!currentWord) {
      if (allWords.length === 0) {
        return (
          <div className="p-8 text-center rounded-xl bg-surface border border-line shadow-sm">
            <BookOpen className="w-10 h-10 text-fg-muted mx-auto mb-3" />
            <h3 className="font-semibold text-fg text-base">No saved words</h3>
            <p className="text-xs text-fg-muted mt-1 max-w-sm mx-auto">
              Select a word while reading and choose Save.
            </p>
          </div>
        );
      }
      return (
        <div className="p-8 text-center rounded-xl bg-surface border border-line shadow-sm">
          <CheckCircle2 className="w-10 h-10 text-accent mx-auto mb-3" />
          <h3 className="font-semibold text-fg text-base">Nothing to review right now</h3>
          <p className="text-xs text-fg-muted mt-1 max-w-sm mx-auto">
            {dueWords.length === 0 && allWords.length > 0
              ? `Next due ${new Date(Math.min(...allWords.map(w => new Date(w.nextReviewAt).getTime()))).toLocaleDateString()}`
              : "Encounter new words in your books to expand your deck!"}
          </p>
          <button
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-page border border-line text-fg hover:bg-line/40 transition-colors"
            onClick={loadWords}
            type="button"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      );
    }

    return (
      <div className="rounded-xl bg-surface border border-line shadow-sm overflow-hidden p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-accent">
            Vocabulary Card {currentIndex + 1} of {dueWords.length}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-line/60 border border-line text-fg-muted font-mono">
            Level {currentWord.repetitionLevel}
          </span>
        </div>

        <div className="text-center py-6">
          <div className="inline-flex items-center gap-2">
            <h2 className="font-display font-medium text-3xl font-serif text-fg capitalize">
              {currentWord.word}
            </h2>
            <button
              aria-label="Pronounce word"
              className="p-1.5 rounded-full text-accent hover:bg-accent/15 transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
              onClick={handlePlayAudio}
              type="button"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>

          {currentWord.phonetic && (
            <p className="text-sm text-fg-muted font-mono mt-1">
              {currentWord.phonetic}
            </p>
          )}

          {isRevealed ? (
            <div className="mt-6 p-4 rounded-xl bg-surface/60 text-left border border-line space-y-2 animate-fadeIn">
              {currentWord.partOfSpeech && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent font-medium">
                  {currentWord.partOfSpeech}
                </span>
              )}
              <p className="text-sm text-fg leading-relaxed">
                {currentWord.definition}
              </p>
              {currentWord.example && (
                <p className="text-xs text-fg-muted border-l-2 border-accent/50 pl-2">
                  &ldquo;{currentWord.example}&rdquo;
                </p>
              )}
              {currentWord.bookTitle && (
                <p className="text-xs text-fg-muted mt-2">
                  Source: {currentWord.bookTitle}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-8">
              <button
                className="px-5 py-2.5 rounded-xl text-sm font-medium bg-page border border-line text-fg hover:bg-line/40 transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
                onClick={() => setIsRevealed(true)}
                type="button"
              >
                Show Definition
              </button>
            </div>
          )}
        </div>

        {isRevealed && (
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-line animate-fadeIn">
            <button
              className="py-2.5 rounded-xl text-xs font-semibold border border-line bg-surface-raised text-fg-muted hover:border-danger/40 hover:text-danger transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              onClick={() => handleRate("again")}
              type="button"
            >
              Again (&lt; 1d)
            </button>
            <button
              className="py-2.5 rounded-xl text-xs font-semibold bg-accent/15 text-accent hover:bg-accent/25 transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
              onClick={() => handleRate("good")}
              type="button"
            >
              Good (3d)
            </button>
            <button
              className="py-2.5 rounded-xl text-xs font-semibold border border-accent bg-accent text-accent-fg hover:brightness-105 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              onClick={() => handleRate("easy")}
              type="button"
            >
              Easy (7d)
            </button>
          </div>
        )}
      </div>
    );
  }

  function renderAllWordsContent() {
    if (allWords.length === 0) {
      return (
        <div className="p-8 text-center rounded-xl bg-surface border border-line shadow-sm">
          <BookOpen className="w-10 h-10 text-fg-muted mx-auto mb-3" />
          <h3 className="font-semibold text-fg text-base">No saved words</h3>
          <p className="text-xs text-fg-muted mt-1 max-w-sm mx-auto">
            Select a word while reading and choose Save.
          </p>
        </div>
      );
    }

    return (
      <div className="rounded-xl bg-surface border border-line shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-line bg-surface/40">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wider">Word</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wider">Definition</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wider">Source</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wider">Level</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {allWords.map((word) => (
                <tr key={word.id} className="border-b border-line hover:bg-surface/40 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-fg">{word.word}</td>
                  <td className="px-4 py-3 text-sm text-fg-muted line-clamp-2">{word.definition}</td>
                  <td className="px-4 py-3 text-xs text-fg-muted">{word.bookTitle || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-line/60 border border-line text-fg-muted font-mono">
                      {word.repetitionLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {deleteConfirmId === word.id ? (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          className="px-2 py-1 text-xs font-medium bg-danger/10 text-danger hover:bg-danger/15 rounded transition-colors"
                          onClick={() => handleDeleteWord(word.id)}
                          type="button"
                        >
                          Confirm
                        </button>
                        <button
                          className="px-2 py-1 text-xs font-medium bg-line/60 text-fg-muted hover:bg-line rounded transition-colors"
                          onClick={() => setDeleteConfirmId(null)}
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className="p-1.5 rounded-lg text-fg-muted hover:bg-danger/10 hover:text-danger transition-colors"
                        onClick={() => setDeleteConfirmId(word.id)}
                        title="Delete word"
                        type="button"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}
