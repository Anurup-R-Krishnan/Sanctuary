import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import ePub from "epubjs";
import { v4 as uuidv4 } from "uuid";
import type { Book, Highlight, Bookmark, SortOption, FilterOption } from "../types";
import * as db from "../db";

type UseBookLibraryOptions = { persistent?: boolean };

interface StoredBook {
  id: string;
  title: string;
  author: string;
  coverUrl: Blob;
  epubBlob: Blob;
  progress: number;
  lastLocation: string;
  genre?: string;
  completedAt?: string;
  addedAt?: string;
  lastOpenedAt?: string;
  isFavorite?: boolean;
  isIncognito?: boolean;
  series?: string;
  seriesIndex?: number;
  tags?: string[];
  readingList?: "to-read" | "reading" | "finished";
  highlights?: Highlight[];
  bookmarks?: Bookmark[];
  totalPages?: number;
  locationHistory?: string[];
}

const isStoredBookArray = (items: unknown[]): items is StoredBook[] =>
  items.every((item) => typeof item === "object" && item !== null && "coverUrl" in item && (item as StoredBook).coverUrl instanceof Blob);

export function useBookLibrary(options: UseBookLibraryOptions = {}) {
  const { persistent = true } = options;
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(persistent);
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const objectUrlsRef = useRef<Set<string>>(new Set());

  const registerObjectUrl = (url: string) => { objectUrlsRef.current.add(url); return url; };
  const cleanupObjectUrls = useCallback(() => { objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)); objectUrlsRef.current.clear(); }, []);

  useEffect(() => cleanupObjectUrls, [cleanupObjectUrls]);

  useEffect(() => {
    if (!persistent) { cleanupObjectUrls(); setBooks([]); setIsLoading(false); return; }
    let isActive = true;
    (async () => {
      setIsLoading(true);
      try {
        const stored = await db.getBooks();
        if (!isActive) return;
        cleanupObjectUrls();
        const hydrated: Book[] = Array.isArray(stored) && isStoredBookArray(stored)
          ? stored.map((s): Book => ({
              id: s.id, title: s.title, author: s.author,
              coverUrl: registerObjectUrl(URL.createObjectURL(s.coverUrl)),
              epubBlob: s.epubBlob, progress: s.progress, lastLocation: s.lastLocation,
              genre: s.genre, completedAt: s.completedAt, addedAt: s.addedAt,
              lastOpenedAt: s.lastOpenedAt, isFavorite: s.isFavorite, isIncognito: s.isIncognito,
              series: s.series, seriesIndex: s.seriesIndex, tags: s.tags,
              readingList: s.readingList, highlights: s.highlights, bookmarks: s.bookmarks,
              totalPages: s.totalPages, locationHistory: s.locationHistory,
            }))
          : [];
        setBooks(hydrated);
      } catch (error) { console.error("Failed to load books:", error); }
      finally { if (isActive) setIsLoading(false); }
    })();
    return () => { isActive = false; };
  }, [cleanupObjectUrls, persistent]);

  const addBook = useCallback(async (file: File) => {
    let bookData: any;
    try {
      const epubArrayBuffer = await file.arrayBuffer();
      bookData = ePub();
      await bookData.open(epubArrayBuffer, "binary");
      await bookData.ready;
      const metadata = await bookData.loaded.metadata;
      const title = metadata.title ?? "Untitled";
      const author = metadata.creator ?? "Unknown";
      const coverHref = await bookData.coverUrl();
      let coverBlob: Blob;
      if (coverHref) {
        const response = await fetch(coverHref);
        coverBlob = await response.blob();
        if (coverHref.startsWith("blob:")) try { URL.revokeObjectURL(coverHref); } catch {}
      } else {
        const canvas = document.createElement("canvas");
        canvas.width = 600; canvas.height = 900;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not create placeholder cover context");
        ctx.fillStyle = "#2d3748"; ctx.fillRect(0, 0, 600, 900);
        ctx.fillStyle = "white"; ctx.textAlign = "center";
        ctx.font = "40px Lora"; ctx.fillText(title, 300, 400);
        ctx.font = "24px Inter"; ctx.fillText(author, 300, 450);
        const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg"));
        if (!blob) throw new Error("Could not generate placeholder cover");
        coverBlob = blob;
      }
      const displayCoverUrl = registerObjectUrl(URL.createObjectURL(coverBlob));
      const newBook: Book = {
        id: uuidv4(), title, author, coverUrl: displayCoverUrl, epubBlob: file,
        progress: 0, lastLocation: "", addedAt: new Date().toISOString(),
        lastOpenedAt: new Date().toISOString(), readingList: "to-read",
        highlights: [], bookmarks: [], locationHistory: [],
      };
      setBooks((prev) => [...prev, newBook]);
      if (persistent) {
        const bookToStore: StoredBook = { ...newBook, coverUrl: coverBlob };
        await db.addBook(bookToStore as unknown as Book);
      }
    } catch (error) { console.error("Error adding book:", error); throw error; }
    finally { bookData?.destroy?.(); }
  }, [persistent]);

  const updateBookProgress = useCallback(async (id: string, progress: number, lastLocation: string) => {
    setBooks((prev) => prev.map((book) => {
      if (book.id !== id) return book;
      const history = book.locationHistory || [];
      if (book.lastLocation && book.lastLocation !== lastLocation) {
        history.push(book.lastLocation);
        if (history.length > 10) history.shift();
      }
      return { ...book, progress, lastLocation, lastOpenedAt: new Date().toISOString(), locationHistory: history };
    }));
    if (persistent) try { await db.updateBookProgress(id, progress, lastLocation); } catch (e) { console.error("Failed to persist progress:", e); }
  }, [persistent]);

  const updateBook = useCallback(async (id: string, updates: Partial<Book>) => {
    setBooks((prev) => prev.map((book) => book.id === id ? { ...book, ...updates } : book));
    if (persistent) try { await db.updateBook(id, updates); } catch (e) { console.error("Failed to update book:", e); }
  }, [persistent]);

  const toggleFavorite = useCallback((id: string) => {
    const book = books.find((b) => b.id === id);
    if (book) updateBook(id, { isFavorite: !book.isFavorite });
  }, [books, updateBook]);

  const toggleIncognito = useCallback((id: string) => {
    const book = books.find((b) => b.id === id);
    if (book) updateBook(id, { isIncognito: !book.isIncognito });
  }, [books, updateBook]);

  const setReadingList = useCallback((id: string, list: "to-read" | "reading" | "finished") => {
    updateBook(id, { readingList: list, completedAt: list === "finished" ? new Date().toISOString() : undefined });
  }, [updateBook]);

  const addHighlight = useCallback((bookId: string, highlight: Highlight) => {
    const book = books.find((b) => b.id === bookId);
    if (book) updateBook(bookId, { highlights: [...(book.highlights || []), highlight] });
  }, [books, updateBook]);

  const removeHighlight = useCallback((bookId: string, highlightId: string) => {
    const book = books.find((b) => b.id === bookId);
    if (book) updateBook(bookId, { highlights: (book.highlights || []).filter((h) => h.id !== highlightId) });
  }, [books, updateBook]);

  const addBookmark = useCallback((bookId: string, bookmark: Bookmark) => {
    const book = books.find((b) => b.id === bookId);
    if (book) updateBook(bookId, { bookmarks: [...(book.bookmarks || []), bookmark] });
  }, [books, updateBook]);

  const removeBookmark = useCallback((bookId: string, bookmarkId: string) => {
    const book = books.find((b) => b.id === bookId);
    if (book) updateBook(bookId, { bookmarks: (book.bookmarks || []).filter((b) => b.id !== bookmarkId) });
  }, [books, updateBook]);

  const deleteBook = useCallback(async (id: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== id));
    if (persistent) try { await db.deleteBook(id); } catch (e) { console.error("Failed to delete book:", e); }
  }, [persistent]);

  const recentBooks = useMemo(() => 
    [...books].filter((b) => !b.isIncognito).sort((a, b) => 
      new Date(b.lastOpenedAt || 0).getTime() - new Date(a.lastOpenedAt || 0).getTime()
    ).slice(0, 10), [books]);

  const favoriteBooks = useMemo(() => books.filter((b) => b.isFavorite), [books]);

  const sortedBooks = useMemo(() => {
    let filtered = [...books];
    if (filterBy === "favorites") filtered = filtered.filter((b) => b.isFavorite);
    else if (filterBy !== "all") filtered = filtered.filter((b) => b.readingList === filterBy);
    
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "title": return a.title.localeCompare(b.title);
        case "author": return a.author.localeCompare(b.author);
        case "progress": return b.progress - a.progress;
        case "added": return new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime();
        case "recent": default: return new Date(b.lastOpenedAt || 0).getTime() - new Date(a.lastOpenedAt || 0).getTime();
      }
    });
  }, [books, sortBy, filterBy]);

  const seriesGroups = useMemo(() => {
    const groups: Record<string, Book[]> = {};
    books.filter((b) => b.series).forEach((b) => {
      if (!groups[b.series!]) groups[b.series!] = [];
      groups[b.series!].push(b);
    });
    Object.values(groups).forEach((g) => g.sort((a, b) => (a.seriesIndex || 0) - (b.seriesIndex || 0)));
    return groups;
  }, [books]);

  return {
    books, sortedBooks, recentBooks, favoriteBooks, seriesGroups,
    addBook, updateBookProgress, updateBook, deleteBook,
    toggleFavorite, toggleIncognito, setReadingList,
    addHighlight, removeHighlight, addBookmark, removeBookmark,
    sortBy, setSortBy, filterBy, setFilterBy,
    isLoading, isPersistent: persistent,
  };
}
