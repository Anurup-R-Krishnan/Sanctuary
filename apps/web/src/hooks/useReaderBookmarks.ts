import { useState, useEffect, useCallback } from "react";

import type { Book, Bookmark } from "@/types";

interface UseReaderBookmarksProps {
  book: Book | undefined;
  currentCfi: string;
  currentPage: number;
  onAddBookmark: (bookId: string, bookmark: Omit<Bookmark, "id" | "createdAt">) => void;
  onRemoveBookmark: (bookId: string, bookmarkId: string) => void;
}

export function useReaderBookmarks({
  book,
  currentCfi,
  currentPage,
  onAddBookmark,
  onRemoveBookmark,
}: UseReaderBookmarksProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    setIsBookmarked(book?.bookmarks?.some((b) => b.cfi === currentCfi) ?? false);
  }, [currentCfi, book?.bookmarks]);

  const handleToggleBookmark = useCallback(() => {
    if (!currentCfi || !book) return;
    if (isBookmarked) {
      const bookmark = book.bookmarks?.find((b) => b.cfi === currentCfi);
      if (bookmark) onRemoveBookmark(book.id, bookmark.id);
    } else {
      onAddBookmark(book.id, { cfi: currentCfi, title: `Page ${currentPage}` });
    }
    setIsBookmarked(!isBookmarked);
  }, [currentCfi, isBookmarked, book, currentPage, onAddBookmark, onRemoveBookmark]);

  return {
    isBookmarked,
    handleToggleBookmark,
  };
}
