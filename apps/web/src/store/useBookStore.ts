import { create } from "zustand";
import type { Book, Bookmark, FilterOption, SortOption } from "@/types";

type LibrarySnapshot = {
  books: Book[];
  sortedBooks: Book[];
  recentBooks: Book[];
  favoriteBooks: Book[];
  seriesGroups: Record<string, Book[]>;
  isLoading: boolean;
  sortBy: SortOption;
  filterBy: FilterOption;
};

type LibraryHandlers = {
  addBook: (file: File) => Promise<void>;
  updateBookProgress: (id: string, progress: number, lastLocation: string) => Promise<void>;
  toggleFavorite: (id: string) => void;
  addBookmark: (bookId: string, bookmark: Bookmark) => void;
  removeBookmark: (bookId: string, bookmarkId: string) => void;
  getBookContent: (id: string) => Promise<Blob>;
  reloadBooks: () => Promise<void>;
  setSortBy: (sortBy: SortOption) => void;
  setFilterBy: (filterBy: FilterOption) => void;
};

type BookStoreState = LibrarySnapshot & {
  setSnapshot: (snapshot: LibrarySnapshot) => void;
  bindHandlers: (handlers: LibraryHandlers) => void;
  addBook: (file: File) => Promise<void>;
  updateBookProgress: (id: string, progress: number, lastLocation: string) => Promise<void>;
  toggleFavorite: (id: string) => void;
  addBookmark: (bookId: string, bookmark: Bookmark) => void;
  removeBookmark: (bookId: string, bookmarkId: string) => void;
  getBookContent: (id: string) => Promise<Blob>;
  reloadBooks: () => Promise<void>;
  getBookById: (id: string | null) => Book | null;
  setSortBy: (sortBy: SortOption) => void;
  setFilterBy: (filterBy: FilterOption) => void;
  handlers: LibraryHandlers | null;
};

const emptySnapshot: LibrarySnapshot = {
  books: [],
  sortedBooks: [],
  recentBooks: [],
  favoriteBooks: [],
  seriesGroups: {},
  isLoading: true,
  sortBy: "recent",
  filterBy: "all",
};

export const useBookStore = create<BookStoreState>((set, get) => ({
  ...emptySnapshot,
  handlers: null,

  setSnapshot: (snapshot) => set(snapshot),
  bindHandlers: (handlers) => set({ handlers }),

  addBook: async (file) => {
    const handlers = get().handlers;
    if (!handlers) return;
    await handlers.addBook(file);
  },
  updateBookProgress: async (id, progress, lastLocation) => {
    const handlers = get().handlers;
    if (!handlers) return;
    await handlers.updateBookProgress(id, progress, lastLocation);
  },

  toggleFavorite: (id) => {
    const handlers = get().handlers;
    if (!handlers) return;
    handlers.toggleFavorite(id);
  },
  addBookmark: (bookId, bookmark) => {
    const handlers = get().handlers;
    if (!handlers) return;
    handlers.addBookmark(bookId, bookmark);
  },
  removeBookmark: (bookId, bookmarkId) => {
    const handlers = get().handlers;
    if (!handlers) return;
    handlers.removeBookmark(bookId, bookmarkId);
  },
  getBookContent: async (id) => {
    const handlers = get().handlers;
    if (!handlers) throw new Error("Book handlers unavailable");
    return handlers.getBookContent(id);
  },
  reloadBooks: async () => {
    const handlers = get().handlers;
    if (!handlers) return;
    await handlers.reloadBooks();
  },
  getBookById: (id) => {
    if (!id) return null;
    return get().books.find((book) => book.id === id) || null;
  },

  setSortBy: (sortBy) => {
    set({ sortBy });
    const handlers = get().handlers;
    if (!handlers) return;
    handlers.setSortBy(sortBy);
  },

  setFilterBy: (filterBy) => {
    set({ filterBy });
    const handlers = get().handlers;
    if (!handlers) return;
    handlers.setFilterBy(filterBy);
  },
}));
