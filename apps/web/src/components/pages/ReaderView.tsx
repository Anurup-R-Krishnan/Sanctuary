import { useState, useEffect, useRef, useCallback } from "react";

import type { ReaderEngineRef } from "@/components/reader/ReaderEngineHost";
import type { Book, Bookmark } from "@/types";
import type { ReaderStatus, ReaderError, ReaderPosition, ReaderSelection } from "@/types/reader";
import type { TocItem } from "@/utils/epub";

import { ReaderEngineHost } from "@/components/reader/ReaderEngineHost";
import { ReaderErrorOverlay } from "@/components/reader/ReaderErrorOverlay";
import ReaderOverlay from "@/components/reader/ReaderOverlay";
import { ReaderSelectionMenu } from "@/components/reader/ReaderSelectionMenu";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useReaderAnnotations } from "@/hooks/useReaderAnnotations";
import { useReaderSearch } from "@/hooks/useReaderSearch";
import { useReaderSessionStats } from "@/hooks/useReaderSessionStats";
import { useReaderShortcuts } from "@/hooks/useReaderShortcuts";
import { useReaderSpeech } from "@/hooks/useReaderSpeech";
import { useBookStore } from "@/store/useBookStore";
import { useSettingsShallow } from "@/store/useSettingsStore";

interface ReaderViewProps {
    bookId: string;
    getBookContent: (id: string) => Promise<Blob>;
    onAddBookmark: (bookId: string, bookmark: Omit<Bookmark, "id" | "createdAt">) => void;
    onClose: () => void;
    onRemoveBookmark: (bookId: string, bookmarkId: string) => void;
    onUpdateProgress: (id: string, progress: number, location: string) => void;
}

function ReaderView({
    bookId,
    onClose,
    onUpdateProgress,
    onAddBookmark,
    onRemoveBookmark,
    getBookContent,
}: ReaderViewProps) {
    const book = useBookStore((state) => state.getBookById(bookId));

    // --- All hooks MUST be declared before any conditional returns (Rules of Hooks) ---

    // UI State
    const [showUI, setShowUI] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [showControls, setShowControls] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [showAnnotations, setShowAnnotations] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(false); // Local optimistic state

    const rootRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<ReaderEngineRef>(null);
    
    // We only need a stable reference to the initial book for hydration.
    // If book is undefined (deleted while reading?), fallback to a dummy or handle it.
    const latestBookRef = useRef(book);

    // Local hydrated book state (for lazy loading content)
    const [hydratedBook, setHydratedBook] = useState<Book | undefined>(book);
    const [isFetchingContent, setIsFetchingContent] = useState(false);
    const [contentError, setContentError] = useState<string | null>(null);

    useEffect(() => {
        if (book) {
            latestBookRef.current = book;
            setHydratedBook((prev) => {
                if (!prev) return book;
                if (prev.id !== book.id) return book;
                return {
                    ...book,
                    epubBlob: prev.epubBlob || book.epubBlob,
                };
            });
        }
    }, [book]);

    const isFetchingRef = useRef(false);

    // Fetch content if missing (runs ONLY when bookId changes or blob is missing)
    useEffect(() => {
        let isMounted = true;
        const activeBook = latestBookRef.current;
        if (!activeBook) return;

        setContentError(null);
        
        // If we already have the blob, do nothing.
        setHydratedBook((prev) => {
            if (prev?.epubBlob && prev.id === activeBook.id) return prev;
            return activeBook;
        });

// Check if we need to fetch the blob.
        // We use activeBook to see if it inherently lacked the blob.
        // We avoid calling async functions and side-effects inside setState!
        if (!activeBook.epubBlob && !isFetchingRef.current) {
            isFetchingRef.current = true;
            setIsFetchingContent(true);
            getBookContent(activeBook.id)
                .then(blob => {
                    if (isMounted) {
                        setHydratedBook(curr => curr ? { ...curr, epubBlob: blob } : undefined);
                        setContentError(null);
                    }
                })
                .catch(err => {
                    console.error("Failed to load book content:", err);
                    if (isMounted) {
                        setContentError("Book content is unavailable on this device.");
                    }
                })
                .finally(() => {
                    if (isMounted) {
                        setIsFetchingContent(false);
                        isFetchingRef.current = false;
                    }
                });
        }

        return () => {
            isMounted = false;
        };
    }, [bookId, getBookContent]); // Note: book is NOT a dependency here! Only bookId!

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
        position: { cfi: "", href: "", chapterLabel: "", bookProgress: 0, chapterProgress: 0, location: 1, totalLocations: 1, displayedPage: 1, displayedPages: 1 },
        tocItems: [],
        selection: null,
    });

    const { status, error, position, tocItems, selection } = engineState;
    const { cfi: currentCfi, totalLocations, location: currentPage } = position;

    const isLoading = status === "loading-book" || status === "loading-navigation" || status === "restoring-location" || isFetchingContent;

    // Feature Hooks
    const { searchState, performSearch, clearSearch, goToResult, nextResult, prevResult } = useReaderSearch({
        epubBook: engineRef.current?.epubBook ?? null,
        display: (target) => engineRef.current?.display(target),
    });

    const { annotations, addAnnotation, removeAnnotation } = useReaderAnnotations({
        bookId: book?.id ?? '',
        rendition: engineRef.current?.rendition ?? null,
        clearSelection: () => engineRef.current?.clearSelection(),
    });

    const { speak, stop: stopSpeech } = useReaderSpeech();

    const { trackLocationProgress, stats: sessionStats } = useReaderSessionStats(book?.id ?? '', totalLocations);
    
    // Track reading speed
    useEffect(() => {
        if (currentPage > 0) trackLocationProgress(currentPage);
    }, [currentPage, trackLocationProgress]);

    // Cleanup on unmount
    useEffect(() => {
        return () => stopSpeech();
    }, [stopSpeech]);

    // Bookmark sync
    useEffect(() => {
        setIsBookmarked(book?.bookmarks?.some((b) => b.cfi === currentCfi) ?? false);
    }, [currentCfi, book?.bookmarks]);

    // Derived Actions
    const handleToggleBookmark = useCallback(() => {
        if (!currentCfi || !book) return;
        if (isBookmarked) {
            const bookmark = book.bookmarks?.find((b) => b.cfi === currentCfi);
            if (bookmark) onRemoveBookmark(book.id, bookmark.id);
        } else {
            onAddBookmark(book.id, { cfi: currentCfi, title: `Page ${currentPage}` });
        }
        setIsBookmarked(!isBookmarked);
    }, [currentCfi, isBookmarked, book, currentPage, onAddBookmark, onRemoveBookmark]);

    const handleToggleFullscreen = useCallback(async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
                setIsFullscreen(true);
            } else {
                await document.exitFullscreen();
                setIsFullscreen(false);
            }
        } catch (err) {
            console.error("Fullscreen error:", err);
        }
    }, []);

    const handleNavigate = useCallback((href: string) => {
        setShowControls(false);
        engineRef.current?.display(href);
    }, []);

    const handlePageChange = useCallback((page: number) => {
        engineRef.current?.goToPage(page);
    }, []);

    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        // Ensure reader owns keyboard focus when opened.
        root.focus({ preventScroll: true });
        const focusRoot = () => root.focus({ preventScroll: true });
        const handleWindowFocus = () => focusRoot();
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                // Defer one tick so browser restores active element first.
                window.setTimeout(focusRoot, 0);
            }
        };
        root.addEventListener("pointerdown", focusRoot);
        window.addEventListener("focus", handleWindowFocus);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            root.removeEventListener("pointerdown", focusRoot);
            window.removeEventListener("focus", handleWindowFocus);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    // Shortcuts
    useReaderShortcuts({
        keybinds,
        nextPage: () => engineRef.current?.nextPage(),
        prevPage: () => engineRef.current?.prevPage(),
        goToStart: () => engineRef.current?.display("0"),
        goToEnd: () => engineRef.current?.goToPage(totalLocations),
        onClose,
        toggleBookmark: handleToggleBookmark,
        toggleFullscreen: handleToggleFullscreen,
        toggleUI: () => setShowUI(prev => !prev),
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



    // UI Visibility Auto-hide
    const uiStateRef = useRef({
        showUI,
        showSettings,
        showControls,
        showSearch,
        showAnnotations,
        selection: !!selection,
    });

    useEffect(() => {
        uiStateRef.current = {
            showUI,
            showSettings,
            showControls,
            showSearch,
            showAnnotations,
            selection: !!selection,
        };
    }, [showUI, showSettings, showControls, showSearch, showAnnotations, selection]);

    useEffect(() => {
        let lastMove = Date.now();
        const handleMove = () => {
            const now = Date.now();
            if (now - lastMove < 200) return;
            lastMove = now;
            setShowUI(prev => (prev ? prev : true));
        };

        const checkIdle = () => {
            const state = uiStateRef.current;
            if (state.showUI && !state.showSettings && !state.showControls && !state.showSearch && !state.showAnnotations && !state.selection) {
                if (Date.now() - lastMove > 3500) {
                    setShowUI(false);
                }
            }
        };

        const interval = setInterval(checkIdle, 1000);
        document.addEventListener("mousemove", handleMove, { passive: true });
        document.addEventListener("touchstart", handleMove, { passive: true });
        return () => {
            clearInterval(interval);
            document.removeEventListener("mousemove", handleMove);
            document.removeEventListener("touchstart", handleMove);
        };
    }, []);

    
    const handleToggleTOC = useCallback(() => { setShowControls(p => !p); setShowSearch(false); setShowAnnotations(false); setShowSettings(false); }, []);
    const handleToggleSettings = useCallback(() => { setShowSettings(p => !p); setShowControls(false); setShowSearch(false); setShowAnnotations(false); }, []);
    const handleToggleSearch = useCallback(() => { setShowSearch(p => !p); setShowControls(false); setShowSettings(false); setShowAnnotations(false); }, []);
    const handleToggleAnnotations = useCallback(() => { setShowAnnotations(p => !p); setShowControls(false); setShowSettings(false); setShowSearch(false); }, []);
    
    const handleNextPage = useCallback(() => engineRef.current?.nextPage(), []);
    const handlePrevPage = useCallback(() => engineRef.current?.prevPage(), []);
    const handleJumpToTop = useCallback(() => engineRef.current?.display("0"), []);
    const handleJumpToBottom = useCallback(() => engineRef.current?.goToPage(totalLocations), [totalLocations]);
    
    const handleCloseSettings = useCallback(() => setShowSettings(false), []);
    const handleCloseControls = useCallback(() => setShowControls(false), []);
    const handleCloseSearch = useCallback(() => setShowSearch(false), []);
    const handleCloseAnnotations = useCallback(() => setShowAnnotations(false), []);
    
    const handleHighlight = useCallback((color: string) => {
        if(selection) addAnnotation(selection, "highlight", color);
    }, [selection, addAnnotation]);
    const handleUnderline = useCallback(() => {
        if(selection) addAnnotation(selection, "underline");
    }, [selection, addAnnotation]);
    const handleAddNote = useCallback(() => {
        if(!selection) return;
        const note = window.prompt("Add a note:");
        if (note !== null) addAnnotation(selection, "note", undefined, note);
    }, [selection, addAnnotation]);
    const handleCopy = useCallback(() => {
        if(!selection) return;
        navigator.clipboard.writeText(selection.text);
        engineRef.current?.clearSelection();
    }, [selection]);
    const handleSpeak = useCallback(() => {
        if(!selection) return;
        speak(selection.text);
        engineRef.current?.clearSelection();
    }, [selection, speak]);

    // --- Conditional returns AFTER all hooks (Rules of Hooks preserved) ---
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
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-light-primary/95 dark:bg-dark-primary/95 backdrop-blur-sm p-6 animate-fadeIn">
                    <div className="max-w-sm w-full rounded-2xl bg-light-surface dark:bg-dark-surface border border-red-200/50 dark:border-red-800/30 p-8 text-center shadow-2xl">
                        <div className="mx-auto mb-5 flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40">
                            <svg className="w-7 h-7 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-2">Unable to Load Book</h3>
                        <p className="text-sm text-light-text-muted dark:text-dark-text-muted mb-6 leading-relaxed">{contentError}</p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={onClose}
                                className="px-4 py-2.5 rounded-xl text-sm font-medium bg-black/[0.04] dark:bg-white/[0.06] text-light-text dark:text-dark-text hover:bg-black/[0.08] dark:hover:bg-white/[0.1] transition-colors"
                            >
                                Back to Library
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2.5 rounded-xl text-sm font-medium bg-light-accent dark:bg-dark-accent text-white hover:opacity-90 transition-opacity shadow-sm"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <div
                className={`absolute inset-0 transition-[padding] duration-instant ease-out ${
                    (showControls || showSettings || showSearch || showAnnotations) ? "md:pr-[400px]" : ""
                }`}
                style={
                    brightness < 100 || grayscale
                        ? { filter: `brightness(${brightness}%) grayscale(${grayscale ? 1 : 0})` }
                        : undefined
                }
            >
                <ReaderEngineHost 
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

            <ReaderOverlay
                book={book}
                bookmarks={book.bookmarks || []}
                annotations={annotations}
                showUI={showUI}
                showSettings={showSettings}
                showControls={showControls}
                showSearch={showSearch}
                showAnnotations={showAnnotations}
                isLoading={isLoading}
                currentPage={currentPage}
                totalPages={totalLocations}
                isBookmarked={isBookmarked}
                currentCfi={currentCfi}
                toc={tocItems}
                isFullscreen={isFullscreen}
                estimatedMinutesRemaining={sessionStats.estimatedMinutesRemaining}
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
                onCloseSearch={handleCloseSearch}
                onCloseAnnotations={handleCloseAnnotations}
                onDeleteAnnotation={removeAnnotation}
                searchState={searchState}
                onSearch={performSearch}
                onClearSearch={clearSearch}
                onNextSearchResult={nextResult}
                onPrevSearchResult={prevResult}
                onGoToSearchResult={goToResult}
            />

            <ReaderSelectionMenu
                selection={selection}
                onHighlight={handleHighlight}
                onUnderline={handleUnderline}
                onAddNote={handleAddNote}
                onCopy={handleCopy}
                onSpeak={handleSpeak}
            />

            {error && (
                <ReaderErrorOverlay 
                    error={error} 
                    onRetry={() => {
                        window.location.reload(); 
                    }} 
                    onClose={onClose} 
                />
            )}
        </div>
    );
};

export default ReaderView;
