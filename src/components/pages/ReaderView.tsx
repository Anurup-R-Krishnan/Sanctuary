import React, { useState, useEffect, useRef, useCallback } from "react";
import type { Book, Bookmark, Highlight } from "@/types";
import { useSettings } from "@/context/SettingsContext";
import ReaderHeader from "@/components/reader/ReaderHeader";
import ReaderFooter from "@/components/reader/ReaderFooter";
import ReaderSettings from "@/components/reader/ReaderSettings";
import ReaderControls from "@/components/reader/ReaderControls";
import Panel from "@/components/ui/Panel";
import { X, Highlighter, Copy, Search } from "lucide-react";

interface ReaderViewProps {
    book: Book;
    onClose: () => void;
    onUpdateProgress: (id: string, progress: number, location: string) => void;
    onAddBookmark: (bookId: string, bookmark: Omit<Bookmark, "id" | "createdAt">) => void;
    onRemoveBookmark: (bookId: string, bookmarkId: string) => void;
    onAddHighlight?: (bookId: string, highlight: Omit<Highlight, "id" | "createdAt">) => void;
    onRemoveHighlight?: (bookId: string, highlightId: string) => void;
}

interface TocItem {
    id: string;
    href: string;
    label: string;
    subitems?: TocItem[];
}

interface SelectionMenu {
    x: number;
    y: number;
    cfi: string;
    text: string;
}

const HIGHLIGHT_COLORS: Highlight["color"][] = ["yellow", "green", "blue", "pink", "purple"];

// Average reading speed (words per minute)
const WPM = 250;


const ReaderView: React.FC<ReaderViewProps> = ({
    book,
    onClose,
    onUpdateProgress,
    onAddBookmark,
    onRemoveBookmark,
    onAddHighlight,
    onRemoveHighlight,
}) => {
    // UI State
    const [showUI, setShowUI] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [showControls, setShowControls] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isReady, setIsReady] = useState(false);
    const [selectionMenu, setSelectionMenu] = useState<SelectionMenu | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<{ cfi: string; excerpt: string }[]>([]);
    const [showSearch, setShowSearch] = useState(false);

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
        showScrollbar,
        keybinds,
        focusMode,
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

    // Selection Handler
    const handleSelection = useCallback((cfiRange: string, content: any) => {
        // Clear previous menu first
        // setSelectionMenu(null); // Warning: this might cause flashing if we replace it immediately

        if (!content) return;

        const selection = content.window.getSelection();
        if (!selection || selection.isCollapsed) {
            setSelectionMenu(null);
            return;
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Get absolute position relative to the viewing container
        // Note: 'rect' is inside the iframe. We need to add iframe offset.
        // BUT, since we are using full screen iframe usually, it might be close.
        // A safer bet for this MVP is to center it or place it at the touch coordinates if available.
        // For now, let's try to use the rect from the iframe + container offset.

        // However, 'rect' coordinates are relative to the viewport of the iframe.
        // If the iframe is fixed/full size, it matches our window.
        // Let's assume full size for now.

        const text = selection.toString();
        if (text.length > 0) {
            setSelectionMenu({
                x: rect.left + (rect.width / 2),
                y: rect.top,
                cfi: cfiRange,
                text
            });
        }
    }, []);


    // Apply current settings to rendition
    const applyStyles = useCallback(() => {
        if (!renditionRef.current) return;

        const fontFamily = getFontFamily();
        const dropCapColor = readerAccent;
        const marginRem = pageMargin / 16;

        renditionRef.current.themes.default({
            "body": {
                "font-family": `${fontFamily} !important`,
                "font-size": `${fontSize}px !important`,
                "line-height": `${lineHeight} !important`,
                "color": `${readerForeground} !important`,
                "background-color": `${readerBackground} !important`,
                "padding": `${marginRem}rem !important`,
                ...(continuous ? {
                    "max-width": `${maxTextWidth}ch !important`,
                    "margin": "0 auto !important",
                } : {}),
            },
            "p": {
                "font-family": "inherit !important",
                "font-size": "inherit !important",
                "line-height": "inherit !important",
                "color": "inherit !important",
                "text-align": `${textAlignment} !important`,
                "margin": `0 0 ${paragraphSpacing}em 0 !important`,
                "hyphens": hyphenation ? "auto !important" : "none !important",
                "-webkit-hyphens": hyphenation ? "auto !important" : "none !important",
            },
            "p + p": {
                "text-indent": "1.5em !important",
            },
            ...(dropCaps ? {
                ".first-paragraph::first-letter": {
                    "font-size": "3.2em !important",
                    "font-family": `${fontFamily} !important`,
                    "font-weight": "600 !important",
                    "line-height": "1 !important",
                    "float": "left !important",
                    "margin-right": "0.08em !important",
                    "color": `${dropCapColor} !important`,
                },
                ".first-paragraph": {
                    "text-indent": "0 !important"
                }
            } : {}),
            "div, span": {
                "font-family": "inherit !important",
                "line-height": "inherit !important",
                "color": "inherit !important",
            },
            "li": {
                "font-family": "inherit !important",
                "line-height": "inherit !important",
                "color": "inherit !important",
                "margin-bottom": "0.5em !important",
            },
            "blockquote": {
                "font-family": "inherit !important",
                "font-style": "italic !important",
                "margin": "1.5em 2em !important",
                "padding-left": "1em !important",
                "border-left": `3px solid ${readerAccent}40 !important`,
                "color": "inherit !important",
            },
            "h1, h2, h3, h4, h5, h6": {
                "font-family": `${fontFamily} !important`,
                "color": `${readerForeground} !important`,
                "margin": "1.5em 0 0.75em 0 !important",
                "font-weight": "600 !important",
                "line-height": "1.3 !important",
            },
            "a": {
                "color": `${readerAccent} !important`,
                "text-decoration": "underline !important",
                "text-decoration-color": `${readerAccent}60 !important`,
            },
            "img": {
                "max-width": "100% !important",
                "height": "auto !important",
                "display": "block !important",
                "margin": "1.5em auto !important",
            },
            ...(focusMode ? {
                "p:not(:hover)": {
                    "opacity": "0.35 !important",
                    "transition": "opacity 0.15s ease !important",
                },
                "p:hover": {
                    "opacity": "1 !important",
                    "transition": "opacity 0.15s ease !important",
                },
            } : {}),
        });

        // Force re-application of the default theme
        renditionRef.current.themes.select("default");

        // Explicitly set font size to ensure it propagates
        renditionRef.current.themes.fontSize(`${fontSize}px !important`);
    }, [fontSize, lineHeight, fontPairing, textAlignment, readerForeground, readerBackground, readerAccent, pageMargin, maxTextWidth, hyphenation, paragraphSpacing, dropCaps, getFontFamily, continuous, focusMode]);

    // Navigation
    const goToNextPage = useCallback(() => {
        if (renditionRef.current && isReady) {
            setLastPageTurn(Date.now());
            if (continuous) {
                const container = containerRef.current;
                if (container) {
                    const { scrollTop, scrollHeight, clientHeight } = container;
                    if (scrollTop + clientHeight >= scrollHeight - 50) {
                        renditionRef.current.next();
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
            setLastPageTurn(Date.now());
            if (continuous) {
                const container = containerRef.current;
                if (container) {
                    if (container.scrollTop <= 0) {
                        renditionRef.current.prev();
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
        setIsBookmarked(!isBookmarked);
    }, [currentCfi, isBookmarked, book.id, book.bookmarks, currentPage, chapterTitle, onAddBookmark, onRemoveBookmark]);

    // Handle Search
    const handleSearch = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim() || !bookRef.current) return;

        try {
            const results = await Promise.resolve(bookRef.current.find(searchQuery));
            setSearchResults(results.map((r: any) => ({
                cfi: r.cfi,
                excerpt: r.excerpt
            })));
        } catch (err) {
            console.error("Search error:", err);
        }
    }, [searchQuery]);

    const navigateToSearchResult = useCallback((cfi: string) => {
        if (!renditionRef.current) return;
        renditionRef.current.display(cfi);
        setShowSearch(false);
        renditionRef.current.annotations.add("highlight", cfi);
    }, []);

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
                    gap: pageMargin,
                });

                // Hook to sanitize EPUB content CSS and add classes
                renditionRef.current.hooks.content.register((content: any) => {
                    if (!content.document) return;

                    const doc = content.document;
                    const win = content.window;

                    // Add key listener to iframe document
                    doc.addEventListener('keydown', handleIframeKey);

                    // Add touch listeners for swiping (inside the iframe)
                    let startX = 0;
                    let startY = 0;
                    let startTime = 0;

                    doc.addEventListener('touchstart', (e: TouchEvent) => {
                        const touch = e.touches[0];
                        startX = touch.clientX;
                        startY = touch.clientY;
                        startTime = Date.now();
                    }, { passive: true });

                    doc.addEventListener('touchend', (e: TouchEvent) => {
                        const touch = e.changedTouches[0];
                        const deltaX = touch.clientX - startX;
                        const deltaY = touch.clientY - startY;
                        const deltaTime = Date.now() - startTime;

                        // Identify horizontal swipe
                        if (deltaTime < 300 && Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
                            if (deltaX > 0) goToPrevPage();
                            else goToNextPage();
                        } else {
                            // Tap handling (center vs edges) is tricky inside iframe due to text selection conflicts.
                            // We typically want to let the user select text.
                            // If it was a quick tap and NO selection occurred, we could treat as navigation/toggle.
                            const selection = win.getSelection();
                            if ((!selection || selection.isCollapsed) && deltaTime < 200 && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
                                // It was a tap.
                                // Map coordinates to screen width percentage
                                const width = win.innerWidth;
                                if (touch.clientX < width * 0.25) goToPrevPage();
                                else if (touch.clientX > width * 0.75) goToNextPage();
                                else {
                                    setShowUI(prev => !prev);
                                }
                            }
                        }
                    });

                    // Add selection listener
                    renditionRef.current.on("selected", (cfiRange: string, contents: any) => {
                        handleSelection(cfiRange, contents);
                        // Add highlight capability here later
                        // Example:
                        // renditionRef.current.annotations.add("highlight", cfiRange, {}, (e: any) => {
                        //     console.log("highlight clicked", e.target);
                        // });
                    });

                    // Keep all book styles - only inject our overrides via themes
                    // No CSS sanitization needed since epub.js themes take precedence

                    // Add class to first paragraph for drop caps
                    const firstPara = doc.querySelector('p');
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

    // Re-render on mode change (only for major structural changes)
    useEffect(() => {
        if (!isReady || !renditionRef.current || !bookRef.current) return;

        // Check if flow/spread actually changed before destroying
        // Note: simple destroy/create is robust but slow.
        // We can try to just update options if epubjs supports it well, 
        // but typically flow changes require re-rendering.

        const switchMode = async () => {
            const cfi = currentCfi; // Persist location

            // Note: We are deliberately keeping the destroy/re-create for 'continuous'/'spread' changes
            // because these fundamentally change the epubjs internal view managers (Iframe vs Default).
            // However, we ensure this ONLY happens when these specific props change, not others.

            renditionRef.current.destroy();

            renditionRef.current = bookRef.current.renderTo(containerRef.current, {
                width: "100%",
                height: continuous ? "auto" : "100%",
                spread: continuous ? "none" : (spread ? "always" : "none"),
                flow: continuous ? "scrolled-doc" : "paginated",
                gap: pageMargin,
                manager: continuous ? "continuous" : "default",
            });

            // Re-register hooks on mode switch
            renditionRef.current.hooks.content.register((content: any) => {
                if (!content.document) return;

                const doc = content.document;
                const win = content.window;

                // Add key listener to iframe document
                doc.addEventListener('keydown', handleIframeKey);

                // Add touch listeners for swiping (inside the iframe)
                let startX = 0;
                let startY = 0;
                let startTime = 0;

                doc.addEventListener('touchstart', (e: TouchEvent) => {
                    const touch = e.touches[0];
                    startX = touch.clientX;
                    startY = touch.clientY;
                    startTime = Date.now();
                }, { passive: true });

                doc.addEventListener('touchend', (e: TouchEvent) => {
                    const touch = e.changedTouches[0];
                    const deltaX = touch.clientX - startX;
                    const deltaY = touch.clientY - startY;
                    const deltaTime = Date.now() - startTime;

                    if (deltaTime < 300 && Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
                        if (deltaX > 0) goToPrevPage();
                        else goToNextPage();
                    } else {
                        const selection = win.getSelection();
                        if ((!selection || selection.isCollapsed) && deltaTime < 200 && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
                            const width = win.innerWidth;
                            if (touch.clientX < width * 0.2) goToPrevPage();
                            else if (touch.clientX > width * 0.8) goToNextPage();
                            else {
                                setShowUI(prev => !prev);
                            }
                        }
                    }
                });

                // Add selection listener
                renditionRef.current.on("selected", (cfiRange: string, contents: any) => {
                    handleSelection(cfiRange, contents);
                });

                const firstPara = doc.querySelector('p');
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
                    // Use locations if ready
                    const percent = bookRef.current.locations.percentageFromCfi(location.start.cfi);
                    const page = Math.max(1, Math.ceil(percent * totalPages));
                    setCurrentPage(page);
                }
            });
        };

        switchMode();
    }, [continuous, spread, pageMargin, isReady]);

    // Apply styles when settings change
    useEffect(() => {
        if (isReady) applyStyles();
    }, [isReady, applyStyles]);

    // Handle Scroll for Continuous Mode
    useEffect(() => {
        if (!continuous || !isReady || !renditionRef.current) return;
        const container = containerRef.current;
        if (!container) return;

        let timeout: NodeJS.Timeout;
        const handleScroll = () => {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => {
                // Try to force location update 
                // Note: rendition.location might not update automatically if manager doesn't fire.
                // We can try: rendition.reportLocation() or similar if available, 
                // but checking visible range is hard without internals.
                // However, getting the current location from epubjs might trigger the event.
                try {
                    const flow = renditionRef.current.location?.start;
                    if (flow) {
                        renditionRef.current.emit("relocated", { start: flow });
                    }
                } catch (e) { console.warn(e); }
            }, 100);
        };

        container.addEventListener('scroll', handleScroll);
        return () => {
            container.removeEventListener('scroll', handleScroll);
            if (timeout) clearTimeout(timeout);
        };
    }, [continuous, isReady]);

    // Calculate reading time
    useEffect(() => {
        if (!bookRef.current) return;

        // Try to get word count from metadata or estimate
        // Use locations to estimate remaining percentage
        if (totalPages > 0) {
            const remainingPages = Math.max(0, totalPages - currentPage);
            // Estimate 300 words per page average for standard books? 
            // Better: If we have locations, we have a total count.
            // Let's assume ~1 min per page as a safer default if we don't have word count.
            // But let's try to find real word count if possible.

            // For now, refining the page estimate to be 1.5 min per page
            setReadingTime(Math.ceil(remainingPages * 1.5));
        }
    }, [currentPage, totalPages]);

    // UI visibility - only auto-hide during active page turns
    const [lastPageTurn, setLastPageTurn] = useState(0);

    useEffect(() => {
        // Auto-hide disabled for manual control
    }, [showUI, showSettings, showControls, lastPageTurn]);

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

    // Touch/Swipe gestures
    const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
    const lastTapRef = useRef<{ time: number; x: number } | null>(null);
    const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        const touch = e.touches[0];
        touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    }, []);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (!touchStartRef.current || showSettings || showControls) return;

        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - touchStartRef.current.x;
        const deltaY = touch.clientY - touchStartRef.current.y;
        const deltaTime = Date.now() - touchStartRef.current.time;

        // Swipe detection
        const isSwipe = deltaTime < 300 && Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5;

        if (isSwipe) {
            if (deltaX > 0) goToPrevPage();
            else goToNextPage();
            touchStartRef.current = null;
            return;
        }

        // Tap detection (not a swipe, minimal movement)
        if (deltaTime < 200 && Math.abs(deltaX) < 15 && Math.abs(deltaY) < 15) {
            const x = touch.clientX;
            const width = window.innerWidth;
            const now = Date.now();

            // Double-tap check
            if (lastTapRef.current && now - lastTapRef.current.time < 300 && Math.abs(x - lastTapRef.current.x) < 50) {
                if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
                lastTapRef.current = null;
                toggleFullscreen();
            } else {
                lastTapRef.current = { time: now, x };
                // Delay single tap to wait for potential double-tap
                if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
                tapTimeoutRef.current = setTimeout(() => {
                    if (x < width * 0.33) goToPrevPage();
                    else if (x > width * 0.67) goToNextPage();
                    else setShowUI(prev => !prev);
                    lastTapRef.current = null;
                }, 250);
            }
        }

        touchStartRef.current = null;
    }, [goToNextPage, goToPrevPage, showSettings, showControls, toggleFullscreen]);

    // Click handler for desktop (mouse)
    const handleClick = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button, a, [role="button"]')) return;
        if (showSettings || showControls) return;

        const { clientX } = e;
        const width = window.innerWidth;

        // Wider tap zones: 33% each side
        if (clientX < width * 0.33) {
            goToPrevPage();
        } else if (clientX > width * 0.67) {
            goToNextPage();
        } else {
            setShowUI(prev => !prev);
        }
    }, [goToNextPage, goToPrevPage, showSettings, showControls]);

    // Double-click for fullscreen (desktop)
    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button, a, [role="button"]')) return;
        toggleFullscreen();
    }, [toggleFullscreen]);

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col overflow-hidden"
            style={{ backgroundColor: readerBackground }}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* Loading */}
            {isLoading && (
                <div className="absolute inset-0 z-[70] flex items-center justify-center" style={{ backgroundColor: readerBackground }}>
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full border-2 border-current opacity-20" style={{ borderColor: readerForeground }} />
                            <div
                                className="absolute inset-0 w-12 h-12 rounded-full border-2 border-t-transparent animate-spin"
                                style={{ borderColor: readerAccent }}
                            />
                        </div>
                        <p className="text-sm font-medium opacity-60" style={{ color: readerForeground }}>Opening book...</p>
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
                onToggleSearch={() => { setShowSearch(true); setSearchResults([]); setSearchQuery(""); }}
                onToggleSettings={() => setShowSettings(true)}
                onToggleControls={() => setShowControls(true)}
                onToggleFullscreen={toggleFullscreen}
            />

            {/* Selection Menu */}
            {selectionMenu && (
                <div
                    className="absolute z-[60] flex items-center gap-2 p-2 rounded-lg shadow-lg animate-in fade-in zoom-in duration-200"
                    style={{
                        top: selectionMenu.y - 60, // Position above
                        left: selectionMenu.x,
                        backgroundColor: readerBackground,
                        color: readerForeground,
                        border: '1px solid currentColor',
                        transform: 'translateX(-50%)'
                    }}
                >
                    <button
                        onClick={() => {
                            // Copy
                            navigator.clipboard.writeText(selectionMenu.text);
                            setSelectionMenu(null);
                        }}
                        className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded"
                        title="Copy"
                    >
                        <Copy size={16} />
                    </button>
                    <button
                        onClick={() => {
                            // Highlight (Mock)
                            console.log("Highlighting", selectionMenu.cfi);
                            if (onAddHighlight) {
                                onAddHighlight(book.id, {
                                    cfi: selectionMenu.cfi,
                                    color: "yellow",
                                    text: selectionMenu.text
                                });
                            }
                            setSelectionMenu(null);
                        }}
                        className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded"
                        title="Highlight"
                    >
                        <Highlighter size={16} />
                    </button>
                    <div className="w-px h-4 bg-current opacity-20" />
                    <button
                        onClick={() => setSelectionMenu(null)}
                        className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Reader Container */}
            <div
                ref={containerRef}
                className={`flex-1 w-full h-full transition-[filter] duration-300 ${continuous ? "overflow-y-auto" : "overflow-hidden"}`}
                style={{
                    filter: `brightness(${brightness}%)`,
                    scrollbarWidth: showScrollbar ? 'thin' : 'none',
                    scrollbarColor: `${readerAccent}40 transparent`,
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

            <Panel isOpen={showSettings} onClose={() => setShowSettings(false)} title="Appearance" side="right">
                <ReaderSettings />
            </Panel>

            {/* Search Panel */}
            <Panel
                title="Search"
                isOpen={showSearch}
                onClose={() => setShowSearch(false)}
                side="left"
            >
                <div className="p-4 space-y-4">
                    <form onSubmit={handleSearch} className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search in book..."
                            className="w-full pl-10 pr-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-light-accent/50 dark:focus:ring-dark-accent/50"
                            autoFocus
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    </form>

                    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                        {searchResults.length === 0 && searchQuery && (
                            <p className="text-sm text-center text-gray-500 py-4">Press Enter to search</p>
                        )}
                        {searchResults.map((result, idx) => (
                            <button
                                key={idx}
                                onClick={() => navigateToSearchResult(result.cfi)}
                                className="w-full text-left p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                            >
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-2">
                                    "{result.excerpt.trim()}"
                                </p>
                            </button>
                        ))}
                    </div>
                </div>
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
