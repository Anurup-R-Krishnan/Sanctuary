import type { RefObject } from "react";

import { useState, useEffect, useRef, useCallback } from "react";

import type { Book } from "@/types";
import type { EpubBookHandle, EpubLocation, EpubRendition, TocItem } from "@/utils/epub";

import { useSettingsShallow } from "@/store/useSettingsStore";
import { openEpub } from "@/utils/epub";

interface UseReaderEngineProps {
    book: Book;
    containerRef: RefObject<HTMLDivElement | null>;
    onUpdateProgress: (id: string, progress: number, location: string) => void;
}

const FONT_FAMILIES: Record<string, string> = {
    "merriweather-georgia": "'Merriweather', Georgia, serif",
    "crimson-pro": "'Crimson Pro', Georgia, serif",
    "libre-baskerville": "'Libre Baskerville', Georgia, serif",
    "lora": "'Lora', Georgia, serif",
    "source-serif": "'Source Serif Pro', Georgia, serif",
    "inter": "'Inter', system-ui, sans-serif",
};

const TEXT_WIDTH_CH = 96;

export const useReaderEngine = ({ book, containerRef, onUpdateProgress }: UseReaderEngineProps) => {
    const activeBookId = book.id;
    const activeBlob = book.epubBlob;

    const [isLoading, setIsLoading] = useState(true);
    const [currentCfi, setCurrentCfi] = useState<string>("");
    const [totalPages, setTotalPages] = useState(book.totalPages || 100);
    const [currentPage, setCurrentPage] = useState(book.progress || 1);
    const [tocItems, setTocItems] = useState<TocItem[]>([]);

    const renditionRef = useRef<EpubRendition | null>(null);
    const bookRef = useRef<EpubBookHandle | null>(null);
    const onUpdateProgressRef = useRef(onUpdateProgress);
    const startLocationRef = useRef(book.lastLocation);
    // Keep a ref to the latest style builder fn so the "relocated" handler
    // can reapply styles without a stale closure.
    const applyStylesRef = useRef<() => void>(() => undefined);

    const {
        fontSize, lineHeight, fontPairing, textAlignment, hyphenation,
        readerForeground, readerBackground,
        continuous, spread, reduceMotion, pageMargin, paragraphSpacing,
    } = useSettingsShallow((state) => ({
        fontSize: state.fontSize,
        lineHeight: state.lineHeight,
        fontPairing: state.fontPairing,
        textAlignment: state.textAlignment,
        hyphenation: state.hyphenation,
        readerForeground: state.readerForeground,
        readerBackground: state.readerBackground,
        continuous: state.continuous,
        spread: state.spread,
        reduceMotion: state.reduceMotion,
        pageMargin: state.pageMargin,
        paragraphSpacing: state.paragraphSpacing,
    }));

    useEffect(() => {
        onUpdateProgressRef.current = onUpdateProgress;
    }, [onUpdateProgress]);

    useEffect(() => {
        startLocationRef.current = book.lastLocation;
    }, [book.id, book.lastLocation]);

    // Build the styles object from current settings
    const buildStyles = useCallback(() => {
        const fontFamily = FONT_FAMILIES[fontPairing] ?? "'Merriweather', Georgia, serif";
        return {
            "body": {
                "font-family": fontFamily,
                "font-size": `${fontSize}px`,
                "line-height": `${lineHeight}`,
                "color": readerForeground,
                "background-color": readerBackground,
                "padding-top": `${pageMargin}px`,
                "padding-bottom": continuous ? "2em" : `${pageMargin}px`,
                "padding-left": `${continuous ? pageMargin : 0}px`,
                "padding-right": `${continuous ? pageMargin : 0}px`,
                ...(continuous
                    ? { "max-width": `${TEXT_WIDTH_CH}ch`, "margin": "0 auto" }
                    : { "max-width": "none", "margin": "0", "padding-bottom": "2em" }
                ),
            },
            "p": {
                "font-family": "inherit",
                "font-size": "inherit",
                "line-height": "inherit",
                "color": "inherit",
                "margin-bottom": `${paragraphSpacing}px`,
                "text-align": textAlignment,
                "hyphens": hyphenation ? "auto" : "none",
            },
        };
    }, [fontSize, lineHeight, fontPairing, textAlignment, hyphenation,
        readerForeground, readerBackground, continuous, pageMargin, paragraphSpacing]);

    // Apply styles safely — themes.default() is the stable epubjs API.
    // Wrapped in try/catch because it can throw if called while a section
    // is being destroyed (e.g. rapid page turns).
    const applyStyles = useCallback(() => {
        if (!renditionRef.current) return;
        try {
            renditionRef.current.themes.default(buildStyles());
        } catch {
            // Benign — section mid-teardown, next render will reapply
        }
    }, [buildStyles]);

    const buildStylesRef = useRef(buildStyles);
    useEffect(() => {
        buildStylesRef.current = buildStyles;
    }, [buildStyles]);

    // Keep applyStylesRef current so relocated handler always has latest version
    useEffect(() => {
        applyStylesRef.current = applyStyles;
    }, [applyStyles]);

    // ─── Book initialisation ───────────────────────────────────────────────────
    useEffect(() => {
        let mounted = true;
        const container = containerRef.current;
        let handleRelocated: ((loc: EpubLocation) => void) | null = null;

        const init = async () => {
            // Guard: if no blob yet, nothing to render — clear loading so the
            // fetching-content overlay (from ReaderView) takes over.
            if (!activeBlob) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);

            // Guard: container must be in the DOM
            if (!container || !mounted) {
                setIsLoading(false);
                return;
            }

            try {
                const arrayBuffer = await activeBlob.arrayBuffer();
                if (!mounted) return;

                bookRef.current = openEpub(arrayBuffer);

                // Load navigation (non-blocking — we don't await failure)
                bookRef.current.loaded.navigation
                    .then((nav) => {
                        if (mounted && nav?.toc) setTocItems(nav.toc);
                    })
                    .catch(() => undefined);

                renditionRef.current = bookRef.current.renderTo(container, {
                    width: "100%",
                    height: continuous ? "auto" : "100%",
                    spread: continuous ? "none" : (spread ? "always" : "none"),
                    flow: continuous ? "scrolled-doc" : "paginated",
                    // Disabling allowScriptedContent to prevent the "allow-scripts + allow-same-origin"
                    // iframe escape vulnerability warning. epub.js 0.3+ handles pagination via 
                    // range offsets without strictly requiring script injection for most standard epubs.
                    allowScriptedContent: false,
                });

                // Set styles BEFORE display() so the first render is already styled
                const initialStyles = buildStylesRef.current();
                renditionRef.current.themes.default(initialStyles);

                const startLocation = startLocationRef.current;
                await renditionRef.current.display(startLocation || undefined);

                if (!mounted) return;

                // Reapply styles after first display to override any epub-internal CSS
                applyStylesRef.current();

                // Attach event listener AFTER display so we don't fire on the initial
                // render before the book is stable.
                handleRelocated = (location: EpubLocation) => {
                    if (!mounted) return;
                    const cfi = location.start.cfi;
                    setCurrentCfi(cfi);

                    if (bookRef.current?.locations?.length()) {
                        const percent = bookRef.current.locations.percentageFromCfi(cfi);
                        const generatedPages = Math.max(1, bookRef.current.locations.length());
                        setCurrentPage(Math.max(1, Math.ceil(percent * generatedPages)));

                        const progressPercent = Math.max(0, Math.min(100, Math.round(percent * 100)));
                        onUpdateProgressRef.current(activeBookId, progressPercent, cfi);
                    }
                };
                renditionRef.current.on("relocated", handleRelocated);

                // Generate locations in the background (non-blocking)
                bookRef.current.locations.generate(1024)
                    .then(() => {
                        if (mounted && bookRef.current) {
                            setTotalPages(Math.max(1, bookRef.current.locations.length()));
                        }
                    })
                    .catch((err: unknown) => console.warn("Location generation failed:", err));

            } catch (err) {
                console.error("Reader init error:", err);
            } finally {
                // Always clear loading, even on error, so the UI doesn't hang
                if (mounted) setIsLoading(false);
            }
        };

        init();

        return () => {
            mounted = false;
            if (renditionRef.current && handleRelocated) {
                try { renditionRef.current.off("relocated", handleRelocated); } catch { /* ignore */ }
            }
            try { renditionRef.current?.destroy(); } catch { /* ignore */ }
            try { bookRef.current?.destroy?.(); } catch { /* ignore */ }
            renditionRef.current = null;
            bookRef.current = null;
            if (container) {
                container.innerHTML = "";
            }
        };
    }, [activeBookId, activeBlob, continuous, spread, containerRef]);
    
    // Note: The rendition is re-initialized only when structural options (flow/spread) or the book itself changes.
    useEffect(() => {
        applyStyles();
    }, [applyStyles]);

    // ─── Resize Observer ───────────────────────────────────────────────────────
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver(() => {
            try {
                // epub.js rendition resize
                renditionRef.current?.resize();
            } catch {
                // Ignore internal epub.js resize errors
            }
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, [containerRef]);

    // ─── Navigation ───────────────────────────────────────────────────────────
    const nextPage = useCallback(() => {
        if (!renditionRef.current) return;
        if (continuous && containerRef.current) {
            const c = containerRef.current;
            if (c.scrollTop + c.clientHeight >= c.scrollHeight - 50) {
                renditionRef.current.next();
            } else {
                c.scrollBy({ top: window.innerHeight * 0.8, behavior: reduceMotion ? "auto" : "smooth" });
            }
        } else {
            renditionRef.current.next();
        }
    }, [continuous, reduceMotion, containerRef]);

    const prevPage = useCallback(() => {
        if (!renditionRef.current) return;
        if (continuous && containerRef.current) {
            const c = containerRef.current;
            if (c.scrollTop <= 0) {
                renditionRef.current.prev();
            } else {
                c.scrollBy({ top: -window.innerHeight * 0.8, behavior: reduceMotion ? "auto" : "smooth" });
            }
        } else {
            renditionRef.current.prev();
        }
    }, [continuous, reduceMotion, containerRef]);

    const display = useCallback((target: string) => {
        renditionRef.current?.display(target);
    }, []);

    const goToPage = useCallback((page: number) => {
        if (!bookRef.current || !renditionRef.current) return;
        const percentage = (page - 1) / totalPages;
        const cfi = bookRef.current.locations.cfiFromPercentage(percentage);
        if (cfi) renditionRef.current.display(cfi);
    }, [totalPages]);

    return {
        isLoading,
        currentCfi,
        totalPages,
        currentPage,
        tocItems,
        renditionRef,
        bookRef,
        nextPage,
        prevPage,
        display,
        goToPage,
    };
};
