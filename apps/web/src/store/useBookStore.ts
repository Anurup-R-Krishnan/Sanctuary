import { create } from "zustand";

import type { Book, FilterOption, SortOption } from "@/types";

type BookStoreState = {
  activeCollection: string | null;
  allCollections: string[];
  books: Book[];
  favoriteBooks: Book[];
  filterBy: FilterOption;
  isLoading: boolean;
  recentBooks: Book[];
  selectedBookIds: Set<string>;
  seriesGroups: Record<string, Book[]>;
  sortBy: SortOption;
  sortedBooks: Book[];

  clearSelection: () => void;
  getBookById: (id: string | null) => Book | null;
  setActiveCollection: (name: string | null) => void;
  setBooks: (books: Book[]) => void;
  setFilterBy: (filterBy: FilterOption) => void;
  setIsLoading: (isLoading: boolean) => void;
  setSelectedBookIds: (ids: Set<string>) => void;
  setSortBy: (sortBy: SortOption) => void;
  toggleBookSelection: (id: string) => void;
  updateDerivedState: (books: Book[]) => void;
};

const computeDerivedState = (
  books: Book[],
  sortBy: SortOption,
  filterBy: FilterOption,
  activeCollection: string | null
) => {
  const recentBooks = [...books]
    .filter((book) => !book.isIncognito)
    .sort((a, b) => new Date(b.lastOpenedAt || 0).getTime() - new Date(a.lastOpenedAt || 0).getTime())
    .slice(0, 10);

  const favoriteBooks = books.filter((book) => book.isFavorite);

  const sortedBooks = books.filter((book) => {
    if (filterBy === "favorites") return !!book.isFavorite;
    if (filterBy === "collection") return activeCollection != null && (book.collections ?? []).includes(activeCollection);
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

  const collectionSet = new Set<string>();
  books.forEach((book) => {
    (book.collections ?? []).forEach((c) => collectionSet.add(c));
  });
  const allCollections = [...collectionSet].sort();

  return { allCollections, favoriteBooks, recentBooks, seriesGroups, sortedBooks };
};

export const useBookStore = create<BookStoreState>((set, get) => ({
  activeCollection: null,
  allCollections: [],
  books: [],
  favoriteBooks: [],
  filterBy: "all",
  isLoading: true,
  recentBooks: [],
  selectedBookIds: new Set<string>(),
  seriesGroups: {},
  sortBy: "recent",
  sortedBooks: [],

  clearSelection: () => set({ selectedBookIds: new Set<string>() }),

  getBookById: (id) => {
    if (!id) return null;
    return get().books.find((book) => book.id === id) || null;
  },

  setActiveCollection: (name) => {
    set({ activeCollection: name, ...computeDerivedState(get().books, get().sortBy, get().filterBy, name) });
  },

  setBooks: (books) =>
    set({ books, ...computeDerivedState(books, get().sortBy, get().filterBy, get().activeCollection) }),

  setFilterBy: (filterBy) => {
    set({ filterBy, ...computeDerivedState(get().books, get().sortBy, filterBy, get().activeCollection) });
  },

  setIsLoading: (isLoading) => set({ isLoading }),

  setSelectedBookIds: (ids) => set({ selectedBookIds: ids }),

  setSortBy: (sortBy) => {
    set({ sortBy, ...computeDerivedState(get().books, sortBy, get().filterBy, get().activeCollection) });
  },

  toggleBookSelection: (id) => {
    const current = get().selectedBookIds;
    const next = new Set(current);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    set({ selectedBookIds: next });
  },

  updateDerivedState: (books) => {
    set({ ...computeDerivedState(books, get().sortBy, get().filterBy, get().activeCollection) });
  },
}));
