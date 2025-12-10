import React, { useState, useEffect, useMemo } from "react";
import { Book, SortOption, FilterOption, ViewMode } from "../types";
import { BookOpen, Sparkles, Grid3X3, List, SortAsc, Filter, Star, Clock, ChevronRight } from "lucide-react";
import BookCard from "./BookCard";
import AddBookButton from "./AddBookButton";

interface LibraryGridProps {
  books: Book[];
  sortedBooks: Book[];
  recentBooks: Book[];
  favoriteBooks: Book[];
  seriesGroups: Record<string, Book[]>;
  onSelectBook: (book: Book) => void;
  addBook: (file: File) => Promise<void>;
  isLoading: boolean;
  sortBy: SortOption;
  setSortBy: (s: SortOption) => void;
  filterBy: FilterOption;
  setFilterBy: (f: FilterOption) => void;
  onToggleFavorite: (id: string) => void;
  searchTerm?: string;
}

const SkeletonCard: React.FC = () => (
  <div className="w-full h-[280px] sm:h-[320px] rounded-2xl bg-light-card/50 dark:bg-dark-card/50 overflow-hidden shimmer" />
);

const LibraryGrid: React.FC<LibraryGridProps> = ({
  books, sortedBooks, recentBooks, favoriteBooks, seriesGroups,
  onSelectBook, addBook, isLoading, sortBy, setSortBy, filterBy, setFilterBy, onToggleFavorite, searchTerm,
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  useEffect(() => { const t = setTimeout(() => setIsMounted(true), 100); return () => clearTimeout(t); }, []);

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
    { value: "reading", label: "Currently Reading" },
    { value: "finished", label: "Finished" },
  ];

  const displayBooks = useMemo(() => {
    if (!searchTerm) return sortedBooks;
    const term = searchTerm.toLowerCase();
    return sortedBooks.filter((b) => b.title.toLowerCase().includes(term) || b.author.toLowerCase().includes(term) || b.tags?.some((t) => t.toLowerCase().includes(term)));
  }, [sortedBooks, searchTerm]);

  if (isLoading) {
    return (
      <div className="space-y-10">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 rounded-xl bg-light-card/50 dark:bg-dark-card/50 shimmer" />
            <div className="h-4 w-32 rounded-lg bg-light-card/30 dark:bg-dark-card/30 shimmer" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">{[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}</div>
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-light-accent/5 dark:bg-dark-accent/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        </div>
        <div className="relative animate-fadeInUp">
          <div className="relative mx-auto mb-8">
            <div className="absolute inset-0 bg-gradient-to-br from-light-accent to-amber-500 dark:from-dark-accent dark:to-amber-400 rounded-3xl blur-2xl opacity-20 scale-150" />
            <div className="relative flex items-center justify-center w-28 h-28 rounded-3xl bg-gradient-to-br from-light-accent/10 to-amber-500/10 dark:from-dark-accent/15 dark:to-amber-400/15 border border-light-accent/20 dark:border-dark-accent/20">
              <BookOpen className="w-12 h-12 text-light-accent dark:text-dark-accent" />
            </div>
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-light-text dark:text-dark-text mb-4">Your Sanctuary Awaits</h2>
          <p className="text-light-text-muted dark:text-dark-text-muted max-w-md mx-auto mb-10 text-lg leading-relaxed">Begin your reading journey by adding your first book. Your personal library is ready to grow.</p>
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <AddBookButton onAddBook={addBook} variant="inline" />
            <div className="flex items-center gap-2 text-sm text-light-text-muted dark:text-dark-text-muted">
              <Sparkles className="w-4 h-4" /><span>Supports EPUB format</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const SectionHeader = ({ title, count, action }: { title: string; count?: number; action?: React.ReactNode }) => (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <h3 className="text-xl font-serif font-semibold text-light-text dark:text-dark-text">{title}</h3>
        {count !== undefined && <span className="px-2.5 py-1 rounded-full bg-light-card dark:bg-dark-card text-xs font-medium text-light-text-muted dark:text-dark-text-muted">{count}</span>}
      </div>
      {action}
    </div>
  );

  const HorizontalScroll = ({ books: scrollBooks }: { books: Book[] }) => (
    <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
      {scrollBooks.map((book) => (
        <div key={book.id} className="flex-shrink-0 w-[160px] sm:w-[180px]">
          <BookCard book={book} onSelect={onSelectBook} onToggleFavorite={onToggleFavorite} compact />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-light-text dark:text-dark-text">Your Library</h2>
          <p className="text-light-text-muted dark:text-dark-text-muted mt-2">{books.length} {books.length === 1 ? "book" : "books"} in your collection</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-light-card/50 dark:bg-dark-card/50">
            <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-light-surface dark:bg-dark-surface shadow-sm" : ""}`}><Grid3X3 className="w-4 h-4" /></button>
            <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-light-surface dark:bg-dark-surface shadow-sm" : ""}`}><List className="w-4 h-4" /></button>
          </div>
          {/* Sort */}
          <div className="relative">
            <button onClick={() => { setShowSortMenu(!showSortMenu); setShowFilterMenu(false); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-light-card/50 dark:bg-dark-card/50 hover:bg-light-card dark:hover:bg-dark-card transition-colors">
              <SortAsc className="w-4 h-4" /><span className="text-sm hidden sm:inline">{sortOptions.find((o) => o.value === sortBy)?.label}</span>
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 py-2 rounded-xl bg-light-surface dark:bg-dark-surface shadow-xl border border-light-card dark:border-dark-card z-20">
                {sortOptions.map((opt) => (
                  <button key={opt.value} onClick={() => { setSortBy(opt.value); setShowSortMenu(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-light-card dark:hover:bg-dark-card transition-colors ${sortBy === opt.value ? "text-light-accent dark:text-dark-accent font-medium" : "text-light-text dark:text-dark-text"}`}>{opt.label}</button>
                ))}
              </div>
            )}
          </div>
          {/* Filter */}
          <div className="relative">
            <button onClick={() => { setShowFilterMenu(!showFilterMenu); setShowSortMenu(false); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-light-card/50 dark:bg-dark-card/50 hover:bg-light-card dark:hover:bg-dark-card transition-colors">
              <Filter className="w-4 h-4" /><span className="text-sm hidden sm:inline">{filterOptions.find((o) => o.value === filterBy)?.label}</span>
            </button>
            {showFilterMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 py-2 rounded-xl bg-light-surface dark:bg-dark-surface shadow-xl border border-light-card dark:border-dark-card z-20">
                {filterOptions.map((opt) => (
                  <button key={opt.value} onClick={() => { setFilterBy(opt.value); setShowFilterMenu(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-light-card dark:hover:bg-dark-card transition-colors ${filterBy === opt.value ? "text-light-accent dark:text-dark-accent font-medium" : "text-light-text dark:text-dark-text"}`}>{opt.label}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recently Opened */}
      {recentBooks.length > 0 && filterBy === "all" && !searchTerm && (
        <section>
          <SectionHeader title="Continue Reading" count={recentBooks.length} action={<button className="flex items-center gap-1 text-sm text-light-accent dark:text-dark-accent hover:underline"><Clock className="w-4 h-4" />Recent</button>} />
          <HorizontalScroll books={recentBooks.slice(0, 5)} />
        </section>
      )}

      {/* Favorites */}
      {favoriteBooks.length > 0 && filterBy === "all" && !searchTerm && (
        <section>
          <SectionHeader title="Favorites" count={favoriteBooks.length} action={<button className="flex items-center gap-1 text-sm text-light-accent dark:text-dark-accent hover:underline"><Star className="w-4 h-4" />View all</button>} />
          <HorizontalScroll books={favoriteBooks.slice(0, 5)} />
        </section>
      )}

      {/* Series Groups */}
      {Object.keys(seriesGroups).length > 0 && filterBy === "all" && !searchTerm && (
        <section>
          <SectionHeader title="Series" />
          <div className="space-y-6">
            {Object.entries(seriesGroups).slice(0, 3).map(([series, seriesBooks]) => (
              <div key={series}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium text-light-text dark:text-dark-text">{series}</span>
                  <ChevronRight className="w-4 h-4 text-light-text-muted dark:text-dark-text-muted" />
                </div>
                <HorizontalScroll books={seriesBooks} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All Books Grid */}
      <section>
        <SectionHeader title={searchTerm ? `Search Results` : "All Books"} count={displayBooks.length} />
        {viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
            {displayBooks.map((book, index) => (
              <div key={book.id} className={`transition-all duration-700 ease-out ${isMounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`} style={{ transitionDelay: `${Math.min(index * 50, 400)}ms` }}>
                <BookCard book={book} onSelect={onSelectBook} onToggleFavorite={onToggleFavorite} />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {displayBooks.map((book) => (
              <button key={book.id} onClick={() => onSelectBook(book)} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-light-surface dark:bg-dark-surface hover:bg-light-card dark:hover:bg-dark-card transition-colors text-left">
                <img src={book.coverUrl} alt={book.title} className="w-14 h-20 object-cover rounded-lg shadow-md" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-serif font-semibold text-light-text dark:text-dark-text truncate">{book.title}</h4>
                  <p className="text-sm text-light-text-muted dark:text-dark-text-muted">{book.author}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1 h-1.5 bg-light-card dark:bg-dark-card rounded-full overflow-hidden max-w-[120px]">
                      <div className="h-full bg-light-accent dark:bg-dark-accent rounded-full" style={{ width: `${book.progress}%` }} />
                    </div>
                    <span className="text-xs text-light-text-muted dark:text-dark-text-muted">{book.progress}%</span>
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(book.id); }} className={`p-2 rounded-full ${book.isFavorite ? "text-amber-500" : "text-light-text-muted dark:text-dark-text-muted"}`}>
                  <Star className={`w-5 h-5 ${book.isFavorite ? "fill-current" : ""}`} />
                </button>
              </button>
            ))}
          </div>
        )}
      </section>

      <AddBookButton onAddBook={addBook} />
    </div>
  );
};

export default LibraryGrid;
