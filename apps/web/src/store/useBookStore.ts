import { create } from "zustand";
import type { Book, FilterOption, SortOption } from "@/types";

type BookStoreState = {
  books: Book[];
  sortedBooks: Book[];
  recentBooks: Book[];
  favoriteBooks: Book[];
  seriesGroups: Record<string, Book[]>;
  isLoading: boolean;
  sortBy: SortOption;
  filterBy: FilterOption;
  
  setBooks: (books: Book[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  setSortBy: (sortBy: SortOption) => void;
  setFilterBy: (filterBy: FilterOption) => void;
  updateDerivedState: (books: Book[]) => void;
  getBookById: (id: string | null) => Book | null;
};

const computeDerivedState = (books: Book[], sortBy: SortOption, filterBy: FilterOption) => {
  const recentBooks = [...books]
    .filter((book) => !book.isIncognito)
    .sort((a, b) => new Date(b.lastOpenedAt || 0).getTime() - new Date(a.lastOpenedAt || 0).getTime())
    .slice(0, 10);

  const favoriteBooks = books.filter((book) => book.isFavorite);

  const sortedBooks = books.filter((book) => {
    if (filterBy === "favorites") return !!book.isFavorite;
    if (filterBy === "all") return true;
    return book.readingList === filterBy;
  }).sort((a, b) => {
    switch (sortBy) {
      case "title":
        return a.title.localeCompare(b.title);
      case "author":
        return a.author.localeCompare(b.author);
      case "progress":
        return b.progress - a.progress;
      case "added":
        return new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime();
      case "recent":
      default:
        return new Date(b.lastOpenedAt || 0).getTime() - new Date(a.lastOpenedAt || 0).getTime();
    }
  });

  const seriesGroups: Record<string, Book[]> = {};
  books
    .filter((book) => book.series)
    .forEach((book) => {
      const seriesKey = book.series!;
      let group = seriesGroups[seriesKey];
      if (!group) {
        group = [];
        seriesGroups[seriesKey] = group;
      }
      group.push(book);
    });

  Object.values(seriesGroups).forEach((group) => {
    group.sort((a, b) => (a.seriesIndex || 0) - (b.seriesIndex || 0));
  });

  return { recentBooks, favoriteBooks, sortedBooks, seriesGroups };
};

export const useBookStore = create<BookStoreState>((set, get) => ({
  books: [],
  sortedBooks: [],
  recentBooks: [],
  favoriteBooks: [],
  seriesGroups: {},
  isLoading: true,
  sortBy: "recent",
  filterBy: "all",

  setBooks: (books) => set({ books, ...computeDerivedState(books, get().sortBy, get().filterBy) }),
  setIsLoading: (isLoading) => set({ isLoading }),
  
  setSortBy: (sortBy) => {
    set({ sortBy, ...computeDerivedState(get().books, sortBy, get().filterBy) });
  },

  setFilterBy: (filterBy) => {
    set({ filterBy, ...computeDerivedState(get().books, get().sortBy, filterBy) });
  },

  updateDerivedState: (books) => {
    set({ ...computeDerivedState(books, get().sortBy, get().filterBy) });
  },

  getBookById: (id) => {
    if (!id) return null;
    return get().books.find((book) => book.id === id) || null;
  },
}));
