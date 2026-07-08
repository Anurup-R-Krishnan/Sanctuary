import { Star, Clock, ChevronRight, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import type { Book, SortOption, FilterOption, ViewMode } from "@/types";

import { DeleteBookDialog } from "@/components/library/DeleteBookDialog";
import { HorizontalScroll } from "@/components/library/HorizontalScroll";
import { LibraryEmptyState } from "@/components/library/LibraryEmptyState";
import { LibraryToolbar } from "@/components/library/LibraryToolbar";
import { SectionHeader } from "@/components/library/SectionHeader";
import { SkeletonCard } from "@/components/library/SkeletonCard";
import { useBookStore } from "@/store/useBookStore";
import { useUIStore } from "@/store/useUIStore";

import AddBookButton from "../ui/AddBookButton";
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
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);

  const SORT_LABELS: Record<SortOption, string> = {
    recent: "Recently Opened",
    title: "Title",
    author: "Author",
    progress: "Progress",
    added: "Date Added",
  };
  const FILTER_LABELS: Record<FilterOption, string> = {
    all: "All Books",
    favorites: "Favorites",
    "to-read": "To Read",
    reading: "Reading",
    finished: "Finished",
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
    return <LibraryEmptyState onAddBook={addBook} />;
  }

  return (
    <div className="page-stack">
      <LibraryToolbar
        bookCount={books.length}
        viewMode={viewMode}
        setViewMode={setViewMode}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortLabel={sortLabel}
        showSortMenu={showSortMenu}
        setShowSortMenu={setShowSortMenu}
        filterBy={filterBy}
        setFilterBy={setFilterBy}
        filterLabel={filterLabel}
        showFilterMenu={showFilterMenu}
        setShowFilterMenu={setShowFilterMenu}
      />

      {recentBooks.length > 0 && filterBy === "all" && !searchTerm && (
        <section>
          <SectionHeader title="Continue Reading" count={recentBooks.length} icon={Clock} />
          <HorizontalScroll books={recentBooks.slice(0, 6)} onSelectBook={onSelectBook} onToggleFavorite={onToggleFavorite} onDelete={onDeleteBook} />
        </section>
      )}

      {favoriteBooks.length > 0 && filterBy === "all" && !searchTerm && (
        <section>
          <SectionHeader title="Favorites" count={favoriteBooks.length} icon={Star} />
          <HorizontalScroll books={favoriteBooks.slice(0, 6)} onSelectBook={onSelectBook} onToggleFavorite={onToggleFavorite} onDelete={onDeleteBook} />
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
                  <HorizontalScroll books={seriesBooks} onSelectBook={onSelectBook} onToggleFavorite={onToggleFavorite} onDelete={onDeleteBook} />
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

      <AddBookButton onAddBook={addBook} />

      <DeleteBookDialog
        isOpen={!!bookToDelete}
        onClose={() => setBookToDelete(null)}
        book={bookToDelete}
        onConfirm={(id) => {
          onDeleteBook(id);
          setBookToDelete(null);
        }}
      />
    </div>
  );
};

export default LibraryGrid;
