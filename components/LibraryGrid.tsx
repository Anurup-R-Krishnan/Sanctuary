import React, { useState, useEffect } from 'react';
import { Book } from '../types';
import BookCard from './BookCard';
import AddBookButton from './AddBookButton';

interface LibraryGridProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  addBook: (file: File) => Promise<void>;
  isLoading: boolean;
}

const LibraryGrid: React.FC<LibraryGridProps> = ({ books, onSelectBook, addBook, isLoading }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <div className="text-center text-light-text-muted dark:text-dark-text-muted">Loading your library...</div>
  }
  
  if (!isLoading && books.length === 0) {
    return (
        <div className="text-center mt-20">
            <h2 className="text-2xl font-serif text-light-text dark:text-dark-text">Your Sanctuary is Empty</h2>
            <p className="text-light-text-muted dark:text-dark-text-muted mt-2">Click the '+' button to add your first book.</p>
            <AddBookButton onAddBook={addBook} />
        </div>
    );
  }

  return (
    <>
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
        {books.map((book, index) => (
          <div 
            key={book.id}
            className={`break-inside-avoid transition-all duration-700 ease-out ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
            style={{ transitionDelay: `${index * 50}ms` }}
          >
            <BookCard book={book} onSelect={onSelectBook} />
          </div>
        ))}
      </div>
      <AddBookButton onAddBook={addBook} />
    </>
  );
};

export default LibraryGrid;