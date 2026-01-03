import React, { useState, useEffect, useRef, useCallback } from "react";
import type { Book, Bookmark } from "@/types";
import {
    X,
    Bookmark as BookmarkIcon,
    BookmarkCheck,
    ChevronLeft,
    ChevronRight,
    Settings,
    List,
    Clock,
    Minus,
    Plus,
    Sun,
    Moon,
    Coffee,
    BookOpen,
    ArrowLeft,
    Maximize2,
    Minimize2,
    Type,
    Scroll,
    Layers,
} from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

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
    const [showUI, setShowUI] = useState(true);
    const [showTOC, setShowTOC] = useState(false);
    const [showBookmarks, setShowBookmarks] = useState(false);
    const [showQuickSettings, setShowQuickSettings] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentPage, setCurrentPage] = useState(book.progress || 1);
    const [totalPages, setTotalPages] = useState(book.totalPages || 100);
    const [chapterTitle, setChapterTitle] = useState("");
    const [currentCfi, setCurrentCfi] = useState(book.lastLocation || "");
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [readingTime, setReadingTime] = useState(0);
    const [tocItems, setTocItems] = useState<TocItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isReady, setIsReady] = useState(false);

    const renditionRef = useRef<any>(null);
    const bookRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const lastMouseMoveRef = useRef<number>(Date.now());
    const settingsAppliedRef = useRef(false);

    const settings = useSettings();

    const {
        fontSize,
        setFontSize,
        lineHeight,
        fontPairing,
        textAlignment,
        maxTextWidth,
        hyphenation,
        pageMargin,
        paragraphSpacing,
        readerForeground,
        readerBackground,
        readerAccent,
        immersiveMode,
        continuousMode,
        setContinuousMode,
        reduceMotion,
        applyPreset,
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

    // Apply current settings to rendition
    const applyStyles = useCallback(() => {
        if (!renditionRef.current) return;

        renditionRef.current.themes.default({
            "body": {
                "font-family": `${getFontFamily()} !important`,
                "font-size": `${fontSize}px !important`,
                "line-height": `${lineHeight} !important`,
                "text-align": `${textAlignment} !important`,
                "color": `${readerForeground} !important`,
                "background-color": `${readerBackground} !important`,
                "padding": `${pageMargin}px !important`,
                "max-width": `${maxTextWidth}ch`,
                "margin": "0 auto",
                "hyphens": hyphenation ? "auto" : "none",
                "-webkit-hyphens": hyphenation ? "auto" : "none",
            },
            "p, div, span": {
                "font-family": "inherit !important",
                "font-size": "inherit !important",
                "line-height": "inherit !important",
                "color": "inherit !important",
            },
            "p": {
                "margin-bottom": `${paragraphSpacing}px !important`,
                "text-indent": "1.5em",
            },
            "h1, h2, h3, h4, h5, h6": {
                "color": `${readerForeground} !important`,
                "margin-top": "2em",
                "margin-bottom": "1em",
            },
            "a": {
                "color": `${readerAccent} !important`,
            }
        });
    }, [fontSize, lineHeight, fontPairing, textAlignment, readerForeground, readerBackground, readerAccent, pageMargin, maxTextWidth, hyphenation, paragraphSpacing, getFontFamily]);

    // Navigation
    const goToNextPage = useCallback(() => {
        if (renditionRef.current) {
            renditionRef.current.next();
        }
    }, []);

    const goToPrevPage = useCallback(() => {
        if (renditionRef.current) {
            renditionRef.current.prev();
        }
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

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    // Navigate to chapter
    const navigateToChapter = useCallback((href: string, label: string) => {
        if (!renditionRef.current) return;

        setShowTOC(false);
        renditionRef.current.display(href).then(() => {
            setChapterTitle(label);
        }).catch((err: any) => {
            console.error("Navigation error:", err);
        });
    }, []);

    // Extract TOC from book
    const extractToc = useCallback(async (bookInstance: any) => {
        try {
            const navigation = await bookInstance.loaded.navigation;
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
        } catch (err) {
            console.error("TOC extraction error:", err);
        }
    }, []);

    // Initialize ePub
    useEffect(() => {
        let mounted = true;

        const init = async () => {
            try {
                setIsLoading(true);
                const ePub = (await import("epubjs")).default;

                if (!containerRef.current || !mounted) return;

                const arrayBuffer = await book.epubBlob.arrayBuffer();
                bookRef.current = ePub(arrayBuffer);

                // Extract TOC
                await extractToc(bookRef.current);

                // Create rendition
                renditionRef.current = bookRef.current.renderTo(containerRef.current, {
                    width: "100%",
                    height: "100%",
                    spread: "none",
                    flow: continuousMode ? "scrolled-doc" : "paginated",
                });

                // Apply styles
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

                    // Update page number
                    if (bookRef.current?.locations?.length()) {
                        const percent = bookRef.current.locations.percentageFromCfi(cfi);
                        const page = Math.max(1, Math.ceil(percent * totalPages));
                        setCurrentPage(page);
                        onUpdateProgress(book.id, page, cfi);
                    }

                    // Check bookmark
                    setIsBookmarked(book.bookmarks?.some((b) => b.cfi === cfi) ?? false);
                });

                // Handle chapter changes
                renditionRef.current.on("rendered", (section: any) => {
                    if (!mounted) return;
                    // Find matching chapter
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

                // Generate locations
                await bookRef.current.locations.generate(1024);
                if (mounted) {
                    setTotalPages(Math.max(1, bookRef.current.locations.length()));
                    setIsLoading(false);
                    setIsReady(true);
                }
            } catch (err) {
                console.error("Init error:", err);
                if (mounted) setIsLoading(false);
            }
        };

        init();

        return () => {
            mounted = false;
            if (renditionRef.current) {
                renditionRef.current.destroy();
            }
            if (bookRef.current) {
                bookRef.current.destroy();
            }
        };
    }, [book.epubBlob, book.id]);

    // Apply styles when settings change
    useEffect(() => {
        if (isReady) {
            applyStyles();
        }
    }, [isReady, applyStyles]);

    // Handle continuous mode toggle
    useEffect(() => {
        if (!isReady || !renditionRef.current || !bookRef.current) return;

        const switchMode = async () => {
            const cfi = currentCfi;

            renditionRef.current.destroy();

            renditionRef.current = bookRef.current.renderTo(containerRef.current, {
                width: "100%",
                height: "100%",
                spread: "none",
                flow: continuousMode ? "scrolled-doc" : "paginated",
            });

            applyStyles();

            if (cfi) {
                await renditionRef.current.display(cfi);
            } else {
                await renditionRef.current.display();
            }

            // Re-add handlers
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
    }, [continuousMode, isReady]);

    // Calculate reading time
    useEffect(() => {
        const remaining = Math.max(0, totalPages - currentPage);
        setReadingTime(remaining * 2);
    }, [currentPage, totalPages]);

    // UI visibility
    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;

        const handleMove = () => {
            lastMouseMoveRef.current = Date.now();
            if (!showUI) setShowUI(true);
        };

        const checkIdle = () => {
            if (immersiveMode && showUI && !showTOC && !showBookmarks && !showQuickSettings) {
                if (Date.now() - lastMouseMoveRef.current > 4000) {
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
    }, [showUI, immersiveMode, showTOC, showBookmarks, showQuickSettings]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement) return;

            if (settings.keybinds.nextPage.includes(e.key)) {
                e.preventDefault();
                goToNextPage();
            } else if (settings.keybinds.prevPage.includes(e.key)) {
                e.preventDefault();
                goToPrevPage();
            } else if (settings.keybinds.close.includes(e.key)) {
                if (showTOC || showBookmarks || showQuickSettings) {
                    setShowTOC(false);
                    setShowBookmarks(false);
                    setShowQuickSettings(false);
                } else {
                    onClose();
                }
            } else if (settings.keybinds.toggleBookmark.includes(e.key)) {
                toggleBookmark();
            } else if (settings.keybinds.toggleFullscreen.includes(e.key)) {
                toggleFullscreen();
            } else if (settings.keybinds.toggleUI.includes(e.key)) {
                setShowUI(prev => !prev);
            }
        };

        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [goToNextPage, goToPrevPage, toggleBookmark, toggleFullscreen, showTOC, showBookmarks, showQuickSettings, onClose]);

    const progressPercent = Math.round((currentPage / totalPages) * 100) || 0;

    // Panel component
    const Panel = ({ isOpen, onClose: close, title, children, side = "left" }: {
        isOpen: boolean;
        onClose: () => void;
        title: string;
        children: React.ReactNode;
        side?: "left" | "right";
    }) => (
        <>
            <div
                className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                onClick={close}
            />
            <div
                className={`fixed top-0 ${side === "left" ? "left-0" : "right-0"} h-full w-80 max-w-[85vw] z-[60] bg-light-surface dark:bg-dark-surface shadow-2xl transition-transform duration-300 ${isOpen ? "translate-x-0" : side === "left" ? "-translate-x-full" : "translate-x-full"
                    }`}
            >
                <div className="flex items-center justify-between p-4 border-b border-black/10 dark:border-white/10">
                    <h3 className="font-semibold text-light-text dark:text-dark-text">{title}</h3>
                    <button onClick={close} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
                        <X className="w-5 h-5" strokeWidth={1.5} />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto h-[calc(100%-65px)]">{children}</div>
            </div>
        </>
    );

    // Action button
    const ActionBtn = ({ icon: Icon, label, onClick, active }: {
        icon: React.ElementType;
        label: string;
        onClick: () => void;
        active?: boolean;
    }) => (
        <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`flex flex-col items-center gap-1 p-2.5 rounded-xl transition-colors ${active ? "bg-light-accent/15 dark:bg-dark-accent/15 text-light-accent dark:text-dark-accent" : "hover:bg-black/5 dark:hover:bg-white/5"
                }`}
            title={label}
        >
            <Icon className="w-5 h-5" strokeWidth={1.5} />
            <span className="text-[10px]">{label}</span>
        </button>
    );

    // TOC item
    const TocEntry = ({ item, depth = 0 }: { item: TocItem; depth?: number }) => (
        <div>
            <button
                onClick={() => navigateToChapter(item.href, item.label)}
                className={`w-full text-left px-3 py-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${chapterTitle === item.label ? "bg-light-accent/10 dark:bg-dark-accent/10 text-light-accent dark:text-dark-accent font-medium" : ""
                    }`}
                style={{ paddingLeft: `${12 + depth * 16}px` }}
            >
                <span className="text-sm">{item.label}</span>
            </button>
            {item.subitems?.map(sub => <TocEntry key={sub.id} item={sub} depth={depth + 1} />)}
        </div>
    );

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col"
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

            {/* Top bar */}
            <header className={`absolute top-0 left-0 right-0 z-50 transition-all duration-300 ${showUI ? "opacity-100" : "opacity-0 -translate-y-2 pointer-events-none"}`}>
                <div className="m-3">
                    <div className="rounded-2xl bg-white/95 dark:bg-dark-surface/95 backdrop-blur-xl shadow-lg border border-black/5 dark:border-white/5">
                        <div className="flex items-center justify-between px-4 py-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
                                    <ArrowLeft className="w-5 h-5 text-light-text dark:text-dark-text" strokeWidth={1.5} />
                                </button>
                                <div className="min-w-0">
                                    <h1 className="font-medium text-sm text-light-text dark:text-dark-text truncate">{book.title}</h1>
                                    {chapterTitle && <p className="text-xs text-light-text-muted dark:text-dark-text-muted truncate">{chapterTitle}</p>}
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <ActionBtn icon={isBookmarked ? BookmarkCheck : BookmarkIcon} label="Mark" onClick={toggleBookmark} active={isBookmarked} />
                                <ActionBtn icon={List} label="TOC" onClick={() => setShowTOC(true)} />
                                <ActionBtn icon={BookOpen} label="Saved" onClick={() => setShowBookmarks(true)} />
                                <ActionBtn icon={Settings} label="Style" onClick={() => setShowQuickSettings(true)} />
                                <ActionBtn icon={isFullscreen ? Minimize2 : Maximize2} label={isFullscreen ? "Exit" : "Full"} onClick={toggleFullscreen} />
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Nav buttons (paginated mode only) */}
            {!continuousMode && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); goToPrevPage(); }}
                        className={`absolute left-2 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-white/90 dark:bg-dark-surface/90 shadow-lg transition-all duration-300 ${showUI ? "opacity-100" : "opacity-0"}`}
                    >
                        <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); goToNextPage(); }}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-white/90 dark:bg-dark-surface/90 shadow-lg transition-all duration-300 ${showUI ? "opacity-100" : "opacity-0"}`}
                    >
                        <ChevronRight className="w-5 h-5" strokeWidth={1.5} />
                    </button>
                </>
            )}

            {/* Reader area */}
            <div ref={containerRef} className="flex-1 overflow-hidden" />

            {/* Bottom bar */}
            <footer className={`absolute bottom-0 left-0 right-0 z-50 transition-all duration-300 ${showUI ? "opacity-100" : "opacity-0 translate-y-2 pointer-events-none"}`}>
                <div className="m-3">
                    <div className="rounded-2xl bg-white/95 dark:bg-dark-surface/95 backdrop-blur-xl shadow-lg border border-black/5 dark:border-white/5">
                        <div className="h-1 bg-black/5 dark:bg-white/5 rounded-t-2xl overflow-hidden">
                            <div className="h-full transition-all" style={{ width: `${progressPercent}%`, backgroundColor: readerAccent }} />
                        </div>
                        <div className="flex items-center justify-between px-4 py-2.5">
                            <div className="flex items-center gap-3">
                                <span className="text-lg font-semibold text-light-text dark:text-dark-text tabular-nums">{currentPage}</span>
                                <span className="text-sm text-light-text-muted dark:text-dark-text-muted">/ {totalPages}</span>
                                <span className="text-sm font-medium px-2 py-0.5 rounded-md" style={{ backgroundColor: `${readerAccent}20`, color: readerAccent }}>{progressPercent}%</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-light-text-muted dark:text-dark-text-muted">
                                {continuousMode ? <Scroll className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                                <Clock className="w-4 h-4 ml-2" />
                                <span>{readingTime}m</span>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>

            {/* TOC Panel */}
            <Panel isOpen={showTOC} onClose={() => setShowTOC(false)} title="Contents" side="left">
                {tocItems.length > 0 ? (
                    <div className="space-y-0.5">{tocItems.map(item => <TocEntry key={item.id} item={item} />)}</div>
                ) : (
                    <p className="text-center text-light-text-muted dark:text-dark-text-muted py-8">No contents available</p>
                )}
            </Panel>

            {/* Bookmarks Panel */}
            <Panel isOpen={showBookmarks} onClose={() => setShowBookmarks(false)} title="Bookmarks" side="right">
                {book.bookmarks?.length ? (
                    <div className="space-y-2">
                        {book.bookmarks.map(bm => (
                            <div key={bm.id} className="group flex items-center gap-3 p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
                                <button onClick={() => { renditionRef.current?.display(bm.cfi); setShowBookmarks(false); }} className="flex-1 text-left">
                                    <p className="text-sm font-medium text-light-text dark:text-dark-text">{bm.title}</p>
                                    <p className="text-xs text-light-text-muted dark:text-dark-text-muted">{new Date(bm.createdAt).toLocaleDateString()}</p>
                                </button>
                                <button onClick={() => onRemoveBookmark(book.id, bm.id)} className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30">
                                    <X className="w-4 h-4 text-red-500" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-light-text-muted dark:text-dark-text-muted py-8">No bookmarks yet. Press B to add one.</p>
                )}
            </Panel>

            {/* Settings Panel */}
            <Panel isOpen={showQuickSettings} onClose={() => setShowQuickSettings(false)} title="Reading Settings" side="right">
                <div className="space-y-6">
                    {/* Reading Mode */}
                    <div>
                        <p className="text-xs uppercase tracking-wide text-light-text-muted dark:text-dark-text-muted mb-2">Mode</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setContinuousMode(false)}
                                className={`flex items-center justify-center gap-2 p-3 rounded-xl border ${!continuousMode ? "border-light-accent dark:border-dark-accent bg-light-accent/10 dark:bg-dark-accent/10" : "border-black/10 dark:border-white/10"}`}
                            >
                                <Layers className="w-4 h-4" />
                                <span className="text-sm">Pages</span>
                            </button>
                            <button
                                onClick={() => setContinuousMode(true)}
                                className={`flex items-center justify-center gap-2 p-3 rounded-xl border ${continuousMode ? "border-light-accent dark:border-dark-accent bg-light-accent/10 dark:bg-dark-accent/10" : "border-black/10 dark:border-white/10"}`}
                            >
                                <Scroll className="w-4 h-4" />
                                <span className="text-sm">Scroll</span>
                            </button>
                        </div>
                    </div>

                    {/* Font Size */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs uppercase tracking-wide text-light-text-muted dark:text-dark-text-muted">Font Size</p>
                            <span className="text-sm font-medium" style={{ color: readerAccent }}>{fontSize}px</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setFontSize(Math.max(14, fontSize - 1))} className="p-2.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10">
                                <Minus className="w-4 h-4" />
                            </button>
                            <div className="flex-1 h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${((fontSize - 14) / 14) * 100}%`, backgroundColor: readerAccent }} />
                            </div>
                            <button onClick={() => setFontSize(Math.min(28, fontSize + 1))} className="p-2.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10">
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Theme */}
                    <div>
                        <p className="text-xs uppercase tracking-wide text-light-text-muted dark:text-dark-text-muted mb-2">Theme</p>
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => applyPreset("focus")} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white border border-black/10">
                                <Sun className="w-5 h-5 text-gray-700" />
                                <span className="text-xs text-gray-700">Light</span>
                            </button>
                            <button onClick={() => applyPreset("comfort")} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-[#F4ECD8] border border-[#8B7355]/20">
                                <Coffee className="w-5 h-5 text-[#5C4B37]" />
                                <span className="text-xs text-[#5C4B37]">Sepia</span>
                            </button>
                            <button onClick={() => applyPreset("night")} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-[#1a1a1a] border border-white/10">
                                <Moon className="w-5 h-5 text-[#e8e6e3]" />
                                <span className="text-xs text-[#e8e6e3]">Dark</span>
                            </button>
                        </div>
                    </div>

                    {/* Shortcuts */}
                    <div className="pt-2 border-t border-black/10 dark:border-white/10">
                        <p className="text-xs uppercase tracking-wide text-light-text-muted dark:text-dark-text-muted mb-2">Shortcuts</p>
                        <div className="space-y-1.5 text-xs text-light-text-muted dark:text-dark-text-muted">
                            <div className="flex justify-between"><span>Next/Prev</span><span>← → or Space</span></div>
                            <div className="flex justify-between"><span>Bookmark</span><span>B</span></div>
                            <div className="flex justify-between"><span>Fullscreen</span><span>F</span></div>
                            <div className="flex justify-between"><span>Toggle UI</span><span>M</span></div>
                        </div>
                    </div>
                </div>
            </Panel>
        </div>
    );
};

export default ReaderView;
