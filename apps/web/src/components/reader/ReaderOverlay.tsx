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
  onPageChange: (page: number) => void;
  onRemoveBookmark: (bookId: string, bookmarkId: string) => void;
  onCloseSettings: () => void;
  onCloseControls: () => void;
}

const ReaderOverlay: React.FC<ReaderOverlayProps> = (props) => {
  const tocId = (parentKey: string, id?: string, href?: string, label?: string) => {
    const stablePart = id || href || label || "item";
    return `${parentKey}:${encodeURIComponent(stablePart)}`;
  };

  const mappedToc = props.toc.map((item, itemIndex) => {
    const itemId = tocId(`toc:${itemIndex}`, item.id, item.href, item.label);
    return {
      id: itemId,
      href: item.href,
      label: item.label,
      subitems: item.subitems?.map((sub, subIndex) => ({
        id: tocId(`${itemId}:${subIndex}`, sub.id, sub.href, sub.label),
        href: sub.href,
        label: sub.label
      }))
    };
  });

  return (
    <>
      <ReaderHeader
        book={props.book}
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
        onPageChange={props.onPageChange}
      />

      {props.showControls && (
        <div className="fixed right-4 top-24 bottom-24 z-50 w-[clamp(18rem,34vw,28rem)] max-w-[92vw] bg-[#fdfaf5] border-[3px] border-[#2c1e16] shadow-[8px_8px_0px_rgba(44,30,22,1)] p-5 overflow-y-auto rotate-1 transition-transform">
          {/* Decorative Tape */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-5 bg-[#e6d5b8] border border-[#2c1e16]/20 rotate-[-2deg] shadow-sm z-10 mix-blend-multiply" />

          <ReaderControls
            toc={mappedToc}
            bookmarks={props.bookmarks}
            onNavigate={(href) => props.onNavigate(href)}
            onJumpToTop={props.onJumpToTop}
            onJumpToBottom={props.onJumpToBottom}
            onRemoveBookmark={(bookmarkId) => props.onRemoveBookmark(props.book.id, bookmarkId)}
          />
          <button
            className="mt-6 w-full py-3 bg-[#e6d5b8] border-[3px] border-[#2c1e16] text-[#2c1e16] font-black uppercase tracking-widest text-xs shadow-[4px_4px_0px_rgba(44,30,22,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_rgba(44,30,22,1)] active:translate-y-px active:shadow-[2px_2px_0px_rgba(44,30,22,1)] transition-all -rotate-1"
            onClick={props.onCloseControls}
          >
            Close Panel
          </button>
        </div>
      )}

      {props.showSettings && (
        <div className="fixed left-4 top-24 bottom-24 z-50 w-[clamp(18rem,34vw,28rem)] max-w-[92vw] bg-[#fdfaf5] border-[3px] border-[#2c1e16] shadow-[8px_8px_0px_rgba(44,30,22,1)] p-5 overflow-y-auto -rotate-1 transition-transform">
          {/* Decorative Tape */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-5 bg-[#e6d5b8] border border-[#2c1e16]/20 rotate-[3deg] shadow-sm z-10 mix-blend-multiply" />

          <ReaderSettings />
          <button
            className="mt-6 w-full py-3 bg-[#e6d5b8] border-[3px] border-[#2c1e16] text-[#2c1e16] font-black uppercase tracking-widest text-xs shadow-[4px_4px_0px_rgba(44,30,22,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_rgba(44,30,22,1)] active:translate-y-px active:shadow-[2px_2px_0px_rgba(44,30,22,1)] transition-all rotate-1"
            onClick={props.onCloseSettings}
          >
            Close Settings
          </button>
        </div>
      )}
    </>
  );
};

export default ReaderOverlay;
