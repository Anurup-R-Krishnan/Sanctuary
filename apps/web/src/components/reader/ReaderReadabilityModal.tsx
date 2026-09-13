import {
  BarChart2,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Sparkles,
  X,
} from "lucide-react";
import React, { useEffect, useMemo } from "react";

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
  const metrics = useMemo(
    () => analyzeReadability(rawText, readingSpeedWpm),
    [rawText, readingSpeedWpm]
  );

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

  if (!isOpen) return null;

  const band = colorBandClasses[metrics.interpretation.colorBand];

  return (
    <div
      aria-label="Readability & Cognitive Complexity"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      role="dialog"
      tabIndex={-1}
    >
      {/* Modal Container */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface-elevated rounded-2xl shadow-2xl border border-border flex flex-col z-10 custom-scrollbar">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-surface-elevated/95 backdrop-blur-md border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h2
                className="text-base font-semibold text-text leading-tight"
                id="readability-modal-title"
              >
                Readability & Cognitive Complexity
              </h2>
              <p className="text-xs text-text-muted truncate max-w-sm">
                {chapterLabel}
              </p>
            </div>
          </div>
          <button
            aria-label="Close dialog"
            className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
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
            className={`p-5 rounded-2xl border ${band.border} bg-surface/50 space-y-4`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-text-muted">
                  Flesch Reading Ease
                </span>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className={`text-4xl font-extrabold tracking-tight ${band.text}`}>
                    {metrics.fleschReadingEase}
                  </span>
                  <span className="text-sm font-medium text-text-muted">
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
                <span className="text-xs text-text-muted uppercase tracking-wider font-medium">
                  Grade Equivalent
                </span>
                <p className="text-base font-semibold text-text mt-0.5">
                  {metrics.interpretation.gradeLevelEquivalent}
                </p>
              </div>
            </div>

            {/* Ease Progress Bar */}
            <div className="w-full h-2 rounded-full bg-surface-hover overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${band.progress}`}
                style={{ width: `${metrics.fleschReadingEase}%` }}
              />
            </div>

            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              {metrics.interpretation.description}
            </p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-surface border border-border/80 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-text-muted text-xs">
                <GraduationCap className="w-3.5 h-3.5 text-primary" />
                <span>Grade Level</span>
              </div>
              <div className="mt-2">
                <p className="text-xl font-bold text-text">
                  {metrics.fleschKincaidGradeLevel}
                </p>
                <p className="text-[11px] text-text-muted">Flesch-Kincaid</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-surface border border-border/80 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-text-muted text-xs">
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                <span>Gunning Fog</span>
              </div>
              <div className="mt-2">
                <p className="text-xl font-bold text-text">
                  {metrics.gunningFogIndex}
                </p>
                <p className="text-[11px] text-text-muted">Years schooling</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-surface border border-border/80 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-text-muted text-xs">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>Lexical Diversity</span>
              </div>
              <div className="mt-2">
                <p className="text-xl font-bold text-text">
                  {metrics.typeTokenRatio}%
                </p>
                <p className="text-[11px] text-text-muted">Type-Token Ratio</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-surface border border-border/80 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-text-muted text-xs">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>Est. Duration</span>
              </div>
              <div className="mt-2">
                <p className="text-xl font-bold text-text">
                  {metrics.estimatedReadingMinutes} min
                </p>
                <p className="text-[11px] text-text-muted">
                  At {readingSpeedWpm} WPM
                </p>
              </div>
            </div>
          </div>

          {/* Passage Volume Breakdown */}
          <div className="p-4 rounded-xl bg-surface border border-border/80 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Passage Statistics
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 text-xs">
              <div>
                <span className="text-text-muted">Total Words:</span>
                <span className="ml-1.5 font-semibold text-text">
                  {metrics.totalWords.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-text-muted">Sentences:</span>
                <span className="ml-1.5 font-semibold text-text">
                  {metrics.sentenceCount.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-text-muted">Total Syllables:</span>
                <span className="ml-1.5 font-semibold text-text">
                  {metrics.syllableCount.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-text-muted">Avg Sentence Length:</span>
                <span className="ml-1.5 font-semibold text-text">
                  {metrics.averageSentenceLength} words
                </span>
              </div>
              <div>
                <span className="text-text-muted">Complex Words (3+ syl):</span>
                <span className="ml-1.5 font-semibold text-text">
                  {metrics.complexWordCount} ({metrics.complexWordPercentage}%)
                </span>
              </div>
              <div>
                <span className="text-text-muted">Hapax Legomena (1×):</span>
                <span className="ml-1.5 font-semibold text-text">
                  {metrics.hapaxCount} ({metrics.hapaxPercentage}%)
                </span>
              </div>
            </div>
          </div>

          {/* Polysyllabic Vocabulary Preview */}
          {metrics.polysyllabicWords.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Complex Vocabulary Preview
                </h3>
                <span className="text-[11px] text-text-muted">
                  Ranked by syllables & frequency
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 custom-scrollbar">
                {metrics.polysyllabicWords.slice(0, 24).map((item) => (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border text-xs text-text-secondary hover:border-primary/40 transition-colors"
                    key={item.word}
                  >
                    <span className="font-medium text-text">{item.word}</span>
                    <span className="text-[10px] px-1 py-0.2 rounded bg-surface-hover text-text-muted">
                      {item.syllables} syl
                    </span>
                    {item.frequency > 1 && (
                      <span className="text-[10px] px-1 py-0.2 rounded bg-primary/10 text-primary font-medium">
                        {item.frequency}×
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-20 flex items-center justify-between px-6 py-3.5 bg-surface-elevated/95 backdrop-blur-md border-t border-border">
          <p className="text-[11px] text-text-muted hidden sm:block">
            Formulas: Flesch Reading Ease, Flesch-Kincaid & Gunning Fog index.
          </p>
          <button
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 transition-colors"
            onClick={onClose}
            type="button"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Close</span>
          </button>
        </div>
      </div>
    </div>
  );
};
