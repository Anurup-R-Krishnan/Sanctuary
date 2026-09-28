import { BookOpen, ChevronRight, FileText, Search, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { Book, BookSearchResult } from "@/types";

import { CoverImage } from "@/components/ui/CoverImage";
import { GenerativeBookCover } from "@/components/ui/GenerativeBookCover";
import { searchLibrary } from "@/services/librarySearchIndex";

interface GlobalSearchModalProps {
  books: Book[];
  isOpen: boolean;
  onClose: () => void;
  onSelectBook: (book: Book, cfi?: string) => void;
}

function HighlightedSnippet({ query, text }: { query: string; text: string }) {
  if (!query.trim()) return <span>{text}</span>;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));

  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            className="bg-gold-500/25 dark:bg-dark-accent/30 text-gold-900 dark:text-gold-200 font-medium px-0.5 rounded"
            key={i}
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

export function GlobalSearchModal({
  books,
  isOpen,
  onClose,
  onSelectBook,
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    const clean = query.trim();
    if (clean.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(() => {
      searchLibrary(clean, books)
        .then((res) => {
          setResults(res);
        })
        .finally(() => {
          setIsSearching(false);
        });
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [query, books]);

  if (!isOpen) return null;

  const totalMatches = results.reduce((sum, r) => sum + r.totalMatches, 0);

  return createPortal(
    <div
      aria-modal="true"
      aria-label="Global full-text search"
      className="fixed inset-0 z-[80] flex items-start justify-center p-4 sm:p-6 md:p-20 bg-black/60 backdrop-blur-sm animate-fadeIn overflow-y-auto"
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
        className="w-full max-w-2xl bg-page rounded-2xl shadow-2xl border border-line overflow-hidden flex flex-col my-auto"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-line gap-3">
          <Search className="w-5 h-5 text-fg-muted shrink-0" />
          <input
            aria-label="Search all books"
            className="flex-1 bg-transparent text-sm sm:text-base text-fg placeholder:text-fg-muted outline-none"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across entire library..."
            ref={inputRef}
            type="text"
            value={query}
          />
          {query && (
            <button
              aria-label="Clear search input"
              className="p-1 text-fg-muted hover:text-fg rounded-md transition-colors"
              onClick={() => setQuery("")}
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            aria-label="Close search"
            className="p-1.5 text-fg-muted hover:text-fg rounded-lg hover:bg-line/40 transition-colors text-xs font-medium"
            onClick={onClose}
           type="button"

           >            ESC
          </button>
        </div>

        {/* Results Area */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {isSearching && (
            <div className="py-8 text-center text-xs text-fg-muted">
              Searching entire library...
            </div>
          )}

          {!isSearching && query.trim().length >= 2 && results.length === 0 && (
            <div className="py-12 text-center space-y-2">
              <FileText className="w-8 h-8 mx-auto text-fg-muted/50" />
              <p className="text-sm font-medium text-fg">
                No matches found
              </p>
              <p className="text-xs text-fg-muted">
                Try searching for a different word or phrase across your books.
              </p>
            </div>
          )}

          {!isSearching && query.trim().length < 2 && (
            <div className="py-10 text-center space-y-2">
              <BookOpen className="w-8 h-8 mx-auto text-accent/50" />
              <p className="text-sm font-medium text-fg">
                Full-Text Library Search
              </p>
              <p className="text-xs text-fg-muted max-w-sm mx-auto">
                Search passages, quotes, or themes across all your books. Press <kbd className="px-1.5 py-0.5 rounded bg-line/60 border border-line text-2xs font-mono">Cmd+K</kbd> anytime to open.
              </p>
            </div>
          )}

          {!isSearching && results.length > 0 && (
            <>
              <div className="text-xs font-semibold text-fg-muted uppercase tracking-wider px-1">
                Found {totalMatches} {totalMatches === 1 ? "match" : "matches"} across {results.length} {results.length === 1 ? "book" : "books"}
              </div>

              <div className="space-y-3">
                {results.map((item) => {
                  const book = books.find((b) => b.id === item.bookId);
                  if (!book) return null;

                  return (
                    <div
                      className="p-3.5 rounded-xl border border-line bg-surface/40 space-y-2.5"
                      key={item.bookId}
                    >
                        <div className="flex items-center justify-between">
                          <button
                            className="flex items-center gap-2.5 text-left group"
                            onClick={() => {
                              onSelectBook(book);
                              onClose();
                            }}
                          >
                            <CoverImage
                              className="w-7 h-10 object-cover rounded shadow-sm shrink-0"
                              fallback={
                                <div className="w-7 h-10 rounded overflow-hidden shadow-sm shrink-0">
                                <GenerativeBookCover author={item.author} title={item.title} variant="compact" />
                              </div>
                              }
                              url={item.coverUrl}
                            />
                            <div>
                              <h4 className="text-sm font-semibold text-fg group-hover:text-accent transition-colors line-clamp-1">
                                {item.title}
                              </h4>
                              {item.author && (
                                <p className="text-xs text-fg-muted">
                                  {item.author}
                                </p>
                              )}
                            </div>
                          </button>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-surface text-fg-muted border border-line/60 font-medium">
                            {item.totalMatches} {item.totalMatches === 1 ? "match" : "matches"}
                          </span>
                        </div>

                        {/* Snippets list */}
                        <div className="space-y-1.5 pt-1">
                          {item.matches.map((match, mi) => (
                            <button
                              className="w-full text-left p-2 rounded-lg hover:bg-surface text-xs text-fg-muted flex items-start gap-2 group transition-colors"
                              key={mi}
                              onClick={() => {
                                onSelectBook(book, match.cfi);
                                onClose();
                              }}
                            >
                              <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-fg-muted/60 group-hover:text-accent" />
                              <div className="flex-1 min-w-0">
                                {match.sectionTitle && (
                                  <span className="block text-2xs font-semibold text-fg/70 mb-0.5">
                                    {match.sectionTitle}
                                  </span>
                                )}
                                <p className="leading-relaxed line-clamp-2 text-fg">
                                  <HighlightedSnippet query={query} text={match.snippet} />
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>,
      document.body
    );
  }
