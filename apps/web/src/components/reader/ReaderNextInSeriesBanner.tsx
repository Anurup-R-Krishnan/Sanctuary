import { BookOpen, ChevronRight, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import type { Book } from '@/types';

import { CoverImage } from '@/components/ui/CoverImage';
import { findNextBookInSeries } from '@/utils/seriesEngine';

export interface ReaderNextInSeriesBannerProps {
  books: Book[];
  currentBook: Book;
  onOpenBook: (book: Book) => void;
}

export function ReaderNextInSeriesBanner({
  books,
  currentBook,
  onOpenBook,
}: ReaderNextInSeriesBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  const nextBookItem = useMemo(() => {
    return findNextBookInSeries(currentBook.id, books);
  }, [currentBook.id, books]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setDismissed(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  if (!nextBookItem || dismissed) {
    return null;
  }

  const handleOpenNext = () => {
    const fullBook = books.find((b) => b.id === nextBookItem.id);
    if (fullBook) {
      onOpenBook(fullBook);
    }
  };

  const banner = (
    <div
      role="region"
      aria-label="Next book in series banner"
      data-next-in-series-banner="true"
      className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[calc(100%-2rem)] animate-fadeInUp"
    >
      <div className="p-4 rounded-xl backdrop-blur-xl bg-page/95 border border-line shadow-2xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 overflow-hidden">
          <CoverImage
            className="w-8 h-11 object-cover rounded shadow-sm shrink-0 border border-line"
            fallback={
              <div className="w-9 h-9 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
            }
            url={nextBookItem.coverUrl}
          />
          <div className="overflow-hidden">
            <div className="flex items-center gap-1.5">
              <span className="text-2xs font-bold uppercase tracking-wider text-accent">
                Next in Series
              </span>
              {nextBookItem.seriesIndex > 0 && (
                <span className="text-2xs font-semibold text-fg-muted">
                  · Vol. #{nextBookItem.seriesIndex}
                </span>
              )}
            </div>
            <h4 className="text-xs font-bold text-fg truncate">
              {nextBookItem.title}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleOpenNext}
            type="button"
            className="px-3 py-1.5 rounded-xl bg-accent hover:bg-accent/90 text-white dark:text-black text-xs font-bold transition-all flex items-center gap-1 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label={`Read next book: ${nextBookItem.title}`}
          >
            <span>Read</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDismissed(true)}
            type="button"
            className="p-1.5 rounded-lg hover:bg-line/40 text-fg-muted hover:text-fg transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label="Dismiss next book banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return banner;
  }
  return createPortal(banner, document.body);
}
