import { AlertTriangle, BookOpen, CheckCircle2, ChevronRight, Layers, Search, Sparkles, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import type { Book } from '@/types';
import type { SeriesGroup } from '@/utils/seriesEngine';

import { groupBooksBySeries } from '@/utils/seriesEngine';

export interface SeriesShelfModalProps {
  books: Book[];
  isOpen: boolean;
  onClose: () => void;
  onSelectBook: (book: Book) => void;
}

export function SeriesShelfModal({ books, isOpen, onClose, onSelectBook }: SeriesShelfModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const seriesGroups = useMemo(() => {
    return groupBooksBySeries(books, { minVolumes: 1 });
  }, [books]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return seriesGroups;
    const query = searchQuery.toLowerCase().trim();
    return seriesGroups.filter(
      (g) => g.seriesTitle.toLowerCase().includes(query) || g.author.toLowerCase().includes(query)
    );
  }, [seriesGroups, searchQuery]);

  if (!isOpen) return null;

  const handleBookClick = (bookId: string) => {
    const fullBook = books.find((b) => b.id === bookId);
    if (fullBook) {
      onSelectBook(fullBook);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-light-primary dark:bg-dark-primary rounded-3xl shadow-2xl border border-black/10 dark:border-white/10 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-light-text dark:text-dark-text">
                Book Series & Sagas
              </h2>
              <p className="text-xs text-light-text-muted dark:text-dark-text-muted">
                {seriesGroups.length} {seriesGroups.length === 1 ? 'series' : 'series collections'} in your library
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-light-text-muted hover:text-light-text dark:text-dark-text-muted dark:hover:text-dark-text transition-colors"
            aria-label="Close series modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-black/[0.04] dark:border-white/[0.04] bg-black/[0.01] dark:bg-white/[0.01]">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-light-text-muted dark:text-dark-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search series title or author..."
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-light-text dark:text-dark-text placeholder:text-light-text-muted/60 focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
            />
          </div>
        </div>

        {/* Series List Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {filteredGroups.length === 0 ? (
            <div className="py-12 text-center text-light-text-muted dark:text-dark-text-muted">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold">No series match your search</p>
              <p className="text-xs mt-1">Try searching for a different saga or author name.</p>
            </div>
          ) : (
            filteredGroups.map((series: SeriesGroup) => (
              <div
                key={series.id}
                className="p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] flex flex-col gap-4 transition-all"
              >
                {/* Series Header Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-light-text dark:text-dark-text">
                        {series.seriesTitle}
                      </h3>
                      {series.isComplete ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Complete
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          {series.completedCount} / {series.totalVolumes} Read
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-0.5">
                      {series.author} · {series.totalVolumes} {series.totalVolumes === 1 ? 'Volume' : 'Volumes'}
                      {series.totalPagesRemaining > 0 && ` · ${series.totalPagesRemaining} pages remaining`}
                    </p>
                  </div>

                  {series.nextBookToRead && (
                    <button
                      onClick={() => handleBookClick(series.nextBookToRead!.id)}
                      type="button"
                      className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-light-accent hover:bg-light-accent/90 dark:bg-dark-accent dark:hover:bg-dark-accent/90 text-white text-xs font-bold transition-all shadow-sm shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Continue Vol. {series.nextBookToRead.seriesIndex}</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Progress bar across series */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-medium text-light-text-muted dark:text-dark-text-muted">
                    <span>Series Progression</span>
                    <span className="font-bold tabular-nums text-light-text dark:text-dark-text">
                      {series.percentComplete}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-black/[0.05] dark:bg-white/[0.05] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-light-accent dark:bg-dark-accent rounded-full transition-all duration-300"
                      style={{ width: `${series.percentComplete}%` }}
                    />
                  </div>
                </div>

                {/* Missing volumes warning */}
                {series.missingIndices.length > 0 && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>
                      Missing from library:{' '}
                      {series.missingIndices.map((idx) => `Volume #${idx}`).join(', ')}
                    </span>
                  </div>
                )}

                {/* Volumes Shelf Row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
                  {series.books.map((bookItem) => (
                    <button
                      key={bookItem.id}
                      onClick={() => handleBookClick(bookItem.id)}
                      type="button"
                      className="group p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.04] text-left transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-black/[0.06] dark:bg-white/[0.08] text-light-text dark:text-dark-text">
                            #{bookItem.seriesIndex}
                          </span>
                          {bookItem.status === 'finished' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <span className="text-[10px] tabular-nums font-semibold text-light-text-muted dark:text-dark-text-muted">
                              {bookItem.progress}%
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-semibold text-light-text dark:text-dark-text line-clamp-2 leading-tight group-hover:text-light-accent dark:group-hover:text-dark-accent transition-colors">
                          {bookItem.title}
                        </h4>
                      </div>

                      <div className="mt-2.5 h-1 w-full bg-black/[0.05] dark:bg-white/[0.05] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            bookItem.status === 'finished' ? 'bg-emerald-500' : 'bg-light-accent dark:bg-dark-accent'
                          }`}
                          style={{ width: `${bookItem.progress}%` }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
