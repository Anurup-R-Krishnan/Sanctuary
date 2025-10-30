import { useState, useEffect, useCallback } from 'react';
import { Book } from '../types';
import * as db from '../db';

export function useBookLibrary() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadBooks() {
      setIsLoading(true);
      const storedBooks = await db.getBooks();
      // Revoke old blob URLs to prevent memory leaks
      books.forEach(book => URL.revokeObjectURL(book.coverUrl));
      // Create new blob URLs
      storedBooks.forEach(book => {
        book.coverUrl = URL.createObjectURL(book.coverUrl as any);
      });
      setBooks(storedBooks);
      setIsLoading(false);
    }
    loadBooks();
  }, []);

  const addBook = useCallback(async (file: File) => {
    return new Promise<void>(async (resolve, reject) => {
        let objectUrl: string | null = null;
        try {
            // Use object URL instead of passing File/Blob directly
            objectUrl = URL.createObjectURL(file);
            const bookData = window.ePub(objectUrl);

            const metadata = await bookData.loaded.metadata;
            const title = metadata.title;
            const author = metadata.creator;

            let coverBlob: Blob;
            const coverUrl = await bookData.coverUrl();

            if (coverUrl) {
                const response = await fetch(coverUrl);
                coverBlob = await response.blob();
            } else {
                // Create a placeholder cover if none exists
                const canvas = document.createElement('canvas');
                canvas.width = 600;
                canvas.height = 900;
                const ctx = canvas.getContext('2d')!;
                ctx.fillStyle = "#2d3748";
                ctx.fillRect(0, 0, 600, 900);
                ctx.fillStyle = "white";
                ctx.textAlign = "center";
                ctx.font = "40px Lora";
                ctx.fillText(title, 300, 400);
                ctx.font = "24px Inter";
                ctx.fillText(author, 300, 450);

                const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg'));
                if (!blob) throw new Error("Could not create placeholder cover.");
                coverBlob = blob;
            }

            const newBook: Book = {
                id: window.uuid.v4(),
                title,
                author,
                coverUrl: URL.createObjectURL(coverBlob), // Temporary URL for immediate display
                epubBlob: file,
                progress: 0,
                lastLocation: '',
            };

            // For DB storage, we need to store the cover blob, not the object URL
            const bookToStore = { ...newBook, coverUrl: coverBlob as any };
            await db.addBook(bookToStore);
            setBooks(prev => [...prev, newBook]);
            bookData.destroy();
            resolve();
        } catch(error) {
            console.error("Error adding book:", error);
            reject(error);
        } finally {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        }
    });
  }, []);

  const updateBookProgress = useCallback(async (id: string, progress: number, lastLocation: string) => {
    await db.updateBookProgress(id, progress, lastLocation);
    setBooks(prev => prev.map(book => book.id === id ? { ...book, progress, lastLocation } : book));
  }, []);

  return { books, addBook, updateBookProgress, isLoading };
}
