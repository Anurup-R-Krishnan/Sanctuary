import { CheckSquare, ChevronRight, Clock, Search, Square, Star } from "lucide-react";
import React, { Suspense, lazy, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import type { Book, FilterOption, SortOption, ViewMode } from "@/types";

import { BatchActionBar } from "@/components/library/BatchActionBar";
import { BookMetadataModal } from "@/components/library/BookMetadataModal";
import { HorizontalScroll } from "@/components/library/HorizontalScroll";
import { LibraryEmptyState } from "@/components/library/LibraryEmptyState";
import { LibraryToolbar } from "@/components/library/LibraryToolbar";
import { SectionHeader } from "@/components/library/SectionHeader";
import { SkeletonCard } from "@/components/library/SkeletonCard";
import { formatBatchAnnotationsAsMarkdown, triggerFileDownload } from "@/services/annotationExportService";
import { useBookStore } from "@/store/useBookStore";
import { useUIStore } from "@/store/useUIStore";

import BookCard from "../ui/BookCard";

const CatalogBrowser = lazy(() =>
  import("@/components/library/CatalogBrowser").then((m) => ({ default: m.CatalogBrowser }))
);

const DailyDigestModal = lazy(() =>
  import("@/components/digest/DailyDigestModal").then((m) => ({ default: m.DailyDigestModal }))
);

const SeriesShelfModal = lazy(() =>
  import("@/components/library/SeriesShelfModal").then((m) => ({ default: m.SeriesShelfModal }))
);

interface LibraryGridProps {
  addBook: (file: File) => Promise<void>;
  deleteBook: (id: string) => void;
  onBatchDelete: (ids: string[]) => void;
  onSelectBook: (book: Book) => void;
  onUpdateBook: (id: string, updates: Partial<Book>) => void;
  toggleFavorite: (id: string) => void;
}

function LibraryGrid({
  addBook,
  deleteBook: onDeleteBook,
  onBatchDelete,
  onSelectBook,
  onUpdateBook,
  toggleFavorite: onToggleFavorite,
}: LibraryGridProps) {
  const { searchTerm } = useUIStore(useShallow((state) => ({
    searchTerm: state.searchTerm,
  })));
  const {
    activeCollection,
    allCollections,
    books,
    clearSelection,
    favoriteBooks,
    filterBy,
    isLoading,
    recentBooks,
    selectedBookIds,
    seriesGroups,
    setActiveCollection,
    setFilterBy,
    setSortBy,
    sortBy,
    sortedBooks,
    toggleBookSelection,
  } = useBookStore(useShallow((state) => ({
    activeCollection: state.activeCollection,
    allCollections: state.allCollections,
    books: state.books,
    clearSelection: state.clearSelection,
    favoriteBooks: state.favoriteBooks,
    filterBy: state.filterBy,
    isLoading: state.isLoading,
    recentBooks: state.recentBooks,
    selectedBookIds: state.selectedBookIds,
    seriesGroups: state.seriesGroups,
    setActiveCollection: state.setActiveCollection,
    setFilterBy: state.setFilterBy,
    setSortBy: state.setSortBy,
    sortBy: state.sortBy,
    sortedBooks: state.sortedBooks,
    toggleBookSelection: state.toggleBookSelection,
  })));

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isDailyDigestOpen, setIsDailyDigestOpen] = useState(false);
  const [isSeriesShelfOpen, setIsSeriesShelfOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const isSelecting = selectedBookIds.size > 0;

  const SORT_LABELS: Record<SortOption, string> = {
    added: "Date Added",
    author: "Author",
    progress: "Progress",
    recent: "Recently Opened",
    title: "Title",
  };
  const FILTER_LABELS: Record<FilterOption, string> = {
    all: "All Books",
    collection: "Collection",
    favorites: "Favorites",
    finished: "Finished",
    reading: "Reading",
    "to-read": "To Read",
  };
  const sortLabel = SORT_LABELS[sortBy] ?? sortBy;
  const filterLabel = filterBy === "collection" && activeCollection
    ? activeCollection
    : (FILTER_LABELS[filterBy] ?? filterBy);

  const displayBooks = useMemo(() => {
    if (!searchTerm) return sortedBooks;
    const term = searchTerm.toLowerCase();
    return sortedBooks.filter(
      (b) =>
        b.title.toLowerCase().includes(term) ||
        b.author.toLowerCase().includes(term) ||
        (b.tags ?? []).some((t) => t.toLowerCase().includes(term)) ||
        (b.collections ?? []).some((c) => c.toLowerCase().includes(term))
    );
  }, [sortedBooks, searchTerm]);

  const handleBookClick = (book: Book) => {
    if (isSelecting) {
      toggleBookSelection(book.id);
    } else {
      onSelectBook(book);
    }
  };

  const handleAssignCollection = (bookIds: string[], collection: string) => {
    bookIds.forEach((id) => {
      const book = books.find((b) => b.id === id);
      if (!book) return;
      const next = book.collections ?? [];
      if (!next.includes(collection)) {
        onUpdateBook(id, { collections: [...next, collection] });
      }
    });
    clearSelection();
  };

  const handleBatchMarkFinished = (bookIds: string[]) => {
    bookIds.forEach((id) => onUpdateBook(id, { readingList: "finished" }));
    clearSelection();
  };

  const handleBatchDelete = (bookIds: string[]) => {
    onBatchDelete(bookIds);
    clearSelection();
  };

  const handleBatchExportAnnotations = (bookIds: string[]) => {
    const selectedBooks = books.filter((b) => bookIds.includes(b.id));
    if (selectedBooks.length === 0) return;
    const md = formatBatchAnnotationsAsMarkdown(selectedBooks);
    triggerFileDownload(md, `sanctuary_notes_${Date.now()}.md`, "text/markdown");
    clearSelection();
  };

  const handleSaveMetadata = (updates: Partial<Book>) => {
    if (editingBook) onUpdateBook(editingBook.id, updates);
  };

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
        <Suspense fallback={null}>
          <CatalogBrowser
            isOpen={isCatalogOpen}
            onClose={() => setIsCatalogOpen(false)}
            onImport={addBook}
          />
        </Suspense>
      </>
    );
  }

  return (
    <div className="page-stack">
      {/* Toolbar with multi-select toggle */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <LibraryToolbar
            bookCount={books.length}
            filterBy={filterBy}
            filterLabel={filterLabel}
            onOpenCatalog={() => setIsCatalogOpen(true)}
            onOpenDailyDigest={() => setIsDailyDigestOpen(true)}
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
        </div>
        <button
          aria-label={isSelecting ? "Exit selection mode" : "Select books"}
          className={`shrink-0 rounded-xl p-2 transition-colors ${
            isSelecting
              ? "bg-light-text dark:bg-dark-text text-white dark:text-black"
              : "text-light-text-muted dark:text-dark-text-muted hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
          }`}
          onClick={() => isSelecting ? clearSelection() : undefined}
          title={isSelecting ? "Exit selection" : "Select books"}
        >
          {isSelecting ? (
            <CheckSquare className="h-5 w-5" />
          ) : (
            <Square className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Collection filter pills */}
      {allCollections.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mt-2">
          <button
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filterBy !== "collection"
                ? "bg-black/[0.07] dark:bg-white/[0.09] text-light-text dark:text-dark-text"
                : "text-light-text-muted dark:text-dark-text-muted hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
            }`}
            onClick={() => setFilterBy("all")}
          >
            All
          </button>
          {allCollections.map((col) => (
            <button
              key={col}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filterBy === "collection" && activeCollection === col
                  ? "bg-black/[0.07] dark:bg-white/[0.09] text-light-text dark:text-dark-text"
                  : "text-light-text-muted dark:text-dark-text-muted hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
              }`}
              onClick={() => {
                setActiveCollection(col);
                setFilterBy("collection");
              }}
            >
              {col}
            </button>
          ))}
        </div>
      )}

      {recentBooks.length > 0 && filterBy === "all" && !searchTerm && !isSelecting && (
        <section className="mb-10">
          <BookCard
            book={recentBooks[0]}
            onDelete={onDeleteBook}
            onSelect={onSelectBook}
            onToggleFavorite={onToggleFavorite}
            variant="featured"
          />
        </section>
      )}

      {(recentBooks.length > 1 || favoriteBooks.length > 0 || Object.keys(seriesGroups).length > 0) &&
        filterBy === "all" && !searchTerm && !isSelecting && (
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
              <div className="flex items-center justify-between mb-2">
                <SectionHeader title="Series" variant="quiet" />
                <button
                  onClick={() => setIsSeriesShelfOpen(true)}
                  type="button"
                  className="text-xs font-semibold text-light-accent dark:text-dark-accent hover:underline flex items-center gap-1"
                >
                  <span>View All Series</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
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

      <section className={(recentBooks.length > 0 || favoriteBooks.length > 0) && filterBy === "all" && !searchTerm && !isSelecting ? "pt-6 border-t border-black/[0.06] dark:border-white/[0.06]" : ""}>
        <SectionHeader
          title={searchTerm ? "Results" : "All Books"}
          count={displayBooks.length}
          icon={searchTerm ? Search : undefined}
        />
        {searchTerm && (
          <p className="mb-4 text-xs text-light-text-muted dark:text-dark-text-muted">
            Showing matches for &ldquo;{searchTerm}&rdquo;. Curated sections are hidden while searching.
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
              isSelecting ? (
                <div
                  key={book.id}
                  aria-checked={selectedBookIds.has(book.id)}
                  className="relative cursor-pointer"
                  role="checkbox"
                  tabIndex={0}
                  onClick={() => toggleBookSelection(book.id)}
                  onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") toggleBookSelection(book.id); }}
                >
                  <div className={`absolute top-2 left-2 z-10 w-5 h-5 rounded-full border-2 transition-colors ${
                    selectedBookIds.has(book.id)
                      ? "bg-light-text dark:bg-dark-text border-light-text dark:border-dark-text"
                      : "bg-white/80 dark:bg-black/50 border-black/30 dark:border-white/30"
                  }`} />
                  <BookCard
                    book={book}
                    onSelect={() => toggleBookSelection(book.id)}
                  />
                </div>
              ) : (
                <div key={book.id} className="relative group/card">
                  <BookCard
                    book={book}
                    onDelete={onDeleteBook}
                    onSelect={handleBookClick}
                    onToggleFavorite={onToggleFavorite}
                  />
                  <button
                    aria-label={`Edit metadata for ${book.title}`}
                    className="absolute top-2 right-2 z-10 opacity-0 group-hover/card:opacity-100 rounded-full p-1 bg-black/40 text-white transition-opacity"
                    onClick={(e) => { e.stopPropagation(); setEditingBook(book); }}
                  >
                    <span className="sr-only">Edit</span>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                </div>
              )
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {displayBooks.map((book) => (
              isSelecting ? (
                <div
                  key={book.id}
                  aria-checked={selectedBookIds.has(book.id)}
                  className="relative cursor-pointer"
                  role="checkbox"
                  tabIndex={0}
                  onClick={() => toggleBookSelection(book.id)}
                  onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") toggleBookSelection(book.id); }}
                >
                  <div className={`absolute top-1/2 left-3 z-10 -translate-y-1/2 w-4 h-4 rounded-full border-2 transition-colors ${
                    selectedBookIds.has(book.id)
                      ? "bg-light-text dark:bg-dark-text border-light-text dark:border-dark-text"
                      : "bg-white/80 dark:bg-black/50 border-black/30 dark:border-white/30"
                  }`} />
                  <BookCard
                    book={book}
                    onSelect={() => toggleBookSelection(book.id)}
                    variant="compact"
                  />
                </div>
              ) : (
                <div key={book.id} className="relative group/card">
                  <BookCard
                    book={book}
                    onDelete={onDeleteBook}
                    onSelect={handleBookClick}
                    onToggleFavorite={onToggleFavorite}
                    variant="compact"
                  />
                  <button
                    aria-label={`Edit metadata for ${book.title}`}
                    className="absolute top-1/2 right-3 z-10 -translate-y-1/2 opacity-0 group-hover/card:opacity-100 rounded-full p-1 bg-black/40 text-white transition-opacity"
                    onClick={(e) => { e.stopPropagation(); setEditingBook(book); }}
                  >
                    <span className="sr-only">Edit</span>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                </div>
              )
            ))}
          </div>
        )}
      </section>

      <Suspense fallback={null}>
        <CatalogBrowser
          isOpen={isCatalogOpen}
          onClose={() => setIsCatalogOpen(false)}
          onImport={addBook}
        />
      </Suspense>

      {isSeriesShelfOpen && (
        <Suspense fallback={null}>
          <SeriesShelfModal
            books={books}
            isOpen={isSeriesShelfOpen}
            onClose={() => setIsSeriesShelfOpen(false)}
            onSelectBook={onSelectBook}
          />
        </Suspense>
      )}

      {isDailyDigestOpen && (
        <Suspense fallback={null}>
          <DailyDigestModal
            isOpen={isDailyDigestOpen}
            onClose={() => setIsDailyDigestOpen(false)}
            onOpenBook={(bookId) => {
              const target = books.find((b) => b.id === bookId);
              if (target) onSelectBook(target);
            }}
          />
        </Suspense>
      )}

      <BatchActionBar
        onAssignCollection={handleAssignCollection}
        onClearSelection={clearSelection}
        onDelete={handleBatchDelete}
        onExportAnnotations={handleBatchExportAnnotations}
        onMarkFinished={handleBatchMarkFinished}
        selectedBookIds={[...selectedBookIds]}
      />

      <BookMetadataModal
        allCollections={allCollections}
        book={editingBook}
        onClose={() => setEditingBook(null)}
        onSave={handleSaveMetadata}
      />
    </div>
  );
}

export default LibraryGrid;
