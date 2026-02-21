import React, { useMemo } from "react";
import { Book } from "@/types";
import { BookOpen, Star, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface BunniesPickProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
}

const BunniesPick: React.FC<BunniesPickProps> = ({ books, onSelectBook }) => {
  // Logic: Prefer a "Favorite" book that is NOT finished.
  // If no favorites, pick a random unfinished book.
  // If all finished, pick a random book.
  const pickedBook = useMemo(() => {
    if (!books.length) return null;

    const favorites = books.filter((b) => b.isFavorite && b.readingList !== "finished");
    if (favorites.length > 0) {
      return favorites[Math.floor(Math.random() * favorites.length)];
    }

    const unfinished = books.filter((b) => b.readingList !== "finished");
    if (unfinished.length > 0) {
      return unfinished[Math.floor(Math.random() * unfinished.length)];
    }

    return books[Math.floor(Math.random() * books.length)];
  }, [books]);

  if (!pickedBook) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full overflow-hidden rounded-2xl border-2 border-[rgb(var(--ink-navy))] bg-[rgb(var(--aged-paper))] p-6 sm:p-8 shadow-pixel mb-10"
    >
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-[rgb(var(--woodstock-gold))] opacity-20 blur-2xl" />
      <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-24 w-24 rounded-full bg-[rgb(var(--sage-green))] opacity-20 blur-2xl" />

      {/* Pixel Art Decoration (SVG) */}
      <div className="absolute top-4 right-4 animate-bounce-gentle hidden sm:block">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="rgb(var(--ink-navy))" className="opacity-80">
             <path d="M4 2h2v2H4V2zm2 2h2v2H6V4zm2 2h2v2H8V6zm2 2h2v2h-2V8zm2-2h2v2h-2V6zm2-2h2v2h-2V4zm2-2h2v2h-2V2zM4 16h2v-2H4v2zm2-2h2v-2H6v2zm2-2h2v-2H8v2zm8 4h2v-2h-2v2zm2-2h2v-2h-2v2zm2-2h2v-2h-2v2z" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
        {/* Book Cover with 3D effect */}
        <div className="relative group shrink-0">
          <div className="absolute inset-0 bg-[rgb(var(--ink-navy))] translate-x-2 translate-y-2 rounded-lg" />
          <motion.div
            whileHover={{ y: -4, x: -4 }}
            className="relative w-32 sm:w-40 aspect-[2/3] rounded-lg overflow-hidden border-2 border-[rgb(var(--ink-navy))]"
          >
            <img
              src={pickedBook.coverUrl}
              alt={pickedBook.title}
              className="w-full h-full object-cover"
            />
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
          </motion.div>
        </div>

        {/* Content */}
        <div className="flex-1 text-center md:text-left space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[rgb(var(--ink-navy))] bg-[rgb(var(--paper-cream))] text-xs font-pixel uppercase tracking-widest text-[rgb(var(--ink-navy))]">
            <Sparkles className="w-3 h-3" />
            <span>Bunnies' Pick</span>
            <Sparkles className="w-3 h-3" />
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[rgb(var(--ink-navy))] mb-1">
              {pickedBook.title}
            </h2>
            <p className="text-[rgb(var(--sepia-brown))] font-medium italic">
              by {pickedBook.author}
            </p>
          </div>

          <p className="text-sm text-[rgb(var(--ink-navy))] opacity-80 max-w-lg mx-auto md:mx-0 font-sans leading-relaxed">
             The bunnies have sniffed around your library and think this is the perfect story for right now.
             Curl up with a warm drink and dive in!
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 justify-center md:justify-start">
            <button
              onClick={() => onSelectBook(pickedBook)}
              className="btn-cozy shadow-pixel active:translate-y-1 active:shadow-none hover:-translate-y-0.5 transition-transform"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Start Reading
            </button>

            {pickedBook.progress > 0 && (
              <span className="text-xs font-pixel text-[rgb(var(--sepia-brown))] bg-white/50 px-3 py-2 rounded-lg border border-[rgb(var(--ink-navy))]/20">
                {pickedBook.progress}% Complete
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default BunniesPick;
