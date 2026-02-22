import React, { useState, useEffect, useMemo, useRef } from "react";
import type { Book, SortOption, FilterOption, ViewMode } from "@/types";
import { Grid3X3, List, SortAsc, Filter, Star, Clock, ChevronRight, ChevronDown, Search, BookOpen, Sparkles, BookUp, Ghost } from "lucide-react";
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
  <div className="w-full h-[260px] sm:h-[300px] rounded-xl bg-scrap-cream border-2 border-dashed border-scrap-navy/10 overflow-hidden relative">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
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

  // Enhanced Empty State (Scrapbook / Desk Cluster)
  if (books.length === 0) {
    return (
      <div className="relative min-h-[70vh] flex flex-col items-center justify-center pointer-events-none">
        {/* Desk Cluster */}
        <div className="relative z-10 mb-12 transform rotate-2 pointer-events-auto group">
            <div className="absolute -left-32 top-10 w-40 h-40 bg-[#3E2723] rounded-lg shadow-scrap-deep transform -rotate-12 flex items-center justify-center border-4 border-[#5D4037]">
                <div className="w-32 h-32 bg-black rounded-full border-4 border-gray-800 flex items-center justify-center animate-spin-slow" style={{ animationDuration: '8s' }}>
                    <div className="w-10 h-10 bg-red-800 rounded-full border-2 border-white/20" />
                    <div className="absolute top-0 right-0 w-2 h-20 bg-gray-400 origin-top transform rotate-[25deg] shadow-md" />
                </div>
            </div>

            <div className="relative">
                <div className="w-48 h-12 bg-scrap-navy rounded-l-sm rounded-r-lg border-l-8 border-r-2 border-y-2 border-black/20 shadow-md transform rotate-3 translate-x-4 translate-y-2">
                    <div className="h-full border-l-2 border-white/10 ml-2" />
                </div>
                <div className="w-44 h-10 bg-scrap-sage rounded-l-sm rounded-r-lg border-l-8 border-r-2 border-y-2 border-black/20 shadow-md transform -rotate-2 translate-x-0 -translate-y-1">
                    <div className="h-full border-l-2 border-white/10 ml-2" />
                </div>
                <div className="w-40 h-8 bg-scrap-blue rounded-l-sm rounded-r-lg border-l-8 border-r-2 border-y-2 border-black/20 shadow-md transform rotate-1 -translate-y-4">
                     <span className="text-[8px] text-white/60 font-serif ml-4 pt-2 block">VOL. I</span>
                </div>
            </div>

            <div className="absolute -right-20 -bottom-4 transform rotate-6">
                 <div className="w-16 h-10 bg-white border-2 border-gray-200 rounded-b-full shadow-md relative z-10">
                    <div className="absolute -right-3 top-2 w-6 h-6 border-4 border-white rounded-full -z-10" />
                 </div>
                 <div className="w-20 h-2 bg-gray-200 rounded-full absolute -bottom-1 left-1/2 -translate-x-1/2 -z-10" />
                 <div className="absolute -top-10 left-4 text-2xl animate-float opacity-40">♨</div>
            </div>
        </div>

        {/* Message Frame */}
        <div className="relative z-20 max-w-md mx-auto pointer-events-auto">
             <div className="bg-white p-10 shadow-scrap-deep mask-torn-all transform -rotate-1 relative">
                <div className="absolute -top-3 -left-3 w-16 h-6 bg-scrap-sage/60 rotate-[-45deg] backdrop-blur-[1px] shadow-sm z-30" style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.3) 5px, rgba(255,255,255,0.3) 10px)" }} />
                <div className="absolute -bottom-3 -right-3 w-16 h-6 bg-scrap-blue/60 rotate-[-45deg] backdrop-blur-[1px] shadow-sm z-30" style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.3) 5px, rgba(255,255,255,0.3) 10px)" }} />

                <div className="absolute -top-12 -right-8 w-20 h-32 opacity-80 pointer-events-none transform rotate-12 z-0 text-scrap-sage text-6xl">
                    🌿
                </div>

                <div className="relative z-10 text-center space-y-4">
                    <h2 className="text-3xl font-head font-bold text-scrap-navy drop-shadow-sm">
                        The shelves are bare...
                    </h2>
                    <p className="text-scrap-blue font-body text-lg leading-relaxed">
                        It looks like a quiet afternoon. <br/>
                        Add a story to fill the silence.
                    </p>

                    <div className="pt-4">
                        <AddBookButton onAddBook={addBook} variant="inline" />
                    </div>
                    <span className="block mt-4 text-xs font-mono text-scrap-kraft uppercase tracking-widest opacity-80">
                        Supports EPUB
                    </span>
                </div>
             </div>
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
    <div className="flex items-center gap-2 mb-4 mt-8 border-b-2 border-dashed border-scrap-navy/20 pb-2">
      {Icon && <Icon className="w-5 h-5 text-scrap-navy" strokeWidth={2} />}
      <h3 className="text-xl font-head font-bold text-scrap-navy">{title}</h3>
      {count !== undefined && (
        <span className="ml-auto px-2 py-0.5 rounded-full bg-scrap-kraft/20 text-xs font-mono text-scrap-navy tabular-nums border border-scrap-navy/10">
          {count}
        </span>
      )}
    </div>
  );

  const HorizontalScroll = ({ books: scrollBooks }: { books: Book[] }) => (
    <div className="flex gap-6 overflow-x-auto pb-8 pt-4 scrollbar-hide px-2">
      {scrollBooks.map((book, i) => (
        <div
            key={book.id}
            className="flex-shrink-0 w-[150px] sm:w-[170px] transform hover:-translate-y-2 transition-transform duration-300"
            style={{ transform: `rotate(${i % 2 === 0 ? 1 : -1}deg)` }}
        >
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
        className="absolute right-0 top-full mt-2 w-48 py-2 bg-white border-2 border-scrap-navy rounded-lg shadow-scrap-deep z-20 animate-scaleIn origin-top-right font-body"
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
            className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-scrap-cream font-bold ${value === opt.value
              ? "text-scrap-navy bg-scrap-kraft/20"
              : "text-scrap-blue"
              }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    ) : null;

  return (
    <div className="page-stack pb-32">
      <AnimatePresence>
        {selectedBookForDetails && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSelectedBookForDetails(null)}
                    className="absolute inset-0 bg-scrap-navy/60 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ scale: 0.9, y: 20, rotate: -2, opacity: 0 }}
                    animate={{ scale: 1, y: 0, rotate: 0, opacity: 1 }}
                    exit={{ scale: 0.9, y: 20, rotate: 2, opacity: 0 }}
                    className="relative bg-scrap-cream w-full max-w-lg rounded-sm shadow-scrap-deep border-4 border-white p-2"
                >
                    <div className="border border-dashed border-scrap-navy/30 h-full p-6 flex flex-col sm:flex-row gap-6 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]">
                         <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-scrap-sage/60 rotate-2 backdrop-blur-[1px] shadow-sm z-20" />
                        <div className="w-full sm:w-1/3 flex items-center justify-center">
                             <div className="relative aspect-[2/3] w-32 shadow-lg rotate-[-3deg] transform transition-transform hover:rotate-0 border-4 border-white">
                                 <img
                                    src={selectedBookForDetails.coverUrl}
                                    alt={selectedBookForDetails.title}
                                    className="w-full h-full object-cover"
                                 />
                             </div>
                        </div>
                        <div className="flex-1 flex flex-col">
                            <div className="flex-1">
                                <h2 className="text-2xl font-head font-bold text-scrap-navy leading-tight mb-2">
                                    {selectedBookForDetails.title}
                                </h2>
                                <p className="text-scrap-blue font-accent italic mb-6 text-lg">
                                    by {selectedBookForDetails.author}
                                </p>
                                <div className="space-y-3">
                                    <div className="bg-white/60 p-4 transform rotate-1 border border-gray-200 shadow-sm">
                                        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-scrap-sage uppercase tracking-wider font-head">
                                            <Sparkles className="w-3 h-3" />
                                            <span>Librarian's Note</span>
                                        </div>
                                        <p className="text-sm text-scrap-navy leading-relaxed font-body">
                                            "A compelling journey waiting to be unfolded. Perfect for a quiet afternoon."
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-4">
                                        {selectedBookForDetails.progress > 0 && (
                                            <span className="px-3 py-1 bg-scrap-kraft text-xs font-bold text-scrap-navy border border-scrap-navy/20 transform -rotate-2 shadow-sm">
                                                {selectedBookForDetails.progress}% Read
                                            </span>
                                        )}
                                        {selectedBookForDetails.isFavorite && (
                                            <span className="px-3 py-1 bg-[#F1E0C5] text-xs font-bold text-scrap-navy border border-scrap-navy/20 transform rotate-2 shadow-sm flex items-center gap-1">
                                                <Star className="w-3 h-3 fill-current" /> Favorite
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 flex gap-3">
                                <button
                                    onClick={handleStartReading}
                                    className="flex-1 px-6 py-3 bg-scrap-navy text-scrap-cream font-head font-bold text-lg shadow-scrap-card hover:shadow-scrap-lift hover:-translate-y-1 transition-all rounded-sm border-2 border-transparent"
                                >
                                    {selectedBookForDetails.progress > 0 ? "Continue" : "Start Reading"}
                                </button>
                                <button
                                    onClick={() => setSelectedBookForDetails(null)}
                                    className="px-4 py-2 font-head font-bold text-scrap-navy hover:text-red-600 transition-colors"
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

      {filterBy === "all" && !searchTerm && books.length > 0 && (
        <BunniesPick books={books} onSelectBook={handleBookClick} />
      )}

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div className="relative">
          <h2 className="text-4xl font-head font-bold text-scrap-navy drop-shadow-sm transform -rotate-1">Library</h2>
          <div className="absolute -bottom-2 left-0 w-full h-1 bg-scrap-sage/40 rounded-full" />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-white border border-gray-200 shadow-sm rotate-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 transition-all ${viewMode === "grid" ? "bg-scrap-kraft text-scrap-navy" : "text-scrap-blue hover:text-scrap-navy"}`}
              aria-label="Grid view"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 transition-all ${viewMode === "list" ? "bg-scrap-kraft text-scrap-navy" : "text-scrap-blue hover:text-scrap-navy"}`}
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
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all text-sm font-bold font-body text-scrap-navy rotate-[-1deg]"
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
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all text-sm font-bold font-body text-scrap-navy rotate-[1deg]"
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
          <div className="space-y-8">
            {Object.entries(seriesGroups)
              .slice(0, 2)
              .map(([series, seriesBooks]) => (
                <div key={series} className="bg-white/40 p-4 rounded-lg border border-dashed border-scrap-navy/10 transform rotate-[0.5deg]">
                  <div className="flex items-center gap-2 mb-2 text-sm font-bold font-head text-scrap-navy">
                    <span className="bg-scrap-navy text-white px-2 py-0.5 rounded-sm transform -rotate-2">SERIES</span>
                    <span>{series}</span>
                    <ChevronRight className="w-4 h-4 opacity-50" />
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
          <p className="mb-4 text-xs font-body text-scrap-blue italic">
            Searching through the archives for "{searchTerm}"...
          </p>
        )}

        {displayBooks.length === 0 && searchTerm ? (
          <div className="text-center py-12 relative">
             <div className="absolute inset-0 flex items-center justify-center opacity-10 text-9xl pointer-events-none">?</div>
             <div className="w-24 h-24 bg-scrap-kraft rounded-full flex items-center justify-center border-4 border-white shadow-scrap-card mx-auto mb-4 animate-float transform rotate-3">
                <Ghost className="w-12 h-12 text-scrap-navy" strokeWidth={1.5} />
             </div>
             <p className="text-scrap-navy font-bold font-head text-xl">No spirits found.</p>
             <p className="text-scrap-blue text-sm font-body italic">Try summoning a different title.</p>
          </div>
        ) : displayBooks.length === 0 ? (
           null
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 sm:gap-8 px-2">
            {visibleBooks.map((book, i) => (
              <div
                key={book.id}
                className="transform transition-transform hover:-translate-y-2 duration-300"
                style={{ transform: `rotate(${i % 3 - 1}deg)` }}
              >
                <BookCard book={book} onSelect={handleBookClick} onToggleFavorite={onToggleFavorite} />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleBooks.map((book) => (
              <button
                key={book.id}
                onClick={() => handleBookClick(book)}
                className="w-full flex items-center gap-4 p-4 bg-white border border-gray-200 shadow-sm hover:shadow-scrap-card hover:-translate-x-1 hover:border-scrap-navy transition-all duration-200 text-left group transform rotate-[0.5deg]"
              >
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  className="w-12 h-16 object-cover shadow-sm border border-white transform -rotate-2 group-hover:rotate-0 transition-transform"
                  onError={(e) => {
                    const img = e.currentTarget;
                    img.onerror = null;
                    img.style.visibility = "hidden";
                  }}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-base font-head text-scrap-navy truncate group-hover:text-scrap-blue transition-colors">
                    {book.title}
                  </h4>
                  <p className="text-sm font-body text-scrap-blue truncate">{book.author}</p>
                  <div className="flex items-center gap-2.5 mt-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[100px] border border-gray-200">
                      <div
                        className="h-full bg-scrap-sage rounded-full"
                        style={{ width: `${book.progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-scrap-blue tabular-nums">
                      {book.progress}%
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(book.id);
                  }}
                  className={`p-2 hover:scale-110 transition-transform ${book.isFavorite
                    ? "text-[#F1E0C5]"
                    : "text-gray-300 hover:text-[#F1E0C5]"
                    }`}
                >
                  <Star className={`w-5 h-5 ${book.isFavorite ? "fill-current stroke-scrap-navy" : ""}`} />
                </button>
              </button>
            ))}
          </div>
        )}
        {visibleBooks.length < displayBooks.length && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + LIBRARY_PAGE_SIZE)}
              className="px-6 py-2 rounded-full bg-white border-2 border-scrap-navy font-bold font-head text-scrap-navy hover:bg-scrap-navy hover:text-white transition-colors shadow-scrap-card"
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
