import { useState, useEffect, useRef, useCallback } from "react";

import type { Book } from "@/types";

interface UseReaderBookHydrationProps {
  book: Book | undefined;
  bookId: string;
  getBookContent: (id: string) => Promise<Blob>;
}

export function useReaderBookHydration({
  bookId,
  book,
  getBookContent,
}: UseReaderBookHydrationProps) {
  const latestBookRef = useRef(book);
  const [hydratedBook, setHydratedBook] = useState<Book | undefined>(book);
  const [isFetchingContent, setIsFetchingContent] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [contentRetryKey, setContentRetryKey] = useState(0);
  const [readerAttempt, setReaderAttempt] = useState(0);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (book) {
      latestBookRef.current = book;
      setHydratedBook((prev) => {
        if (!prev) return book;
        if (prev.id !== book.id) return book;
        return {
          ...book,
          epubBlob: prev.epubBlob || book.epubBlob,
        };
      });
    }
  }, [book]);

  useEffect(() => {
    let isMounted = true;
    const activeBook = latestBookRef.current;
    if (!activeBook) return;

    setContentError(null);

    setHydratedBook((prev) => {
      if (prev?.epubBlob && prev.id === activeBook.id) return prev;
      return activeBook;
    });

    if (!activeBook.epubBlob && !isFetchingRef.current) {
      isFetchingRef.current = true;
      setIsFetchingContent(true);
      getBookContent(activeBook.id)
        .then((blob) => {
          if (isMounted) {
            setHydratedBook((curr) => (curr ? { ...curr, epubBlob: blob } : undefined));
            setContentError(null);
          }
        })
        .catch((err) => {
          console.error("Failed to load book content:", err);
          if (isMounted) {
            setContentError(
              err instanceof Error ? err.message : "Book content is unavailable on this device."
            );
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsFetchingContent(false);
            isFetchingRef.current = false;
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [bookId, book, contentRetryKey, getBookContent]);

  const retryFetchContent = useCallback(() => {
    setContentError(null);
    setIsFetchingContent(false);
    isFetchingRef.current = false;
    setHydratedBook((current) => (current ? { ...current, epubBlob: null } : current));
    setContentRetryKey((key) => key + 1);
  }, []);

  const retryFromStart = useCallback(() => {
    setHydratedBook((current) => (current ? { ...current, lastLocation: "" } : current));
    setReaderAttempt((attempt) => attempt + 1);
  }, []);

  const retryCurrentAttempt = useCallback(() => {
    setReaderAttempt((attempt) => attempt + 1);
  }, []);

  return {
    hydratedBook,
    setHydratedBook,
    isFetchingContent,
    contentError,
    readerAttempt,
    retryFetchContent,
    retryFromStart,
    retryCurrentAttempt,
  };
}
