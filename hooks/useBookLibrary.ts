import { useState, useEffect, useCallback, useRef } from "react";
import ePub from "epubjs";
import { v4 as uuidv4 } from "uuid";

import type { Book } from "../types";
import * as db from "../db";

type UseBookLibraryOptions = {
  persistent?: boolean;
};

type StoredBook = Omit<Book, "coverUrl"> & {
  coverUrl: Blob;
};

const isStoredBookArray = (items: unknown[]): items is StoredBook[] => {
  return items.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      "coverUrl" in item &&
      item.coverUrl instanceof Blob,
  );
};

export function useBookLibrary(options: UseBookLibraryOptions = {}) {
  const { persistent = true } = options;

  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(persistent);

  const objectUrlsRef = useRef<Set<string>>(new Set());

  const registerObjectUrl = (url: string) => {
    objectUrlsRef.current.add(url);
    return url;
  };

  const cleanupObjectUrls = useCallback(() => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
  }, []);

  useEffect(() => cleanupObjectUrls, [cleanupObjectUrls]);

  useEffect(() => {
    if (!persistent) {
      cleanupObjectUrls();
      setBooks([]);
      setIsLoading(false);
      return;
    }

    let isActive = true;

    (async () => {
      setIsLoading(true);

      try {
        const stored = await db.getBooks();

        if (!isActive) {
          return;
        }

        cleanupObjectUrls();

        const hydrated =
          Array.isArray(stored) && isStoredBookArray(stored)
            ? stored.map((storedBook) => ({
                ...storedBook,
                coverUrl: registerObjectUrl(
                  URL.createObjectURL(storedBook.coverUrl),
                ),
              }))
            : [];

        setBooks(hydrated);
      } catch (error) {
        console.error("Failed to load books:", error);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [cleanupObjectUrls, persistent]);

  const addBook = useCallback(
    async (file: File) =>
      new Promise<void>(async (resolve, reject) => {
        let epubObjectUrl: string | null = null;

        try {
          epubObjectUrl = URL.createObjectURL(file);
          const bookData = ePub(epubObjectUrl);

          const metadata = await bookData.loaded.metadata;
          const title = metadata.title ?? "Untitled";
          const author = metadata.creator ?? "Unknown";

          const coverHref = await bookData.coverUrl();
          let coverBlob: Blob;

          if (coverHref) {
            const response = await fetch(coverHref);
            coverBlob = await response.blob();
          } else {
            const canvas = document.createElement("canvas");
            canvas.width = 600;
            canvas.height = 900;
            const ctx = canvas.getContext("2d");

            if (!ctx) {
              throw new Error("Could not create placeholder cover context");
            }

            ctx.fillStyle = "#2d3748";
            ctx.fillRect(0, 0, 600, 900);
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.font = "40px Lora";
            ctx.fillText(title, 300, 400);
            ctx.font = "24px Inter";
            ctx.fillText(author, 300, 450);

            const blob = await new Promise<Blob | null>((resolveBlob) =>
              canvas.toBlob(resolveBlob, "image/jpeg"),
            );

            if (!blob) {
              throw new Error("Could not generate placeholder cover");
            }

            coverBlob = blob;
          }

          const displayCoverUrl = registerObjectUrl(
            URL.createObjectURL(coverBlob),
          );

          const newBook: Book = {
            id: uuidv4(),
            title,
            author,
            coverUrl: displayCoverUrl,
            epubBlob: file,
            progress: 0,
            lastLocation: "",
          };

          setBooks((prev) => [...prev, newBook]);

          if (persistent) {
            const bookToStore: StoredBook = {
              ...newBook,
              coverUrl: coverBlob,
            };
            await db.addBook(bookToStore as unknown as Book);
          }

          bookData.destroy();
          resolve();
        } catch (error) {
          console.error("Error adding book:", error);
          reject(error);
        } finally {
          if (epubObjectUrl) {
            URL.revokeObjectURL(epubObjectUrl);
          }
        }
      }),
    [persistent],
  );

  const updateBookProgress = useCallback(
    async (id: string, progress: number, lastLocation: string) => {
      setBooks((prev) =>
        prev.map((book) =>
          book.id === id ? { ...book, progress, lastLocation } : book,
        ),
      );

      if (!persistent) {
        return;
      }

      try {
        await db.updateBookProgress(id, progress, lastLocation);
      } catch (error) {
        console.error("Failed to persist progress:", error);
      }
    },
    [persistent],
  );

  return {
    books,
    addBook,
    updateBookProgress,
    isLoading,
    isPersistent: persistent,
  };
}
