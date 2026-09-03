import type { Book, Bookmark } from "@/types";
import type { ReaderSearchState, ReaderAnnotation } from "@/types/reader";
import { ReaderAnnotationsPanel } from "@/components/reader/ReaderAnnotationsPanel";
import { ReaderSearchPanel } from "@/components/reader/ReaderSearchPanel";
import ReaderControls from "@/components/reader/ReaderControls";
import ReaderHeader from "@/components/reader/ReaderHeader";
import ReaderFooter from "@/components/reader/ReaderFooter";
import ReaderSettings from "@/components/reader/ReaderSettings";
import { Button } from "@/components/ui/Button";

interface ReaderOverlayProps {
  book: Book;
  annotations: ReaderAnnotation[];
  bookmarks: Bookmark[];
  isBookmarked: boolean;
  isFullscreen: boolean;
  showUI: boolean;
  showSettings: boolean;
  showControls: boolean;
  showSearch: boolean;
  showAnnotations: boolean;
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  currentCfi: string;
  estimatedMinutesRemaining?: number;
  toc: Array<{ id?: string; href: string; label: string; subitems?: Array<{ id?: string; href: string; label: string }> }>;
  onClose: () => void;
  onToggleBookmark: () => void;
  onToggleTOC: () => void;
  onToggleSettings: () => void;
  onToggleSearch: () => void;
  onToggleAnnotations: () => void;
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
  onCloseSearch: () => void;
  onCloseAnnotations: () => void;
  onDeleteAnnotation: (cfiRange: string) => void;
  searchState: ReaderSearchState;
  onSearch: (q: string) => void;
  onClearSearch: () => void;
  onNextSearchResult: () => void;
  onPrevSearchResult: () => void;
  onGoToSearchResult: (index: number) => void;
}

export default function ReaderOverlay(props: ReaderOverlayProps) {
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
              isOpen={props.showAnnotations}
              onClose={props.onCloseAnnotations}
              annotations={props.annotations}
              onGoToAnnotation={props.onNavigate}
              onDeleteAnnotation={props.onDeleteAnnotation}
            />
          )}

          <div className="p-4 border-t border-black/5 dark:border-white/5 mt-auto">
            <Button 
                variant="secondary" 
                className="w-full" 
                onClick={() => {
                    if (props.showControls) props.onCloseControls();
                    if (props.showSettings) props.onCloseSettings();
                    if (props.showSearch) props.onCloseSearch();
                    if (props.showAnnotations) props.onCloseAnnotations();
                }}
            >
                Close Panel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}