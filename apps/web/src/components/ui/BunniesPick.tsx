import React, { useMemo } from "react";
import type { Book } from "@/types";
import { BookOpen, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface BunniesPickProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
}

const BunniesPick: React.FC<BunniesPickProps> = ({ books, onSelectBook }) => {
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
      initial={{ opacity: 0, y: 20, rotate: 1 }}
      animate={{ opacity: 1, y: 0, rotate: 1 }}
      className="relative w-full overflow-hidden rounded-sm border-2 border-scrap-navy bg-scrap-cream p-6 sm:p-8 shadow-scrap-deep mb-12 max-w-4xl mx-auto transform rotate-1"
    >
      {/* Tape Strip */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-48 h-10 bg-scrap-sage/60 rotate-1 backdrop-blur-[1px] shadow-sm z-20"
           style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.3) 5px, rgba(255,255,255,0.3) 10px)" }}
      />

      {/* Background Texture */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-80" />

      {/* Decorative Stamp */}
      <div className="absolute top-4 right-4 hidden sm:block opacity-60 transform rotate-12">
        <div className="w-20 h-20 border-4 border-scrap-navy rounded-full flex items-center justify-center mask-stamp">
             <span className="font-head font-bold text-scrap-navy text-xs text-center leading-tight">BUNNIES'<br/>CHOICE<br/>★</span>
        </div>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 sm:gap-12">
        {/* Book Cover with 3D effect */}
        <div className="relative group shrink-0 perspective-500">
          <motion.div
            whileHover={{ rotateY: -10, rotateX: 5, scale: 1.05 }}
            className="relative w-40 sm:w-48 aspect-[2/3] rounded-sm shadow-xl border-l-4 border-t border-b border-r border-white/20"
          >
            <img
              src={pickedBook.coverUrl}
              alt={pickedBook.title}
              className="w-full h-full object-cover rounded-r-sm shadow-md"
            />
            {/* Gloss */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/30 to-transparent pointer-events-none mix-blend-overlay" />
          </motion.div>
          {/* Shadow */}
          <div className="absolute -bottom-6 left-4 right-4 h-4 bg-black/30 blur-xl transform rotate-3" />
        </div>

        {/* Content */}
        <div className="flex-1 text-center md:text-left space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-scrap-kraft text-scrap-navy border border-scrap-navy/20 text-xs font-head font-bold uppercase tracking-widest shadow-sm transform -rotate-1">
            <Sparkles className="w-3 h-3 text-scrap-sage" />
            <span>Recommended Reading</span>
            <Sparkles className="w-3 h-3 text-scrap-sage" />
          </div>

          <div>
            <h2 className="text-3xl sm:text-4xl font-head font-bold text-scrap-navy mb-2 drop-shadow-sm">
              {pickedBook.title}
            </h2>
            <p className="text-scrap-blue font-accent italic text-xl">
              by {pickedBook.author}
            </p>
          </div>

          <p className="text-base text-scrap-navy opacity-80 max-w-lg mx-auto md:mx-0 font-body leading-relaxed bg-white/50 p-4 rounded-sm border border-dashed border-scrap-navy/10 transform rotate-[0.5deg]">
             "The bunnies have sniffed around your library and think this is the perfect story for right now.
             Curl up with a warm drink and dive in!"
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
            <button
              onClick={() => onSelectBook(pickedBook)}
              className="px-8 py-3 bg-scrap-navy text-scrap-cream font-head font-bold text-lg rounded-sm shadow-scrap-card hover:shadow-scrap-lift hover:-translate-y-1 transition-all border-2 border-transparent flex items-center gap-2"
            >
              <BookOpen className="w-5 h-5" />
              Start Reading
            </button>

            {pickedBook.progress > 0 && (
              <span className="text-sm font-mono font-bold text-scrap-blue bg-white px-4 py-2 border border-scrap-navy/20 shadow-sm transform rotate-2">
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
