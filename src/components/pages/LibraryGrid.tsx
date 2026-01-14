import React, { useState, useEffect, useMemo, useRef } from "react";
import { Book, SortOption, FilterOption, ViewMode } from "@/types";
import { Grid3X3, List, SortAsc, Filter, Star, Clock, ChevronRight, ChevronLeft, ChevronDown, Search, BookOpen, Trash2, X, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import BookCard from "../ui/BookCard";
import AddBookButton from "../ui/AddBookButton";

interface LibraryGridProps {
  books: Book[];
  sortedBooks: Book[];
  recentBooks: Book[];
  favoriteBooks: Book[];
  seriesGroups: Record<string, Book[]>;
  onSelectBook: (book: Book) => void;
  addBook: (file: File) => Promise<void>;
  onDeleteBook?: (id: string) => void;
  isLoading: boolean;
  sortBy: SortOption;
  setSortBy: (s: SortOption) => void;
  filterBy: FilterOption;
  setFilterBy: (f: FilterOption) => void;
  onToggleFavorite: (id: string) => void;
  searchTerm?: string;
}

const SkeletonCard: React.FC = () => (
  <div className="w-full h-[260px] sm:h-[300px] rounded-xl bg-black/[0.03] dark:bg-white/[0.03] animate-pulse-soft" />
);

const LibraryGrid: React.FC<LibraryGridProps> = ({
  books,
  sortedBooks,
  recentBooks,
  favoriteBooks,
  seriesGroups,
  onSelectBook,
  addBook,
  onDeleteBook,
  isLoading,
  sortBy,
  setSortBy,
  filterBy,
  setFilterBy,
  onToggleFavorite,
  searchTerm,
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Book | null>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setIsMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

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
        b.tags?.some((t) => t.toLowerCase().includes(term))
    );
  }, [sortedBooks, searchTerm]);

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-40 rounded-lg bg-black/[0.04] dark:bg-white/[0.04]" />
            <div className="h-4 w-28 rounded bg-black/[0.03] dark:bg-white/[0.03]" />
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
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6 animate-fadeInUp">
        <div className="relative mb-8">
          {/* Decorative rings */}
          <div className="absolute inset-0 -m-4 rounded-full border border-light-accent/10 dark:border-dark-accent/10" />
          <div className="absolute inset-0 -m-8 rounded-full border border-light-accent/5 dark:border-dark-accent/5" />
          <div className="flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-light-accent/10 to-light-accent/5 dark:from-dark-accent/10 dark:to-dark-accent/5">
            <BookOpen className="w-10 h-10 text-light-accent dark:text-dark-accent" strokeWidth={1.25} />
          </div>
        </div>
        <h2 className="text-3xl font-serif font-semibold text-light-text dark:text-dark-text mb-3">Your Sanctuary Awaits</h2>
        <p className="text-light-text-muted dark:text-dark-text-muted max-w-md mx-auto mb-8 text-base leading-relaxed">
          Every great journey begins with a single page. Add your first book and let the adventure unfold.
        </p>
        <div className="flex flex-col items-center gap-4">
          <AddBookButton onAddBook={addBook} variant="inline" />
          <span className="text-xs text-light-text-muted/60 dark:text-dark-text-muted/60 tracking-wide">Supports EPUB format</span>
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
      <h3 className="text-sm font-semibold text-light-text dark:text-dark-text uppercase tracking-wide">{title}</h3>
      {count !== undefined && (
        <span className="px-1.5 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.04] text-[10px] font-medium text-light-text-muted dark:text-dark-text-muted tabular-nums">
          {count}
        </span>
      )}
    </div>
  );

  const HorizontalScroll = ({ books: scrollBooks }: { books: Book[] }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
      }
    };

    useEffect(() => {
      checkScroll();
      window.addEventListener('resize', checkScroll);
      return () => window.removeEventListener('resize', checkScroll);
    }, [scrollBooks]);

    const scroll = (direction: 'left' | 'right') => {
      if (scrollRef.current) {
        const scrollAmount = direction === 'left' ? -300 : 300;
        scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        setTimeout(checkScroll, 300);
      }
    };

    return (
      <div className="relative group -mx-4 px-4 sm:mx-0 sm:px-0">
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/90 dark:bg-black/90 shadow-lg border border-black/5 dark:border-white/5 text-light-text dark:text-dark-text opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-hide snap-x snap-mandatory"
        >
          {scrollBooks.map((book) => (
            <div key={book.id} className="flex-shrink-0 w-[140px] sm:w-[160px] snap-start">
              <BookCard book={book} onSelect={onSelectBook} onToggleFavorite={onToggleFavorite} compact />
            </div>
          ))}
        </div>
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/90 dark:bg-black/90 shadow-lg border border-black/5 dark:border-white/5 text-light-text dark:text-dark-text opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    );
  };

  const DropdownMenu = ({
    show,
    options,
    value,
    onSelect,
    onClose,
  }: {
    show: boolean;
    options: { value: string; label: string }[];
    value: string;
    onSelect: (v: string) => void;
    onClose: () => void;
  }) =>
    show ? (
      <div className="absolute right-0 top-full mt-1.5 w-40 py-1 rounded-xl glass-strong shadow-xl border border-black/[0.04] dark:border-white/[0.04] z-20 animate-scaleIn origin-top-right">
        {options.map((opt) => (
          <button
            key={opt.value}
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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">Library</h2>
          <p className="text-light-text-muted dark:text-dark-text-muted mt-1 text-sm">
            {books.length} {books.length === 1 ? "book" : "books"}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center p-0.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.03]">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md transition-all duration-150 ${viewMode === "grid"
                ? "bg-light-surface dark:bg-dark-surface shadow-sm text-light-text dark:text-dark-text"
                : "text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text"
                }`}
              aria-label="Grid view"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-all duration-150 ${viewMode === "list"
                ? "bg-light-surface dark:bg-dark-surface shadow-sm text-light-text dark:text-dark-text"
                : "text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text"
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
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors text-sm text-light-text-muted dark:text-dark-text-muted"
            >
              <SortAsc className="w-4 h-4" />
              <span className="hidden sm:inline">{sortOptions.find((o) => o.value === sortBy)?.label}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showSortMenu ? "rotate-180" : ""}`} />
            </button>
            <DropdownMenu
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
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors text-sm text-light-text-muted dark:text-dark-text-muted"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">{filterOptions.find((o) => o.value === filterBy)?.label}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showFilterMenu ? "rotate-180" : ""}`} />
            </button>
            <DropdownMenu
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
        {displayBooks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-light-text-muted dark:text-dark-text-muted text-sm">No books found</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {displayBooks.map((book, index) => (
              <div
                key={book.id}
                className={`transition-all duration-500 ease-smooth ${isMounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
                  }`}
                style={{ transitionDelay: `${Math.min(index * 30, 250)}ms` }}
              >
                <BookCard book={book} onSelect={onSelectBook} onToggleFavorite={onToggleFavorite} onDeleteClick={setDeleteConfirm} />
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
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-light-text dark:text-dark-text truncate group-hover:text-light-accent dark:group-hover:text-dark-accent transition-colors">
                    {book.title}
                  </h4>
                  <p className="text-xs text-light-text-muted dark:text-dark-text-muted truncate">{book.author}</p>
                  <div className="flex items-center gap-2.5 mt-1">
                    <div className="flex-1 h-1 bg-black/[0.08] dark:bg-white/[0.08] rounded-full overflow-hidden max-w-[80px]">
                      <div
                        className="h-full bg-light-accent dark:bg-dark-accent rounded-full"
                        style={{ width: `${Math.min(100, Math.round((book.progress / (book.totalPages || 1)) * 100))}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-light-text-muted dark:text-dark-text-muted tabular-nums">
                      {Math.min(100, Math.round((book.progress / (book.totalPages || 1)) * 100))}%
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
                    : "text-light-text-muted dark:text-dark-text-muted hover:text-amber-500"
                    }`}
                >
                  <Star className={`w-4 h-4 ${book.isFavorite ? "fill-current" : ""}`} />
                </button>
                {onDeleteBook && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(book);
                    }}
                    className="p-1.5 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      <AddBookButton onAddBook={addBook} />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <div
            className="bg-light-surface dark:bg-dark-surface rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-light-text dark:text-dark-text">Delete Book?</h3>
                <p className="text-sm text-light-text-muted dark:text-dark-text-muted mt-1">
                  "{deleteConfirm.title}" will be permanently removed from your library.
                </p>
              </div>
              <button onClick={() => setDeleteConfirm(null)} className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
                <X className="w-5 h-5 text-light-text-muted dark:text-dark-text-muted" />
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteBook?.(deleteConfirm.id);
                  setDeleteConfirm(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryGrid;
