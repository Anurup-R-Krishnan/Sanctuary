import React, { useState, useEffect, useMemo, useRef } from "react";
import type { Book, SortOption, FilterOption, ViewMode } from "@/types";
import { Grid3X3, List, SortAsc, Filter, Star, Clock, ChevronRight, ChevronDown, Search, BookOpen } from "lucide-react";
import BookCard from "../ui/BookCard";
import AddBookButton from "../ui/AddBookButton";
import { useBookStore } from "@/store/useBookStore";
import { useUIStore } from "@/store/useUIStore";
import { useShallow } from "zustand/react/shallow";

interface LibraryGridProps {
  onSelectBook: (book: Book) => void;
}

const SkeletonCard: React.FC = () => (
  <div className="w-full h-[260px] sm:h-[300px] rounded-xl bg-light-surface dark:bg-dark-surface border border-black/[0.08] dark:border-white/[0.08] overflow-hidden relative">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 dark:via-white/5 to-transparent animate-shimmer" />
  </div>
);

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
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
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

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-fadeInUp rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-light-surface dark:bg-dark-surface">
        <div className="mb-8 flex items-center justify-center w-20 h-20 rounded-2xl bg-light-surface dark:bg-dark-surface border border-black/[0.08] dark:border-white/[0.08]">
          <BookOpen className="w-9 h-9 text-light-accent dark:text-dark-accent" strokeWidth={1.5} />
        </div>
        <h2 className="text-2xl font-bold text-light-text dark:text-dark-text mb-2">Your Library Awaits</h2>
        <p className="text-light-text-muted dark:text-dark-text-muted max-w-sm mx-auto mb-7 text-sm leading-relaxed">
          Add your first book to begin your reading journey
        </p>
        <div className="flex flex-col items-center gap-3">
          <AddBookButton onAddBook={addBook} variant="inline" />
          <span className="text-xs text-light-text-muted/50 dark:text-dark-text-muted/50">EPUB format supported</span>
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
    <div className="flex items-center gap-2 mb-4">
      {Icon && <Icon className="w-4 h-4 text-light-accent dark:text-dark-accent" strokeWidth={1.75} />}
      <h3 className="text-sm font-semibold text-light-text dark:text-dark-text">{title}</h3>
      {count !== undefined && (
        <span className="px-1.5 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.04] text-[10px] font-medium text-light-text-muted dark:text-dark-text-muted tabular-nums">
          {count}
        </span>
      )}
    </div>
  );

  const HorizontalScroll = ({ books: scrollBooks }: { books: Book[] }) => (
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
      {scrollBooks.map((book) => (
        <div key={book.id} className="flex-shrink-0 w-[140px] sm:w-[160px]">
          <BookCard book={book} onSelect={onSelectBook} onToggleFavorite={onToggleFavorite} variant="compact" />
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
        {displayBooks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-light-text-muted dark:text-dark-text-muted text-sm">No books found</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {displayBooks.map((book) => (
              <div key={book.id}>
                <BookCard book={book} onSelect={onSelectBook} onToggleFavorite={onToggleFavorite} />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {displayBooks.map((book) => (
              <button
                key={book.id}
                onClick={() => onSelectBook(book)}
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
      </section>

      <AddBookButton onAddBook={addBook} />
    </div>
  );
};

export default LibraryGrid;
