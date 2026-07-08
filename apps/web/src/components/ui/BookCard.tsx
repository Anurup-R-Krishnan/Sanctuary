import { Star, Clock, BookOpen, Heart, Trash2 } from "lucide-react";
import React, { useState, useCallback } from "react";

import type { Book } from "@/types";

import { useSettings } from "@/store/useSettingsStore";
import { cx } from "@/utils/cx";
import { clampPercent } from "@/utils/number";

import { ConfirmDialog } from "./Dialog";
import { IconButton } from "./IconButton";

type BookCardVariant = "default" | "compact" | "featured";

interface BookCardProps {
  book: Book;
  onDelete?: (id: string) => void;
  onSelect: (book: Book) => void;
  onToggleFavorite?: (id: string) => void;
  variant?: BookCardVariant;
}



const getBookProgressPercent = (book: Book) => {
  const totalPages = Math.max(1, book.totalPages || 100);
  return clampPercent((book.progress / totalPages) * 100);
};

const BookCover = ({
  book,
  imageError,
  imageLoaded,
  handleImageLoad,
  handleImageError,
  variant = "default",
  reduceMotion = false
}: {
  book: Book;
  imageError: boolean;
  imageLoaded: boolean;
  handleImageLoad: () => void;
  handleImageError: () => void;
  variant?: BookCardVariant;
  reduceMotion?: boolean;
}) => {
  const isCompact = variant === "compact";
  const isFeatured = variant === "featured";

  const containerClass = isCompact
    ? "w-12 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-light-accent/10 to-amber-500/10 dark:from-dark-accent/10 dark:to-amber-400/10"
    : isFeatured
      ? "w-20 h-28 rounded-2xl overflow-hidden bg-gradient-to-br from-light-accent/10 to-amber-500/10 dark:from-dark-accent/10 dark:to-amber-400/10 book-spine-shadow"
      : "w-full h-full object-cover";

  const iconSize = isCompact ? "w-5 h-5" : isFeatured ? "w-8 h-8" : "w-12 h-12";

  return (
    <div className={isCompact || isFeatured ? containerClass : "relative aspect-[3/4] overflow-hidden bg-black/[0.03] dark:bg-white/[0.05]"}>
      {book.coverUrl && !imageError ? (
        <img
          src={book.coverUrl}
          alt={book.title}
          className={cx(
            "w-full h-full object-cover transition-all duration-500",
            imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105",
            !isCompact && "group-hover:scale-105"
          )}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <BookOpen className={`${iconSize} text-light-accent dark:text-dark-accent`} strokeWidth={1.5} />
        </div>
      )}
      {isFeatured && !reduceMotion && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}
      {!isCompact && !isFeatured && !reduceMotion && (
        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      )}
    </div>
  );
};

const FavoriteButton = ({
  isFavorite,
  onClick,
  variant = "default"
}: {
  isFavorite: boolean;
  onClick: (e: React.MouseEvent) => void;
  variant?: BookCardVariant;
}) => {
  if (variant === "compact") return null;

  const isFeatured = variant === "featured";
  const className = isFeatured
    ? cx(
      "p-2 rounded-xl transition-all duration-200",
      isFavorite
        ? "text-red-500 bg-red-50 dark:bg-red-950/30"
        : "text-light-text-muted dark:text-dark-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
    )
    : cx(
      "absolute top-3 right-3 p-2 rounded-xl backdrop-blur-xl transition-all duration-200 opacity-0 group-hover:opacity-100",
      isFavorite ? "bg-red-500/90 text-white" : "bg-black/20 text-white hover:bg-red-500/90"
    );
  const iconClassName = cx(isFeatured ? "w-5 h-5" : "w-4 h-4", isFavorite && "fill-current");

  return (
    <IconButton
      onClick={onClick}
      className={className}
      icon={<Heart className={iconClassName} strokeWidth={1.5} />}
      label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      variant="ghost"
      size="md"
    />
  );
};

const DeleteButton = ({
  onClick,
  variant = "default"
}: {
  onClick: (e: React.MouseEvent) => void;
  variant?: BookCardVariant;
}) => {
  if (variant === "compact") return null;

  const isFeatured = variant === "featured";
  const className = isFeatured
    ? "p-2 rounded-xl transition-all duration-200 text-light-text-muted dark:text-dark-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
    : "absolute top-3 right-12 p-2 rounded-xl backdrop-blur-xl transition-all duration-200 opacity-0 group-hover:opacity-100 bg-black/20 text-white hover:bg-red-500/90";
  
  const iconClassName = isFeatured ? "w-5 h-5" : "w-4 h-4";

  return (
    <IconButton
      onClick={onClick}
      className={className}
      aria-label="Delete book"
      label="Delete book"
      icon={<Trash2 className={iconClassName} strokeWidth={1.5} />}
      variant="ghost"
      size="md"
    />
  );
};

const ProgressBar = ({ progress, variant = "default" }: { progress: number; variant?: BookCardVariant }) => {
  if (progress <= 0) return null;

  if (variant === "compact") {
    return (
      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-light-accent dark:bg-dark-accent flex items-center justify-center">
        <span className="text-[8px] font-bold text-white">{progress}%</span>
      </div>
    );
  }

  if (variant === "featured") {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-light-text-muted dark:text-dark-text-muted">Progress</span>
          <span className="font-semibold text-light-accent dark:text-dark-accent">{progress}%</span>
        </div>
        <div className="h-2 bg-black/[0.06] dark:bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-light-accent to-amber-500 dark:from-dark-accent dark:to-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
      <div
        className="h-full bg-gradient-to-r from-light-accent to-amber-500 dark:from-dark-accent dark:to-amber-400 transition-all duration-500"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

const BookMetadata = ({ title, author, variant = "default" }: { title: string; author: string; variant?: BookCardVariant }) => {
  const isFeatured = variant === "featured";
  
  return (
    <div className={isFeatured ? "mb-1" : ""}>
      <h3 className={cx(
        isFeatured ? "text-xl font-bold" : "font-semibold",
        "text-light-text dark:text-dark-text line-clamp-2 group-hover:text-light-accent dark:group-hover:text-dark-accent transition-colors duration-200"
      )}>
        {title}
      </h3>
      <p className={cx(isFeatured ? "font-medium" : "text-sm", "text-light-text-muted dark:text-dark-text-muted line-clamp-1")}>
        {author}
      </p>
    </div>
  );
};

function BookCard({
  book,
  onSelect,
  onToggleFavorite,
  onDelete,
  variant = "default"
}: BookCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const reduceMotion = useSettings((state) => state.reduceMotion);

  const progressPercentage = getBookProgressPercent(book);
  const isRecent = book.lastOpenedAt && Date.now() - new Date(book.lastOpenedAt).getTime() < 7 * 24 * 60 * 60 * 1000;
  const isCompleted = progressPercentage >= 100;

  const handleImageLoad = () => setImageLoaded(true);
  const handleImageError = () => setImageError(true);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(book.id);
  };
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    onDelete?.(book.id);
  }, [book.id, onDelete]);
  const handleCardKeyDown = (e: React.KeyboardEvent, selectedBook: Book) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(selectedBook);
    }
  };

  const commonCoverProps = {
    book,
    imageError,
    imageLoaded,
    handleImageLoad,
    handleImageError,
    reduceMotion
  };

  const isFeatured = variant === "featured";
  const isCompact = variant === "compact";
  const Tag: "div" | "article" = variant === "compact" ? "div" : "article";

  return (
    <Tag
      onClick={() => onSelect(book)}
      onKeyDown={(e: React.KeyboardEvent) => handleCardKeyDown(e, book)}
      role="button"
      tabIndex={0}
      className={cx(
        "group border border-black/[0.08] dark:border-white/[0.08] bg-light-surface dark:bg-dark-surface transition-colors cursor-pointer",
        isCompact && "flex items-center gap-4 p-3 rounded-xl hover:border-light-accent/40 dark:hover:border-dark-accent/40",
        isFeatured && "relative overflow-hidden rounded-2xl hover:border-light-accent/40 dark:hover:border-dark-accent/40 p-5",
        !isCompact && !isFeatured && "relative overflow-hidden rounded-2xl hover:border-light-accent/35 dark:hover:border-dark-accent/35"
      )}
    >
      {isCompact ? (
        <>
          <div className="relative flex-shrink-0">
            <BookCover {...commonCoverProps} variant="compact" />
            <ProgressBar progress={progressPercentage} variant="compact" />
          </div>
          <div className="flex-1 min-w-0">
            <BookMetadata title={book.title} author={book.author} variant="compact" />
          </div>
          <div className="flex items-center gap-2">
            {book.isFavorite && <Heart className="w-4 h-4 text-red-500 fill-current" strokeWidth={1.5} />}
            {isRecent && <Clock className="w-4 h-4 text-light-accent dark:text-dark-accent" strokeWidth={1.5} />}
          </div>
        </>
      ) : isFeatured ? (
        <div className="flex items-start gap-6">
          <div className="relative flex-shrink-0">
            <BookCover {...commonCoverProps} variant="featured" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-3">
              <BookMetadata title={book.title} author={book.author} variant="featured" />
              <div className="flex items-center gap-2">
                <FavoriteButton isFavorite={!!book.isFavorite} onClick={handleFavoriteClick} variant="featured" />
                {onDelete && <DeleteButton onClick={handleDeleteClick} variant="featured" />}
              </div>
            </div>
            <div className="space-y-3">
              <ProgressBar progress={progressPercentage} variant="featured" />
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
      ) : (
        <>
          <div className="relative">
            <BookCover {...commonCoverProps} variant="default" />
            <FavoriteButton isFavorite={!!book.isFavorite} onClick={handleFavoriteClick} variant="default" />
            {onDelete && <DeleteButton onClick={handleDeleteClick} variant="default" />}
            <ProgressBar progress={progressPercentage} variant="default" />
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {isRecent && (
                <div className="px-2 py-1 bg-light-accent/90 dark:bg-dark-accent/90 text-white text-xs font-semibold rounded-lg backdrop-blur-xl">Recent</div>
              )}
              {isCompleted && (
                <div className="px-2 py-1 bg-amber-500/90 text-white text-xs font-semibold rounded-lg backdrop-blur-xl">Complete</div>
              )}
            </div>
          </div>
          <div className="p-4 space-y-2">
            <BookMetadata title={book.title} author={book.author} variant="default" />
            {progressPercentage > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-light-text-muted dark:text-dark-text-muted">{book.progress} / {book.totalPages} pages</span>
                <span className="font-semibold text-light-accent dark:text-dark-accent">{progressPercentage}%</span>
              </div>
            )}
          </div>
        </>
      )}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Book"
        description={`Are you sure you want to delete "${book.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isDestructive
      />
    </Tag>
  );
};

export default BookCard;
