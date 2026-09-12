import { ChevronRight, Clock, Search, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import type { Book, FilterOption, SortOption, ViewMode } from "@/types";

import { CatalogBrowser } from "@/components/library/CatalogBrowser";
import { HorizontalScroll } from "@/components/library/HorizontalScroll";
import { LibraryEmptyState } from "@/components/library/LibraryEmptyState";
import { LibraryToolbar } from "@/components/library/LibraryToolbar";
import { SectionHeader } from "@/components/library/SectionHeader";
import { SkeletonCard } from "@/components/library/SkeletonCard";
import { useBookStore } from "@/store/useBookStore";
import { useUIStore } from "@/store/useUIStore";

import BookCard from "../ui/BookCard";

interface LibraryGridProps {
  addBook: (file: File) => Promise<void>;
  deleteBook: (id: string) => void;
  onSelectBook: (book: Book) => void;
  toggleFavorite: (id: string) => void;
}



function LibraryGrid({
  onSelectBook,
  addBook,
  toggleFavorite: onToggleFavorite,
  deleteBook: onDeleteBook,
}: LibraryGridProps) {
  const { searchTerm } = useUIStore(useShallow((state) => ({
    searchTerm: state.searchTerm,
  })));
  const {
    books,
    sortedBooks,
    recentBooks,
    favoriteBooks,
    seriesGroups,
    isLoading,
    sortBy,
    setSortBy,
    filterBy,
    setFilterBy,
  } = useBookStore(useShallow((state) => ({
    books: state.books,
    sortedBooks: state.sortedBooks,
    recentBooks: state.recentBooks,
    favoriteBooks: state.favoriteBooks,
    seriesGroups: state.seriesGroups,
    isLoading: state.isLoading,
    sortBy: state.sortBy,
    setSortBy: state.setSortBy,
    filterBy: state.filterBy,
    setFilterBy: state.setFilterBy,
  })));

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  const SORT_LABELS: Record<SortOption, string> = {
    added: "Date Added",
    author: "Author",
    progress: "Progress",
    recent: "Recently Opened",
    title: "Title",
  };
  const FILTER_LABELS: Record<FilterOption, string> = {
    all: "All Books",
    favorites: "Favorites",
    finished: "Finished",
    reading: "Reading",
    "to-read": "To Read",
  };
  const sortLabel = SORT_LABELS[sortBy] ?? sortBy;
  const filterLabel = FILTER_LABELS[filterBy] ?? filterBy;

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
            <div className="h-8 w-40 rounded-lg bg-black/[0.05] dark:bg-white/[0.08] animate-pulse-soft" />
            <div className="h-4 w-28 rounded bg-black/[0.04] dark:bg-white/[0.06] animate-pulse-soft" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {[...Array(10)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <>
        <LibraryEmptyState onAddBook={addBook} onOpenCatalog={() => setIsCatalogOpen(true)} />
        <CatalogBrowser
          isOpen={isCatalogOpen}
          onClose={() => setIsCatalogOpen(false)}
          onImport={addBook}
        />
      </>
    );
  }

  return (
    <div className="page-stack">
      <LibraryToolbar
        bookCount={books.length}
        filterBy={filterBy}
        filterLabel={filterLabel}
        onOpenCatalog={() => setIsCatalogOpen(true)}
        setFilterBy={setFilterBy}
        setShowFilterMenu={setShowFilterMenu}
        setShowSortMenu={setShowSortMenu}
        setSortBy={setSortBy}
        setViewMode={setViewMode}
        showFilterMenu={showFilterMenu}
        showSortMenu={showSortMenu}
        sortBy={sortBy}
        sortLabel={sortLabel}
        viewMode={viewMode}
      />

      {recentBooks.length > 0 && filterBy === "all" && !searchTerm && (
        <section className="mb-10">
          <BookCard 
            book={recentBooks[0]} 
            onSelect={onSelectBook} 
            onToggleFavorite={onToggleFavorite} 
            onDelete={onDeleteBook} 
            variant="featured" 
          />
        </section>
      )}

      {(recentBooks.length > 1 || favoriteBooks.length > 0 || Object.keys(seriesGroups).length > 0) &&
        filterBy === "all" && !searchTerm && (
        <section className="mb-10 space-y-6">
          {recentBooks.length > 1 && (
            <div>
              <SectionHeader title="More in Progress" count={recentBooks.length - 1} icon={Clock} variant="quiet" />
              <HorizontalScroll books={recentBooks.slice(1, 7)} onSelectBook={onSelectBook} onToggleFavorite={onToggleFavorite} onDelete={onDeleteBook} />
            </div>
          )}

          {favoriteBooks.length > 0 && (
            <div>
              <SectionHeader title="Favorites" count={favoriteBooks.length} icon={Star} variant="quiet" />
              <HorizontalScroll books={favoriteBooks.slice(0, 6)} onSelectBook={onSelectBook} onToggleFavorite={onToggleFavorite} onDelete={onDeleteBook} />
            </div>
          )}

          {Object.keys(seriesGroups).length > 0 && (
            <div>
              <SectionHeader title="Series" variant="quiet" />
              <div className="space-y-4">
                {Object.entries(seriesGroups)
                  .slice(0, 2)
                  .map(([series, seriesBooks]) => (
                    <div key={series}>
                      <div className="flex items-center gap-1 mb-2 text-xs font-medium text-light-text-muted dark:text-dark-text-muted">
                        <span>{series}</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                      <HorizontalScroll books={seriesBooks} onSelectBook={onSelectBook} onToggleFavorite={onToggleFavorite} onDelete={onDeleteBook} />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className={(recentBooks.length > 0 || favoriteBooks.length > 0) && filterBy === "all" && !searchTerm ? "pt-6 border-t border-black/[0.06] dark:border-white/[0.06]" : ""}>
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
          <div className="flex flex-col items-center justify-center py-16 text-center animate-fadeIn">
            <div className="w-16 h-16 mb-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] flex items-center justify-center border border-black/[0.06] dark:border-white/[0.06]">
              <Search className="w-7 h-7 text-light-text-muted dark:text-dark-text-muted" strokeWidth={1.5} />
            </div>
            <p className="text-light-text dark:text-dark-text font-medium">No books found</p>
            <p className="mt-1 text-sm text-light-text-muted dark:text-dark-text-muted">
              Try a different search term or clear your query.
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {displayBooks.map((book) => (
              <div key={book.id}>
                <BookCard book={book} onSelect={onSelectBook} onToggleFavorite={onToggleFavorite} onDelete={onDeleteBook} />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {displayBooks.map((book) => (
              <div key={book.id}>
                <BookCard
                  book={book}
                  onSelect={onSelectBook}
                  onToggleFavorite={onToggleFavorite}
                  onDelete={onDeleteBook}
                  variant="compact"
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <CatalogBrowser
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        onImport={addBook}
      />
    </div>
  );
};

export default LibraryGrid;
