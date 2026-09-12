import React, { memo } from "react";

import type { Book, Bookmark } from "@/types";
import type { ReaderSearchState, ReaderAnnotation } from "@/types/reader";

import { ReaderAnnotationsPanel } from "@/components/reader/ReaderAnnotationsPanel";
import ReaderControls from "@/components/reader/ReaderControls";
import ReaderFooter from "@/components/reader/ReaderFooter";
import ReaderHeader from "@/components/reader/ReaderHeader";
import { ReaderSearchPanel } from "@/components/reader/ReaderSearchPanel";
import ReaderSettings from "@/components/reader/ReaderSettings";


interface ReaderOverlayProps {
  annotations: ReaderAnnotation[];
  book: Book;
  bookmarks: Bookmark[];
  currentCfi: string;
  currentPage: number;
  estimatedMinutesRemaining?: number;
  isBookmarked: boolean;
  isFullscreen: boolean;
  isLoading: boolean;
  onClearSearch: () => void;
  onClose: () => void;
  onCloseAnnotations: () => void;
  onCloseControls: () => void;
  onCloseSearch: () => void;
  onCloseSettings: () => void;
  onDeleteAnnotation: (cfiRange: string) => void;
  onGoToSearchResult: (index: number) => void;
  onJumpToBottom: () => void;
  onJumpToTop: () => void;
  onNavigate: (href: string) => void;
  onNextPage: () => void;
  onNextSearchResult: () => void;
  onPageChange: (page: number) => void;
  onPrevPage: () => void;
  onPrevSearchResult: () => void;
  onRemoveBookmark: (bookId: string, bookmarkId: string) => void;
  onSearch: (q: string) => void;
  onToggleAnnotations: () => void;
  onToggleBookmark: () => void;
  onToggleFullscreen: () => void;
  onToggleSearch: () => void;
  onToggleSettings: () => void;
  onToggleTOC: () => void;
  onUpdateAnnotation?: (id: string, note: string, color?: string) => void;
  searchState: ReaderSearchState;
  showAnnotations: boolean;
  showControls: boolean;
  showSearch: boolean;
  showSettings: boolean;
  showUI: boolean;
  toc: Array<{ id?: string; href: string; label: string; subitems?: Array<{ id?: string; href: string; label: string }> }>;
  totalPages: number;
}

function ReaderOverlay(props: ReaderOverlayProps) {
  const mappedToc = props.toc.map((item, i) => ({
    id: `toc-${i}`,
    href: item.href,
    label: item.label,
    subitems: item.subitems?.map((sub, j) => ({
      id: `toc-${i}-${j}`,
      href: sub.href,
      label: sub.label,
    }))
  }));

  const isAnyPanelOpen = props.showControls || props.showSettings || props.showSearch || props.showAnnotations;

  return (
    <div className="pointer-events-none absolute inset-0 z-50">
      <ReaderHeader
        book={props.book}
        isBookmarked={props.isBookmarked}
        isFullscreen={props.isFullscreen}
        showUI={props.showUI}
        onClose={props.onClose}
        onToggleBookmark={props.onToggleBookmark}
        onToggleTOC={props.onToggleTOC}
        onToggleSettings={props.onToggleSettings}
        onToggleSearch={props.onToggleSearch}
        onToggleAnnotations={props.onToggleAnnotations}
        onToggleFullscreen={props.onToggleFullscreen}
      />

      <ReaderFooter
        currentPage={props.currentPage}
        totalPages={props.totalPages}
        showUI={props.showUI}
        onNextPage={props.onNextPage}
        onPrevPage={props.onPrevPage}
        onPageChange={props.onPageChange}
        estimatedMinutesRemaining={props.estimatedMinutesRemaining}
      />

      {isAnyPanelOpen && (
        <div className="absolute right-0 top-0 bottom-0 w-[min(400px,100vw)] bg-light-surface/95 dark:bg-dark-surface/95 backdrop-blur-2xl shadow-2xl border-l border-black/5 dark:border-white/5 pointer-events-auto flex flex-col z-[100] animate-slideInRight">
          {props.showControls && (
            <ReaderControls
              toc={mappedToc}
              bookmarks={props.bookmarks}
              onNavigate={(href) => props.onNavigate(href)}
              onJumpToTop={props.onJumpToTop}
              onJumpToBottom={props.onJumpToBottom}
              onRemoveBookmark={(bookmarkId) => props.onRemoveBookmark(props.book.id, bookmarkId)}
            />
          )}
          {props.showSettings && <ReaderSettings />}
          {props.showSearch && (
            <ReaderSearchPanel
              isOpen={props.showSearch}
              onClose={props.onCloseSearch}
              searchState={props.searchState}
              onSearch={props.onSearch}
              onClear={props.onClearSearch}
              onNext={props.onNextSearchResult}
              onPrev={props.onPrevSearchResult}
              onGoToResult={props.onGoToSearchResult}
            />
          )}
          {props.showAnnotations && (
            <ReaderAnnotationsPanel
              annotations={props.annotations}
              bookTitle={props.book.title}
              bookAuthor={props.book.author}
              onGoToAnnotation={props.onNavigate}
              onDeleteAnnotation={props.onDeleteAnnotation}
              onUpdateAnnotation={props.onUpdateAnnotation}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default memo(ReaderOverlay);