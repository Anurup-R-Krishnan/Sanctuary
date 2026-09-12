import { BookOpen, ChevronRight, FileText, Search, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import type { Book, BookSearchResult } from "@/types";

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

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-start justify-center p-4 sm:p-6 md:p-20 bg-black/50 backdrop-blur-sm animate-fadeIn overflow-y-auto"
      role="dialog"
    >
      <div
        className="w-full max-w-2xl bg-light-primary dark:bg-dark-primary rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden flex flex-col my-auto"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-black/5 dark:border-white/5 gap-3">
          <Search className="w-5 h-5 text-light-text-muted dark:text-dark-text-muted shrink-0" />
          <input
            aria-label="Search all books"
            className="flex-1 bg-transparent text-sm sm:text-base text-light-text dark:text-dark-text placeholder:text-light-text-muted dark:placeholder:text-dark-text-muted outline-none"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across entire library..."
            ref={inputRef}
            type="text"
            value={query}
          />
          {query && (
            <button
              aria-label="Clear search input"
              className="p-1 text-light-text-muted hover:text-light-text dark:text-dark-text-muted dark:hover:text-dark-text rounded-md transition-colors"
              onClick={() => setQuery("")}
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            aria-label="Close search"
            className="p-1.5 text-light-text-muted hover:text-light-text dark:text-dark-text-muted dark:hover:text-dark-text rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-xs font-medium"
            onClick={onClose}
          >
            ESC
          </button>
        </div>

        {/* Results Area */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {isSearching && (
            <div className="py-8 text-center text-xs text-light-text-muted dark:text-dark-text-muted">
              Searching entire library...
            </div>
          )}

          {!isSearching && query.trim().length >= 2 && results.length === 0 && (
            <div className="py-12 text-center space-y-2">
              <FileText className="w-8 h-8 mx-auto text-light-text-muted/50 dark:text-dark-text-muted/50" />
              <p className="text-sm font-medium text-light-text dark:text-dark-text">
                No matches found
              </p>
              <p className="text-xs text-light-text-muted dark:text-dark-text-muted">
                Try searching for a different word or phrase across your books.
              </p>
            </div>
          )}

          {!isSearching && query.trim().length < 2 && (
            <div className="py-10 text-center space-y-2">
              <BookOpen className="w-8 h-8 mx-auto text-light-accent/50 dark:text-dark-accent/50" />
              <p className="text-sm font-medium text-light-text dark:text-dark-text">
                Full-Text Library Search
              </p>
              <p className="text-xs text-light-text-muted dark:text-dark-text-muted max-w-sm mx-auto">
                Search passages, quotes, or themes across all your books. Press <kbd className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[10px] font-mono">Cmd+K</kbd> anytime to open.
              </p>
            </div>
          )}

          {!isSearching && results.length > 0 && (
            <>
              <div className="text-[11px] font-semibold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider px-1">
                Found {totalMatches} {totalMatches === 1 ? "match" : "matches"} across {results.length} {results.length === 1 ? "book" : "books"}
              </div>

              <div className="space-y-3">
                {results.map((item) => {
                  const book = books.find((b) => b.id === item.bookId);
                  if (!book) return null;

                  return (
                    <div
                      className="p-3.5 rounded-xl border border-black/5 dark:border-white/5 bg-black/[0.015] dark:bg-white/[0.015] space-y-2.5"
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
                          {item.coverUrl ? (
                            <img
                              alt=""
                              className="w-7 h-10 object-cover rounded shadow-sm shrink-0"
                              src={item.coverUrl}
                            />
                          ) : (
                            <div className="w-7 h-10 rounded overflow-hidden shadow-sm shrink-0">
                              <GenerativeBookCover author={item.author} title={item.title} variant="compact" />
                            </div>
                          )}
                          <div>
                            <h4 className="text-sm font-semibold text-light-text dark:text-dark-text group-hover:text-light-accent dark:group-hover:text-dark-accent transition-colors line-clamp-1">
                              {item.title}
                            </h4>
                            {item.author && (
                              <p className="text-xs text-light-text-muted dark:text-dark-text-muted">
                                {item.author}
                              </p>
                            )}
                          </div>
                        </button>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-light-text-muted dark:text-dark-text-muted font-medium">
                          {item.totalMatches} {item.totalMatches === 1 ? "match" : "matches"}
                        </span>
                      </div>

                      {/* Snippets list */}
                      <div className="space-y-1.5 pt-1">
                        {item.matches.map((match, mi) => (
                          <button
                            className="w-full text-left p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-xs text-light-text-muted dark:text-dark-text-muted flex items-start gap-2 group transition-colors"
                            key={mi}
                            onClick={() => {
                              onSelectBook(book, match.cfi);
                              onClose();
                            }}
                          >
                            <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-light-text-muted/60 dark:text-dark-text-muted/60 group-hover:text-light-accent dark:group-hover:text-dark-accent" />
                            <div className="flex-1 min-w-0">
                              {match.sectionTitle && (
                                <span className="block text-[10px] font-semibold text-light-text/70 dark:text-dark-text/70 mb-0.5">
                                  {match.sectionTitle}
                                </span>
                              )}
                              <p className="leading-relaxed line-clamp-2 text-light-text dark:text-dark-text">
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
    </div>
  );
}
