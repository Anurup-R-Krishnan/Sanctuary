import React from "react";
import type { Book } from "@/types";
import BookCard from "../ui/BookCard";

interface HorizontalScrollProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  onToggleFavorite: (id: string) => void;
}

export const HorizontalScroll = ({
  books,
  onSelectBook,
  onToggleFavorite,
}: HorizontalScrollProps) => (
  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
    {books.map((book) => (
      <div key={book.id} className="flex-shrink-0 w-[140px] sm:w-[160px]">
        <BookCard book={book} onSelect={onSelectBook} onToggleFavorite={onToggleFavorite} variant="compact" />
      </div>
    ))}
  </div>
);
