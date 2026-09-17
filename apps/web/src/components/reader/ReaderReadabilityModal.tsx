import {
  BarChart2,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Hash,
  X,
} from "lucide-react";
import React, { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

import type { ReadabilityInterpretation } from "@/utils/readabilityEngine";

import { analyzeReadability } from "@/utils/readabilityEngine";

export interface ReaderReadabilityModalProps {
  chapterLabel?: string;
  isOpen: boolean;
  onClose: () => void;
  rawText: string;
  readingSpeedWpm?: number;
}

const colorBandClasses: Record<
  ReadabilityInterpretation["colorBand"],
  {
    badge: string;
    border: string;
    progress: string;
    text: string;
  }
> = {
  amber: {
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    border: "border-amber-500/30",
    progress: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
  },
  emerald: {
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    border: "border-emerald-500/30",
    progress: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  indigo: {
    badge: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
    border: "border-indigo-500/30",
    progress: "bg-indigo-500",
    text: "text-indigo-600 dark:text-indigo-400",
  },
  rose: {
    badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
    border: "border-rose-500/30",
    progress: "bg-rose-500",
    text: "text-rose-600 dark:text-rose-400",
  },
  sky: {
    badge: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
    border: "border-sky-500/30",
    progress: "bg-sky-500",
    text: "text-sky-600 dark:text-sky-400",
  },
};

export const ReaderReadabilityModal: React.FC<ReaderReadabilityModalProps> = ({
  chapterLabel = "Active Chapter",
  isOpen,
  onClose,
  rawText,
  readingSpeedWpm = 250,
}) => {
  const metrics = useMemo(() => {
    if (!isOpen) return null;
    return analyzeReadability(rawText || "", readingSpeedWpm);
  }, [isOpen, rawText, readingSpeedWpm]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !metrics) return null;
  if (typeof document === "undefined") return null;

  const band = colorBandClasses[metrics.interpretation.colorBand] || colorBandClasses.sky;

  return createPortal(
    <div
      aria-labelledby="readability-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn pointer-events-auto"
      role="dialog"
    >
      {/* Backdrop dismiss */}
      <button
        aria-label="Close readability modal"
        className="fixed inset-0 bg-transparent cursor-default border-none"
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-light-primary dark:bg-dark-primary rounded-3xl shadow-2xl border border-light-border dark:border-dark-border flex flex-col z-10 custom-scrollbar text-light-text dark:text-dark-text animate-scaleUp">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-light-primary/95 dark:bg-dark-primary/95 backdrop-blur-md border-b border-light-border dark:border-dark-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-light-accent/15 dark:bg-dark-accent/15 text-light-accent dark:text-dark-accent border border-light-accent/20 dark:border-dark-accent/20">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h2
                className="text-base font-semibold text-light-text dark:text-dark-text leading-tight"
                id="readability-modal-title"
              >
                Readability Metrics
              </h2>
              <p className="text-xs text-light-text-muted dark:text-dark-text-muted truncate max-w-sm">
                {chapterLabel}
              </p>
            </div>
          </div>
          <button
            aria-label="Close dialog"
            className="p-2 rounded-full text-light-text-muted hover:text-light-text dark:text-dark-text-muted dark:hover:text-dark-text hover:bg-light-border/40 dark:hover:bg-dark-border/40 transition-colors"
            onClick={onClose}
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Hero Score Card */}
          <div
            className={`p-5 rounded-2xl border ${band.border} bg-light-surface/60 dark:bg-dark-surface/60 space-y-4`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-light-text-muted dark:text-dark-text-muted">
                  Flesch Reading Ease
                </span>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className={`text-4xl font-extrabold tracking-tight ${band.text}`}>
                    {metrics.fleschReadingEase}
                  </span>
                  <span className="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">
                    / 100
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${band.badge}`}
                  >
                    {metrics.interpretation.label}
                  </span>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider font-medium">
                  Grade Equivalent
                </span>
                <p className="text-base font-semibold text-light-text dark:text-dark-text mt-0.5">
                  {metrics.interpretation.gradeLevelEquivalent}
                </p>
              </div>
            </div>

            {/* Ease Progress Bar */}
            <div className="w-full h-2 rounded-full bg-light-border/60 dark:bg-dark-border/60 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${band.progress}`}
                style={{ width: `${metrics.fleschReadingEase}%` }}
              />
            </div>

            <p className="text-xs sm:text-sm text-light-text-muted dark:text-dark-text-muted leading-relaxed">
              {metrics.interpretation.description}
            </p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-light-text-muted dark:text-dark-text-muted text-xs">
                <GraduationCap className="w-3.5 h-3.5 text-light-accent dark:text-dark-accent" />
                <span>Grade Level</span>
              </div>
              <div className="mt-2">
                <p className="text-xl font-bold text-light-text dark:text-dark-text">
                  {metrics.fleschKincaidGradeLevel}
                </p>
                <p className="text-[11px] text-light-text-muted dark:text-dark-text-muted">Flesch-Kincaid</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-light-text-muted dark:text-dark-text-muted text-xs">
                <BookOpen className="w-3.5 h-3.5 text-light-accent dark:text-dark-accent" />
                <span>Gunning Fog</span>
              </div>
              <div className="mt-2">
                <p className="text-xl font-bold text-light-text dark:text-dark-text">
                  {metrics.gunningFogIndex}
                </p>
                <p className="text-[11px] text-light-text-muted dark:text-dark-text-muted">Years schooling</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-light-text-muted dark:text-dark-text-muted text-xs">
                <Hash className="w-3.5 h-3.5 text-light-accent dark:text-dark-accent" />
                <span>Vocabulary Variety</span>
              </div>
              <div className="mt-2">
                <p className="text-xl font-bold text-light-text dark:text-dark-text">
                  {metrics.typeTokenRatio}%
                </p>
                <p className="text-[11px] text-light-text-muted dark:text-dark-text-muted">Unique word ratio</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-light-text-muted dark:text-dark-text-muted text-xs">
                <Clock className="w-3.5 h-3.5 text-light-accent dark:text-dark-accent" />
                <span>Est. Duration</span>
              </div>
              <div className="mt-2">
                <p className="text-xl font-bold text-light-text dark:text-dark-text">
                  {metrics.estimatedReadingMinutes} min
                </p>
                <p className="text-[11px] text-light-text-muted dark:text-dark-text-muted">
                  At {readingSpeedWpm} WPM
                </p>
              </div>
            </div>
          </div>

          {/* Passage Volume Breakdown */}
          <div className="p-4 rounded-xl bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-light-text-muted dark:text-dark-text-muted">
              Passage Statistics
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 text-xs">
              <div>
                <span className="text-light-text-muted dark:text-dark-text-muted">Total Words:</span>
                <span className="ml-1.5 font-semibold text-light-text dark:text-dark-text">
                  {metrics.totalWords.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-light-text-muted dark:text-dark-text-muted">Sentences:</span>
                <span className="ml-1.5 font-semibold text-light-text dark:text-dark-text">
                  {metrics.sentenceCount.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-light-text-muted dark:text-dark-text-muted">Total Syllables:</span>
                <span className="ml-1.5 font-semibold text-light-text dark:text-dark-text">
                  {metrics.syllableCount.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-light-text-muted dark:text-dark-text-muted">Avg Sentence Length:</span>
                <span className="ml-1.5 font-semibold text-light-text dark:text-dark-text">
                  {metrics.averageSentenceLength} words
                </span>
              </div>
              <div>
                <span className="text-light-text-muted dark:text-dark-text-muted">Complex Words (3+ syl):</span>
                <span className="ml-1.5 font-semibold text-light-text dark:text-dark-text">
                  {metrics.complexWordCount} ({metrics.complexWordPercentage}%)
                </span>
              </div>
              <div>
                <span className="text-light-text-muted dark:text-dark-text-muted">Words used once:</span>
                <span className="ml-1.5 font-semibold text-light-text dark:text-dark-text">
                  {metrics.hapaxCount} ({metrics.hapaxPercentage}%)
                </span>
              </div>
            </div>
          </div>

          {/* Polysyllabic Vocabulary Preview */}
          {metrics.polysyllabicWords.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-light-text-muted dark:text-dark-text-muted">
                  Complex Words Preview
                </h3>
                <span className="text-[11px] text-light-text-muted dark:text-dark-text-muted">
                  Ranked by syllables and frequency
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 custom-scrollbar">
                {metrics.polysyllabicWords.slice(0, 24).map((item) => (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border text-xs text-light-text dark:text-dark-text hover:border-light-accent/40 dark:hover:border-dark-accent/40 transition-colors"
                    key={item.word}
                  >
                    <span className="font-medium text-light-text dark:text-dark-text">{item.word}</span>
                    <span className="text-[10px] px-1 py-0.2 rounded bg-light-border/50 dark:bg-dark-border/50 text-light-text-muted dark:text-dark-text-muted">
                      {item.syllables} syl
                    </span>
                    {item.frequency > 1 && (
                      <span className="text-[10px] px-1 py-0.2 rounded bg-light-accent/15 dark:bg-dark-accent/15 text-light-accent dark:text-dark-accent font-medium">
                        {item.frequency}×
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Challenging Sentences (retext-readability) */}
          {metrics.difficultSentences && metrics.difficultSentences.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-light-text-muted dark:text-dark-text-muted">
                  Challenging Sentences ({metrics.difficultSentences.length})
                </h3>
                <span className="text-[11px] text-light-text-muted dark:text-dark-text-muted">
                  retext-readability consensus
                </span>
              </div>

              <div className="space-y-2 max-h-36 overflow-y-auto p-1 custom-scrollbar">
                {metrics.difficultSentences.slice(0, 5).map((item, idx) => (
                  <div
                    className="p-3 rounded-xl bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border text-xs space-y-1"
                    key={idx}
                  >
                    <p className="text-light-text dark:text-dark-text italic leading-relaxed">
                      &ldquo;{item.actual}&rdquo;
                    </p>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                      {item.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-20 flex items-center justify-between px-6 py-3.5 bg-light-primary/95 dark:bg-dark-primary/95 backdrop-blur-md border-t border-light-border/60 dark:border-dark-border/60">
          <p className="text-[11px] text-light-text-muted dark:text-dark-text-muted hidden sm:block">
            Formulas: Flesch Reading Ease, Flesch-Kincaid, Gunning Fog & retext-readability.
          </p>
          <button
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-light-accent dark:bg-dark-accent text-white dark:text-black font-semibold text-xs hover:opacity-90 transition-opacity"
            onClick={onClose}
            type="button"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Close</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
