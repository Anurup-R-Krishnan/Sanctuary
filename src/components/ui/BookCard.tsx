import React, { useState } from "react";
import { Book } from "@/types";
import { Star, Clock, BookOpen, Heart, Loader2 } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";

interface BookCardProps {
  book: Book;
  onSelect: (book: Book) => void;
  onToggleFavorite?: (id: string) => void;
  onDeleteClick?: (book: Book) => void;
  variant?: "default" | "compact" | "featured";
  compact?: boolean; // alias for variant="compact"
}

const ImageSkeleton: React.FC = () => (
  <div className="w-full h-full bg-black/[0.1] dark:bg-white/[0.1] animate-pulse-soft flex items-center justify-center">
    <BookOpen className="w-8 h-8 text-black/10 dark:text-white/10" />
  </div>
);

const BookCard: React.FC<BookCardProps> = ({
  book,
  onSelect,
  onToggleFavorite,
  onDeleteClick,
  variant = "default",
  compact = false,
}) => {
  const actualVariant = compact ? "compact" : variant;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isTogglingFav, setIsTogglingFav] = useState(false);
  const { reduceMotion } = useSettings();
  const { addToast } = useToast();

  const calculateProgress = () => {
    if (book.totalPages && book.totalPages > 0) {
      return Math.min(100, Math.round((book.progress / book.totalPages) * 100));
    }
    return 0;
  };

  const progressPercentage = calculateProgress();
  const lastOpened = book.lastOpenedAt ? new Date(book.lastOpenedAt).getTime() : 0;
  const isRecent = lastOpened && Date.now() - lastOpened < 7 * 24 * 60 * 60 * 1000;
  const isCompleted = progressPercentage >= 100 || book.readingList === "finished";

  const handleImageLoad = () => setImageLoaded(true);
  const handleImageError = () => setImageError(true);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onToggleFavorite) return;

    setIsTogglingFav(true);
    try {
      await onToggleFavorite(book.id);
      addToast(book.isFavorite ? "Removed from favorites" : "Added to favorites", "success");
    } catch (e) {
      addToast("Failed to update favorite", "error");
    } finally {
      setIsTogglingFav(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteClick?.(book);
  };

  if (actualVariant === "compact") {
    return (
      <div
        onClick={() => onSelect(book)}
        className="group flex items-center gap-4 p-4 rounded-2xl card card-hover card-interactive cursor-pointer"
      >
        <div className="relative flex-shrink-0">
          <div className="w-12 h-16 rounded-lg overflow-hidden bg-black/[0.05] dark:bg-white/[0.05] relative">
            {!imageLoaded && !imageError && <ImageSkeleton />}
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
              <div className="absolute inset-0 flex items-center justify-center">
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

  if (actualVariant === "featured") {
    return (
      <div
        onClick={() => onSelect(book)}
        className="group relative overflow-hidden rounded-3xl card card-hover card-interactive cursor-pointer p-6"
      >
        <div className="flex items-start gap-6">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-28 rounded-2xl overflow-hidden bg-black/[0.05] dark:bg-white/[0.05] book-spine-shadow relative">
              {!imageLoaded && !imageError && <ImageSkeleton />}
              {book.coverUrl && !imageError ? (
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  className={`w-full h-full object-cover transition-all duration-500 ${imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                    } group-hover:scale-105`}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-light-accent dark:text-dark-accent" strokeWidth={1.5} />
                </div>
              )}
            </div>

            {!reduceMotion && (
              <div className="absolute inset-0 rounded-2xl bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
                disabled={isTogglingFav}
                className={`p-2 rounded-xl transition-all duration-200 ${book.isFavorite
                  ? 'text-red-500 bg-red-50 dark:bg-red-950/30'
                  : 'text-light-text-muted dark:text-dark-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
                  } ${isTogglingFav ? 'opacity-50 cursor-wait' : ''}`}
              >
                <Heart className={`w-5 h-5 ${book.isFavorite ? 'fill-current' : ''} ${isTogglingFav ? 'animate-pulse' : ''}`} strokeWidth={1.5} />
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
                      className="h-full bg-light-accent dark:bg-dark-accent rounded-full transition-all duration-500"
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
      className="group relative overflow-hidden rounded-2xl card card-hover card-interactive cursor-pointer bg-light-surface dark:bg-dark-surface"
    >
      {/* Book Cover */}
      <div className="relative aspect-[2/3] overflow-hidden bg-gradient-to-br from-black/[0.02] to-black/[0.06] dark:from-white/[0.02] dark:to-white/[0.06]">
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 z-10">
            <ImageSkeleton />
          </div>
        )}
        {book.coverUrl && !imageError ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className={`w-full h-full object-cover transition-all duration-700 ease-out ${imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-102'
              } group-hover:scale-105`}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-light-accent/10 to-light-accent/5 dark:from-dark-accent/10 dark:to-dark-accent/5">
            <BookOpen className="w-12 h-12 text-light-accent/40 dark:text-dark-accent/40" strokeWidth={1} />
          </div>
        )}

        {/* Subtle vignette overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Favorite Button */}
        <button
          onClick={handleFavoriteClick}
          disabled={isTogglingFav}
          className={`absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-md transition-all duration-300 ${book.isFavorite
            ? 'bg-red-500/90 text-white shadow-lg shadow-red-500/25'
            : 'bg-black/30 text-white/90 hover:bg-red-500/90 hover:shadow-lg hover:shadow-red-500/25'
            } ${isTogglingFav ? 'opacity-100 cursor-wait' : 'opacity-0 group-hover:opacity-100'} z-10`}
        >
          <Heart className={`w-4 h-4 ${book.isFavorite ? 'fill-current' : ''} ${isTogglingFav ? 'animate-pulse' : ''}`} strokeWidth={2} />
        </button>

        {/* Delete Button */}
        {onDeleteClick && (
          <button
            onClick={handleDeleteClick}
            className="absolute top-3 left-3 p-2.5 rounded-full backdrop-blur-md bg-black/30 text-white/90 hover:bg-red-500/90 transition-all duration-300 opacity-0 group-hover:opacity-100 z-10"
            title="Delete Book"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
          </button>
        )}

        {/* Progress Bar - Elegant bottom edge */}
        {progressPercentage > 0 && (
          <div className="absolute bottom-0 left-0 right-0">
            <div className="h-1 bg-black/10">
              <div
                className="h-full bg-gradient-to-r from-light-accent to-light-accent/80 dark:from-dark-accent dark:to-dark-accent/80 transition-all duration-700"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Book Info - Cleaner typography */}
      <div className="p-4 space-y-1.5">
        <h3 className="font-serif font-semibold text-[15px] leading-snug text-light-text dark:text-dark-text line-clamp-2 group-hover:text-light-accent dark:group-hover:text-dark-accent transition-colors duration-300">
          {book.title}
        </h3>
        <p className="text-[13px] text-light-text-muted dark:text-dark-text-muted line-clamp-1">
          {book.author}
        </p>

        {progressPercentage > 0 && (
          <div className="flex items-center justify-between pt-1 text-[11px] text-light-text-muted/70 dark:text-dark-text-muted/70">
            <span className="tabular-nums">
              {book.progress} of {book.totalPages}
            </span>
            <span className="font-medium text-light-accent dark:text-dark-accent">
              {progressPercentage}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookCard;
