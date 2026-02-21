import React from "react";
import type { Book, Bookmark } from "@/types";
import ReaderHeader from "@/components/reader/ReaderHeader";
import ReaderFooter from "@/components/reader/ReaderFooter";
import ReaderSettings from "@/components/reader/ReaderSettings";
import ReaderControls from "@/components/reader/ReaderControls";

interface ReaderOverlayProps {
  book: Book;
  showUI: boolean;
  showSettings: boolean;
  showControls: boolean;
  isLoading: boolean;
  chapterTitle: string;
  currentPage: number;
  totalPages: number;
  readingTime: number;
  isBookmarked: boolean;
  currentCfi: string;
  toc: Array<{ id?: string; href: string; label: string; subitems?: Array<{ id?: string; href: string; label: string }> }>;
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
  onPrevChapter: () => void;
  onNextChapter: () => void;
  onPageChange: (page: number) => void;
  onRemoveBookmark: (bookId: string, bookmarkId: string) => void;
  onCloseSettings: () => void;
  onCloseControls: () => void;
}

const ReaderOverlay: React.FC<ReaderOverlayProps> = (props) => {
  const mappedToc = props.toc.map((item, index) => ({
    id: item.id || `${index}-${item.href || item.label}`,
    href: item.href,
    label: item.label,
    subitems: item.subitems?.map((sub, subIndex) => ({
      id: sub.id || `${index}-${subIndex}-${sub.href || sub.label}`,
      href: sub.href,
      label: sub.label
    }))
  }));

  return (
    <>
      <ReaderHeader
        book={props.book}
        chapterTitle={props.chapterTitle}
        isBookmarked={props.isBookmarked}
        isFullscreen={props.isFullscreen}
        showUI={props.showUI}
        onClose={props.onClose}
        onToggleBookmark={props.onToggleBookmark}
        onToggleTOC={props.onToggleTOC}
        onToggleSettings={props.onToggleSettings}
        onToggleControls={props.onToggleControls}
        onToggleFullscreen={props.onToggleFullscreen}
      />

      <ReaderFooter
        currentPage={props.currentPage}
        totalPages={props.totalPages}
        readingTime={props.readingTime}
        showUI={props.showUI}
        onNextPage={props.onNextPage}
        onPrevPage={props.onPrevPage}
        onNextChapter={props.onNextChapter}
        onPrevChapter={props.onPrevChapter}
        onPageChange={props.onPageChange}
      />

      {props.showControls && (
        <div className="fixed right-4 top-24 bottom-24 z-50 w-[min(420px,92vw)] rounded-2xl border border-black/10 dark:border-white/10 bg-light-surface/95 dark:bg-dark-surface/95 backdrop-blur-xl shadow-2xl p-4 overflow-y-auto">
          <ReaderControls
            toc={mappedToc}
            bookmarks={props.bookmarks}
            currentChapter={props.chapterTitle}
            onNavigate={(href) => props.onNavigate(href)}
            onPrevChapter={props.onPrevChapter}
            onNextChapter={props.onNextChapter}
            onJumpToTop={props.onJumpToTop}
            onJumpToBottom={props.onJumpToBottom}
            onRemoveBookmark={(bookmarkId) => props.onRemoveBookmark(props.book.id, bookmarkId)}
          />
          <button className="mt-4 w-full btn-secondary" onClick={props.onCloseControls}>Close Panel</button>
        </div>
      )}

      {props.showSettings && (
        <div className="fixed left-4 top-24 bottom-24 z-50 w-[min(420px,92vw)] rounded-2xl border border-black/10 dark:border-white/10 bg-light-surface/95 dark:bg-dark-surface/95 backdrop-blur-xl shadow-2xl p-4 overflow-y-auto">
          <ReaderSettings />
          <button className="mt-4 w-full btn-secondary" onClick={props.onCloseSettings}>Close Settings</button>
        </div>
      )}
    </>
  );
};

export default ReaderOverlay;
