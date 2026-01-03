import React, { useState } from "react";
import { Book } from "@/types";
import { Star, Clock, BookOpen, MoreVertical, Heart } from "lucide-react";
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
  const { reduceMotion } = useSettings();

  const progressPercentage = Math.round((book.progress / book.totalPages) * 100);
  const isRecent = book.lastRead && Date.now() - book.lastRead < 7 * 24 * 60 * 60 * 1000;
  const isCompleted = progressPercentage >= 100;

  const handleImageLoad = () => setImageLoaded(true);
  const handleImageError = () => setImageError(true);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(book.id);
  };

  if (variant === "compact") {
    return (
      <div 
        onClick={() => onSelect(book)}
        className="group flex items-center gap-4 p-4 rounded-2xl card card-hover card-interactive cursor-pointer"
      >
        <div className="relative flex-shrink-0">
          <div className="w-12 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-light-accent/10 to-amber-500/10 dark:from-dark-accent/10 dark:to-amber-400/10">
            {book.coverUrl && !imageError ? (
              <img
                src={book.coverUrl}
                alt={book.title}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
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
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-light-accent dark:bg-dark-accent flex items-center justify-center">
              <span className="text-[8px] font-bold text-white">{progressPercentage}%</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-light-text dark:text-dark-text line-clamp-1 group-hover:text-light-accent dark:group-hover:text-dark-accent transition-colors duration-200">
            {book.title}
          </h3>
          <p className="text-sm text-light-text-muted dark:text-dark-text-muted line-clamp-1">
            {book.author}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {book.isFavorite && (
            <Heart className="w-4 h-4 text-red-500 fill-current" strokeWidth={1.5} />
          )}
          {isRecent && (
            <Clock className="w-4 h-4 text-light-accent dark:text-dark-accent" strokeWidth={1.5} />
          )}
        </div>
      </div>
    );
  }

  if (variant === "featured") {
    return (
      <div 
        onClick={() => onSelect(book)}
        className="group relative overflow-hidden rounded-3xl card card-hover card-interactive cursor-pointer p-6"
      >
        <div className="flex items-start gap-6">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-28 rounded-2xl overflow-hidden bg-gradient-to-br from-light-accent/10 to-amber-500/10 dark:from-dark-accent/10 dark:to-amber-400/10 book-spine-shadow">
              {book.coverUrl && !imageError ? (
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  className={`w-full h-full object-cover transition-all duration-500 ${
                    imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                  } group-hover:scale-105`}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-light-accent dark:text-dark-accent" strokeWidth={1.5} />
                </div>
              )}
            </div>
            
            {!reduceMotion && (
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h3 className="text-xl font-bold text-light-text dark:text-dark-text line-clamp-2 group-hover:text-light-accent dark:group-hover:text-dark-accent transition-colors duration-200">
                  {book.title}
                </h3>
                <p className="text-light-text-muted dark:text-dark-text-muted font-medium">
                  {book.author}
                </p>
              </div>
              
              <button
                onClick={handleFavoriteClick}
                className={`p-2 rounded-xl transition-all duration-200 ${
                  book.isFavorite
                    ? 'text-red-500 bg-red-50 dark:bg-red-950/30'
                    : 'text-light-text-muted dark:text-dark-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
                }`}
              >
                <Heart className={`w-5 h-5 ${book.isFavorite ? 'fill-current' : ''}`} strokeWidth={1.5} />
              </button>
            </div>

            <div className="space-y-3">
              {progressPercentage > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-light-text-muted dark:text-dark-text-muted">Progress</span>
                    <span className="font-semibold text-light-accent dark:text-dark-accent">{progressPercentage}%</span>
                  </div>
                  <div className="h-2 bg-black/[0.06] dark:bg-white/[0.06] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-light-accent to-amber-500 dark:from-dark-accent dark:to-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-light-text-muted dark:text-dark-text-muted">
                {isRecent && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" strokeWidth={1.5} />
                    <span>Recently read</span>
                  </div>
                )}
                {isCompleted && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-500 fill-current" strokeWidth={1.5} />
                    <span>Completed</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div 
      onClick={() => onSelect(book)}
      className="group relative overflow-hidden rounded-3xl card card-hover card-interactive cursor-pointer"
    >
      {/* Book Cover */}
      <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-light-accent/10 to-amber-500/10 dark:from-dark-accent/10 dark:to-amber-400/10">
        {book.coverUrl && !imageError ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className={`w-full h-full object-cover transition-all duration-500 ${
              imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
            } group-hover:scale-105`}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-light-accent dark:text-dark-accent" strokeWidth={1.5} />
          </div>
        )}
        
        {/* Overlay */}
        {!reduceMotion && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        )}

        {/* Favorite Button */}
        <button
          onClick={handleFavoriteClick}
          className={`absolute top-3 right-3 p-2 rounded-xl backdrop-blur-xl transition-all duration-200 ${
            book.isFavorite
              ? 'bg-red-500/90 text-white'
              : 'bg-black/20 text-white hover:bg-red-500/90'
          } opacity-0 group-hover:opacity-100`}
        >
          <Heart className={`w-4 h-4 ${book.isFavorite ? 'fill-current' : ''}`} strokeWidth={1.5} />
        </button>

        {/* Progress Indicator */}
        {progressPercentage > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
            <div 
              className="h-full bg-gradient-to-r from-light-accent to-amber-500 dark:from-dark-accent dark:to-amber-400 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        )}

        {/* Status Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {isRecent && (
            <div className="px-2 py-1 bg-light-accent/90 dark:bg-dark-accent/90 text-white text-xs font-semibold rounded-lg backdrop-blur-xl">
              Recent
            </div>
          )}
          {isCompleted && (
            <div className="px-2 py-1 bg-amber-500/90 text-white text-xs font-semibold rounded-lg backdrop-blur-xl">
              Complete
            </div>
          )}
        </div>
      </div>

      {/* Book Info */}
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-light-text dark:text-dark-text line-clamp-2 group-hover:text-light-accent dark:group-hover:text-dark-accent transition-colors duration-200">
          {book.title}
        </h3>
        <p className="text-sm text-light-text-muted dark:text-dark-text-muted line-clamp-1">
          {book.author}
        </p>
        
        {progressPercentage > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-light-text-muted dark:text-dark-text-muted">
              {book.progress} / {book.totalPages} pages
            </span>
            <span className="font-semibold text-light-accent dark:text-dark-accent">
              {progressPercentage}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookCard;
