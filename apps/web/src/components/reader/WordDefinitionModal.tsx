import { Bookmark, Check, Volume2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { VocabularyDefinition } from "@/types";

import {
  lookupWord,
  saveVocabularyWord,
} from "@/services/dictionaryService";

interface WordDefinitionModalProps {
  bookId?: string;
  bookTitle?: string;
  cfi?: string;
  contextSentence?: string;
  isOpen: boolean;
  onClose: () => void;
  word: string;
}

export function WordDefinitionModal({
  bookId,
  bookTitle,
  cfi,
  contextSentence,
  isOpen,
  onClose,
  word,
}: WordDefinitionModalProps) {
  const [definition, setDefinition] = useState<VocabularyDefinition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !word) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);
    setIsSaved(false);

    lookupWord(word)
      .then((def) => {
        if (!isMounted) return;
        if (def) {
          setDefinition(def);
        } else {
          setError(`No definition found for "${word}".`);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setError(`Failed to look up "${word}".`);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, word]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  const handlePlayAudio = () => {
    if (definition?.audioUrl) {
      // Pronunciation the user asked to hear (spoken content like read-aloud), not a sound effect.
      // eslint-disable-next-line no-restricted-syntax
      const audio = new Audio(definition.audioUrl);
      audio.play().catch(() => {
        // Fallback to speech synthesis
        speakFallback();
      });
    } else {
      speakFallback();
    }
  };

  const speakFallback = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSave = async () => {
    if (!definition) return;
    try {
      await saveVocabularyWord({
        audioUrl: definition.audioUrl,
        bookId,
        bookTitle,
        cfi,
        contextSentence,
        definition: definition.definition,
        example: definition.example,
        partOfSpeech: definition.partOfSpeech,
        phonetic: definition.phonetic,
        word: definition.word,
      });
      setIsSaved(true);
    } catch {
      // Ignore save errors
    }
  };

  return createPortal(
    <div
      aria-labelledby="word-definition-title"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
      role="dialog"
      tabIndex={-1}
    >
      <div
        className="w-full max-w-md rounded-xl bg-page border border-line shadow-2xl overflow-hidden p-6 relative animate-scaleUp text-fg"
      >
        {/* Close Button */}
        <button
          aria-label="Close definition (Esc)"
          className="absolute top-4 right-4 rounded-full p-1.5 text-fg-muted hover:text-fg hover:bg-line/40 transition-colors"
          onClick={onClose}
          type="button"
        >
          <X className="w-5 h-5" />
        </button>

        {isLoading ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-8 h-8 mx-auto border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-fg-muted">
              Looking up &ldquo;{word}&rdquo;…
            </p>
          </div>
        ) : error ? (
          <div className="py-6 text-center space-y-4">
            <p className="text-sm text-fg-muted">{error}</p>
            <button
              className="px-4 py-2 text-sm font-medium rounded-xl bg-surface/60 border border-line text-fg hover:bg-line/40 transition-colors"
              onClick={onClose}
              type="button"
            >
              Close
            </button>
          </div>
        ) : definition ? (
          <div className="space-y-4">
            {/* Word Header */}
            <div>
              <div className="flex items-center gap-3">
                <h2 id="word-definition-title" className="font-display font-medium text-2xl font-serif text-fg capitalize">
                  {definition.word}
                </h2>
                <button
                  aria-label="Pronounce word"
                  className="rounded-full p-2 text-accent hover:bg-accent/10 dark:hover:bg-accent/15 transition-colors"
                  onClick={handlePlayAudio}
                  title="Listen to pronunciation"
                  type="button"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2 mt-1">
                {definition.phonetic && (
                  <span className="text-sm text-fg-muted font-mono">
                    {definition.phonetic}
                  </span>
                )}
                {definition.partOfSpeech && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 dark:bg-accent/20 text-accent font-medium">
                    {definition.partOfSpeech}
                  </span>
                )}
              </div>
            </div>

            {/* Definition */}
            <div className="p-4 rounded-xl bg-surface/40 border border-line">
              <p className="text-sm text-fg leading-relaxed">
                {definition.definition}
              </p>
              {definition.example && (
                <p className="text-xs text-fg-muted mt-2 border-l-2 border-accent/40 pl-2">
                  "{definition.example}"
                </p>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-fg-muted">
                Free Dictionary API
              </span>

              <button
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isSaved
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold"
                    : "bg-accent text-white dark:text-black hover:opacity-90 shadow-sm font-semibold"
                }`}
                disabled={isSaved}
                onClick={handleSave}
                type="button"
              >
                {isSaved ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Saved to Vocabulary</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4" />
                    <span>Save Word</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
