import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  MessageSquare,
  RotateCw,
  Sparkles,
  X,
} from "lucide-react";
import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { IconButton } from "@/components/ui/IconButton";
import { getAllAnnotations, getAllBooks } from "@/utils/db";
import {
  buildDailyDigestItems,
  type DigestItem,
  type DigestRating,
  formatDateKey,
  getDigestSummary,
  loadDigestReviews,
  recordDigestReview,
} from "@/utils/digestEngine";

const QuoteCardModal = lazy(() =>
  import("@/components/reader/QuoteCardModal").then((m) => ({
    default: m.QuoteCardModal,
  })),
);

export interface DailyDigestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBook?: (bookId: string, href?: string) => void;
}

export function DailyDigestModal({
  isOpen,
  onClose,
  onOpenBook,
}: DailyDigestModalProps) {
  const [items, setItems] = useState<DigestItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [quoteCardOpen, setQuoteCardOpen] = useState(false);

  const todayStr = useMemo(() => formatDateKey(new Date()), []);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const [books, annotations] = await Promise.all([
          getAllBooks(),
          getAllAnnotations(),
        ]);
        const reviews = loadDigestReviews();
        const digestItems = buildDailyDigestItems(
          annotations,
          books,
          reviews,
          todayStr,
          5,
        );

        if (!isMounted) return;
        setItems(digestItems);

        // Advance to first unreviewed card
        const firstUnreviewed = digestItems.findIndex((it) => !it.isReviewedToday);
        setCurrentIndex(firstUnreviewed >= 0 ? firstUnreviewed : 0);
        setIsFlipped(false);
      } catch (err) {
        console.error("Failed to load daily digest items:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [isOpen, todayStr]);

  const summary = useMemo(
    () => getDigestSummary(items, todayStr),
    [items, todayStr],
  );

  const currentItem = items[currentIndex];

  const handleRate = useCallback(
    (rating: DigestRating) => {
      if (!currentItem) return;
      recordDigestReview(currentItem.annotation.id, rating);

      // Update local state
      setItems((prev) =>
        prev.map((item, idx) =>
          idx === currentIndex ? { ...item, isReviewedToday: true } : item,
        ),
      );

      // Advance to next card if available
      if (currentIndex + 1 < items.length) {
        setCurrentIndex((idx) => idx + 1);
        setIsFlipped(false);
      } else {
        setIsFlipped(false);
      }
    },
    [currentItem, currentIndex, items.length],
  );

  const handleCopy = async () => {
    if (!currentItem) return;
    const textToCopy = `"${currentItem.annotation.text}"\n— ${currentItem.bookAuthor}, ${currentItem.bookTitle}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard write failure
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || quoteCardOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === " " && items.length > 0) {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key === "ArrowRight" && currentIndex < items.length - 1) {
        e.preventDefault();
        setCurrentIndex((idx) => idx + 1);
        setIsFlipped(false);
      } else if (e.key === "ArrowLeft" && currentIndex > 0) {
        e.preventDefault();
        setCurrentIndex((idx) => idx - 1);
        setIsFlipped(false);
      } else if (isFlipped) {
        if (e.key === "1") handleRate("hard");
        if (e.key === "2") handleRate("good");
        if (e.key === "3") handleRate("easy");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, quoteCardOpen, items.length, currentIndex, isFlipped, onClose, handleRate]);

  if (!isOpen) return null;

  return (
    <div
      aria-label="Daily Highlight Digest"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      role="dialog"
      tabIndex={-1}
    >
      <div
        className="relative flex flex-col w-full max-w-xl max-h-[90vh] bg-surface-primary dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-surface-secondary/40 dark:bg-zinc-800/40">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Daily Highlight Digest
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Spaced retrieval reflection for {todayStr}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {summary.totalCount > 0 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                {summary.reviewedCount} of {summary.totalCount} reviewed
              </span>
            )}
            <IconButton
              icon={<X className="w-4 h-4" />}
              label="Close daily digest"
              onClick={onClose}
              size="sm"
              variant="ghost"
            />
          </div>
        </div>

        {/* Progress Bar */}
        {summary.totalCount > 0 && (
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1">
            <div
              className="bg-amber-500 h-1 transition-all duration-300"
              style={{ width: `${summary.completionPercentage}%` }}
            />
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <RotateCw className="w-6 h-6 animate-spin text-zinc-400" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Curating today&apos;s retrieval deck...
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center max-w-sm mx-auto space-y-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 text-amber-500">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                  No Highlights in Sanctuary Yet
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  As you read books, select meaningful passages to highlight or take marginalia notes.
                  Sanctuary will automatically schedule 5 quotes every day for cognitive spaced retrieval.
                </p>
              </div>
            </div>
          ) : summary.reviewedCount === summary.totalCount && !currentItem ? (
            <div className="flex flex-col items-center justify-center py-12 text-center max-w-sm mx-auto space-y-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                  Daily Retrieval Complete!
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  You reviewed all {summary.totalCount} highlights scheduled for today.
                  Spaced intervals help encode knowledge into long-term recall.
                </p>
              </div>
              <button
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors"
                onClick={() => {
                  setCurrentIndex(0);
                  setIsFlipped(false);
                }}
                type="button"
              >
                Review Deck Again
              </button>
            </div>
          ) : (
            <div className="flex flex-col space-y-4">
              {/* Card Container */}
              <div className="relative min-h-[260px] p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 shadow-sm flex flex-col justify-between">
                {!isFlipped ? (
                  /* Card Front: Quote & Book Metadata */
                  <button
                    aria-label="Reveal reflection notes and ratings"
                    className="flex flex-col flex-1 justify-between space-y-4 text-left w-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-lg"
                    onClick={() => setIsFlipped(true)}
                    type="button"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{
                            backgroundColor: currentItem.annotation.color || "#facc15",
                          }}
                        />
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 tracking-wide uppercase">
                          {currentItem.bookTitle}
                        </span>
                      </div>
                      {currentItem.annotation.chapterLabel && (
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate max-w-[140px]">
                          {currentItem.annotation.chapterLabel}
                        </span>
                      )}
                    </div>

                    <blockquote className="text-sm md:text-base font-serif italic text-zinc-800 dark:text-zinc-200 leading-relaxed pl-3 border-l-2 border-amber-500/40 my-auto">
                      &ldquo;{currentItem.annotation.text}&rdquo;
                    </blockquote>

                    <div className="flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500 pt-2 w-full">
                      <span>— {currentItem.bookAuthor}</span>
                      <span className="flex items-center space-x-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                        <RotateCw className="w-3 h-3" />
                        <span>Tap or Space to reveal</span>
                      </span>
                    </div>
                  </button>
                ) : (
                  /* Card Back: Reflection & Rating */
                  <div className="flex flex-col flex-1 justify-between space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                      <button
                        className="flex items-center space-x-1 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
                        onClick={() => setIsFlipped(false)}
                        type="button"
                      >
                        <RotateCw className="w-3 h-3" />
                        <span>Flip back to quote</span>
                      </button>
                      {currentItem.reviewRecord && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                          Box {currentItem.reviewRecord.box} (Reviewed {currentItem.reviewRecord.reviewCount}x)
                        </span>
                      )}
                    </div>

                    {/* Marginalia Note */}
                    <div className="flex-1 my-auto">
                      {currentItem.annotation.note ? (
                        <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 text-amber-900 dark:text-amber-200">
                          <div className="flex items-center space-x-1.5 text-xs font-semibold mb-1">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Your Marginalia Note:</span>
                          </div>
                          <p className="text-xs leading-relaxed">
                            {currentItem.annotation.note}
                          </p>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs text-center italic">
                          No note attached. How well do you recall the context and core insight of this passage?
                        </div>
                      )}
                    </div>

                    {/* Spaced Repetition Buttons */}
                    <div>
                      <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-2 text-center">
                        Rate retrieval ease:
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          className="flex flex-col items-center justify-center p-2 rounded-lg border border-red-200/50 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 transition-colors"
                          onClick={() => handleRate("hard")}
                          type="button"
                        >
                          <span className="text-xs font-semibold">1. Hard</span>
                          <span className="text-[10px] opacity-75">Tomorrow</span>
                        </button>
                        <button
                          className="flex flex-col items-center justify-center p-2 rounded-lg border border-blue-200/50 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 transition-colors"
                          onClick={() => handleRate("good")}
                          type="button"
                        >
                          <span className="text-xs font-semibold">2. Good</span>
                          <span className="text-[10px] opacity-75">3-7 days</span>
                        </button>
                        <button
                          className="flex flex-col items-center justify-center p-2 rounded-lg border border-emerald-200/50 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 transition-colors"
                          onClick={() => handleRate("easy")}
                          type="button"
                        >
                          <span className="text-xs font-semibold">3. Easy</span>
                          <span className="text-[10px] opacity-75">10-30 days</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Deck Navigation & Action Bar */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center space-x-1">
                  <IconButton
                    disabled={currentIndex === 0}
                    icon={<ArrowLeft className="w-4 h-4" />}
                    label="Previous quote"
                    onClick={() => {
                      if (currentIndex > 0) {
                        setCurrentIndex((i) => i - 1);
                        setIsFlipped(false);
                      }
                    }}
                    size="sm"
                    variant="ghost"
                  />
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 px-1">
                    {currentIndex + 1} / {items.length}
                  </span>
                  <IconButton
                    disabled={currentIndex >= items.length - 1}
                    icon={<ArrowRight className="w-4 h-4" />}
                    label="Next quote"
                    onClick={() => {
                      if (currentIndex < items.length - 1) {
                        setCurrentIndex((i) => i + 1);
                        setIsFlipped(false);
                      }
                    }}
                    size="sm"
                    variant="ghost"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors"
                    onClick={() => setQuoteCardOpen(true)}
                    title="Generate high-DPI quote card"
                    type="button"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span className="hidden sm:inline">Quote Card</span>
                  </button>

                  <button
                    className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors"
                    onClick={handleCopy}
                    title="Copy excerpt with attribution"
                    type="button"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400 hidden sm:inline">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="hidden sm:inline">Copy</span>
                      </>
                    )}
                  </button>

                  {onOpenBook && (
                    <button
                      className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-medium text-white dark:text-zinc-900 transition-colors"
                      onClick={() => {
                        onClose();
                        onOpenBook(currentItem.bookId, currentItem.annotation.href);
                      }}
                      title="Open source book in reader"
                      type="button"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Read</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sub-modal: High-DPI Quote Card Generator */}
      {quoteCardOpen && currentItem && (
        <Suspense fallback={null}>
          <QuoteCardModal
            bookAuthor={currentItem.bookAuthor}
            bookTitle={currentItem.bookTitle}
            chapterLabel={currentItem.annotation.chapterLabel}
            isOpen={quoteCardOpen}
            onClose={() => setQuoteCardOpen(false)}
            quote={currentItem.annotation.text}
          />
        </Suspense>
      )}
    </div>
  );
}
