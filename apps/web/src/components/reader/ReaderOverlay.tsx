import React, { Suspense, lazy, memo } from "react";

import type { SpeechState } from "@/hooks/useReaderSpeech";
import type { Book, Bookmark } from "@/types";
import type { ReaderAnnotation, ReaderSearchState } from "@/types/reader";

import ReaderControls from "@/components/reader/ReaderControls";
import ReaderFooter from "@/components/reader/ReaderFooter";
import ReaderHeader from "@/components/reader/ReaderHeader";
import { ReaderSearchPanel } from "@/components/reader/ReaderSearchPanel";
import { useAmbientSoundStore } from "@/store/useAmbientSoundStore";

const ReaderAmbientSoundPopover = lazy(() =>
  import("@/components/reader/ReaderAmbientSoundPopover").then((m) => ({
    default: m.ReaderAmbientSoundPopover,
  }))
);

const ReaderAnnotationsPanel = lazy(() =>
  import("@/components/reader/ReaderAnnotationsPanel").then((m) => ({
    default: m.ReaderAnnotationsPanel,
  }))
);

const ReaderSettings = lazy(() => import("@/components/reader/ReaderSettings"));

const ReaderTTSBar = lazy(() =>
  import("@/components/reader/ReaderTTSBar").then((m) => ({ default: m.ReaderTTSBar }))
);

interface ReaderOverlayProps {
  activeVoiceURI?: string | null;
  annotations: ReaderAnnotation[];
  book: Book;
  bookmarks: Bookmark[];
  chapterEstimatedMinutesRemaining?: number | null;
  chapterLabel?: string;
  currentCfi: string;
  currentPage: number;
  estimatedMinutesRemaining?: number | null;
  isBookmarked: boolean;
  isFullscreen: boolean;
  isLoading: boolean;
  isReadabilityActive?: boolean;
  isTTSActive?: boolean;
  isZenModeActive?: boolean;
  onChangeTTSParagraphPause?: (ms: number) => void;
  onChangeTTSRate?: (rate: number) => void;
  onChangeTTSVoice?: (voiceURI: string) => void;
  onClearSearch: () => void;
  onClose: () => void;
  onCloseAnnotations: () => void;
  onCloseControls: () => void;
  onCloseSearch: () => void;
  onCloseSettings: () => void;
  onCloseTTS?: () => void;
  onCreateQuoteCard?: (text: string, chapterLabel?: string) => void;
  onDeleteAnnotation: (cfiRange: string) => void;
  onGoToSearchResult: (index: number) => void;
  onJumpToBottom: () => void;
  onJumpToTop: () => void;
  onNavigate: (href: string) => void;
  onNextPage: () => void;
  onNextSearchResult: () => void;
  onNextTTSSentence?: () => void;
  onPageChange: (page: number) => void;
  onPrevPage: () => void;
  onPrevSearchResult: () => void;
  onPrevTTSSentence?: () => void;
  onRemoveBookmark: (bookId: string, bookmarkId: string) => void;
  onSearch: (q: string) => void;
  onToggleAnnotations: () => void;
  onToggleBookmark: () => void;
  onToggleFullscreen: () => void;
  onToggleReadability?: () => void;
  onToggleSearch: () => void;
  onToggleSettings: () => void;
  onToggleSpeedReader?: () => void;
  onToggleTOC: () => void;
  onToggleTTS?: () => void;
  onToggleZenMode?: () => void;
  onUpdateAnnotation?: (id: string, note: string, color?: string) => void;
  paragraphPauseMs?: number;
  readingSpeedWpm?: number | null;
  searchState: ReaderSearchState;
  showAnnotations: boolean;
  showControls: boolean;
  showSearch: boolean;
  showSettings: boolean;
  showUI: boolean;
  speechState?: SpeechState;
  toc: Array<{ href: string; id?: string; label: string; subitems?: Array<{ href: string; id?: string; label: string }> }>;
  totalPages: number;
  voices?: SpeechSynthesisVoice[];
}

function ReaderOverlay(props: ReaderOverlayProps) {
  const mappedToc = props.toc.map((item, i) => ({
    href: item.href,
    id: `toc-${i}`,
    label: item.label,
    subitems: item.subitems?.map((sub, j) => ({
      href: sub.href,
      id: `toc-${i}-${j}`,
      label: sub.label,
    })),
  }));

  const isAnyPanelOpen =
    props.showSettings ||
    props.showControls ||
    props.showSearch ||
    props.showAnnotations;

  const isAmbientPopoverOpen = useAmbientSoundStore((state) => state.isPopoverOpen);
  const toggleAmbientPopover = useAmbientSoundStore((state) => state.togglePopover);
  const closeAmbientPopover = useAmbientSoundStore((state) => state.setPopoverOpen);

  return (
    <div className="pointer-events-none absolute inset-0 z-50">
      <ReaderHeader
        book={props.book}
        chapterEstimatedMinutesRemaining={props.chapterEstimatedMinutesRemaining}
        chapterLabel={props.chapterLabel}
        isAmbientActive={useAmbientSoundStore.getState().isPlaying}
        isBookmarked={props.isBookmarked}
        isFullscreen={props.isFullscreen}
        isReadabilityActive={props.isReadabilityActive}
        isTTSActive={props.isTTSActive}
        isZenModeActive={props.isZenModeActive}
        onClose={props.onClose}
        onToggleAmbient={toggleAmbientPopover}
        onToggleAnnotations={props.onToggleAnnotations}
        onToggleBookmark={props.onToggleBookmark}
        onToggleFullscreen={props.onToggleFullscreen}
        onToggleReadability={props.onToggleReadability}
        onToggleSearch={props.onToggleSearch}
        onToggleSettings={props.onToggleSettings}
        onToggleSpeedReader={props.onToggleSpeedReader}
        onToggleTOC={props.onToggleTOC}
        onToggleTTS={props.onToggleTTS}
        onToggleZenMode={props.onToggleZenMode}
        readingSpeedWpm={props.readingSpeedWpm}
        showUI={props.showUI}
      />

      {isAmbientPopoverOpen && (
        <Suspense fallback={null}>
          <ReaderAmbientSoundPopover onClose={() => closeAmbientPopover(false)} />
        </Suspense>
      )}

      {props.isTTSActive && props.speechState && (
        <Suspense fallback={null}>
          <ReaderTTSBar
            activeVoiceURI={props.activeVoiceURI}
            onChangeParagraphPause={props.onChangeTTSParagraphPause}
            onChangeRate={props.onChangeTTSRate || (() => {})}
            onChangeVoice={props.onChangeTTSVoice}
            onClose={props.onCloseTTS || props.onToggleTTS || (() => {})}
            onNextSentence={props.onNextTTSSentence || (() => {})}
            onPrevSentence={props.onPrevTTSSentence || (() => {})}
            onTogglePlayPause={props.onToggleTTS || (() => {})}
            paragraphPauseMs={props.paragraphPauseMs}
            speechState={props.speechState}
            voices={props.voices}
          />
        </Suspense>
      )}

      <ReaderFooter
        chapterEstimatedMinutesRemaining={props.chapterEstimatedMinutesRemaining}
        currentPage={props.currentPage}
        estimatedMinutesRemaining={props.estimatedMinutesRemaining}
        onNextPage={props.onNextPage}
        onPageChange={props.onPageChange}
        onPrevPage={props.onPrevPage}
        showUI={props.showUI}
        totalPages={props.totalPages}
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
          {props.showSettings && (
            <Suspense fallback={null}>
              <ReaderSettings />
            </Suspense>
          )}
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
            <Suspense fallback={null}>
              <ReaderAnnotationsPanel
                annotations={props.annotations}
                bookAuthor={props.book.author}
                bookTitle={props.book.title}
                onCreateQuoteCard={props.onCreateQuoteCard}
                onDeleteAnnotation={props.onDeleteAnnotation}
                onGoToAnnotation={props.onNavigate}
                onUpdateAnnotation={props.onUpdateAnnotation}
              />
            </Suspense>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(ReaderOverlay);