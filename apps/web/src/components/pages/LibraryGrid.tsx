import React, { useState, useEffect, useMemo, useRef } from "react";
import type { Book, SortOption, FilterOption, ViewMode } from "@/types";
import { Grid3X3, List, SortAsc, Filter, Star, Clock, ChevronRight, ChevronDown, Search, BookOpen, Sparkles, BookUp, Info, Ghost } from "lucide-react";
import BookCard from "../ui/BookCard";
import AddBookButton from "../ui/AddBookButton";
import BunniesPick from "../ui/BunniesPick";
import { useBookStore } from "@/store/useBookStore";
import { useUIStore } from "@/store/useUIStore";
import { useShallow } from "zustand/react/shallow";
import { motion, AnimatePresence } from "framer-motion";

interface LibraryGridProps {
  onSelectBook: (book: Book) => void;
}

const SkeletonCard: React.FC = () => (
  <div className="w-full h-[260px] sm:h-[300px] rounded-xl bg-light-surface dark:bg-dark-surface border border-black/[0.08] dark:border-white/[0.08] overflow-hidden relative">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 dark:via-white/5 to-transparent animate-shimmer" />
  </div>
);

const LIBRARY_PAGE_SIZE = 40;

const LibraryGrid: React.FC<LibraryGridProps> = ({
  onSelectBook,
}) => {
  const { searchTerm } = useUIStore(useShallow((state) => ({
    searchTerm: state.searchTerm,
  })));
  const {
    books,
    sortedBooks,
    recentBooks,
    favoriteBooks,
    seriesGroups,
    addBook,
    isLoading,
    sortBy,
    setSortBy,
    filterBy,
    setFilterBy,
    toggleFavorite: onToggleFavorite,
  } = useBookStore(useShallow((state) => ({
    books: state.books,
    sortedBooks: state.sortedBooks,
    recentBooks: state.recentBooks,
    favoriteBooks: state.favoriteBooks,
    seriesGroups: state.seriesGroups,
    addBook: state.addBook,
    isLoading: state.isLoading,
    sortBy: state.sortBy,
    setSortBy: state.setSortBy,
    filterBy: state.filterBy,
    setFilterBy: state.setFilterBy,
    toggleFavorite: state.toggleFavorite,
  })));

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [visibleCount, setVisibleCount] = useState(LIBRARY_PAGE_SIZE);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedBookForDetails, setSelectedBookForDetails] = useState<Book | null>(null);

  const sortRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortMenuId = "library-sort-menu";
  const filterMenuId = "library-filter-menu";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSortMenu(false);
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilterMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "recent", label: "Recently Opened" },
    { value: "title", label: "Title" },
    { value: "author", label: "Author" },
    { value: "progress", label: "Progress" },
    { value: "added", label: "Date Added" },
  ];

  const filterOptions: { value: FilterOption; label: string }[] = [
    { value: "all", label: "All Books" },
    { value: "favorites", label: "Favorites" },
    { value: "to-read", label: "To Read" },
    { value: "reading", label: "Reading" },
    { value: "finished", label: "Finished" },
  ];

  const displayBooks = useMemo(() => {
    if (!searchTerm) return sortedBooks;
    const term = searchTerm.toLowerCase();
    return sortedBooks.filter(
      (b) =>
        b.title.toLowerCase().includes(term) ||
        b.author.toLowerCase().includes(term) ||
        (b.tags ?? []).some((t) => t.toLowerCase().includes(term))
    );
  }, [sortedBooks, searchTerm]);

  useEffect(() => {
    setVisibleCount(LIBRARY_PAGE_SIZE);
  }, [searchTerm, sortBy, filterBy]);

  const visibleBooks = useMemo(
    () => displayBooks.slice(0, visibleCount),
    [displayBooks, visibleCount]
  );

  // Smart Grouping Logic
  const upNextBooks = useMemo(() => {
    if (books.length === 0) return [];
    const unread = books.filter(b => b.progress === 0 && b.readingList !== 'finished');
    return unread.slice(0, 5);
  }, [books]);

  const handleBookClick = (book: Book) => {
    setSelectedBookForDetails(book);
  };

  const handleStartReading = () => {
    if (selectedBookForDetails) {
        onSelectBook(selectedBookForDetails);
        setSelectedBookForDetails(null);
    }
  };

  if (isLoading) {
    return (
      <div className="page-stack animate-fadeIn">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-40 rounded-lg bg-black/[0.05] dark:bg-white/[0.08]" />
            <div className="h-4 w-28 rounded bg-black/[0.04] dark:bg-white/[0.06]" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {[...Array(10)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Enhanced Empty State
  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-fadeInUp">
        <div className="relative mb-8">
            <div className="w-40 h-40 bg-[rgb(var(--aged-paper))] rounded-full flex items-center justify-center border-4 border-[rgb(var(--ink-navy))] shadow-pixel relative z-10 animate-float">
                <BookOpen className="w-16 h-16 text-[rgb(var(--ink-navy))]" strokeWidth={1.5} />
            </div>
            {/* Dust bunnies */}
            <div className="absolute -bottom-4 -left-10 text-4xl animate-bounce-gentle" style={{ animationDelay: '0.5s' }}>🕸️</div>
            <div className="absolute top-0 -right-8 text-3xl animate-bounce-gentle" style={{ animationDelay: '1.5s' }}>💨</div>
        </div>

        <h2 className="text-3xl font-serif font-bold text-[rgb(var(--ink-navy))] mb-3">The shelves are bare...</h2>
        <p className="text-[rgb(var(--sepia-brown))] max-w-sm mx-auto mb-8 text-lg font-hand italic">
          It's awfully quiet in here. Why not add a story to keep the bunnies company?
        </p>

        <div className="flex flex-col items-center gap-3">
          <AddBookButton onAddBook={addBook} variant="inline" />
          <span className="text-xs font-pixel text-[rgb(var(--ink-navy))]/60">SUPPORTS EPUB</span>
        </div>
      </div>
    );
  }

  const SectionHeader = ({
    title,
    count,
    icon: Icon,
  }: {
    title: string;
    count?: number;
    icon?: React.ElementType;
  }) => (
    <div className="flex items-center gap-2 mb-4 mt-8 border-b-2 border-[rgb(var(--aged-paper))] pb-2">
      {Icon && <Icon className="w-5 h-5 text-[rgb(var(--ink-navy))]" strokeWidth={2} />}
      <h3 className="text-lg font-serif font-bold text-[rgb(var(--ink-navy))]">{title}</h3>
      {count !== undefined && (
        <span className="ml-auto px-2 py-0.5 rounded-full bg-[rgb(var(--aged-paper))] text-[10px] font-pixel text-[rgb(var(--sepia-brown))] tabular-nums">
          {count}
        </span>
      )}
    </div>
  );

  const HorizontalScroll = ({ books: scrollBooks }: { books: Book[] }) => (
    <div className="flex gap-4 overflow-x-auto pb-6 pt-2 scrollbar-hide px-1">
      {scrollBooks.map((book) => (
        <div key={book.id} className="flex-shrink-0 w-[140px] sm:w-[160px]">
          <BookCard book={book} onSelect={handleBookClick} onToggleFavorite={onToggleFavorite} variant="compact" />
        </div>
      ))}
    </div>
  );

  const DropdownMenu = ({
    id,
    show,
    options,
    value,
    onSelect,
    onClose,
  }: {
    id: string;
    show: boolean;
    options: { value: string; label: string }[];
    value: string;
    onSelect: (v: string) => void;
    onClose: () => void;
  }) =>
    show ? (
      <div
        id={id}
        role="menu"
        aria-orientation="vertical"
        className="absolute right-0 top-full mt-1.5 w-40 py-1 rounded-xl bg-light-surface dark:bg-dark-surface shadow-lg border border-black/[0.08] dark:border-white/[0.08] z-20 animate-scaleIn origin-top-right"
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            role="menuitemradio"
            aria-checked={value === opt.value}
            onClick={() => {
              onSelect(opt.value);
              onClose();
            }}
            className={`w-full text-left px-3 py-2 text-sm transition-colors ${value === opt.value
              ? "text-light-accent dark:text-dark-accent font-medium bg-light-accent/5 dark:bg-dark-accent/5"
              : "text-light-text dark:text-dark-text hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
              }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    ) : null;

  return (
    <div className="page-stack">
      {/* Book Details Modal */}
      <AnimatePresence>
        {selectedBookForDetails && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSelectedBookForDetails(null)}
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ scale: 0.9, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.9, y: 20, opacity: 0 }}
                    className="relative bg-[rgb(var(--paper-cream))] w-full max-w-lg rounded-2xl shadow-2xl border-2 border-[rgb(var(--ink-navy))] overflow-hidden"
                >
                    <div className="flex flex-col sm:flex-row">
                        {/* Cover Column */}
                        <div className="w-full sm:w-1/3 bg-[rgb(var(--aged-paper))] p-6 flex items-center justify-center border-b sm:border-b-0 sm:border-r-2 border-[rgb(var(--ink-navy))]">
                             <div className="relative aspect-[2/3] w-32 shadow-pixel rotate-3 transform transition-transform hover:rotate-0">
                                 <img
                                    src={selectedBookForDetails.coverUrl}
                                    alt={selectedBookForDetails.title}
                                    className="w-full h-full object-cover rounded-sm border border-black/20"
                                 />
                             </div>
                        </div>

                        {/* Info Column */}
                        <div className="flex-1 p-6 sm:p-8 flex flex-col">
                            <div className="flex-1">
                                <h2 className="text-2xl font-serif font-bold text-[rgb(var(--ink-navy))] leading-tight mb-2">
                                    {selectedBookForDetails.title}
                                </h2>
                                <p className="text-[rgb(var(--sepia-brown))] font-medium italic mb-4">
                                    by {selectedBookForDetails.author}
                                </p>

                                <div className="space-y-3">
                                    <div className="bg-white/50 p-3 rounded-lg border border-[rgb(var(--ink-navy))]/10">
                                        <div className="flex items-center gap-2 mb-1 text-xs font-bold text-[rgb(var(--sage-green))] uppercase tracking-wider">
                                            <Sparkles className="w-3 h-3" />
                                            <span>Librarian's Note</span>
                                        </div>
                                        <p className="text-sm text-[rgb(var(--ink-navy))] leading-relaxed">
                                            "A compelling journey waiting to be unfolded. Perfect for a quiet afternoon."
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {selectedBookForDetails.progress > 0 && (
                                            <span className="px-2 py-1 rounded-md bg-[rgb(var(--aged-paper))] text-xs font-mono text-[rgb(var(--sepia-brown))] border border-[rgb(var(--ink-navy))]/10">
                                                {selectedBookForDetails.progress}% Read
                                            </span>
                                        )}
                                        {selectedBookForDetails.isFavorite && (
                                            <span className="px-2 py-1 rounded-md bg-[rgb(var(--woodstock-gold))]/20 text-xs font-mono text-[rgb(var(--ink-navy))] border border-[rgb(var(--woodstock-gold))]">
                                                Favorite
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex gap-3">
                                <button
                                    onClick={handleStartReading}
                                    className="flex-1 btn-cozy shadow-pixel hover:shadow-none hover:translate-y-[2px] active:translate-y-[4px] border-2 border-[rgb(var(--ink-navy))]"
                                >
                                    {selectedBookForDetails.progress > 0 ? "Continue" : "Start Reading"}
                                </button>
                                <button
                                    onClick={() => setSelectedBookForDetails(null)}
                                    className="px-4 py-2 rounded-full border-2 border-[rgb(var(--ink-navy))] text-[rgb(var(--ink-navy))] font-bold hover:bg-[rgb(var(--aged-paper))]"
                                >
                                    Back
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* Bunnies' Pick Feature - Only show when filtering "All" and no search term */}
      {filterBy === "all" && !searchTerm && books.length > 0 && (
        <BunniesPick books={books} onSelectBook={handleBookClick} />
      )}

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">Library</h2>
          <p className="text-light-text-muted dark:text-dark-text-muted mt-1 text-sm">
            {books.length} {books.length === 1 ? "book" : "books"}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center p-0.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-light-surface dark:bg-dark-surface">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md transition-all duration-150 ${viewMode === "grid"
                ? "bg-black/[0.05] dark:bg-white/[0.08] text-light-text dark:text-dark-text"
                : "text-light-text-muted/50 dark:text-dark-text-muted/50 hover:text-light-text dark:hover:text-dark-text"
                }`}
              aria-label="Grid view"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-all duration-150 ${viewMode === "list"
                ? "bg-black/[0.05] dark:bg-white/[0.08] text-light-text dark:text-dark-text"
                : "text-light-text-muted/50 dark:text-dark-text-muted/50 hover:text-light-text dark:hover:text-dark-text"
                }`}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <div ref={sortRef} className="relative">
            <button
              onClick={() => {
                setShowSortMenu(!showSortMenu);
                setShowFilterMenu(false);
              }}
              aria-label={`Sort by: ${sortOptions.find((o) => o.value === sortBy)?.label}`}
              aria-haspopup="menu"
              aria-expanded={showSortMenu}
              aria-controls={showSortMenu ? sortMenuId : undefined}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-light-surface dark:bg-dark-surface hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-colors text-sm text-light-text-muted dark:text-dark-text-muted"
            >
              <SortAsc className="w-4 h-4" />
              <span className="hidden sm:inline">{sortOptions.find((o) => o.value === sortBy)?.label}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showSortMenu ? "rotate-180" : ""}`} />
            </button>
            <DropdownMenu
              id={sortMenuId}
              show={showSortMenu}
              options={sortOptions as { value: string; label: string }[]}
              value={sortBy}
              onSelect={(v) => setSortBy(v as SortOption)}
              onClose={() => setShowSortMenu(false)}
            />
          </div>

          <div ref={filterRef} className="relative">
            <button
              onClick={() => {
                setShowFilterMenu(!showFilterMenu);
                setShowSortMenu(false);
              }}
              aria-label={`Filter by: ${filterOptions.find((o) => o.value === filterBy)?.label}`}
              aria-haspopup="menu"
              aria-expanded={showFilterMenu}
              aria-controls={showFilterMenu ? filterMenuId : undefined}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-light-surface dark:bg-dark-surface hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-colors text-sm text-light-text-muted dark:text-dark-text-muted"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">{filterOptions.find((o) => o.value === filterBy)?.label}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showFilterMenu ? "rotate-180" : ""}`} />
            </button>
            <DropdownMenu
              id={filterMenuId}
              show={showFilterMenu}
              options={filterOptions as { value: string; label: string }[]}
              value={filterBy}
              onSelect={(v) => setFilterBy(v as FilterOption)}
              onClose={() => setShowFilterMenu(false)}
            />
          </div>
        </div>
      </div>

      {recentBooks.length > 0 && filterBy === "all" && !searchTerm && (
        <section>
          <SectionHeader title="Continue Reading" count={recentBooks.length} icon={Clock} />
          <HorizontalScroll books={recentBooks.slice(0, 6)} />
        </section>
      )}

      {/* Up Next Section (Smart Grouping) */}
      {upNextBooks.length > 0 && filterBy === "all" && !searchTerm && (
        <section>
            <SectionHeader title="Up Next" count={upNextBooks.length} icon={BookUp} />
            <HorizontalScroll books={upNextBooks} />
        </section>
      )}

      {favoriteBooks.length > 0 && filterBy === "all" && !searchTerm && (
        <section>
          <SectionHeader title="Favorites" count={favoriteBooks.length} icon={Star} />
          <HorizontalScroll books={favoriteBooks.slice(0, 6)} />
        </section>
      )}

      {Object.keys(seriesGroups).length > 0 && filterBy === "all" && !searchTerm && (
        <section>
          <SectionHeader title="Series" />
          <div className="space-y-4">
            {Object.entries(seriesGroups)
              .slice(0, 2)
              .map(([series, seriesBooks]) => (
                <div key={series}>
                  <div className="flex items-center gap-1 mb-2 text-xs font-medium text-light-text-muted dark:text-dark-text-muted">
                    <span>{series}</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                  <HorizontalScroll books={seriesBooks} />
                </div>
              ))}
          </div>
        </section>
      )}

      <section>
          <SectionHeader
            title={searchTerm ? "Results" : "All Books"}
          count={displayBooks.length}
          icon={searchTerm ? Search : undefined}
        />
        {searchTerm && (
          <p className="mb-4 text-xs text-light-text-muted dark:text-dark-text-muted">
            Showing matches for "{searchTerm}". Curated sections are hidden while searching.
          </p>
        )}

        {/* Search Empty State */}
        {displayBooks.length === 0 && searchTerm ? (
          <div className="text-center py-12">
             <div className="w-20 h-20 bg-[rgb(var(--aged-paper))] rounded-full flex items-center justify-center border-2 border-[rgb(var(--ink-navy))] shadow-pixel mx-auto mb-4 animate-float">
                <Ghost className="w-10 h-10 text-[rgb(var(--ink-navy))]" strokeWidth={1.5} />
             </div>
             <p className="text-[rgb(var(--ink-navy))] font-bold font-serif text-lg">No spirits found.</p>
             <p className="text-[rgb(var(--sepia-brown))] text-sm font-hand italic">Try summoning a different title.</p>
          </div>
        ) : displayBooks.length === 0 ? (
           null // Handled by main empty state
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {visibleBooks.map((book) => (
              <div key={book.id}>
                <BookCard book={book} onSelect={handleBookClick} onToggleFavorite={onToggleFavorite} />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {visibleBooks.map((book) => (
              <button
                key={book.id}
                onClick={() => handleBookClick(book)}
                className="w-full flex items-center gap-3.5 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] border border-transparent hover:border-black/[0.04] dark:hover:border-white/[0.04] transition-all duration-150 text-left group"
              >
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  className="w-10 h-14 object-cover rounded-lg shadow-sm"
                  onError={(e) => {
                    const img = e.currentTarget;
                    img.onerror = null;
                    img.style.visibility = "hidden";
                  }}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-light-text dark:text-dark-text truncate group-hover:text-light-accent dark:group-hover:text-dark-accent transition-colors">
                    {book.title}
                  </h4>
                  <p className="text-xs text-light-text-muted dark:text-dark-text-muted truncate">{book.author}</p>
                  <div className="flex items-center gap-2.5 mt-1">
                    <div className="flex-1 h-1 bg-black/[0.04] dark:bg-white/[0.04] rounded-full overflow-hidden max-w-[80px]">
                      <div
                        className="h-full bg-light-accent dark:bg-dark-accent rounded-full"
                        style={{ width: `${book.progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-light-text-muted dark:text-dark-text-muted tabular-nums">
                      {book.progress}%
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(book.id);
                  }}
                  className={`p-1.5 rounded-lg transition-colors ${book.isFavorite
                    ? "text-amber-500"
                    : "text-light-text-muted/30 dark:text-dark-text-muted/30 hover:text-amber-500"
                    }`}
                >
                  <Star className={`w-4 h-4 ${book.isFavorite ? "fill-current" : ""}`} />
                </button>
              </button>
            ))}
          </div>
        )}
        {visibleBooks.length < displayBooks.length && (
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + LIBRARY_PAGE_SIZE)}
              className="px-4 py-2 rounded-lg text-sm border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
            >
              Load more ({displayBooks.length - visibleBooks.length} remaining)
            </button>
          </div>
        )}
      </section>

      <AddBookButton onAddBook={addBook} />
    </div>
  );
};

export default LibraryGrid;
