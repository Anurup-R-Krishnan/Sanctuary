
import type { Book, Bookmark } from "@/types";

import ReaderControls from "@/components/reader/ReaderControls";
import ReaderFooter from "@/components/reader/ReaderFooter";
import ReaderHeader from "@/components/reader/ReaderHeader";
import ReaderSettings from "@/components/reader/ReaderSettings";
import { Button } from "@/components/ui/Button";

interface ReaderOverlayProps {
  book: Book;
  bookmarks: Bookmark[];
  currentCfi: string;
  currentPage: number;
  isBookmarked: boolean;
  isFullscreen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onCloseControls: () => void;
  onCloseSettings: () => void;
  onJumpToBottom: () => void;
  onJumpToTop: () => void;
  onNavigate: (href: string) => void;
  onNextPage: () => void;
  onPageChange: (page: number) => void;
  onPrevPage: () => void;
  onRemoveBookmark: (bookId: string, bookmarkId: string) => void;
  onToggleBookmark: () => void;
  onToggleControls: () => void;
  onToggleFullscreen: () => void;
  onToggleSettings: () => void;
  onToggleTOC: () => void;
  showControls: boolean;
  showSettings: boolean;
  showUI: boolean;
  toc: Array<{ id?: string | undefined; href: string; label: string; subitems?: Array<{ id?: string | undefined; href: string; label: string }> | undefined }>;
  totalPages: number;
}

function ReaderOverlay(props: ReaderOverlayProps) {
  const tocId = (parentKey: string, id?: string, href?: string, label?: string) => {
    const stablePart = id || href || label || "item";
    return `${parentKey}:${encodeURIComponent(stablePart)}`;
  };

  const mappedToc = props.toc.map((item) => {
    const itemId = tocId("toc", item.id, item.href, item.label);
    return {
      id: itemId,
      href: item.href,
      label: item.label,
      subitems: item.subitems?.map((sub) => ({
        id: tocId(itemId, sub.id, sub.href, sub.label),
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
        showUI={props.showUI}
        onNextPage={props.onNextPage}
        onPrevPage={props.onPrevPage}
        onPageChange={props.onPageChange}
      />

      {props.showControls && (
        <div className="fixed right-4 top-24 bottom-24 z-50 w-[min(420px,92vw)] rounded-2xl border border-black/10 dark:border-white/10 bg-light-surface/95 dark:bg-dark-surface/95 backdrop-blur-xl shadow-2xl p-4 overflow-y-auto">
          <ReaderControls
            toc={mappedToc}
            bookmarks={props.bookmarks}
            onNavigate={(href) => props.onNavigate(href)}
            onJumpToTop={props.onJumpToTop}
            onJumpToBottom={props.onJumpToBottom}
            onRemoveBookmark={(bookmarkId) => props.onRemoveBookmark(props.book.id, bookmarkId)}
          />
          <Button variant="secondary" className="mt-4 w-full" onClick={props.onCloseControls}>Close Panel</Button>
        </div>
      )}

      {props.showSettings && (
        <div className="fixed left-4 top-24 bottom-24 z-50 w-[min(420px,92vw)] rounded-2xl border border-black/10 dark:border-white/10 bg-light-surface/95 dark:bg-dark-surface/95 backdrop-blur-xl shadow-2xl p-4 overflow-y-auto">
          <ReaderSettings />
          <Button variant="secondary" className="mt-4 w-full" onClick={props.onCloseSettings}>Close Settings</Button>
        </div>
      )}
    </>
  );
};

export default ReaderOverlay;
