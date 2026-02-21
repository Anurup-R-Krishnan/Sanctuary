import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Book, Bookmark } from "@/types";
import { useSettingsShallow } from "@/context/SettingsContext";
import { useReaderEngine } from "@/hooks/useReaderEngine";
import { useReaderShortcuts } from "@/hooks/useReaderShortcuts";
import ReaderContent from "@/components/reader/ReaderContent";
import ReaderOverlay from "@/components/reader/ReaderOverlay";
import { useReaderProgressStore } from "@/store/useReaderProgressStore";
import { Sparkles, BookmarkPlus, Copy } from "lucide-react";

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

    // Context Menu State (Replaced "Rabbit Hole")
    const [selection, setSelection] = useState<Selection | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<{ x: number, y: number } | null>(null);
    const [contextMessage, setContextMessage] = useState<string | null>(null);

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

    // Selection Handling for Context Menu
    useEffect(() => {
        const handleSelection = () => {
            const sel = window.getSelection();
            if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
                const range = sel.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                setSelection(sel);
                setTooltipPosition({
                    x: rect.left + rect.width / 2,
                    y: rect.top - 10 // Above the selection
                });
                setContextMessage(null); // Reset any message
            } else {
                setSelection(null);
                setTooltipPosition(null);
            }
        };

        document.addEventListener("selectionchange", handleSelection);
        return () => document.removeEventListener("selectionchange", handleSelection);
    }, []);

    const handleCopy = () => {
        if (!selection) return;
        navigator.clipboard.writeText(selection.toString());
        setContextMessage("Copied to clipboard!");
        setTimeout(() => setContextMessage(null), 2000);
    };

    const handleSaveHighlight = async () => {
        if (!selection || !currentCfi) return;
        // In a real implementation, this would save a Highlight object
        // For now, we'll save it as a bookmark with a note
        try {
            await onAddBookmark(activeBook.id, {
                cfi: currentCfi,
                title: `Highlight: ${selection.toString().slice(0, 20)}...`,
                note: selection.toString()
            });
            setContextMessage("Saved to bookmarks!");
            setTimeout(() => setContextMessage(null), 2000);
        } catch (e) {
            setContextMessage("Failed to save.");
        }
    };

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
            if (showUI && !showSettings && !showControls && !tooltipPosition) { // Don't hide if tooltip is active
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
    }, [showUI, showSettings, showControls, screenReaderMode, tooltipPosition]);

    return (
        <div
            ref={rootRef}
            tabIndex={-1}
            className="fixed inset-0 z-50 bg-[rgb(var(--paper-cream))] text-[rgb(var(--ink-navy))] font-serif overflow-hidden transition-colors duration-1000 ease-in-out"
        >
            {/* Ambient Background Noise/Texture */}
            <div className="absolute inset-0 pointer-events-none opacity-50 bg-repeat z-0 mix-blend-multiply"
                 style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E")` }}
            />

            {/* Context Menu Tooltip */}
            {tooltipPosition && (
                <div
                    className="absolute z-[100] transform -translate-x-1/2 -translate-y-full mb-2 pointer-events-auto"
                    style={{ left: tooltipPosition.x, top: tooltipPosition.y }}
                >
                    <div className="flex items-center gap-1 bg-[rgb(var(--ink-navy))] p-1 rounded-full shadow-xl animate-scaleIn">
                        {contextMessage ? (
                            <span className="px-3 py-1.5 text-xs font-bold text-[rgb(var(--woodstock-gold))] whitespace-nowrap">
                                {contextMessage}
                            </span>
                        ) : (
                            <>
                                <button
                                    onClick={handleCopy}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[rgb(var(--paper-cream))] hover:bg-white/10 transition-colors text-xs font-sans font-bold"
                                    title="Copy text"
                                >
                                    <Copy className="w-3 h-3" />
                                    <span>Copy</span>
                                </button>
                                <div className="w-px h-4 bg-white/20" />
                                <button
                                    onClick={handleSaveHighlight}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[rgb(var(--paper-cream))] hover:bg-white/10 transition-colors text-xs font-sans font-bold"
                                    title="Save as Bookmark/Highlight"
                                >
                                    <BookmarkPlus className="w-3 h-3" />
                                    <span>Save</span>
                                </button>
                            </>
                        )}
                    </div>
                    {/* Arrow */}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[rgb(var(--ink-navy))] transform rotate-45" />
                </div>
            )}

            {bookmarkError && (
                <div className="absolute left-1/2 top-20 z-[70] -translate-x-1/2 rounded-lg border border-red-300/50 bg-red-50 px-3 py-2 text-xs text-red-700 shadow dark:border-red-700/50 dark:bg-red-950/40 dark:text-red-300 font-sans">
                    {bookmarkError}
                </div>
            )}
            {contentError && !isLoading && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 p-6">
                    <div className="max-w-md rounded-xl bg-white p-5 text-center shadow-xl dark:bg-neutral-900 border border-[rgb(var(--aged-paper))]">
                        <p className="text-sm text-[rgb(var(--ink-navy))] font-serif">{contentError}</p>
                    </div>
                </div>
            )}

            <div
                className="absolute inset-0 z-10"
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
