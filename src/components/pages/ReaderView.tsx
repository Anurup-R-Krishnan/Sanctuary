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


const ReaderView: React.FC<ReaderViewProps> = ({
    book,
    onClose,
    onUpdateProgress,
    onAddBookmark,
    onRemoveBookmark,
    onAddHighlight,
}) => {
    
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

    
    const [currentPage, setCurrentPage] = useState(book.progress || 1);
    const [totalPages, setTotalPages] = useState(book.totalPages || 100);
    const [chapterTitle, setChapterTitle] = useState("");
    const [currentCfi, setCurrentCfi] = useState(book.lastLocation || "");
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [readingTime, setReadingTime] = useState(0);
    const [tocItems, setTocItems] = useState<TocItem[]>([]);

    
    const renditionRef = useRef<any>(null);
    const bookRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    
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

    const handleSelection = useCallback((cfiRange: string, content: any) => {
        
        

        if (!content) return;

        const selection = content.window.getSelection();
        if (!selection || selection.isCollapsed) {
            setSelectionMenu(null);
            return;
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        
        
        
        
        

        
        
        

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


    
    const applyStyles = useCallback(() => {
        if (!renditionRef.current) return;

        const fontFamily = getFontFamily();
        const dropCapColor = readerAccent;
        const marginRem = pageMargin / 16;

        renditionRef.current.themes.default({
            "body": {
                "font-family": `${fontFamily}`,
                "font-size": `${fontSize}px`,
                "line-height": `${lineHeight}`,
                "color": `${readerForeground}`,
                "background-color": `${readerBackground}`,
                "padding": `${marginRem}rem`,
                "margin": "0 auto",
                "max-width": `${maxTextWidth}ch`,
            },
            "p": {
                "text-align": `${textAlignment}`,
                "margin-bottom": `${paragraphSpacing}em`,
                "hyphens": hyphenation ? "auto" : "none",
            },
            "h1, h2, h3, h4, h5, h6": {
                "font-family": `${fontFamily}`,
                "color": `${readerForeground}`,
                "margin": "1.5em 0 0.75em 0",
                "font-weight": "600",
                "line-height": "1.3",
            },
            "a": {
                "color": `${readerAccent}`,
                "text-decoration": "underline",
            },
        });

        renditionRef.current.themes.select("default");
    }, [fontSize, lineHeight, fontPairing, textAlignment, readerForeground, readerBackground, readerAccent, pageMargin, maxTextWidth, hyphenation, paragraphSpacing, getFontFamily]);

    
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

    
    const handleIframeKey = useCallback((e: KeyboardEvent) => {
        if (keybinds.nextPage.includes(e.code)) {
            e.preventDefault();
            goToNextPage();
        } else if (keybinds.prevPage.includes(e.code)) {
            e.preventDefault();
            goToPrevPage();
        } else if (keybinds.close.includes(e.code)) {
            if (showSettings || showControls) {
                setShowSettings(false);
                setShowControls(false);
            } else {
                onClose();
            }
        } else if (keybinds.toggleBookmark.includes(e.code)) {
            toggleBookmark();
        } else if (keybinds.toggleFullscreen.includes(e.code)) {
            toggleFullscreen();
        } else if (keybinds.toggleUI.includes(e.code)) {
            setShowUI(prev => !prev);
        }
    }, [keybinds, goToNextPage, goToPrevPage, showSettings, showControls, onClose, toggleBookmark, toggleFullscreen]);

    
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

                
                renditionRef.current = bookRef.current.renderTo(containerRef.current, {
                    width: "100%",
                    height: continuous ? "auto" : "100%",
                    spread: continuous ? "none" : (spread ? "always" : "none"),
                    flow: continuous ? "scrolled-doc" : "paginated",
                    gap: pageMargin,
                });

                
                renditionRef.current.hooks.content.register((content: any) => {
                    if (!content.document) return;

                    const doc = content.document;

                    
                    doc.addEventListener('keydown', handleIframeKey);

                    
                    renditionRef.current.on("selected", (cfiRange: string, contents: any) => {
                        handleSelection(cfiRange, contents);
                    });

                    const firstPara = doc.querySelector('p');
                    if (firstPara && dropCaps) {
                        firstPara.classList.add('first-paragraph');
                    }

                    if (doc.body) {
                        doc.body.style.maxWidth = `${maxTextWidth}ch`;
                        doc.body.style.margin = '0 auto';
                        doc.body.style.padding = `${pageMargin / 16}rem`;
                    }
                });

                applyStyles();

                
                if (book.lastLocation) {
                    await renditionRef.current.display(book.lastLocation);
                } else {
                    await renditionRef.current.display();
                }

                
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

    
    useEffect(() => {
        if (!isReady) applyStyles();
    }, [continuous, spread, pageMargin, isReady, applyStyles]);

    
    useEffect(() => {
        if (!isReady) return;
        
        // Debounce style application to improve performance
        const timeoutId = setTimeout(() => {
            applyStyles();
        }, 150);
        
        return () => clearTimeout(timeoutId);
    }, [isReady, applyStyles]);

    
    useEffect(() => {
        if (!continuous || !isReady || !renditionRef.current) return;
        const container = containerRef.current;
        if (!container) return;

        let timeout: NodeJS.Timeout;
        const handleScroll = () => {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => {
                
                
                
                
                
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

    
    useEffect(() => {
        if (!bookRef.current || totalPages <= 0) return;
        const remainingPages = Math.max(0, totalPages - currentPage);
        setReadingTime(Math.ceil(remainingPages * 1.5));
    }, [currentPage, totalPages]);

    
    const [lastPageTurn, setLastPageTurn] = useState(0);

    
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement) return;

            if (keybinds.nextPage.includes(e.code)) {
                e.preventDefault();
                goToNextPage();
            } else if (keybinds.prevPage.includes(e.code)) {
                e.preventDefault();
                goToPrevPage();
            } else if (keybinds.close.includes(e.code)) {
                if (showSettings || showControls) {
                    setShowSettings(false);
                    setShowControls(false);
                } else {
                    onClose();
                }
            } else if (keybinds.toggleBookmark.includes(e.code)) {
                toggleBookmark();
            } else if (keybinds.toggleFullscreen.includes(e.code)) {
                toggleFullscreen();
            } else if (keybinds.toggleUI.includes(e.code)) {
                setShowUI(prev => !prev);
            }
        };

        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [goToNextPage, goToPrevPage, toggleBookmark, toggleFullscreen, showSettings, showControls, onClose, keybinds]);

    
    const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        const touch = e.touches[0];
        touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    }, []);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (!touchStartRef.current || showSettings || showControls) return;

        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - touchStartRef.current.x;
        const deltaTime = Date.now() - touchStartRef.current.time;

        if (deltaTime < 300 && Math.abs(deltaX) > 50) {
            if (deltaX > 0) goToPrevPage();
            else goToNextPage();
        } else if (deltaTime < 200 && Math.abs(deltaX) < 15) {
            const x = touch.clientX;
            const width = window.innerWidth;
            
            if (x < width * 0.25) goToPrevPage();
            else if (x > width * 0.75) goToNextPage();
            else setShowUI(prev => !prev);
        }

        touchStartRef.current = null;
    }, [goToNextPage, goToPrevPage, showSettings, showControls]);

    
    const handleClick = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button, a, [role="button"]')) return;
        if (showSettings || showControls) return;

        const { clientX } = e;
        const width = window.innerWidth;

        if (clientX < width * 0.25) {
            goToPrevPage();
        } else if (clientX > width * 0.75) {
            goToNextPage();
        } else {
            setShowUI(prev => !prev);
        }
    }, [goToNextPage, goToPrevPage, showSettings, showControls]);



    return (
        <div
            className="fixed inset-0 z-50 flex flex-col overflow-hidden"
            style={{ backgroundColor: readerBackground }}
            onClick={handleClick}
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
                        top: selectionMenu.y - 60, 
                        left: selectionMenu.x,
                        backgroundColor: readerBackground,
                        color: readerForeground,
                        border: '1px solid currentColor',
                        transform: 'translateX(-50%)'
                    }}
                >
                    <button
                        onClick={() => {
                            
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
                        
                        
                        renditionRef.current?.next();
                    }}
                    onJumpToTop={() => {
                        renditionRef.current?.display(0);
                        containerRef.current?.scrollTo(0, 0);
                    }}
                    onJumpToBottom={() => {
                        
                        renditionRef.current?.display(bookRef.current.locations.length() - 1);
                    }}
                    onRemoveBookmark={(id) => onRemoveBookmark(book.id, id)}
                />
            </Panel>
        </div>
    );
};

export default ReaderView;
