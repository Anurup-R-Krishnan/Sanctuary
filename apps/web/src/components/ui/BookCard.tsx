import React, { useState } from "react";
import type { Book } from "@/types";
import { Star, Clock, BookOpen, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useSettings } from "@/context/SettingsContext";

interface BookCardProps {
  book: Book;
  onSelect: (book: Book) => void;
  onToggleFavorite?: (id: string) => void;
  variant?: "default" | "compact" | "featured";
}

const BookCard: React.FC<BookCardProps> = ({
  book,
  onSelect,
  onToggleFavorite,
  variant = "default"
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const reduceMotion = useSettings((state) => state.reduceMotion);

  const progressPercentage = Math.round((book.progress / book.totalPages) * 100);
  const isRecent = book.lastOpenedAt && Date.now() - new Date(book.lastOpenedAt).getTime() < 7 * 24 * 60 * 60 * 1000;
  const isCompleted = progressPercentage >= 100;

  const handleImageLoad = () => setImageLoaded(true);
  const handleImageError = () => setImageError(true);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(book.id);
  };
  const handleCardKeyDown = (e: React.KeyboardEvent, selectedBook: Book) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(selectedBook);
    }
  };

  if (variant === "compact") {
    return (
      <div
        onClick={() => onSelect(book)}
        onKeyDown={(e) => handleCardKeyDown(e, book)}
        role="button"
        tabIndex={0}
        className="group relative flex items-center gap-4 p-3 bg-[#faf6f0] dark:bg-[#302b26] border-2 border-[#2c1e16] dark:border-[#453c34] shadow-[4px_4px_0px_rgba(44,30,22,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.9)] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_rgba(44,30,22,1)] dark:hover:shadow-[6px_6px_0px_rgba(0,0,0,0.9)] transition-all cursor-pointer"
      >
        {/* Masking tape on top-left corner */}
        <div className="absolute -top-2 -left-3 w-10 h-4 bg-[#e6d5b8] dark:bg-[#5a4238] border border-[#2c1e16]/20 rotate-[-15deg] shadow-sm z-10" />

        <div className="relative flex-shrink-0">
          <div className="w-12 h-16 border-2 border-[#2c1e16] dark:border-[#453c34] overflow-hidden bg-[#e6d5b8] dark:bg-[#26211e]">
            {book.coverUrl && !imageError ? (
              <img
                src={book.coverUrl}
                alt={book.title}
                className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-light-accent dark:text-dark-accent" strokeWidth={1.5} />
              </div>
            )}
          </div>
          {progressPercentage > 0 && (
            <div className="absolute -bottom-2 -right-2 px-1.5 py-0.5 border-2 border-[#2c1e16] bg-amber-400 rotate-6 shadow-[2px_2px_0px_rgba(44,30,22,1)]">
              <span className="text-[10px] font-bold text-[#2c1e16]">{progressPercentage}%</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold font-serif text-light-text dark:text-dark-text line-clamp-1 group-hover:text-light-accent dark:group-hover:text-dark-accent transition-colors duration-200">
            {book.title}
          </h3>
          <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-0.5 font-sans font-medium line-clamp-1">
            {book.author}
          </p>
        </div>

        <div className="flex flex-col items-center gap-2">
          {book.isFavorite && (
            <Heart className="w-4 h-4 text-[#b85e42] fill-current" strokeWidth={2} />
          )}
          {isRecent && (
            <div className="w-2 h-2 rounded-full bg-amber-500 border border-[#2c1e16]" title="Recent" />
          )}
        </div>
      </div>
    );
  }

  if (variant === "featured") {
    return (
      <article
        onClick={() => onSelect(book)}
        onKeyDown={(e) => handleCardKeyDown(e, book)}
        role="button"
        tabIndex={0}
        className="group relative overflow-hidden border-[3px] border-[#2c1e16] dark:border-[#453c34] bg-[#faf6f0] dark:bg-[#302b26] shadow-[6px_6px_0px_rgba(44,30,22,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.9)] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[10px_10px_0px_rgba(44,30,22,1)] dark:hover:shadow-[10px_10px_0px_rgba(0,0,0,0.9)] transition-all cursor-pointer p-5"
      >
        <div className="flex items-start gap-6">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-28 border-2 border-[#2c1e16] bg-[#e6d5b8] dark:bg-[#1c1815] shadow-[2px_2px_0px_rgba(44,30,22,1)]">
              {book.coverUrl && !imageError ? (
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-[#2c1e16] dark:text-[#a69a8a]" strokeWidth={1.5} />
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h3 className="text-xl font-black font-serif text-light-text dark:text-dark-text line-clamp-2 leading-tight">
                  {book.title}
                </h3>
                <p className="text-light-text-muted dark:text-dark-text-muted font-bold font-sans mt-1">
                  {book.author}
                </p>
              </div>

              <button
                onClick={handleFavoriteClick}
                className={`p-2 transition-transform duration-200 hover:scale-110 ${book.isFavorite
                  ? 'text-[#b85e42]'
                  : 'text-[#6a5a4e] hover:text-[#b85e42]'
                  }`}
              >
                <Heart className={`w-6 h-6 ${book.isFavorite ? 'fill-current' : ''}`} strokeWidth={2} />
              </button>
            </div>

            <div className="space-y-4">
              {progressPercentage > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-[#6a5a4e]">
                    <span>Progress</span>
                    <span>{progressPercentage}%</span>
                  </div>
                  <div className="h-3 border-2 border-[#2c1e16] bg-white dark:bg-[#1c1815]">
                    <div
                      className="h-full bg-[#b85e42] transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 text-sm font-bold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider text-[10px]">
                {isRecent && (
                  <span className="px-2 py-0.5 border border-[#2c1e16] bg-[#e6d5b8] text-[#2c1e16] shadow-[2px_2px_0px_#2c1e16]">
                    Recently Read
                  </span>
                )}
                {isCompleted && (
                  <span className="px-2 py-0.5 border border-[#2c1e16] bg-amber-400 text-[#2c1e16] shadow-[2px_2px_0px_#2c1e16]">
                    Completed
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  }

  // Default variant
  return (
    <motion.article
      onClick={() => onSelect(book)}
      onKeyDown={(e) => handleCardKeyDown(e, book)}
      role="button"
      tabIndex={0}
      whileHover={{
        y: -12,
        x: -12,
        scale: 1.02,
        rotateY: -5,
        rotateX: 5,
        boxShadow: "16px 16px 0px rgba(44,30,22,1)",
        zIndex: 10
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group relative flex flex-col overflow-visible bg-[#faf6f0] dark:bg-[#302b26] border-2 border-[#2c1e16] dark:border-[#453c34] cursor-pointer transform-gpu shadow-[6px_6px_0px_rgba(44,30,22,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.9)]"
    >
      {/* Decorative Washi Tape */}
      {book.isFavorite && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-4 bg-red-400/80 border border-black/20 rotate-[-2deg] z-20 mix-blend-multiply shadow-sm" />
      )}

      {/* Book Cover */}
      <div className="relative aspect-[3/4] overflow-hidden border-b-[2px] border-[#2c1e16] dark:border-[#453c34] bg-[#e6d5b8] dark:bg-[#1c1815]">
        {book.coverUrl && !imageError ? (
          <motion.img
            src={book.coverUrl}
            alt={book.title}
            className={`w-full h-full object-cover filter contrast-105 saturate-105 transition-all duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <BookOpen className="w-12 h-12 text-[#b85e42] mb-3" strokeWidth={1.5} />
            <span className="text-center font-serif text-sm font-bold text-[#b85e42] uppercase tracking-widest px-2">
              {book.title}
            </span>
          </div>
        )}

        {/* Overlay removed, texture implicitly applied */}

        {/* Favorite Button (Tactile) */}
        <button
          onClick={handleFavoriteClick}
          className={`absolute top-2 right-2 p-1.5 border-2 border-[#2c1e16] shadow-[2px_2px_0px_#2c1e16] transition-all duration-200 focus:outline-none ${book.isFavorite
            ? 'bg-[#b85e42] text-[#faf6f0]'
            : 'bg-[#faf6f0] text-[#2c1e16] hover:bg-[#b85e42] hover:text-[#faf6f0]'
            }`}
        >
          <Heart className={`w-4 h-4 ${book.isFavorite ? 'fill-current' : ''}`} strokeWidth={2} />
        </button>

        {/* Custom Progress Indicator Label */}
        {progressPercentage > 0 && (
          <div className="absolute bottom-2 left-2 px-1.5 py-0.5 border-2 border-[#2c1e16] bg-amber-400 -rotate-3 shadow-[2px_2px_0px_#2c1e16]">
            <span className="text-[10px] uppercase font-black tracking-widest text-[#2c1e16]">{progressPercentage}% read</span>
          </div>
        )}

        {/* Status Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-2">
          {isRecent && (
            <div className="px-1.5 py-0.5 border-2 border-[#2c1e16] bg-[#e6d5b8] rotate-2 shadow-[2px_2px_0px_#2c1e16]">
              <span className="text-[8px] uppercase font-black tracking-widest text-[#2c1e16]">Recent</span>
            </div>
          )}
          {isCompleted && (
            <div className="px-1.5 py-0.5 border-2 border-[#2c1e16] bg-[#6ad46a] -rotate-3 shadow-[2px_2px_0px_#2c1e16]">
              <span className="text-[8px] uppercase font-black tracking-widest text-[#2c1e16]">Finished</span>
            </div>
          )}
        </div>
      </div>

      {/* Book Info Panel below cover */}
      <div className="p-3 bg-[#faf6f0] dark:bg-[#302b26] flex flex-col justify-between flex-grow">
        <div>
          <h3 className="font-bold font-serif text-lg leading-tight text-light-text dark:text-dark-text line-clamp-2">
            {book.title}
          </h3>
          <p className="text-xs font-sans font-bold uppercase tracking-wider text-light-text-muted dark:text-dark-text-muted line-clamp-1 mt-1">
            {book.author}
          </p>
        </div>

        {progressPercentage > 0 && (
          <div className="w-full h-1.5 mt-3 border border-[#2c1e16]">
            <div
              className="h-full bg-[#b85e42] transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        )}
      </div>
    </motion.article>
  );
};

export default BookCard;
