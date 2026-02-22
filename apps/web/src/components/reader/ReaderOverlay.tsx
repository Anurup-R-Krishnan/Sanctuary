import React, { useState } from "react";
import type { Book, Bookmark, TOCItem } from "@/types";
import { ArrowLeft, BookOpen, Settings, ChevronLeft, ChevronRight, Bookmark as BookmarkIcon, List, X, Trash2, Maximize, Minimize } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ReaderOverlayProps {
  book: Book;
  showUI: boolean;
  showSettings: boolean;
  showControls: boolean;
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  readingTime: number;
  isBookmarked: boolean;
  currentCfi: string | null;
  toc: TOCItem[];
  bookmarks: Bookmark[];
  isFullscreen: boolean;

  onClose: () => void;
  onToggleBookmark: () => void;
  onToggleTOC: () => void;
  onToggleSettings: () => void;
  onToggleControls: () => void;
  onToggleFullscreen: () => void;

  onNextPage: () => void;
  onPrevPage: () => void;
  onNavigate: (href: string) => void;
  onJumpToTop: () => void;
  onJumpToBottom: () => void;
  onPageChange: (page: number) => void;

  onRemoveBookmark: (bookId: string, bookmarkId: string) => void;
  onCloseSettings: () => void;
  onCloseControls: () => void;
}

const ReaderOverlay: React.FC<ReaderOverlayProps> = ({
  book,
  showUI,
  showSettings,
  showControls,
  isLoading,
  currentPage,
  totalPages,
  readingTime,
  isBookmarked,
  toc,
  bookmarks,
  isFullscreen,
  onClose,
  onToggleBookmark,
  onToggleTOC,
  onToggleSettings,
  onToggleControls,
  onToggleFullscreen,
  onNextPage,
  onPrevPage,
  onNavigate,
  onRemoveBookmark,
  onCloseSettings,
  onCloseControls,
}) => {
  const [activeTab, setActiveTab] = useState<"toc" | "bookmarks">("toc");

  return (
    <>
      {/* Header Bar */}
      <motion.div
        initial={false}
        animate={{ y: showUI ? 0 : -100 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between p-4 pointer-events-none"
      >
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={onClose}
            className="p-3 rounded-full bg-[rgb(var(--paper-cream))] text-[rgb(var(--ink-navy))] shadow-pixel border-2 border-[rgb(var(--ink-navy))] hover:translate-y-1 hover:shadow-none transition-all"
            aria-label="Close reader"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="hidden sm:block px-4 py-2 bg-[rgb(var(--paper-cream))] rounded-full border-2 border-[rgb(var(--ink-navy))] shadow-pixel">
            <h1 className="text-sm font-serif font-bold text-[rgb(var(--ink-navy))] max-w-[200px] truncate">
              {book.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onToggleBookmark}
            className={`p-3 rounded-full border-2 border-[rgb(var(--ink-navy))] shadow-pixel transition-all hover:translate-y-1 hover:shadow-none ${
              isBookmarked
                ? "bg-[rgb(var(--woodstock-gold))] text-[rgb(var(--ink-navy))]"
                : "bg-[rgb(var(--paper-cream))] text-[rgb(var(--ink-navy))]"
            }`}
            aria-label="Toggle bookmark"
          >
            <BookmarkIcon className={`w-5 h-5 ${isBookmarked ? "fill-current" : ""}`} />
          </button>
          <button
            onClick={onToggleTOC}
            className="p-3 rounded-full bg-[rgb(var(--paper-cream))] text-[rgb(var(--ink-navy))] shadow-pixel border-2 border-[rgb(var(--ink-navy))] hover:translate-y-1 hover:shadow-none transition-all"
            aria-label="Table of contents"
          >
            <List className="w-5 h-5" />
          </button>
          <button
            onClick={onToggleFullscreen}
            className="hidden sm:flex p-3 rounded-full bg-[rgb(var(--paper-cream))] text-[rgb(var(--ink-navy))] shadow-pixel border-2 border-[rgb(var(--ink-navy))] hover:translate-y-1 hover:shadow-none transition-all"
            aria-label="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </motion.div>

      {/* Footer Bar */}
      <motion.div
        initial={false}
        animate={{ y: showUI ? 0 : 100 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none p-6"
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between pointer-events-auto">
            {/* Page Control - Tactile Style */}
            <div className="flex items-center gap-4 bg-[rgb(var(--paper-cream))] border-2 border-[rgb(var(--ink-navy))] rounded-full p-2 shadow-deep">
                <button
                    onClick={onPrevPage}
                    className="p-2 rounded-full hover:bg-[rgb(var(--aged-paper))] transition-colors border border-transparent active:border-[rgb(var(--ink-navy))]"
                >
                    <ChevronLeft className="w-5 h-5 text-[rgb(var(--ink-navy))]" />
                </button>

                <div className="flex flex-col items-center px-4 min-w-[100px]">
                    <span className="text-sm font-pixel font-bold text-[rgb(var(--ink-navy))]">
                        {currentPage} / {totalPages || "--"}
                    </span>
                    <span className="text-[9px] font-mono text-[rgb(var(--sepia-brown))] uppercase tracking-wider">
                        {readingTime} min left
                    </span>
                </div>

                <button
                    onClick={onNextPage}
                    className="p-2 rounded-full hover:bg-[rgb(var(--aged-paper))] transition-colors border border-transparent active:border-[rgb(var(--ink-navy))]"
                >
                    <ChevronRight className="w-5 h-5 text-[rgb(var(--ink-navy))]" />
                </button>
            </div>
        </div>
      </motion.div>

      {/* TOC / Controls Drawer (Leather Journal Style) */}
      <AnimatePresence>
        {showControls && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseControls}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 bottom-0 w-80 sm:w-96 bg-[rgb(var(--paper-cream))] z-50 border-l-4 border-[rgb(var(--ink-navy))] shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b-2 border-[rgb(var(--ink-navy))] bg-[rgb(var(--aged-paper))]">
                <h2 className="text-xl font-serif font-bold text-[rgb(var(--ink-navy))]">Contents</h2>
                <button
                  onClick={onCloseControls}
                  className="p-2 hover:bg-[rgb(var(--ink-navy))] hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex p-2 gap-2 bg-[rgb(var(--aged-paper))] border-b-2 border-[rgb(var(--ink-navy))]">
                <button
                  onClick={() => setActiveTab("toc")}
                  className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all border-2 ${
                    activeTab === "toc"
                      ? "bg-[rgb(var(--paper-cream))] border-[rgb(var(--ink-navy))] text-[rgb(var(--ink-navy))] shadow-pixel-sm translate-y-[-2px]"
                      : "border-transparent text-[rgb(var(--sepia-brown))] hover:bg-black/5"
                  }`}
                >
                  Chapters
                </button>
                <button
                  onClick={() => setActiveTab("bookmarks")}
                  className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all border-2 ${
                    activeTab === "bookmarks"
                      ? "bg-[rgb(var(--paper-cream))] border-[rgb(var(--ink-navy))] text-[rgb(var(--ink-navy))] shadow-pixel-sm translate-y-[-2px]"
                      : "border-transparent text-[rgb(var(--sepia-brown))] hover:bg-black/5"
                  }`}
                >
                  Bookmarks
                </button>
              </div>

              {/* Content List */}
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {activeTab === "toc" ? (
                  <div className="space-y-1">
                    {toc.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => onNavigate(item.href)}
                        className="w-full text-left px-4 py-3 rounded-lg hover:bg-[rgb(var(--aged-paper))] text-[rgb(var(--ink-navy))] font-serif transition-colors border border-transparent hover:border-[rgb(var(--ink-navy))]/20"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bookmarks.length === 0 ? (
                        <div className="text-center py-10 opacity-50">
                            <BookmarkIcon className="w-12 h-12 mx-auto mb-2" />
                            <p className="font-hand text-lg">No dog-ears yet.</p>
                        </div>
                    ) : (
                        bookmarks.map((bookmark) => (
                        <div
                            key={bookmark.id}
                            className="group flex items-start gap-3 p-3 rounded-lg border-2 border-[rgb(var(--ink-navy))]/10 bg-white hover:border-[rgb(var(--ink-navy))] hover:shadow-pixel-sm transition-all"
                        >
                            <button
                            onClick={() => onNavigate(bookmark.cfi)}
                            className="flex-1 text-left"
                            >
                            <p className="font-bold text-sm text-[rgb(var(--ink-navy))] line-clamp-2">
                                {bookmark.title || "Untitled Bookmark"}
                            </p>
                            <p className="text-xs text-[rgb(var(--sepia-brown))] mt-1 font-mono opacity-70">
                                {new Date(bookmark.createdAt).toLocaleDateString()}
                            </p>
                            </button>
                            <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemoveBookmark(book.id, bookmark.id);
                            }}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            >
                            <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        ))
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default ReaderOverlay;
