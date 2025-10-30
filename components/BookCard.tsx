import React from 'react';
import { Book } from '../types';

interface BookCardProps {
  book: Book;
  onSelect: (book: Book) => void;
}

const gradients = [
  'from-purple-500 to-indigo-500',
  'from-blue-500 to-cyan-500',
  'from-green-500 to-teal-500',
  'from-amber-700 to-yellow-800',
  'from-pink-500 to-rose-500',
  'from-red-500 to-orange-500',
  'from-gray-700 to-gray-800',
];

const BookCard: React.FC<BookCardProps> = ({ book, onSelect }) => {
  const getHash = (str: string) => str.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  const spineColor = gradients[Math.abs(getHash(book.title)) % gradients.length];

  const bookThickness = '24px'; // Corresponds to w-6

  return (
    <div
      className="w-full perspective group cursor-pointer"
      onClick={() => onSelect(book)}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => e.key === 'Enter' && onSelect(book)}
    >
      <div 
        className="relative w-full h-[280px] sm:h-[320px] preserve-3d transition-transform duration-500 ease-spring group-hover:[transform:rotateY(-25deg)_scale(1.05)]"
        style={{ transformOrigin: 'left center' }}
      >
        {/* Spine */}
        <div 
          className={`absolute left-0 top-0 w-6 h-full bg-gradient-to-b ${spineColor} text-white flex items-center justify-center [transform:rotateY(90deg)_translateX(${bookThickness})_translateZ(-${bookThickness})] [transform-origin:right_center] backface-hidden`}
        >
          <span className="[writing-mode:vertical-rl] rotate-180 font-serif text-sm tracking-wider p-2 whitespace-nowrap overflow-hidden text-ellipsis">
            {book.title}
          </span>
        </div>
        
        {/* Back Cover - visible on rotation */}
         <div className="absolute w-full h-full bg-light-card dark:bg-dark-card [transform:translateZ(-24px)] backface-hidden shadow-soft-lg dark:shadow-dark-soft-lg rounded-r-lg"></div>

        {/* Front Cover */}
        <div className="absolute w-full h-full bg-light-surface dark:bg-dark-surface backface-hidden shadow-soft-xl dark:shadow-dark-soft-xl rounded-lg overflow-hidden">
          <img 
            src={book.coverUrl} 
            alt={`Cover of ${book.title}`} 
            className="w-full h-full object-cover" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
          <div className="absolute bottom-0 left-0 p-4 text-white">
            <h3 className="font-serif font-bold text-lg leading-tight" style={{textShadow: '0 2px 4px rgba(0,0,0,0.7)'}}>{book.title}</h3>
            <p className="text-sm opacity-80" style={{textShadow: '0 1px 2px rgba(0,0,0,0.7)'}}>{book.author}</p>
          </div>

          {/* Progress Bar */}
          <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20">
            <div 
              className="h-full bg-light-accent dark:bg-dark-accent transition-all duration-500"
              style={{ width: `${book.progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookCard;