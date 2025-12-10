import React from "react";
import { Book } from "../types";
import { Star, EyeOff, Play } from "lucide-react";

interface BookCardProps {
  book: Book;
  onSelect: (book: Book) => void;
  onToggleFavorite?: (id: string) => void;
  compact?: boolean;
}

const gradients = [
  "from-stone-600 to-stone-800",
  "from-emerald-700 to-teal-900",
  "from-blue-700 to-indigo-900",
  "from-violet-700 to-purple-900",
  "from-rose-700 to-pink-900",
  "from-amber-700 to-orange-900",
  "from-slate-600 to-zinc-800",
  "from-cyan-700 to-blue-900",
];

const BookCard: React.FC<BookCardProps> = ({ book, onSelect, onToggleFavorite, compact }) => {
  const getHash = (str: string) =>
    str.split("").reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  const spineColor = gradients[Math.abs(getHash(book.title)) % gradients.length];

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(book.id);
  };

  return (
    <div
      className="w-full perspective group cursor-pointer"
      onClick={() => onSelect(book)}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => e.key === "Enter" && onSelect(book)}
    >
      <div
        className={`relative w-full ${
          compact ? "h-[200px] sm:h-[220px]" : "h-[260px] sm:h-[300px]"
        } preserve-3d transition-all duration-500 ease-out group-hover:[transform:rotateY(-8deg)_translateX(3px)] group-hover:scale-[1.01]`}
        style={{ transformOrigin: "left center" }}
      >
        <div
          className={`absolute left-0 top-0 w-[14px] h-full bg-gradient-to-b ${spineColor} text-white flex items-center justify-center [transform:rotateY(90deg)_translateX(14px)_translateZ(-14px)] [transform-origin:right_center] backface-hidden rounded-l book-spine-shadow`}
        >
          <span className="[writing-mode:vertical-rl] rotate-180 font-medium text-[8px] tracking-wide p-1 whitespace-nowrap overflow-hidden text-ellipsis opacity-80">
            {book.title}
          </span>
        </div>

        <div className="absolute w-full h-full bg-light-card dark:bg-dark-card [transform:translateZ(-14px)] backface-hidden shadow-md rounded-r-xl" />

        <div className="absolute w-full h-full backface-hidden rounded-xl overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow duration-500">
          <img
            src={book.coverUrl}
            alt={`Cover of ${book.title}`}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          <div className="absolute top-2 right-2 flex items-center gap-1">
            {book.isIncognito && (
              <div className="p-1.5 rounded-lg bg-black/30 backdrop-blur-sm">
                <EyeOff className="w-3 h-3 text-white/70" />
              </div>
            )}
            {onToggleFavorite && (
              <button
                onClick={handleFavoriteClick}
                className={`p-1.5 rounded-lg backdrop-blur-sm transition-all duration-200 ${
                  book.isFavorite
                    ? "bg-amber-500/90 text-white"
                    : "bg-black/30 text-white/60 hover:text-white"
                }`}
              >
                <Star className={`w-3 h-3 ${book.isFavorite ? "fill-current" : ""}`} />
              </button>
            )}
          </div>

          {book.readingList && book.readingList !== "to-read" && (
            <div className="absolute top-2 left-2">
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium backdrop-blur-sm ${
                  book.readingList === "reading"
                    ? "bg-blue-500/70 text-white"
                    : "bg-emerald-500/70 text-white"
                }`}
              >
                {book.readingList === "reading" ? "Reading" : "Finished"}
              </span>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3
              className={`font-serif font-semibold text-white leading-tight line-clamp-2 ${
                compact ? "text-sm" : "text-[15px]"
              }`}
            >
              {book.title}
            </h3>
            <p className={`text-white/60 mt-0.5 ${compact ? "text-xs" : "text-[13px]"}`}>
              {book.author}
            </p>
            {book.progress > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1 bg-white/15 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-light-accent to-amber-500 dark:from-dark-accent dark:to-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${book.progress}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium text-white/50 tabular-nums">
                  {Math.round(book.progress)}%
                </span>
              </div>
            )}
          </div>

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 dark:bg-dark-surface/95 backdrop-blur-sm text-light-text dark:text-dark-text text-sm font-medium shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
              <Play className="w-3.5 h-3.5 fill-current" />
              {book.progress > 0 ? "Continue" : "Start"}
            </div>
          </div>
        </div>

        <div className="absolute right-0 top-2 bottom-2 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent [transform:translateZ(-7px)]" />
      </div>
    </div>
  );
};

export default BookCard;
