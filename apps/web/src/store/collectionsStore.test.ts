import { describe, beforeEach, expect, it } from "bun:test";

import type { Book, FilterOption } from "@/types";

import { useBookStore } from "@/store/useBookStore";

// Minimal book factory
const makeBook = (id: string, overrides: Partial<Book> = {}): Book => ({
  author: "Author",
  collections: [],
  epubBlob: null,
  id,
  isFavorite: false,
  lastLocation: "",
  progress: 0,
  title: `Book ${id}`,
  ...overrides,
});

describe("useBookStore — collections and multi-selection", () => {
  beforeEach(() => {
    // Reset store to initial state between tests
    useBookStore.setState({
      activeCollection: null,
      allCollections: [],
      books: [],
      favoriteBooks: [],
      filterBy: "all",
      isLoading: false,
      recentBooks: [],
      selectedBookIds: new Set(),
      seriesGroups: {},
      sortBy: "recent",
      sortedBooks: [],
    });
  });

  it("Book type accepts collections field without TypeScript errors", () => {
    const book: Book = makeBook("1", { collections: ["Fiction", "Work"] });
    expect(book.collections).toEqual(["Fiction", "Work"]);
  });

  it("FilterOption union includes the collection value", () => {
    const option: FilterOption = "collection";
    expect(option).toBe("collection");
  });

  it("setActiveCollection filters sortedBooks to the matching shelf", () => {
    const books = [
      makeBook("a", { collections: ["Fiction"] }),
      makeBook("b", { collections: ["Work"] }),
      makeBook("c", { collections: ["Fiction", "Work"] }),
      makeBook("d", { collections: [] }),
    ];
    useBookStore.getState().setBooks(books);
    useBookStore.getState().setFilterBy("collection");
    useBookStore.getState().setActiveCollection("Fiction");

    const { sortedBooks } = useBookStore.getState();
    expect(sortedBooks.map((b) => b.id).sort()).toEqual(["a", "c"]);
  });

  it("toggleBookSelection adds a book ID when not yet selected", () => {
    useBookStore.getState().toggleBookSelection("book-42");
    expect(useBookStore.getState().selectedBookIds.has("book-42")).toBe(true);
  });

  it("toggleBookSelection removes a book ID that is already selected", () => {
    useBookStore.getState().toggleBookSelection("book-42");
    useBookStore.getState().toggleBookSelection("book-42");
    expect(useBookStore.getState().selectedBookIds.has("book-42")).toBe(false);
  });

  it("clearSelection empties the selectedBookIds set", () => {
    useBookStore.getState().toggleBookSelection("book-1");
    useBookStore.getState().toggleBookSelection("book-2");
    useBookStore.getState().clearSelection();
    expect(useBookStore.getState().selectedBookIds.size).toBe(0);
  });

  it("allCollections is deduplicated and alphabetically sorted from all books", () => {
    const books = [
      makeBook("1", { collections: ["Work", "Fiction"] }),
      makeBook("2", { collections: ["Fiction", "Research"] }),
      makeBook("3", { collections: [] }),
    ];
    useBookStore.getState().setBooks(books);
    expect(useBookStore.getState().allCollections).toEqual(["Fiction", "Research", "Work"]);
  });
});
