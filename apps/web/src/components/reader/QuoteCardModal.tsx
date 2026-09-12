import { Check, Copy, Download, Share2, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import { IconButton } from "@/components/ui/IconButton";
import {
  type QuoteCardOptions,
  type QuoteCardRatio,
  type QuoteCardTheme,
  copyQuoteCardToClipboard,
  renderQuoteCardToCanvas,
  shareOrDownloadQuoteCard,
} from "@/utils/quoteCardCanvas";

export interface QuoteCardModalProps {
  bookAuthor?: string;
  bookTitle: string;
  chapterLabel?: string;
  isOpen: boolean;
  onClose: () => void;
  quote: string;
}

const THEME_OPTIONS: Array<{ label: string; preview: string; value: QuoteCardTheme }> = [
  { label: "Editorial", preview: "bg-[#F2ECE1] text-[#1C1917]", value: "editorial" },
  { label: "Obsidian", preview: "bg-[#18181B] text-[#F4F4F5]", value: "obsidian" },
  { label: "Parchment", preview: "bg-[#E8DCCE] text-[#2D2319]", value: "parchment" },
  { label: "Swiss", preview: "bg-[#FFFFFF] text-[#09090B] border border-black/10", value: "swiss" },
];

const RATIO_OPTIONS: Array<{ label: string; value: QuoteCardRatio }> = [
  { label: "4:5 Feed", value: "portrait" },
  { label: "1:1 Square", value: "square" },
  { label: "9:16 Story", value: "story" },
];

export function QuoteCardModal({
  bookAuthor,
  bookTitle,
  chapterLabel,
  isOpen,
  onClose,
  quote,
}: QuoteCardModalProps) {
  const [theme, setTheme] = useState<QuoteCardTheme>("editorial");
  const [aspectRatio, setAspectRatio] = useState<QuoteCardRatio>("portrait");
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Redraw canvas whenever parameters change or modal opens
  useEffect(() => {
    if (!isOpen || !canvasRef.current || !quote) return;

    const options: QuoteCardOptions = {
      aspectRatio,
      bookAuthor,
      bookTitle,
      chapterLabel,
      quote,
      theme,
    };

    renderQuoteCardToCanvas(options, canvasRef.current);
  }, [isOpen, quote, bookTitle, bookAuthor, chapterLabel, theme, aspectRatio]);

  if (!isOpen || !quote) return null;

  const currentOptions: QuoteCardOptions = {
    aspectRatio,
    bookAuthor,
    bookTitle,
    chapterLabel,
    quote,
    theme,
  };

  const handleCopy = async () => {
    setIsExporting(true);
    const success = await copyQuoteCardToClipboard(currentOptions);
    setIsExporting(false);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareOrDownload = async () => {
    setIsExporting(true);
    const safeTitle = (bookTitle || "sanctuary-quote").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    await shareOrDownloadQuoteCard(currentOptions, `${safeTitle}-quote.png`);
    setIsExporting(false);
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-fadeIn select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Quote Card Generator"
      tabIndex={-1}
    >
      <div className="w-full max-w-xl bg-light-surface dark:bg-dark-surface rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-base text-light-text dark:text-dark-text">
              Share Quote Card
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-light-accent/10 dark:bg-dark-accent/10 text-light-accent dark:text-dark-accent font-medium">
              High-DPI
            </span>
          </div>
          <IconButton
            icon={<X className="w-5 h-5" />}
            label="Close"
            onClick={onClose}
            size="sm"
            variant="ghost"
          />
        </div>

        {/* Canvas Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center bg-black/[0.03] dark:bg-black/20 min-h-[260px]">
          <canvas
            ref={canvasRef}
            className="max-h-[46vh] w-auto max-w-full rounded-xl shadow-xl border border-black/10 dark:border-white/10 transition-all object-contain"
            style={{
              aspectRatio:
                aspectRatio === "story"
                  ? "9/16"
                  : aspectRatio === "portrait"
                  ? "4/5"
                  : "1/1",
            }}
          />
        </div>

        {/* Customization Controls */}
        <div className="p-4 sm:p-5 border-t border-black/5 dark:border-white/5 space-y-4 bg-light-surface dark:bg-dark-surface">
          {/* Theme selection */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-light-text-muted dark:text-dark-text-muted">
              Aesthetic Style
            </span>
            <div className="flex items-center gap-1.5">
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    theme === opt.value
                      ? "ring-2 ring-light-accent dark:ring-dark-accent shadow-sm"
                      : "opacity-70 hover:opacity-100"
                  } ${opt.preview}`}
                >
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Aspect ratio toggle */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-light-text-muted dark:text-dark-text-muted">
              Aspect Ratio
            </span>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06]">
              {RATIO_OPTIONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setAspectRatio(r.value)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    aspectRatio === r.value
                      ? "bg-light-surface dark:bg-dark-surface shadow-sm text-light-text dark:text-dark-text"
                      : "text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-light-text dark:text-dark-text transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>Copied Image!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Image</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleShareOrDownload}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-xl bg-light-accent dark:bg-dark-accent text-white hover:opacity-90 shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {typeof navigator !== "undefined" && "canShare" in navigator ? (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Share / Download</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download PNG</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
