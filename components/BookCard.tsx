import React from "react";
import { Book } from "../types";
import { BookOpen, Star, EyeOff } from "lucide-react";

interface BookCardProps {
  book: Book;
  onSelect: (book: Book) => void;
  onToggleFavorite?: (id: string) => void;
  compact?: boolean;
}

const gradients = [
  "from-amber-700 via-amber-600 to-yellow-700",
  "from-emerald-700 via-emerald-600 to-teal-700",
  "from-blue-700 via-blue-600 to-indigo-700",
  "from-purple-700 via-purple-600 to-violet-700",
  "from-rose-700 via-rose-600 to-pink-700",
  "from-slate-700 via-slate-600 to-gray-700",
  "from-orange-700 via-orange-600 to-red-700",
];

const BookCard: React.FC<BookCardProps> = ({ book, onSelect, onToggleFavorite, compact }) => {
  const getHash = (str: string) => str.split("").reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  const spineColor = gradients[Math.abs(getHash(book.title)) % gradients.length];

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(book.id);
  };

  return (
    <div className="w-full perspective group cursor-pointer" onClick={() => onSelect(book)} role="button" tabIndex={0} onKeyPress={(e) => e.key === "Enter" && onSelect(book)}>
      <div className={`relative w-full ${compact ? "h-[220px] sm:h-[240px]" : "h-[280px] sm:h-[320px]"} preserve-3d transition-all duration-700 ease-out group-hover:[transform:rotateY(-15deg)_translateX(6px)] group-hover:scale-[1.02]`} style={{ transformOrigin: "left center" }}>
        {/* Spine */}
        <div className={`absolute left-0 top-0 w-5 h-full bg-gradient-to-b ${spineColor} text-white flex items-center justify-center [transform:rotateY(90deg)_translateX(20px)_translateZ(-20px)] [transform-origin:right_center] backface-hidden rounded-l-sm`}>
          <span className="[writing-mode:vertical-rl] rotate-180 font-serif text-[10px] tracking-wider p-1.5 whitespace-nowrap overflow-hidden text-ellipsis opacity-90">{book.title}</span>
        </div>

        {/* Back Cover */}
        <div className="absolute w-full h-full bg-light-card dark:bg-dark-card [transform:translateZ(-20px)] backface-hidden shadow-soft-lg dark:shadow-dark-soft-lg rounded-r-2xl" />

        {/* Front Cover */}
        <div className="absolute w-full h-full backface-hidden rounded-2xl overflow-hidden shadow-soft-xl dark:shadow-dark-soft-xl group-hover:shadow-soft-2xl dark:group-hover:shadow-dark-soft-2xl transition-shadow duration-500">
          <img src={book.coverUrl} alt={`Cover of ${book.title}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Badges */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            {book.isIncognito && <div className="p-1.5 rounded-full bg-black/50 backdrop-blur-sm"><EyeOff className="w-3.5 h-3.5 text-white" /></div>}
            {onToggleFavorite && (
              <button onClick={handleFavoriteClick} className={`p-1.5 rounded-full backdrop-blur-sm transition-colors ${book.isFavorite ? "bg-amber-500 text-white" : "bg-black/50 text-white/70 hover:text-white"}`}>
                <Star className={`w-3.5 h-3.5 ${book.isFavorite ? "fill-current" : ""}`} />
              </button>
            )}
          </div>

          {/* Reading List Badge */}
          {book.readingList && book.readingList !== "to-read" && (
            <div className="absolute top-3 left-3">
              <span className={`px-2 py-1 rounded-full text-[10px] font-medium backdrop-blur-sm ${book.readingList === "reading" ? "bg-blue-500/80 text-white" : "bg-green-500/80 text-white"}`}>
                {book.readingList === "reading" ? "Reading" : "Finished"}
              </span>
            </div>
          )}

          {/* Book Info */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className={`font-serif font-bold text-white leading-tight line-clamp-2 drop-shadow-lg ${compact ? "text-sm" : "text-base"}`}>{book.title}</h3>
            <p className={`text-white/80 mt-1 drop-shadow-md ${compact ? "text-xs" : "text-sm"}`}>{book.author}</p>
            {book.progress > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-light-accent to-amber-500 dark:from-dark-accent dark:to-amber-400 rounded-full transition-all duration-500" style={{ width: `${book.progress}%` }} />
                </div>
                <span className="text-[10px] font-medium text-white/70">{Math.round(book.progress)}%</span>
              </div>
            )}
          </div>

          {/* Hover Action */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 dark:bg-dark-surface/90 backdrop-blur-sm text-light-text dark:text-dark-text text-sm font-medium shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
              <BookOpen className="w-4 h-4" />
              {book.progress > 0 ? "Continue" : "Start Reading"}
            </div>
          </div>
        </div>

        {/* Page edges */}
        <div className="absolute right-0 top-2 bottom-2 w-0.5 bg-gradient-to-r from-light-card to-light-surface dark:from-dark-card dark:to-dark-surface rounded-r-sm opacity-50 [transform:translateZ(-10px)]" />
      </div>
    </div>
  );
};

export default BookCard;
