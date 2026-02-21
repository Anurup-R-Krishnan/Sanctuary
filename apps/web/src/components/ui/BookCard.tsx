import React, { useState } from "react";
import type { Book } from "@/types";
import { Star, BookOpen, Trash2, Clock } from "lucide-react";
import { useBookStore } from "@/store/useBookStore";
import { motion, AnimatePresence } from "framer-motion";

interface BookCardProps {
  book: Book;
  onSelect: (book: Book) => void;
  onToggleFavorite: (id: string) => void;
  variant?: "standard" | "compact";
}

const BookCard: React.FC<BookCardProps> = ({
  book,
  onSelect,
  onToggleFavorite,
  variant = "standard",
}) => {
  const removeBook = useBookStore((state) => state.removeBook);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirmDelete(true);
  };

  const confirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeBook(book.id);
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirmDelete(false);
  };

  if (variant === "compact") {
    // Compact variant for horizontal scrolls (keep simpler but consistent)
    return (
      <motion.div
        className="group relative flex-shrink-0 w-full cursor-pointer"
        onClick={() => onSelect(book)}
        whileHover={{ y: -4 }}
      >
        <div className="aspect-[2/3] w-full rounded-md border-2 border-[rgb(var(--ink-navy))] bg-[rgb(var(--paper-cream))] shadow-pixel-sm overflow-hidden mb-2 relative">
          {!imageError ? (
            <img
              src={book.coverUrl}
              alt={book.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImageError(true)}
            />
          ) : (
             <div className="flex h-full w-full items-center justify-center bg-[rgb(var(--aged-paper))] p-4 text-center">
              <span className="font-serif text-sm font-semibold text-[rgb(var(--ink-navy))] line-clamp-3 leading-tight">
                {book.title}
              </span>
            </div>
          )}
          {/* Progress Bar Overlay */}
          {book.progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[rgb(var(--ink-navy))]/10">
              <div
                className="h-full bg-[rgb(var(--woodstock-gold))]"
                style={{ width: `${book.progress}%` }}
              />
            </div>
          )}
        </div>
        <h4 className="truncate text-xs font-bold text-[rgb(var(--ink-navy))] font-serif">{book.title}</h4>
      </motion.div>
    );
  }

  // Standard 3D Book Card
  return (
    <div className="group relative perspective">
      <AnimatePresence>
        {showConfirmDelete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl bg-[rgb(var(--paper-cream))] p-4 text-center border-2 border-[rgb(var(--ink-navy))] shadow-pixel"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-sm font-medium text-[rgb(var(--ink-navy))]">Delete book?</p>
            <div className="flex gap-2">
              <button
                onClick={confirmDelete}
                className="rounded-md bg-red-500 px-3 py-1 text-xs font-bold text-white shadow-pixel-sm hover:translate-y-0.5 hover:shadow-none transition-all border border-black/20"
              >
                Yes
              </button>
              <button
                onClick={cancelDelete}
                className="rounded-md bg-[rgb(var(--aged-paper))] px-3 py-1 text-xs font-bold text-[rgb(var(--ink-navy))] shadow-pixel-sm hover:translate-y-0.5 hover:shadow-none transition-all border border-[rgb(var(--ink-navy))]"
              >
                No
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        onClick={() => onSelect(book)}
        className="cursor-pointer relative transform-style-3d transition-transform duration-300 group-hover:-translate-y-2 group-hover:rotate-y-[-5deg]"
      >
        {/* Book Spine (Fake 3D) */}
        <div
          className="absolute left-0 top-1 bottom-1 w-4 bg-[rgb(var(--ink-navy))] rounded-l-sm origin-right transform -translate-x-full translate-z-[-2px] rotate-y-[-90deg] brightness-75 z-0"
          style={{ transform: "translateX(-4px) translateZ(-1px) rotateY(-90deg)" }} // Manual tweak for visual alignment
        />

        {/* Main Cover */}
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-r-md rounded-l-sm border-2 border-[rgb(var(--ink-navy))] bg-[rgb(var(--paper-cream))] shadow-md z-10">
          {!imageError ? (
            <img
              src={book.coverUrl}
              alt={book.title}
              className="h-full w-full object-cover transition-transform duration-500"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-[rgb(var(--aged-paper))] p-4 text-center">
              <div className="mb-2 rounded-full bg-[rgb(var(--woodstock-gold))] p-3 border-2 border-[rgb(var(--ink-navy))]">
                <BookOpen className="h-6 w-6 text-[rgb(var(--ink-navy))]" />
              </div>
              <span className="font-serif font-bold text-[rgb(var(--ink-navy))] line-clamp-3">
                {book.title}
              </span>
              <span className="mt-1 text-xs text-[rgb(var(--sepia-brown))] line-clamp-1">
                {book.author}
              </span>
            </div>
          )}

          {/* Shine/Texture Overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none mix-blend-overlay" />
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-black/10 pointer-events-none" /> {/* Spine crease */}

          {/* Badges */}
          <div className="absolute top-2 right-2 flex flex-col gap-2">
            {book.isFavorite && (
              <div className="bg-[rgb(var(--woodstock-gold))] text-[rgb(var(--ink-navy))] p-1.5 rounded-md border border-[rgb(var(--ink-navy))] shadow-pixel-sm">
                <Star className="w-3 h-3 fill-current" />
              </div>
            )}
             {book.progress > 0 && book.progress < 100 && (
              <div className="bg-[rgb(var(--sage-green))] text-white p-1.5 rounded-md border border-[rgb(var(--ink-navy))] shadow-pixel-sm" title={`${book.progress}%`}>
                <Clock className="w-3 h-3" />
              </div>
            )}
          </div>
        </div>

        {/* Shadow (Bottom) */}
        <div className="absolute -bottom-4 left-4 right-4 h-4 bg-black/20 blur-md rounded-[100%] transition-all duration-300 group-hover:bg-black/10 group-hover:scale-90" />

        {/* Info (Below Book) */}
        <div className="mt-3 space-y-1 pl-1">
          <h3 className="truncate font-serif font-bold text-[rgb(var(--ink-navy))] group-hover:text-[rgb(var(--clay-red))] transition-colors">
            {book.title}
          </h3>
          <p className="truncate text-xs text-[rgb(var(--sepia-brown))] font-medium">
            {book.author}
          </p>

          {/* Progress Bar (Visible on hover or if active) */}
           {book.progress > 0 && (
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-[rgb(var(--ink-navy))]/10 overflow-hidden border border-[rgb(var(--ink-navy))]/20">
              <div
                className="h-full bg-[rgb(var(--sage-green))]"
                style={{ width: `${book.progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Hover Actions */}
        <div className="absolute bottom-16 right-2 flex gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 z-20">
           <button
            onClick={onToggleFavorite ? (e) => { e.stopPropagation(); onToggleFavorite(book.id); } : undefined}
            className="p-2 rounded-full bg-[rgb(var(--paper-cream))] text-[rgb(var(--ink-navy))] border-2 border-[rgb(var(--ink-navy))] shadow-pixel-sm hover:scale-110 active:scale-95 transition-transform"
          >
             <Star className={`w-4 h-4 ${book.isFavorite ? "fill-[rgb(var(--woodstock-gold))] text-[rgb(var(--woodstock-gold))]" : ""}`} />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 rounded-full bg-[rgb(var(--paper-cream))] text-red-500 border-2 border-[rgb(var(--ink-navy))] shadow-pixel-sm hover:scale-110 active:scale-95 transition-transform"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default BookCard;
