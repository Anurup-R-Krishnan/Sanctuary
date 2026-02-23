import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Book, Bookmark } from "@/types";
import { useSettingsShallow } from "@/context/SettingsContext";
import { useReaderEngine } from "@/hooks/useReaderEngine";
import { useReaderShortcuts } from "@/hooks/useReaderShortcuts";
import ReaderContent from "@/components/reader/ReaderContent";
import ReaderOverlay from "@/components/reader/ReaderOverlay";
import { useReaderProgressStore } from "@/store/useReaderProgressStore";

interface ReaderViewProps {
    book: Book;
    onClose: () => void;
    onUpdateProgress: (id: string, progress: number, location: string) => void;
    onAddBookmark: (bookId: string, bookmark: Omit<Bookmark, "id" | "createdAt">) => Promise<void>;
    onRemoveBookmark: (bookId: string, bookmarkId: string) => Promise<void>;
    getBookContent: (id: string) => Promise<Blob>;
}

const ReaderView: React.FC<ReaderViewProps> = ({
    book,
    onClose,
    onUpdateProgress,
    onAddBookmark,
    onRemoveBookmark,
    getBookContent,
}) => {
    const activeReaderProgress = useReaderProgressStore((state) =>
        state.active && state.active.bookId === book.id ? state.active : null
    );
    const activeBook = useMemo(() => {
        if (!activeReaderProgress) return book;
        return {
            ...book,
            progress: activeReaderProgress.progress,
            lastLocation: activeReaderProgress.location,
        };
    }, [book, activeReaderProgress]);

    // UI State
    const [showUI, setShowUI] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [showControls, setShowControls] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(false); // Local optimistic state
    const [bookmarkError, setBookmarkError] = useState<string | null>(null);
    const [readingTime, setReadingTime] = useState(0);

    const rootRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const lastMouseMoveRef = useRef<number>(Date.now());
    const latestBookRef = useRef(book);

    // Local hydrated book state (for lazy loading content)
    const [hydratedBook, setHydratedBook] = useState<Book>(book);
    const [isFetchingContent, setIsFetchingContent] = useState(false);
    const [contentError, setContentError] = useState<string | null>(null);

    useEffect(() => {
        latestBookRef.current = activeBook;
    }, [activeBook]);

    // Sync prop to local state and fetch content if missing
    useEffect(() => {
        let isMounted = true;
        const activeBook = latestBookRef.current;
        setHydratedBook((prev) => ({
            ...activeBook,
            epubBlob: activeBook.epubBlob || (prev.id === activeBook.id ? prev.epubBlob : null),
        }));
        setContentError(null);
        if (!activeBook.epubBlob) {
            setIsFetchingContent(true);
            getBookContent(activeBook.id)
                .then(blob => {
                    if (isMounted) {
                        setHydratedBook(prev => ({ ...prev, epubBlob: blob }));
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
                    if (isMounted) setIsFetchingContent(false);
                });
        }
        return () => {
            isMounted = false;
        };
    }, [activeBook.id, activeBook.epubBlob, getBookContent]);

    // Settings
    const { screenReaderMode, brightness, grayscale } = useSettingsShallow((state) => ({
        screenReaderMode: state.screenReaderMode,
        brightness: state.brightness,
        grayscale: state.grayscale,
    }));

    // Reader Engine
    const {
        isLoading: engineLoading,
        currentCfi,
        totalPages,
        currentPage,
        tocItems,
        nextPage,
        prevPage,
        display,
        goToPage,
    } = useReaderEngine({ book: hydratedBook, containerRef, onUpdateProgress });

    const isLoading = engineLoading || isFetchingContent;

    // Bookmark sync
    useEffect(() => {
        setIsBookmarked(activeBook.bookmarks?.some((b) => b.cfi === currentCfi) ?? false);
    }, [currentCfi, activeBook.bookmarks]);

    // Derived Actions
    const handleToggleBookmark = useCallback(async () => {
        if (!currentCfi) return;
        setBookmarkError(null);
        const previous = isBookmarked;
        const next = !previous;
        setIsBookmarked(next);
        try {
            if (previous) {
                const bookmark = activeBook.bookmarks?.find((b) => b.cfi === currentCfi);
                if (bookmark) {
                    await onRemoveBookmark(activeBook.id, bookmark.id);
                }
            } else {
                await onAddBookmark(activeBook.id, { cfi: currentCfi, title: `Page ${currentPage}` });
            }
        } catch {
            setIsBookmarked(previous);
            setBookmarkError(previous ? "Failed to remove bookmark." : "Failed to save bookmark.");
        }
    }, [currentCfi, isBookmarked, activeBook.id, activeBook.bookmarks, currentPage, onAddBookmark, onRemoveBookmark]);

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
        display(href);
    }, [display]);

    const handlePageChange = useCallback((page: number) => {
        goToPage(page);
    }, [goToPage]);

    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        // Ensure reader owns keyboard focus when opened.
        root.focus({ preventScroll: true });
        const focusRoot = () => root.focus({ preventScroll: true });
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                // Defer one tick so browser restores active element first.
                window.setTimeout(focusRoot, 0);
            }
        };
        root.addEventListener("pointerdown", focusRoot);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            root.removeEventListener("pointerdown", focusRoot);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            previousFocusRef.current?.focus?.();
        };
    }, []);

    // Shortcuts
    useReaderShortcuts({
        nextPage,
        prevPage,
        onClose,
        toggleBookmark: handleToggleBookmark,
        toggleFullscreen: handleToggleFullscreen,
        toggleUI: () => setShowUI(prev => !prev),
        showSettings,
        showControls,
        setShowSettings,
        setShowControls,
        isEnabled: true,
    });

    // Reading Time
    useEffect(() => {
        const remaining = Math.max(0, totalPages - currentPage);
        setReadingTime(remaining * 2);
    }, [currentPage, totalPages]);

    // UI Visibility Auto-hide
    useEffect(() => {
        const handleMove = () => {
            lastMouseMoveRef.current = Date.now();
            if (!showUI) setShowUI(true);
        };
        const checkIdle = () => {
            if (screenReaderMode) {
                setShowUI(true);
                return;
            }
            if (showUI && !showSettings && !showControls) {
                if (Date.now() - lastMouseMoveRef.current > 3000) {
                    setShowUI(false);
                }
            }
        };
        const interval = setInterval(checkIdle, 1000);
        document.addEventListener("mousemove", handleMove);
        document.addEventListener("touchstart", handleMove);
        return () => {
            clearInterval(interval);
            document.removeEventListener("mousemove", handleMove);
            document.removeEventListener("touchstart", handleMove);
        };
    }, [showUI, showSettings, showControls, screenReaderMode]);

    return (
        <div
            ref={rootRef}
            tabIndex={-1}
            className="fixed inset-0 z-50 bg-white dark:bg-black font-sans overflow-hidden"
        >
            {bookmarkError && (
                <div className="absolute left-1/2 top-20 z-[70] -translate-x-1/2 bg-[#fdfaf5] dark:bg-[#302b26] border-[3px] border-[#2c1e16] dark:border-[#453c34] shadow-[6px_6px_0px_#2c1e16] px-4 py-3 rotate-1">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-4 bg-[#e6d5b8] dark:bg-[#5a4238] border border-[#2c1e16]/20 rotate-[3deg] shadow-sm z-10 mix-blend-multiply" />
                    <p className="text-xs font-black uppercase tracking-widest text-red-600 dark:text-red-400">
                        {bookmarkError}
                    </p>
                </div>
            )}
            {contentError && !isLoading && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-[#faf6f0]/80 dark:bg-[#302b26]/80 p-6 backdrop-blur-sm">
                    <div className="max-w-md bg-[#fdfaf5] dark:bg-[#1c1815] p-6 border-[3px] border-[#2c1e16] dark:border-[#453c34] shadow-[8px_8px_0px_rgba(44,30,22,1)] rotate-[-1deg] relative">
                        {/* Decorative tape */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-5 bg-[#e6d5b8] dark:bg-[#5a4238] border border-[#2c1e16]/20 rotate-[2deg] shadow-sm z-10 mix-blend-multiply" />
                        <p className="text-sm font-black uppercase tracking-widest text-[#2c1e16] dark:text-[#a69a8a] text-center">
                            {contentError}
                        </p>
                    </div>
                </div>
            )}
            <div
                className="absolute inset-0"
                style={{ filter: `brightness(${brightness}%) grayscale(${grayscale ? 1 : 0})` }}
            >
                <ReaderContent
                    containerRef={containerRef}
                    isLoading={isLoading}
                />
            </div>

            <ReaderOverlay
                book={activeBook}
                showUI={showUI}
                showSettings={showSettings}
                showControls={showControls}
                isLoading={isLoading}
                currentPage={currentPage} // Engine provides 1-based page
                totalPages={totalPages}
                readingTime={readingTime}
                isBookmarked={isBookmarked}
                currentCfi={currentCfi}
                toc={tocItems}
                bookmarks={activeBook.bookmarks || []}
                isFullscreen={isFullscreen}

                onClose={onClose}
                onToggleBookmark={handleToggleBookmark}
                onToggleTOC={() => setShowControls(true)}
                onToggleSettings={() => setShowSettings(!showSettings)}
                onToggleControls={() => setShowControls(!showControls)}
                onToggleFullscreen={handleToggleFullscreen}

                onNextPage={nextPage}
                onPrevPage={prevPage}
                onNavigate={handleNavigate}
                onJumpToTop={() => { display("0"); }} // Jump to start
                onJumpToBottom={() => { goToPage(totalPages); }}
                onPageChange={handlePageChange}

                onRemoveBookmark={onRemoveBookmark}
                onCloseSettings={() => setShowSettings(false)}
                onCloseControls={() => setShowControls(false)}
            />
        </div>
    );
};

export default ReaderView;
