import React, { useState, useEffect, useRef, useCallback } from "react";
import type { Book, Bookmark } from "@/types";
import { useSettings } from "@/context/SettingsContext";
import ReaderHeader from "@/components/reader/ReaderHeader";
import ReaderFooter from "@/components/reader/ReaderFooter";
import ReaderSettings from "@/components/reader/ReaderSettings";
import ReaderControls from "@/components/reader/ReaderControls";
import Panel from "@/components/ui/Panel";

interface ReaderViewProps {
    book: Book;
    onClose: () => void;
    onUpdateProgress: (id: string, progress: number, location: string) => void;
    onAddBookmark: (bookId: string, bookmark: Omit<Bookmark, "id" | "createdAt">) => void;
    onRemoveBookmark: (bookId: string, bookmarkId: string) => void;
}

interface TocItem {
    id: string;
    href: string;
    label: string;
    subitems?: TocItem[];
}

const ReaderView: React.FC<ReaderViewProps> = ({
    book,
    onClose,
    onUpdateProgress,
    onAddBookmark,
    onRemoveBookmark,
}) => {
    // UI State
    const [showUI, setShowUI] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [showControls, setShowControls] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isReady, setIsReady] = useState(false);

    // Book State
    const [currentPage, setCurrentPage] = useState(book.progress || 1);
    const [totalPages, setTotalPages] = useState(book.totalPages || 100);
    const [chapterTitle, setChapterTitle] = useState("");
    const [currentCfi, setCurrentCfi] = useState(book.lastLocation || "");
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [readingTime, setReadingTime] = useState(0);
    const [tocItems, setTocItems] = useState<TocItem[]>([]);

    // Refs
    const renditionRef = useRef<any>(null);
    const bookRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const lastMouseMoveRef = useRef<number>(Date.now());

    // Settings
    const {
        fontSize,
        lineHeight,
        fontPairing,
        textAlignment,
        maxTextWidth,
        hyphenation,
        pageMargin,
        paragraphSpacing,
        dropCaps,
        readerForeground,
        readerBackground,
        readerAccent,
        continuous,
        spread,
        brightness,
        grayscale,
        showScrollbar,
        keybinds,
    } = useSettings();

    // Get font family string
    const getFontFamily = useCallback(() => {
        const fonts: Record<string, string> = {
            "merriweather-georgia": "'Merriweather', Georgia, serif",
            "crimson-pro": "'Crimson Pro', Georgia, serif",
            "libre-baskerville": "'Libre Baskerville', Georgia, serif",
            "lora": "'Lora', Georgia, serif",
            "source-serif": "'Source Serif Pro', Georgia, serif",
            "inter": "'Inter', system-ui, sans-serif",
        };
        return fonts[fontPairing] || fonts["merriweather-georgia"];
    }, [fontPairing]);

    // Helper to determine if background is dark
    const isDarkBackground = useCallback((color: string) => {
        if (!color.startsWith('#')) return false;
        const hex = color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        // YIQ equation
        return ((r * 299) + (g * 587) + (b * 114)) / 1000 < 128;
    }, []);

    // Apply current settings to rendition
    const applyStyles = useCallback(() => {
        if (!renditionRef.current) return;

        const fontFamily = getFontFamily();
        const isDark = isDarkBackground(readerBackground);
        const dropCapColor = isDark ? '#4ade80' : '#1a472a'; // Adaptive Forest Green
        
        // Register a theme that targets specific elements to override book styles
        renditionRef.current.themes.default({
            "body": {
                "font-family": `${fontFamily} !important`,
                "font-size": `${fontSize}px !important`,
                "line-height": `${lineHeight} !important`,
                "color": `${readerForeground} !important`,
                "background-color": `${readerBackground} !important`,
                "padding-top": `${pageMargin}px !important`,
                "padding-bottom": `${pageMargin}px !important`,
                "padding-left": `${continuous ? pageMargin : 0}px !important`,
                "padding-right": `${continuous ? pageMargin : 0}px !important`,
                ...(continuous ? {
                    "max-width": `${maxTextWidth}ch !important`,
                    "margin": "0 auto !important",
                } : {
                    "max-width": "none !important",
                    "margin": "0 !important",
                }),
            },
            "p": {
                "font-family": "inherit !important",
                "font-size": "inherit !important",
                "line-height": "inherit !important",
                "color": "inherit !important",
                "text-align": `${textAlignment} !important`,
                "margin-bottom": `${paragraphSpacing}px !important`,
                "text-indent": "1.5em",
                "hyphens": hyphenation ? "auto !important" : "none !important",
                "-webkit-hyphens": hyphenation ? "auto !important" : "none !important",
            },
            ...(dropCaps ? {
                ".first-paragraph::first-letter": {
                    "font-size": "3.25em !important",
                    "line-height": "0.8 !important",
                    "font-weight": "bold !important",
                    "float": "left !important",
                    "margin-right": "0.15em !important",
                    "margin-top": "-0.1em !important",
                    "color": `${dropCapColor} !important`,
                    "font-family": `${fontFamily} !important`,
                    "text-transform": "uppercase !important",
                },
                ".first-paragraph": {
                    "text-indent": "0 !important"
                }
            } : {}),
            "div, span, li, blockquote": {
                "font-family": "inherit !important",
                "font-size": "inherit !important",
                "line-height": "inherit !important",
                "color": "inherit !important",
                "text-align": `${textAlignment} !important`,
                "hyphens": hyphenation ? "auto !important" : "none !important",
                "-webkit-hyphens": hyphenation ? "auto !important" : "none !important",
            },
            "h1, h2, h3, h4, h5, h6": {
                "font-family": `${fontFamily} !important`,
                "color": `${readerForeground} !important`,
                "margin-top": "2em",
                "margin-bottom": "1em",
                "font-weight": "600 !important",
                "line-height": "1.3 !important",
            },
            "a": {
                "color": `${readerAccent} !important`,
                "text-decoration": "none",
            },
            "img": {
                "max-width": "100% !important",
                "height": "auto !important",
                "filter": grayscale ? "grayscale(1)" : "none",
                "display": "block !important",
                "margin": "1em auto !important",
            }
        });
    }, [fontSize, lineHeight, fontPairing, textAlignment, readerForeground, readerBackground, readerAccent, pageMargin, maxTextWidth, hyphenation, paragraphSpacing, dropCaps, getFontFamily, continuous, grayscale, isDarkBackground]);

    // Navigation
    const goToNextPage = useCallback(() => {
        if (renditionRef.current && isReady) {
            if (continuous) {
                const container = containerRef.current;
                if (container) {
                    const { scrollTop, scrollHeight, clientHeight } = container;
                    // If near bottom, go to next chapter
                    if (scrollTop + clientHeight >= scrollHeight - 50) {
                        renditionRef.current.next();
                        // Reset scroll to top after chapter change
                        setTimeout(() => container.scrollTo(0, 0), 100);
                    } else {
                        container.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
                    }
                }
            } else {
                renditionRef.current.next();
            }
        }
    }, [continuous, isReady]);

    const goToPrevPage = useCallback(() => {
        if (renditionRef.current && isReady) {
            if (continuous) {
                const container = containerRef.current;
                if (container) {
                    // If at top, go to prev chapter
                    if (container.scrollTop <= 0) {
                        renditionRef.current.prev();
                        // We might want to scroll to bottom of prev chapter, but epubjs might handle it or we need to wait
                    } else {
                        container.scrollBy({ top: -window.innerHeight * 0.8, behavior: 'smooth' });
                    }
                }
            } else {
                renditionRef.current.prev();
            }
        }
    }, [continuous, isReady]);


    const navigateToChapter = useCallback((href: string, label: string) => {
        if (!renditionRef.current) return;
        setShowControls(false);
        renditionRef.current.display(href).then(() => {
            setChapterTitle(label);
        }).catch((err: any) => {
            console.error("Navigation error:", err);
        });
    }, []);

    // Toggle bookmark
    const toggleBookmark = useCallback(() => {
        if (!currentCfi) return;
        if (isBookmarked) {
            const bookmark = book.bookmarks?.find((b) => b.cfi === currentCfi);
            if (bookmark) onRemoveBookmark(book.id, bookmark.id);
        } else {
            onAddBookmark(book.id, { cfi: currentCfi, title: chapterTitle || `Page ${currentPage}` });
        }
        setIsBookmarked(!isBookmarked);
    }, [currentCfi, isBookmarked, book.id, book.bookmarks, currentPage, chapterTitle, onAddBookmark, onRemoveBookmark]);

    // Toggle fullscreen
    const toggleFullscreen = useCallback(async () => {
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

    // Handle key events from within the iframe
    const handleIframeKey = useCallback((e: KeyboardEvent) => {
        if (keybinds.nextPage.includes(e.key)) {
            e.preventDefault();
            goToNextPage();
        } else if (keybinds.prevPage.includes(e.key)) {
            e.preventDefault();
            goToPrevPage();
        } else if (keybinds.close.includes(e.key)) {
            if (showSettings || showControls) {
                setShowSettings(false);
                setShowControls(false);
            } else {
                onClose();
            }
        } else if (keybinds.toggleBookmark.includes(e.key)) {
            toggleBookmark();
        } else if (keybinds.toggleFullscreen.includes(e.key)) {
            toggleFullscreen();
        } else if (keybinds.toggleUI.includes(e.key)) {
            setShowUI(prev => !prev);
        }
    }, [keybinds, goToNextPage, goToPrevPage, showSettings, showControls, onClose, toggleBookmark, toggleFullscreen]);

    // Initialize ePub
    useEffect(() => {
        let mounted = true;

        const init = async () => {
            try {
                if (!book || !book.epubBlob) return;

                setIsLoading(true);
                const ePub = (await import("epubjs")).default;

                if (!containerRef.current || !mounted) return;

                const arrayBuffer = await book.epubBlob.arrayBuffer();
                bookRef.current = ePub(arrayBuffer);

                // Extract TOC
                const navigation = await bookRef.current.loaded.navigation;
                if (navigation?.toc) {
                    const parseToc = (items: any[]): TocItem[] => {
                        return items.map((item) => ({
                            id: item.id || item.href,
                            href: item.href,
                            label: item.label?.trim() || "Untitled",
                            subitems: item.subitems?.length ? parseToc(item.subitems) : undefined,
                        }));
                    };
                    setTocItems(parseToc(navigation.toc));
                }

                // Create rendition
                renditionRef.current = bookRef.current.renderTo(containerRef.current, {
                    width: "100%",
                    height: continuous ? "auto" : "100%",
                    spread: continuous ? "none" : (spread ? "always" : "none"),
                    flow: continuous ? "scrolled-doc" : "paginated",
                });

                // Hook to sanitize EPUB content CSS and add classes
                renditionRef.current.hooks.content.register((content: any) => {
                    if (!content.document) return;
                    
                    // Add key listener to iframe document
                    content.document.addEventListener('keydown', handleIframeKey);
                    
                    // Sanitize styles
                    const styles = content.document.querySelectorAll('style');
                    styles.forEach((style: any) => {
                        style.textContent = style.textContent
                            .replace(/body\s*{[^}]*}/gi, '')
                            .replace(/html\s*{[^}]*}/gi, '');
                    });

                    // Add class to first paragraph for drop caps
                    const firstPara = content.document.querySelector('p');
                    if (firstPara) {
                        firstPara.classList.add('first-paragraph');
                    }
                });

                applyStyles();

                // Display book
                if (book.lastLocation) {
                    await renditionRef.current.display(book.lastLocation);
                } else {
                    await renditionRef.current.display();
                }

                // Handle location changes
                renditionRef.current.on("relocated", (location: any) => {
                    if (!mounted) return;
                    const cfi = location.start.cfi;
                    setCurrentCfi(cfi);

                    if (bookRef.current?.locations?.length()) {
                        const percent = bookRef.current.locations.percentageFromCfi(cfi);
                        const page = Math.max(1, Math.ceil(percent * totalPages));
                        setCurrentPage(page);
                        onUpdateProgress(book.id, page, cfi);
                    }

                    setIsBookmarked(book.bookmarks?.some((b) => b.cfi === cfi) ?? false);
                });

                // Handle chapter changes
                renditionRef.current.on("rendered", (section: any) => {
                    if (!mounted) return;
                    const findChapter = (items: TocItem[]): string | null => {
                        for (const item of items) {
                            if (section.href?.includes(item.href.split('#')[0])) {
                                return item.label;
                            }
                            if (item.subitems) {
                                const sub = findChapter(item.subitems);
                                if (sub) return sub;
                            }
                        }
                        return null;
                    };
                    const chapter = findChapter(tocItems);
                    if (chapter) setChapterTitle(chapter);
                });

                // Generate locations in background
                bookRef.current.locations.generate(1024).then(() => {
                    if (mounted) {
                        setTotalPages(Math.max(1, bookRef.current.locations.length()));
                    }
                }).catch((err: any) => console.warn("Location generation failed:", err));

                setIsLoading(false);
                setIsReady(true);
            } catch (err) {
                console.error("Init error:", err);
                if (mounted) setIsLoading(false);
            }
        };

        init();

        return () => {
            mounted = false;
            if (renditionRef.current) renditionRef.current.destroy();
            if (bookRef.current) bookRef.current.destroy();
        };
    }, [book.epubBlob, book.id]);

    // Re-render on mode change
    useEffect(() => {
        if (!isReady || !renditionRef.current || !bookRef.current) return;

        const switchMode = async () => {
            const cfi = currentCfi;
            renditionRef.current.destroy();

            renditionRef.current = bookRef.current.renderTo(containerRef.current, {
                width: "100%",
                height: continuous ? "auto" : "100%",
                spread: continuous ? "none" : (spread ? "always" : "none"),
                flow: continuous ? "scrolled-doc" : "paginated",
            });

            // Re-register hooks on mode switch
            renditionRef.current.hooks.content.register((content: any) => {
                if (!content.document) return;
                
                // Add key listener to iframe document
                content.document.addEventListener('keydown', handleIframeKey);

                const styles = content.document.querySelectorAll('style');
                styles.forEach((style: any) => {
                    style.textContent = style.textContent
                        .replace(/body\s*{[^}]*}/gi, '')
                        .replace(/html\s*{[^}]*}/gi, '');
                });
                const firstPara = content.document.querySelector('p');
                if (firstPara) {
                    firstPara.classList.add('first-paragraph');
                }
            });

            applyStyles();

            if (cfi) {
                await renditionRef.current.display(cfi);
            } else {
                await renditionRef.current.display();
            }

            renditionRef.current.on("relocated", (location: any) => {
                setCurrentCfi(location.start.cfi);
                if (bookRef.current?.locations?.length()) {
                    const percent = bookRef.current.locations.percentageFromCfi(location.start.cfi);
                    const page = Math.max(1, Math.ceil(percent * totalPages));
                    setCurrentPage(page);
                }
            });
        };

        switchMode();
    }, [continuous, spread, isReady]);

    // Apply styles when settings change
    useEffect(() => {
        if (isReady) applyStyles();
    }, [isReady, applyStyles]);

    // Calculate reading time
    useEffect(() => {
        const remaining = Math.max(0, totalPages - currentPage);
        setReadingTime(remaining * 2); // Rough estimate: 2 mins per page
    }, [currentPage, totalPages]);

    // UI visibility
    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;
        const handleMove = () => {
            lastMouseMoveRef.current = Date.now();
            if (!showUI) setShowUI(true);
        };
        const checkIdle = () => {
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
            clearTimeout(timeout);
            document.removeEventListener("mousemove", handleMove);
            document.removeEventListener("touchstart", handleMove);
        };
    }, [showUI, showSettings, showControls]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement) return;

            if (keybinds.nextPage.includes(e.key)) {
                e.preventDefault();
                goToNextPage();
            } else if (keybinds.prevPage.includes(e.key)) {
                e.preventDefault();
                goToPrevPage();
            } else if (keybinds.close.includes(e.key)) {
                if (showSettings || showControls) {
                    setShowSettings(false);
                    setShowControls(false);
                } else {
                    onClose();
                }
            } else if (keybinds.toggleBookmark.includes(e.key)) {
                toggleBookmark();
            } else if (keybinds.toggleFullscreen.includes(e.key)) {
                toggleFullscreen();
            } else if (keybinds.toggleUI.includes(e.key)) {
                setShowUI(prev => !prev);
            }
        };

        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [goToNextPage, goToPrevPage, toggleBookmark, toggleFullscreen, showSettings, showControls, onClose, keybinds]);

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col overflow-hidden"
            style={{ backgroundColor: readerBackground }}
            onClick={() => { setShowUI(true); lastMouseMoveRef.current = Date.now(); }}
        >
            {/* Loading */}
            {isLoading && (
                <div className="absolute inset-0 z-[70] flex items-center justify-center" style={{ backgroundColor: readerBackground }}>
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-3 border-t-light-accent dark:border-t-dark-accent border-black/10 dark:border-white/10 rounded-full animate-spin" />
                        <p className="text-sm" style={{ color: readerForeground }}>Loading...</p>
                    </div>
                </div>
            )}

            <ReaderHeader
                book={book}
                chapterTitle={chapterTitle}
                isBookmarked={isBookmarked}
                isFullscreen={isFullscreen}
                showUI={showUI}
                onClose={onClose}
                onToggleBookmark={toggleBookmark}
                onToggleTOC={() => { setShowControls(true); }}
                onToggleSettings={() => setShowSettings(true)}
                onToggleControls={() => setShowControls(true)}
                onToggleFullscreen={toggleFullscreen}
            />

            {/* Reader Container */}
            <div 
                ref={containerRef} 
                className={`flex-1 w-full h-full ${continuous ? "overflow-y-auto" : "overflow-hidden"}`}
                style={{ 
                    filter: `brightness(${brightness}%) grayscale(${grayscale ? 1 : 0})`,
                    scrollbarWidth: showScrollbar ? 'auto' : 'none',
                }}
            />

            <ReaderFooter
                currentPage={currentPage}
                totalPages={totalPages}
                readingTime={readingTime}
                showUI={showUI}
                onNextPage={goToNextPage}
                onPrevPage={goToPrevPage}
                onPageChange={(page) => {
                    if (bookRef.current?.locations?.length()) {
                        const cfi = bookRef.current.locations.cfiFromPercentage(page / totalPages);
                        renditionRef.current?.display(cfi);
                    }
                }}
            />

            {/* Settings Panel */}
            <Panel isOpen={showSettings} onClose={() => setShowSettings(false)} title="Appearance" side="right">
                <ReaderSettings />
            </Panel>

            {/* Controls Panel (TOC, Bookmarks, Utils) */}
            <Panel isOpen={showControls} onClose={() => setShowControls(false)} title="Navigation" side="left">
                <ReaderControls
                    toc={tocItems}
                    bookmarks={book.bookmarks || []}
                    currentChapter={chapterTitle}
                    onNavigate={navigateToChapter}
                    onNextChapter={() => {
                        // Find current chapter index and go to next
                        // Simplified: just go next page for now, or implement real chapter skip
                        renditionRef.current?.next();
                    }}
                    onJumpToTop={() => {
                        renditionRef.current?.display(0);
                        containerRef.current?.scrollTo(0, 0);
                    }}
                    onJumpToBottom={() => {
                        // Approximate bottom
                        renditionRef.current?.display(bookRef.current.locations.length() - 1);
                    }}
                    onRemoveBookmark={(id) => onRemoveBookmark(book.id, id)}
                />
            </Panel>
        </div>
    );
};

export default ReaderView;
