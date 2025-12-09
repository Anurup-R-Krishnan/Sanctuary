import React, { useState, useEffect } from "react";
import { Book } from "../types";
import { BookOpen, Sparkles } from "lucide-react";
import BookCard from "./BookCard";
import AddBookButton from "./AddBookButton";

interface LibraryGridProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  addBook: (file: File) => Promise<void>;
  isLoading: boolean;
}

const SkeletonCard: React.FC = () => (
  <div className="w-full h-[300px] sm:h-[340px] rounded-xl bg-light-card/50 dark:bg-dark-card/50 overflow-hidden">
    <div className="w-full h-full shimmer bg-gradient-to-br from-light-card to-light-surface dark:from-dark-card dark:to-dark-surface" />
  </div>
);

const LibraryGrid: React.FC<LibraryGridProps> = ({
  books,
  onSelectBook,
  addBook,
  isLoading,
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 rounded-lg bg-light-card/50 dark:bg-dark-card/50 shimmer" />
            <div className="h-4 w-32 rounded-lg bg-light-card/30 dark:bg-dark-card/30 shimmer" />
          </div>
        </div>
        
        {/* Grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {[...Array(8)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!isLoading && books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        {/* Decorative background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-light-accent/5 dark:bg-dark-accent/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative animate-fadeInUp">
          {/* Icon */}
          <div className="relative mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-light-accent to-amber-500 dark:from-dark-accent dark:to-amber-400 rounded-3xl blur-2xl opacity-20 scale-150" />
            <div className="relative flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-light-accent/10 to-amber-500/10 dark:from-dark-accent/15 dark:to-amber-400/15 border border-light-accent/20 dark:border-dark-accent/20">
              <BookOpen className="w-10 h-10 text-light-accent dark:text-dark-accent" />
            </div>
          </div>

          {/* Text */}
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-light-text dark:text-dark-text mb-3">
            Your Sanctuary Awaits
          </h2>
          <p className="text-light-text-muted dark:text-dark-text-muted max-w-md mx-auto mb-8 text-balance">
            Begin your reading journey by adding your first book. 
            Your personal library is ready to grow.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <AddBookButton onAddBook={addBook} variant="inline" />
            <div className="flex items-center gap-2 text-sm text-light-text-muted dark:text-dark-text-muted">
              <Sparkles className="w-4 h-4" />
              <span>Supports EPUB format</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-light-text dark:text-dark-text">
            Your Library
          </h2>
          <p className="text-sm text-light-text-muted dark:text-dark-text-muted mt-1">
            {books.length} {books.length === 1 ? "book" : "books"} in your collection
          </p>
        </div>
      </div>

      {/* Books Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {books.map((book, index) => (
          <div
            key={book.id}
            className={`transition-all duration-700 ease-out ${
              isMounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
            style={{ transitionDelay: `${Math.min(index * 75, 500)}ms` }}
          >
            <BookCard book={book} onSelect={onSelectBook} />
          </div>
        ))}
      </div>

      <AddBookButton onAddBook={addBook} />
    </div>
  );
};

export default LibraryGrid;
