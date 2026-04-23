import { useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useBookStore } from "@/store/useBookStore";
import { LibraryService } from "@/services/LibraryService";

type UseBookLibraryOptions = { persistent?: boolean };

export function useBookLibrary(options: UseBookLibraryOptions = {}) {
  const { persistent = true } = options;
  const { getToken } = useAuth();
  
  const books = useBookStore((state) => state.books);
  const sortedBooks = useBookStore((state) => state.sortedBooks);
  const recentBooks = useBookStore((state) => state.recentBooks);
  const favoriteBooks = useBookStore((state) => state.favoriteBooks);
  const seriesGroups = useBookStore((state) => state.seriesGroups);
  const isLoading = useBookStore((state) => state.isLoading);
  const sortBy = useBookStore((state) => state.sortBy);
  const filterBy = useBookStore((state) => state.filterBy);
  const setSortBy = useBookStore((state) => state.setSortBy);
  const setFilterBy = useBookStore((state) => state.setFilterBy);

  const libraryService = useMemo(() => new LibraryService(getToken, persistent), [getToken, persistent]);

  useEffect(() => {
    libraryService.loadBooks();
    return () => libraryService.cleanupAllObjectUrls();
  }, [libraryService]);

  return {
    books,
    sortedBooks,
    recentBooks,
    favoriteBooks,
    seriesGroups,
    isLoading,
    sortBy,
    filterBy,
    setSortBy,
    setFilterBy,
    isPersistent: persistent,
    addBook: libraryService.addBook.bind(libraryService),
    updateBookProgress: libraryService.updateBookProgress.bind(libraryService),
    toggleFavorite: libraryService.toggleFavorite.bind(libraryService),
    addBookmark: libraryService.addBookmark.bind(libraryService),
    removeBookmark: libraryService.removeBookmark.bind(libraryService),
    getBookContent: libraryService.getBookContent.bind(libraryService),
    reloadBooks: libraryService.loadBooks.bind(libraryService),
  };
}
