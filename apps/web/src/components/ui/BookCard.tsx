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

  // Random tilt for "living bookshelf" feel (memoized roughly by ID hash to be consistent but varied)
  const tilt = React.useMemo(() => {
    const hash = book.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (hash % 6) - 3; // -3deg to +3deg
  }, [book.id]);

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

  const playHoverSound = () => {
    // const audio = new Audio('/sounds/book-slide.mp3');
    // audio.volume = 0.2;
    // audio.play().catch(() => {});
  };

  if (variant === "compact") {
    // Compact variant for horizontal scrolls
    return (
      <motion.div
        className="group relative flex-shrink-0 w-full cursor-pointer perspective-500"
        onClick={() => onSelect(book)}
        whileHover={{ y: -8, rotateX: 5, zIndex: 10 }}
        onHoverStart={playHoverSound}
        style={{ rotate: tilt }}
      >
        <div className="aspect-[2/3] w-full rounded-md border-2 border-[rgb(var(--ink-navy))] bg-[rgb(var(--paper-cream))] shadow-pixel-sm overflow-hidden mb-2 relative transform transition-transform duration-300 group-hover:shadow-lg">
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

          {/* Dust/Texture Overlay */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dust.png')] opacity-20 mix-blend-overlay pointer-events-none" />

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
        <h4 className="truncate text-xs font-bold text-[rgb(var(--ink-navy))] font-serif group-hover:text-[rgb(var(--clay-red))] transition-colors">{book.title}</h4>
      </motion.div>
    );
  }

  // Standard 3D Book Card
  return (
    <div className="group relative perspective-1000" style={{ transform: `rotate(${tilt}deg)` }}>
      <AnimatePresence>
        {showConfirmDelete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotateY: 90 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-xl bg-[rgb(var(--paper-cream))] p-4 text-center border-2 border-[rgb(var(--ink-navy))] shadow-pixel transform-style-3d backface-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-sm font-medium text-[rgb(var(--ink-navy))] font-hand font-bold">Burn this book?</p>
            <div className="flex gap-2">
              <button
                onClick={confirmDelete}
                className="rounded-md bg-red-500 px-3 py-1 text-xs font-bold text-white shadow-pixel-sm hover:translate-y-0.5 hover:shadow-none transition-all border-2 border-black/20"
              >
                Yes
              </button>
              <button
                onClick={cancelDelete}
                className="rounded-md bg-[rgb(var(--aged-paper))] px-3 py-1 text-xs font-bold text-[rgb(var(--ink-navy))] shadow-pixel-sm hover:translate-y-0.5 hover:shadow-none transition-all border-2 border-[rgb(var(--ink-navy))]"
              >
                No
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        onClick={() => onSelect(book)}
        onHoverStart={playHoverSound}
        className="cursor-pointer relative transform-style-3d transition-transform duration-500 ease-out group-hover:-translate-y-4 group-hover:rotate-y-[-15deg] group-hover:rotate-x-[5deg] group-hover:scale-105 z-10"
      >
        {/* Book Spine (Fake 3D) */}
        <div
          className="absolute left-0 top-1 bottom-1 w-6 bg-[rgb(var(--ink-navy))] rounded-l-sm origin-right transform -translate-x-full translate-z-[-3px] rotate-y-[-90deg] brightness-75 z-0 border-l border-t border-b border-white/10"
          style={{ transform: "translateX(-4px) translateZ(-2px) rotateY(-90deg)" }}
        >
            <div className="h-full w-full flex flex-col justify-center items-center py-2">
                <span className="text-[6px] text-[rgb(var(--paper-cream))] font-serif writing-vertical tracking-widest opacity-60 line-clamp-3">{book.title.slice(0, 15)}</span>
            </div>
        </div>

        {/* Page Edges (Right Side) */}
        <div
            className="absolute right-0 top-1 bottom-1 w-4 bg-[#fdfbf7] origin-left transform translate-x-full rotate-y-[-90deg] z-0 border-r border-[rgb(var(--sepia-brown))]/20"
            style={{
                transform: "translateX(0px) translateZ(-2px) rotateY(90deg)",
                backgroundImage: "linear-gradient(to bottom, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 3px, transparent 3px)",
                backgroundSize: "100% 3px"
            }}
        />

        {/* Main Cover */}
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-r-md rounded-l-sm border-2 border-[rgb(var(--ink-navy))] bg-[rgb(var(--paper-cream))] shadow-lg z-10 group-hover:shadow-2xl transition-shadow duration-500">
          {!imageError ? (
            <img
              src={book.coverUrl}
              alt={book.title}
              className="h-full w-full object-cover"
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

          {/* Realistic Shine/Texture Overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-black/10 pointer-events-none mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/leather.png')] opacity-10 mix-blend-multiply pointer-events-none" />
          <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-black/20 to-transparent pointer-events-none" /> {/* Spine crease */}

          {/* Badges */}
          <div className="absolute top-2 right-2 flex flex-col gap-2">
            {book.isFavorite && (
              <div className="bg-[rgb(var(--woodstock-gold))] text-[rgb(var(--ink-navy))] p-1.5 rounded-md border-2 border-[rgb(var(--ink-navy))] shadow-pixel-sm animate-bounce-gentle">
                <Star className="w-3 h-3 fill-current" />
              </div>
            )}
             {book.progress > 0 && book.progress < 100 && (
              <div className="bg-[rgb(var(--sage-green))] text-white p-1.5 rounded-md border-2 border-[rgb(var(--ink-navy))] shadow-pixel-sm" title={`${book.progress}%`}>
                <Clock className="w-3 h-3" />
              </div>
            )}
          </div>
        </div>

        {/* Shadow (Bottom) */}
        <div className="absolute -bottom-4 left-4 right-4 h-4 bg-black/40 blur-lg rounded-[100%] transition-all duration-300 group-hover:bg-black/20 group-hover:scale-75 group-hover:translate-y-4" />

        {/* Info (Below Book) */}
        <div className="mt-4 space-y-1 pl-1 transition-opacity duration-300 group-hover:opacity-100">
          <h3 className="truncate font-serif font-bold text-[rgb(var(--ink-navy))] group-hover:text-[rgb(var(--clay-red))] transition-colors text-lg">
            {book.title}
          </h3>
          <p className="truncate text-xs text-[rgb(var(--sepia-brown))] font-hand font-bold tracking-wide">
            {book.author}
          </p>

          {/* Progress Bar (Visible on hover or if active) */}
           {book.progress > 0 && (
            <div className="mt-2 h-2 w-full rounded-full bg-[rgb(var(--ink-navy))]/10 overflow-hidden border border-[rgb(var(--ink-navy))]/20">
              <div
                className="h-full bg-[rgb(var(--sage-green))] relative"
                style={{ width: `${book.progress}%` }}
              >
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50" />
              </div>
            </div>
          )}
        </div>

        {/* Hover Actions (Floating off to the side) */}
        <div className="absolute top-1/2 -right-12 -translate-y-1/2 flex flex-col gap-3 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:-right-14 z-20">
           <button
            onClick={onToggleFavorite ? (e) => { e.stopPropagation(); onToggleFavorite(book.id); } : undefined}
            className="p-2 rounded-full bg-[rgb(var(--paper-cream))] text-[rgb(var(--ink-navy))] border-2 border-[rgb(var(--ink-navy))] shadow-pixel-sm hover:scale-110 active:scale-95 transition-transform"
            title="Favorite"
          >
             <Star className={`w-4 h-4 ${book.isFavorite ? "fill-[rgb(var(--woodstock-gold))] text-[rgb(var(--woodstock-gold))]" : ""}`} />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 rounded-full bg-[rgb(var(--paper-cream))] text-red-500 border-2 border-[rgb(var(--ink-navy))] shadow-pixel-sm hover:scale-110 active:scale-95 transition-transform"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default BookCard;
