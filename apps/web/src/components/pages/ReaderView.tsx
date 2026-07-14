import { useState, useEffect, useRef, useCallback } from "react";

import type { Book, Bookmark } from "@/types";

import { ReaderEngineHost, ReaderEngineState, ReaderEngineRef } from "@/components/reader/ReaderEngineHost";
import ReaderOverlay from "@/components/reader/ReaderOverlay";
import { useReaderShortcuts } from "@/hooks/useReaderShortcuts";
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

    // UI State
    const [showUI, setShowUI] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [showControls, setShowControls] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(false); // Local optimistic state

    const rootRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<ReaderEngineRef>(null);
    const lastMouseMoveRef = useRef<number>(Date.now());
    
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

        // Only fetch if we don't have it in our local hydrated state
        setHydratedBook((prev) => {
            if (!prev?.epubBlob && !isFetchingRef.current) {
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
            return prev;
        });

        return () => {
            isMounted = false;
        };
    }, [bookId, getBookContent]); // Note: book is NOT a dependency here! Only bookId!

    // Settings
    const { screenReaderMode, brightness, grayscale } = useSettingsShallow((state) => ({
        screenReaderMode: state.screenReaderMode,
        brightness: state.brightness,
        grayscale: state.grayscale,
    }));

    // Reader Engine
    const [engineState, setEngineState] = useState<ReaderEngineState>({
        isLoading: true,
        currentCfi: "",
        totalPages: 100,
        currentPage: 1,
        tocItems: [],
    });

    const { isLoading: engineLoading, currentCfi, totalPages, currentPage, tocItems } = engineState;

    const isLoading = engineLoading || isFetchingContent;

    // Bookmark sync
    useEffect(() => {
        setIsBookmarked(book.bookmarks?.some((b) => b.cfi === currentCfi) ?? false);
    }, [currentCfi, book.bookmarks]);

    // Derived Actions
    const handleToggleBookmark = useCallback(() => {
        if (!currentCfi) return;
        if (isBookmarked) {
            const bookmark = book.bookmarks?.find((b) => b.cfi === currentCfi);
            if (bookmark) onRemoveBookmark(book.id, bookmark.id);
        } else {
            onAddBookmark(book.id, { cfi: currentCfi, title: `Page ${currentPage}` });
        }
        setIsBookmarked(!isBookmarked);
    }, [currentCfi, isBookmarked, book.id, book.bookmarks, currentPage, onAddBookmark, onRemoveBookmark]);

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
        nextPage: () => engineRef.current?.nextPage(),
        prevPage: () => engineRef.current?.prevPage(),
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
            {contentError && !isLoading && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 p-6">
                    <div className="max-w-md rounded-xl bg-white p-5 text-center shadow-xl dark:bg-neutral-900">
                        <p className="text-sm text-light-text dark:text-dark-text">{contentError}</p>
                    </div>
                </div>
            )}
        {/* Book content with brightness/grayscale filter */}
        <div
            className="absolute inset-0"
            style={{ filter: `brightness(${brightness}%) grayscale(${grayscale ? 1 : 0})` }}
        >
            <ReaderEngineHost 
                ref={engineRef}
                book={hydratedBook} 
                onUpdateProgress={onUpdateProgress} 
                onEngineStateChange={setEngineState} 
            />
        </div>

        {/* Loading overlay — outside the filter div so it renders at full brightness */}
        {isLoading && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-light-primary dark:bg-dark-primary">
                <div className="flex items-center gap-3 text-light-text dark:text-dark-text">
                    <svg className="h-5 w-5 animate-pulse" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="text-sm font-medium">Opening book...</span>
                </div>
            </div>
        )}

            <ReaderOverlay
                book={book}
                showUI={showUI}
                showSettings={showSettings}
                showControls={showControls}
                isLoading={isLoading}
                currentPage={currentPage} // Engine provides 1-based page
                totalPages={totalPages}
                isBookmarked={isBookmarked}
                currentCfi={currentCfi}
                toc={tocItems}
                bookmarks={book.bookmarks || []}
                isFullscreen={isFullscreen}

                onClose={onClose}
                onToggleBookmark={handleToggleBookmark}
                onToggleTOC={() => setShowControls(true)}
                onToggleSettings={() => setShowSettings(!showSettings)}
                onToggleControls={() => setShowControls(!showControls)}
                onToggleFullscreen={handleToggleFullscreen}

                onNextPage={() => engineRef.current?.nextPage()}
                onPrevPage={() => engineRef.current?.prevPage()}
                onNavigate={handleNavigate}
                onJumpToTop={() => { engineRef.current?.display("0"); }} // Jump to start
                onJumpToBottom={() => { engineRef.current?.goToPage(totalPages); }}
                onPageChange={handlePageChange}

                onRemoveBookmark={onRemoveBookmark}
                onCloseSettings={() => setShowSettings(false)}
                onCloseControls={() => setShowControls(false)}
            />
        </div>
    );
};

export default ReaderView;
