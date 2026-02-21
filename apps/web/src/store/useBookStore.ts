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
  addBookmark: (bookId: string, bookmark: Bookmark) => Promise<void>;
  removeBookmark: (bookId: string, bookmarkId: string) => Promise<void>;
  getBookContent: (id: string) => Promise<Blob>;
  reloadBooks: () => Promise<void>;
  setSortBy: (sortBy: SortOption) => void;
  setFilterBy: (filterBy: FilterOption) => void;
};

type BookStoreState = LibrarySnapshot & {
  setSnapshot: (snapshot: LibrarySnapshot) => void;
  bindHandlers: (handlers: LibraryHandlers, ownerId: string) => void;
  addBook: (file: File) => Promise<void>;
  updateBookProgress: (id: string, progress: number, lastLocation: string) => Promise<void>;
  toggleFavorite: (id: string) => void;
  addBookmark: (bookId: string, bookmark: Bookmark) => Promise<void>;
  removeBookmark: (bookId: string, bookmarkId: string) => Promise<void>;
  getBookContent: (id: string) => Promise<Blob>;
  reloadBooks: () => Promise<void>;
  getBookById: (id: string | null) => Book | null;
  setSortBy: (sortBy: SortOption) => void;
  setFilterBy: (filterBy: FilterOption) => void;
  handlers: LibraryHandlers;
  handlersOwnerId: string | null;
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

const unboundHandlers: LibraryHandlers = {
  addBook: async () => {
    throw new Error("Book store not initialized");
  },
  updateBookProgress: async () => {
    throw new Error("Book store not initialized");
  },
  toggleFavorite: () => {
    throw new Error("Book store not initialized");
  },
  addBookmark: () => {
    throw new Error("Book store not initialized");
  },
  removeBookmark: () => {
    throw new Error("Book store not initialized");
  },
  getBookContent: async () => {
    throw new Error("Book store not initialized");
  },
  reloadBooks: async () => {
    throw new Error("Book store not initialized");
  },
  setSortBy: () => undefined,
  setFilterBy: () => undefined,
};

export const useBookStore = create<BookStoreState>((set, get) => ({
  ...emptySnapshot,
  handlers: unboundHandlers,
  handlersOwnerId: null,

  setSnapshot: (snapshot) => set(snapshot),
  bindHandlers: (handlers, ownerId) => {
    const currentOwner = get().handlersOwnerId;
    if (currentOwner && currentOwner !== ownerId) return;
    set({ handlers, handlersOwnerId: ownerId });
  },

  addBook: async (file) => {
    await get().handlers.addBook(file);
  },
  updateBookProgress: async (id, progress, lastLocation) => {
    await get().handlers.updateBookProgress(id, progress, lastLocation);
  },

  toggleFavorite: (id) => {
    get().handlers.toggleFavorite(id);
  },
  addBookmark: async (bookId, bookmark) => {
    await get().handlers.addBookmark(bookId, bookmark);
  },
  removeBookmark: async (bookId, bookmarkId) => {
    await get().handlers.removeBookmark(bookId, bookmarkId);
  },
  getBookContent: async (id) => {
    return get().handlers.getBookContent(id);
  },
  reloadBooks: async () => {
    await get().handlers.reloadBooks();
  },
  getBookById: (id) => {
    if (!id) return null;
    return get().books.find((book) => book.id === id) || null;
  },

  setSortBy: (sortBy) => {
    set({ sortBy });
    get().handlers.setSortBy(sortBy);
  },

  setFilterBy: (filterBy) => {
    set({ filterBy });
    get().handlers.setFilterBy(filterBy);
  },
}));
