import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";

import type { ReaderEngineRef } from "@/components/reader/ReaderEngineHost";
import type { Bookmark } from "@/types";
import type { ReaderStatus, ReaderError, ReaderPosition, ReaderSelection } from "@/types/reader";
import type { TocItem } from "@/utils/epub";

import { ReaderContentErrorBanner } from "@/components/reader/ReaderContentErrorBanner";
import { ReaderEngineHost } from "@/components/reader/ReaderEngineHost";
import { ReaderErrorOverlay } from "@/components/reader/ReaderErrorOverlay";
import { ReaderFilterOverlay } from "@/components/reader/ReaderFilterOverlay";
import { ReaderNoteDialog } from "@/components/reader/ReaderNoteDialog";
import ReaderOverlay from "@/components/reader/ReaderOverlay";
import { ReaderSelectionMenu } from "@/components/reader/ReaderSelectionMenu";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const QuoteCardModal = lazy(() =>
  import("@/components/reader/QuoteCardModal").then((m) => ({
    default: m.QuoteCardModal,
  }))
);

const ReaderReadabilityModal = lazy(() =>
  import("@/components/reader/ReaderReadabilityModal").then((m) => ({
    default: m.ReaderReadabilityModal,
  }))
);

const ReaderSpeedReaderModal = lazy(() =>
  import("@/components/reader/ReaderSpeedReaderModal").then((m) => ({
    default: m.ReaderSpeedReaderModal,
  }))
);

const ReaderZenFocusOverlay = lazy(() =>
  import("@/components/reader/ReaderZenFocusOverlay").then((m) => ({
    default: m.ReaderZenFocusOverlay,
  }))
);

const WordDefinitionModal = lazy(() =>
  import("@/components/reader/WordDefinitionModal").then((m) => ({
    default: m.WordDefinitionModal,
  }))
);
import { useReaderAnnotations } from "@/hooks/useReaderAnnotations";
import { useReaderBookHydration } from "@/hooks/useReaderBookHydration";
import { useReaderBookmarks } from "@/hooks/useReaderBookmarks";
import { useReaderChrome } from "@/hooks/useReaderChrome";
import { useReaderFocus } from "@/hooks/useReaderFocus";
import { useReaderSearch } from "@/hooks/useReaderSearch";
import { useReaderSessionStats } from "@/hooks/useReaderSessionStats";
import { useReaderShortcuts } from "@/hooks/useReaderShortcuts";
import { useReaderSpeech } from "@/hooks/useReaderSpeech";
import { useReaderTextActions } from "@/hooks/useReaderTextActions";
import { useBookStore } from "@/store/useBookStore";
import { useSettingsShallow } from "@/store/useSettingsStore";
import { extractTextFromDocument } from "@/utils/rsvpTokenEngine";

interface ReaderViewProps {
  bookId: string;
  getBookContent: (id: string) => Promise<Blob>;
  onAddBookmark: (bookId: string, bookmark: Omit<Bookmark, "id" | "createdAt">) => void;
  onClose: () => void;
  onRemoveBookmark: (bookId: string, bookmarkId: string) => void;
  onReplaceContent: (id: string, file: File) => Promise<void>;
  onUpdateProgress: (id: string, progress: number, location: string) => void;
}

function ReaderView({
  bookId,
  onClose,
  onUpdateProgress,
  onAddBookmark,
  onRemoveBookmark,
  getBookContent,
  onReplaceContent,
}: ReaderViewProps) {
  const book = useBookStore((state) => state.getBookById(bookId));
  const rootRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ReaderEngineRef>(null);

  // Keyboard focus management
  useReaderFocus(rootRef);

  // Hydration & blob retrieval
  const {
    hydratedBook,
    isFetchingContent,
    contentError,
    readerAttempt,
    retryFetchContent,
    retryFromStart,
    retryCurrentAttempt,
  } = useReaderBookHydration({
    bookId,
    book,
    getBookContent,
  });

  // Settings
  const { brightness, grayscale, keybinds } = useSettingsShallow((state) => ({
    brightness: state.brightness,
    grayscale: state.grayscale,
    keybinds: state.keybinds,
  }));

  // Reader Engine State
  const [engineState, setEngineState] = useState<{
    status: ReaderStatus;
    error: ReaderError | null;
    position: ReaderPosition;
    tocItems: TocItem[];
    selection: ReaderSelection | null;
  }>({
    status: "idle",
    error: null,
    position: {
      cfi: "",
      href: "",
      chapterLabel: "",
      bookProgress: 0,
      chapterProgress: 0,
      location: 1,
      totalLocations: 1,
      displayedPage: 1,
      displayedPages: 1,
    },
    tocItems: [],
    selection: null,
  });

  const { status, error, position, tocItems, selection } = engineState;
  const { cfi: currentCfi, totalLocations, location: currentPage } = position;
  const isLoading =
    status === "loading-book" ||
    status === "loading-navigation" ||
    status === "restoring-location" ||
    isFetchingContent;

  // Chrome, Drawers, and UI Auto-hide
  const {
    showUI,
    setShowUI,
    showSettings,
    setShowSettings,
    showControls,
    setShowControls,
    showSearch,
    setShowSearch,
    showAnnotations,
    isFullscreen,
    hasActiveDrawer,
    handleToggleFullscreen,
    handleToggleTOC,
    handleToggleSettings,
    handleToggleSearch,
    handleToggleAnnotations,
    handleCloseSettings,
    handleCloseControls,
    handleCloseSearch,
    handleCloseAnnotations,
  } = useReaderChrome({ hasSelection: !!selection });

  // Feature Hooks
  const { searchState, performSearch, clearSearch, goToResult, nextResult, prevResult } =
    useReaderSearch({
      epubBook: engineRef.current?.epubBook ?? null,
      display: (target) => engineRef.current?.display(target),
    });

  const handleDismissSearch = useCallback(() => {
    handleCloseSearch();
    clearSearch();
  }, [handleCloseSearch, clearSearch]);

  const [noteTarget, setNoteTarget] = useState<ReaderSelection | null>(null);
  const [noteTargetColor, setNoteTargetColor] = useState<string | undefined>(undefined);
  const [activeDefineWord, setActiveDefineWord] = useState<{
    bookTitle?: string;
    cfi?: string;
    contextSentence?: string;
    word: string;
  } | null>(null);

  const handleDefine = useCallback(() => {
    if (!selection?.text) return;
    setActiveDefineWord({
      bookTitle: book?.title,
      cfi: selection.cfiRange,
      contextSentence: selection.text,
      word: selection.text.trim(),
    });
    engineRef.current?.clearSelection();
  }, [selection, book?.title]);

  const [activeQuoteTarget, setActiveQuoteTarget] = useState<{
    chapterLabel?: string;
    text: string;
  } | null>(null);

  const handleOpenQuoteCard = useCallback(
    (text?: string, chapter?: string) => {
      const quoteText = text || selection?.text?.trim();
      if (!quoteText) return;
      setActiveQuoteTarget({
        chapterLabel: chapter || position.chapterLabel || undefined,
        text: quoteText,
      });
      if (selection) {
        engineRef.current?.clearSelection();
      }
    },
    [selection, position.chapterLabel]
  );

  const [speedReaderTarget, setSpeedReaderTarget] = useState<{
    chapterLabel?: string;
    text: string;
  } | null>(null);

  const handleOpenSpeedReaderFromChapter = useCallback(() => {
    const rendition = engineRef.current?.rendition;
    const doc =
      rendition?.getCurrentDocument?.() ||
      (rendition?.getContents?.()?.[0] as { doc?: Document; document?: Document })?.doc ||
      (rendition?.getContents?.()?.[0] as { doc?: Document; document?: Document })?.document ||
      null;
    const text = extractTextFromDocument(doc);
    setSpeedReaderTarget({
      chapterLabel: position.chapterLabel || book?.title || "Chapter",
      text,
    });
  }, [position.chapterLabel, book?.title]);

  const handleOpenSpeedReaderFromSelection = useCallback(() => {
    if (!selection?.text) return;
    setSpeedReaderTarget({
      chapterLabel: position.chapterLabel || book?.title || "Selection",
      text: selection.text.trim(),
    });
    engineRef.current?.clearSelection();
  }, [selection, position.chapterLabel, book?.title]);

  const [readabilityTarget, setReadabilityTarget] = useState<{
    chapterLabel?: string;
    text: string;
  } | null>(null);

  const handleOpenReadabilityFromChapter = useCallback(() => {
    const rendition = engineRef.current?.rendition;
    const doc =
      rendition?.getCurrentDocument?.() ||
      (rendition?.getContents?.()?.[0] as { doc?: Document; document?: Document })?.doc ||
      (rendition?.getContents?.()?.[0] as { doc?: Document; document?: Document })?.document ||
      null;
    const text = extractTextFromDocument(doc);
    setReadabilityTarget({
      chapterLabel: position.chapterLabel || book?.title || "Chapter",
      text,
    });
  }, [position.chapterLabel, book?.title]);

  const handleOpenReadabilityFromSelection = useCallback(() => {
    if (!selection?.text) return;
    setReadabilityTarget({
      chapterLabel: position.chapterLabel || book?.title || "Selection",
      text: selection.text.trim(),
    });
    engineRef.current?.clearSelection();
  }, [selection, position.chapterLabel, book?.title]);

  const [isZenModeActive, setIsZenModeActive] = useState(false);
  const handleToggleZenMode = useCallback(
    () => setIsZenModeActive((prev) => !prev),
    []
  );

  const { annotations, addAnnotation, removeAnnotation, updateAnnotation } = useReaderAnnotations({
    bookId: book?.id ?? "",
    rendition: engineRef.current?.rendition ?? null,
    clearSelection: () => engineRef.current?.clearSelection(),
  });

  const [isTTSActive, setIsTTSActive] = useState(false);
  const {
    activeVoiceURI,
    changeParagraphPause,
    changeRate,
    changeVoice,
    nextSentence,
    paragraphPauseMs,
    prevSentence,
    speak,
    speechState,
    startBookSpeech,
    stop: stopSpeech,
    stopBookSpeech,
    voices,
  } = useReaderSpeech({
    bookId: book?.id,
    bookMetadata: book
      ? {
          author: book.author || undefined,
          chapter: position.chapterLabel || undefined,
          coverUrl: book.coverUrl || undefined,
          title: book.title,
        }
      : undefined,
    session: engineRef.current,
  });

  const handleToggleTTS = useCallback(() => {
    setIsTTSActive((prev) => {
      const next = !prev;
      if (next) {
        void startBookSpeech(true);
      } else {
        stopBookSpeech();
      }
      return next;
    });
  }, [startBookSpeech, stopBookSpeech]);

  const handleCloseTTS = useCallback(() => {
    setIsTTSActive(false);
    stopBookSpeech();
  }, [stopBookSpeech]);

  const { recordLocationProgress, stats: sessionStats } = useReaderSessionStats(
    book?.id ?? "",
    totalLocations,
    position
  );

  const { handleHighlight, handleUnderline, handleAddNote, handleCopy, handleSpeak } =
    useReaderTextActions({
      addAnnotation,
      clearSelection: () => engineRef.current?.clearSelection(),
      onRequestNote: (sel, color) => {
        setNoteTarget(sel);
        setNoteTargetColor(color);
      },
      selection,
      speak,
    });

  // Reading speed and progress updates
  useEffect(() => {
    if (currentPage > 0) {
      recordLocationProgress(
        currentPage,
        position.chapterRemainingWeight,
        position.totalRemainingWeight
      );
    }
  }, [
    currentPage,
    position.chapterRemainingWeight,
    position.totalRemainingWeight,
    recordLocationProgress,
  ]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
      stopBookSpeech();
    };
  }, [stopSpeech, stopBookSpeech]);

  // Bookmarks
  const { isBookmarked, handleToggleBookmark } = useReaderBookmarks({
    book,
    currentCfi,
    currentPage,
    onAddBookmark,
    onRemoveBookmark,
  });

  // Navigation callbacks
  const handleNavigate = useCallback(
    (href: string) => {
      setShowControls(false);
      engineRef.current?.display(href);
    },
    [setShowControls]
  );

  const handlePageChange = useCallback((page: number) => {
    engineRef.current?.goToPage(page);
  }, []);

  const handleNextPage = useCallback(() => engineRef.current?.nextPage(), []);
  const handlePrevPage = useCallback(() => engineRef.current?.prevPage(), []);
  const handleJumpToTop = useCallback(() => engineRef.current?.display("0"), []);
  const handleJumpToBottom = useCallback(
    () => engineRef.current?.goToPage(totalLocations),
    [totalLocations]
  );

  // Keyboard Shortcuts
  useReaderShortcuts({
    keybinds,
    nextPage: handleNextPage,
    prevPage: handlePrevPage,
    goToStart: handleJumpToTop,
    goToEnd: handleJumpToBottom,
    onClose,
    onToggleReadability: handleOpenReadabilityFromChapter,
    onToggleZenMode: handleToggleZenMode,
    toggleBookmark: handleToggleBookmark,
    toggleFullscreen: handleToggleFullscreen,
    toggleUI: () => setShowUI((prev) => !prev),
    showSettings,
    showControls,
    showSearch,
    setShowSettings,
    setShowControls,
    setShowSearch,
    clearSelection: () => engineRef.current?.clearSelection(),
    hasSelection: !!selection,
    isEnabled: true,
  });

  if (!book) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-black font-sans">
        <div className="flex items-center gap-3 text-light-text dark:text-dark-text">
          <LoadingSpinner className="h-5 w-5" />
          <span className="text-sm font-medium">Loading book...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      className="h-[100dvh] w-screen overflow-hidden select-none flex flex-col fixed inset-0 z-50 bg-light-primary dark:bg-dark-primary font-sans"
    >
      {contentError && !isLoading && (
        <ReaderContentErrorBanner
          contentError={contentError}
          onClose={onClose}
          onRetry={retryFetchContent}
        />
      )}

      <div
        className={`absolute inset-0 transition-[padding] duration-instant ease-out ${
          hasActiveDrawer ? "md:pr-[400px]" : ""
        }`}
      >
        <ReaderEngineHost
          key={readerAttempt}
          ref={engineRef}
          book={hydratedBook}
          onUpdateProgress={onUpdateProgress}
          onEngineStateChange={setEngineState}
        />
      </div>

      {isLoading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-light-primary dark:bg-dark-primary">
          <div className="flex items-center gap-3 text-light-text dark:text-dark-text">
            <LoadingSpinner className="h-5 w-5" />
            <span className="text-sm font-medium">Opening book...</span>
          </div>
        </div>
      )}

      <ReaderFilterOverlay brightness={brightness} grayscale={grayscale} />

      <ReaderOverlay
        book={book}
        bookmarks={book.bookmarks || []}
        annotations={annotations}
        showUI={showUI && !isZenModeActive}
        showSettings={showSettings}
        showControls={showControls}
        showSearch={showSearch}
        showAnnotations={showAnnotations}
        isLoading={isLoading}
        currentPage={currentPage}
        totalPages={totalLocations}
        isBookmarked={isBookmarked}
        isZenModeActive={isZenModeActive}
        currentCfi={currentCfi}
        toc={tocItems}
        chapterEstimatedMinutesRemaining={sessionStats.chapterEstimatedMinutesRemaining}
        chapterLabel={position.chapterLabel}
        estimatedMinutesRemaining={sessionStats.estimatedMinutesRemaining}
        isFullscreen={isFullscreen}
        readingSpeedWpm={sessionStats.readingSpeedWpm}
        onClose={onClose}
        onToggleBookmark={handleToggleBookmark}
        onToggleTOC={handleToggleTOC}
        onToggleSettings={handleToggleSettings}
        onToggleSearch={handleToggleSearch}
        onToggleAnnotations={handleToggleAnnotations}
        onToggleFullscreen={handleToggleFullscreen}
        onNextPage={handleNextPage}
        onPrevPage={handlePrevPage}
        onNavigate={handleNavigate}
        onJumpToTop={handleJumpToTop}
        onJumpToBottom={handleJumpToBottom}
        onPageChange={handlePageChange}
        onRemoveBookmark={onRemoveBookmark}
        onCloseSettings={handleCloseSettings}
        onCloseControls={handleCloseControls}
        onCloseSearch={handleDismissSearch}
        onCloseAnnotations={handleCloseAnnotations}
        onDeleteAnnotation={removeAnnotation}
        onUpdateAnnotation={updateAnnotation}
        searchState={searchState}
        onSearch={performSearch}
        onClearSearch={clearSearch}
        onNextSearchResult={nextResult}
        onPrevSearchResult={prevResult}
        onGoToSearchResult={goToResult}
        activeVoiceURI={activeVoiceURI}
        isTTSActive={isTTSActive}
        onChangeTTSParagraphPause={changeParagraphPause}
        onChangeTTSRate={changeRate}
        onChangeTTSVoice={changeVoice}
        onCloseTTS={handleCloseTTS}
        onCreateQuoteCard={(text, chapter) => handleOpenQuoteCard(text, chapter)}
        onNextTTSSentence={nextSentence}
        onPrevTTSSentence={prevSentence}
        isReadabilityActive={!!readabilityTarget}
        onToggleReadability={handleOpenReadabilityFromChapter}
        onToggleSpeedReader={handleOpenSpeedReaderFromChapter}
        onToggleTTS={handleToggleTTS}
        onToggleZenMode={handleToggleZenMode}
        paragraphPauseMs={paragraphPauseMs}
        speechState={speechState}
        voices={voices}
      />

      <ReaderSelectionMenu
        onAddNote={handleAddNote}
        onAnalyzeReadability={handleOpenReadabilityFromSelection}
        onCopy={handleCopy}
        onCreateQuoteCard={() => handleOpenQuoteCard()}
        onDefine={handleDefine}
        onHighlight={handleHighlight}
        onSpeak={handleSpeak}
        onSpeedRead={handleOpenSpeedReaderFromSelection}
        onUnderline={handleUnderline}
        selection={selection}
      />

      <ReaderNoteDialog
        initialColor={noteTargetColor}
        isOpen={!!noteTarget}
        onCancel={() => {
          setNoteTarget(null);
          setNoteTargetColor(undefined);
        }}
        onSave={(note, color) => {
          if (noteTarget) {
            addAnnotation(noteTarget, "note", color, note);
            setNoteTarget(null);
            setNoteTargetColor(undefined);
          }
        }}
        selectedText={noteTarget?.text}
      />

      {activeDefineWord && (
        <Suspense fallback={null}>
          <WordDefinitionModal
            bookId={bookId}
            bookTitle={activeDefineWord.bookTitle}
            cfi={activeDefineWord.cfi}
            contextSentence={activeDefineWord.contextSentence}
            isOpen={!!activeDefineWord}
            onClose={() => setActiveDefineWord(null)}
            word={activeDefineWord.word}
          />
        </Suspense>
      )}

      {activeQuoteTarget && (
        <Suspense fallback={null}>
          <QuoteCardModal
            bookAuthor={book?.author}
            bookTitle={book?.title || "Untitled"}
            chapterLabel={activeQuoteTarget.chapterLabel}
            isOpen={!!activeQuoteTarget}
            onClose={() => setActiveQuoteTarget(null)}
            quote={activeQuoteTarget.text}
          />
        </Suspense>
      )}

      {readabilityTarget && (
        <Suspense fallback={null}>
          <ReaderReadabilityModal
            chapterLabel={readabilityTarget.chapterLabel}
            isOpen={!!readabilityTarget}
            onClose={() => setReadabilityTarget(null)}
            rawText={readabilityTarget.text}
            readingSpeedWpm={sessionStats.readingSpeedWpm || 250}
          />
        </Suspense>
      )}

      {speedReaderTarget && (
        <Suspense fallback={null}>
          <ReaderSpeedReaderModal
            chapterLabel={speedReaderTarget.chapterLabel}
            initialWpm={sessionStats.readingSpeedWpm || 350}
            isOpen={!!speedReaderTarget}
            onClose={() => setSpeedReaderTarget(null)}
            rawText={speedReaderTarget.text}
          />
        </Suspense>
      )}

      {isZenModeActive && (
        <Suspense fallback={null}>
          <ReaderZenFocusOverlay
            isOpen={isZenModeActive}
            onClose={() => setIsZenModeActive(false)}
            readingSpeedWpm={sessionStats.readingSpeedWpm}
          />
        </Suspense>
      )}

      {error && (
        <ReaderErrorOverlay
          error={error}
          onRetry={retryCurrentAttempt}
          onRetryFromStart={retryFromStart}
          onReplaceContent={(file) => onReplaceContent(bookId, file)}
          onClose={onClose}
        />
      )}
    </div>
  );
}

export default ReaderView;
