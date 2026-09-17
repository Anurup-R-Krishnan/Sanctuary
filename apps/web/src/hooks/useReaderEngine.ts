import type { RefObject } from "react";

import { useState, useEffect, useRef, useCallback } from "react";

import type { LightboxImageTarget } from "@/reader/contracts/engine";
import type { Book } from "@/types";
import type { ReaderError, ReaderPosition, ReaderSelection, ReaderStatus } from "@/types/reader";
import type { TocItem } from "@/utils/epub";
import type { ResolvedFootnote } from "@/utils/footnoteResolver";

import { useSettingsShallow } from "@/store/useSettingsStore";

import { ReaderSession } from "../reader/engine/ReaderSession";
import { ReaderThemeController, type ReaderThemeConfig } from "../reader/engine/ReaderThemeController";

export interface UseReaderEngineProps {
    book: Book;
    containerRef: RefObject<HTMLDivElement | null>;
    onUpdateProgress: (id: string, progress: number, location: string) => void;
}

export const useReaderEngine = ({ book, containerRef, onUpdateProgress }: UseReaderEngineProps) => {
    const activeBookId = book.id;
    const activeBlob = book.epubBlob;

    // React State
    const [status, setStatus] = useState<ReaderStatus>("idle");
    const [error, setError] = useState<ReaderError | null>(null);
    const [position, setPosition] = useState<ReaderPosition>({
        cfi: "", href: "", chapterLabel: "", bookProgress: 0, bookFraction: 0, chapterProgress: 0,
        location: 1, totalLocations: 1
    });
    const [tocItems, setTocItems] = useState<TocItem[]>([]);
    const [selection, setSelection] = useState<ReaderSelection | null>(null);
    const [activeFootnote, setActiveFootnote] = useState<{
        anchorRect: { bottom: number; height: number; left: number; right: number; top: number; width: number } | null;
        footnote: ResolvedFootnote;
    } | null>(null);
    const [activeLightboxImage, setActiveLightboxImage] = useState<LightboxImageTarget | null>(null);

    // Refs
    const sessionRef = useRef<ReaderSession | null>(null);
    const [renditionReady, setRenditionReady] = useState(0);
    const onUpdateProgressRef = useRef(onUpdateProgress);
    const themeControllerRef = useRef(new ReaderThemeController());

    // Settings Selector
    const themeConfig = useSettingsShallow<ReaderThemeConfig>((state) => ({
        bionicReading: state.bionicReading,
        continuous: state.continuous,
        fontPairing: state.fontPairing,
        fontSize: state.fontSize,
        fontWeight: state.fontWeight,
        hyphenation: state.hyphenation,
        letterSpacing: state.letterSpacing,
        lineHeight: state.lineHeight,
        maxTextWidth: state.maxTextWidth,
        pageMargin: state.pageMargin,
        paragraphSpacing: state.paragraphSpacing,
        readerAccent: state.readerAccent,
        readerBackground: state.readerBackground,
        readerForeground: state.readerForeground,
        textAlignment: state.textAlignment,
    }));
    const { readingMode, continuous, spread, direction, writingMode } = useSettingsShallow((state) => ({
        continuous: state.continuous,
        direction: state.direction,
        readingMode: state.readingMode ?? (state.continuous ? "continuous" : "paginated"),
        spread: state.spread,
        writingMode: state.writingMode,
    }));
    const builtFlowRef = useRef({ continuous, direction, readingMode, spread, writingMode });

    useEffect(() => {
        onUpdateProgressRef.current = onUpdateProgress;
    }, [onUpdateProgress]);

    // Theme Application — runs on themeConfig change and when rendition becomes ready
    useEffect(() => {
        if (!sessionRef.current?.rendition) return;
        const styles = themeControllerRef.current.buildStyles(themeConfig);
        // setStyles re-injects the full CSS override (color, font, spacing) into
        // every live iframe document.
        try {
            sessionRef.current.rendition.setStyles(styles, themeConfig.bionicReading);
        } catch { /* benign */ }
        // Sync background color on the host container and every document frame
        sessionRef.current.updateReaderBackground(themeConfig.readerBackground);
    }, [themeConfig, renditionReady]);

    // Auto-sync rendition dimensions when container or window resizes
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleResize = () => {
            sessionRef.current?.rendition?.resize();
        };

        let observer: ResizeObserver | null = null;
        if (typeof ResizeObserver !== "undefined") {
            observer = new ResizeObserver(() => {
                handleResize();
            });
            observer.observe(container);
        }

        window.addEventListener("resize", handleResize);

        return () => {
            if (observer) observer.disconnect();
            window.removeEventListener("resize", handleResize);
        };
    }, [containerRef, renditionReady]);

    // Engine Initialization — only when the book itself (or its bytes) changes.
    // Layout-mode toggles (continuous/spread/direction/writingMode) go through
    // session.setFlow() below, which reuses the parsed book instead of
    // destroying everything and re-parsing the ZIP.
    useEffect(() => {
        let mounted = true;
        const container = containerRef.current;

        if (!activeBlob || !container) {
            setStatus("idle");
            return;
        }

        const isMarkdownOrText = book.format === "markdown" || book.format === "md" || book.format === "txt";
        const effectiveMode = isMarkdownOrText && readingMode === "paginated" ? "continuous" : readingMode;
        const effectiveContinuous = effectiveMode !== "paginated";
        builtFlowRef.current = { continuous: effectiveContinuous, direction, readingMode: effectiveMode, spread, writingMode };
        const styles = themeControllerRef.current.buildStyles(themeConfig);

        sessionRef.current = new ReaderSession({
            bionicReading: themeConfig.bionicReading,
            blob: activeBlob,
            bookId: activeBookId,
            container,
            continuous: effectiveContinuous,
            direction,
            formatHint: book.format,
            initialCfi: book.lastLocation,
            readerBackground: themeConfig.readerBackground,
            readingMode: effectiveMode,
            spread,
            themeStyles: styles,
            writingMode,
        }, {
            onError: (err) => mounted && setError(err),
            onFootnote: (data) => {
                if (!mounted) return;
                setActiveFootnote(data);
            },
            onImageClick: (data) => {
                if (!mounted) return;
                setActiveLightboxImage(data);
            },
            onPositionChange: (pos) => {
                if (!mounted) return;
                setPosition(prev => {
                    const next = { ...prev, ...pos };
                    // Inform app shell
                    if (next.cfi && next.bookProgress !== prev.bookProgress || next.cfi !== prev.cfi) {
                        onUpdateProgressRef.current(activeBookId, next.bookProgress, next.cfi);
                    }
                    return next;
                });
            },
            onSelection: (sel) => mounted && setSelection(sel),
            onStatusChange: (s) => {
                if (!mounted) return;
                setStatus(s);
                if (["restoring-location", "ready", "generating-locations"].includes(s)) {
                    setRenditionReady(n => n + 1);
                }
            },
            onTocReady: (toc) => mounted && setTocItems(toc),
        });

        return () => {
            mounted = false;
            sessionRef.current?.destroy();
            sessionRef.current = null;
        };
        // Re-init only when the book/bytes change. Flow changes are handled
        // by the setFlow effect below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeBookId, activeBlob, containerRef]);

    useEffect(() => {
        if (
            builtFlowRef.current.continuous === continuous &&
            builtFlowRef.current.readingMode === readingMode &&
            builtFlowRef.current.spread === spread &&
            builtFlowRef.current.direction === direction &&
            builtFlowRef.current.writingMode === writingMode
        ) {
            return;
        }
        const timer = window.setTimeout(() => {
            const session = sessionRef.current;
            if (!session?.epubBook) {
                builtFlowRef.current = { continuous, direction, readingMode, spread, writingMode };
                return;
            }
            const styles = themeControllerRef.current.buildStyles(themeConfig);
            const isMarkdownOrText = book.format === "markdown" || book.format === "md" || book.format === "txt";
            const effectiveMode = isMarkdownOrText && readingMode === "paginated" ? "continuous" : readingMode;
            const effectiveContinuous = effectiveMode !== "paginated";
            session.setFlow({
                bionicReading: themeConfig.bionicReading,
                continuous: effectiveContinuous,
                direction,
                readerBackground: themeConfig.readerBackground,
                readingMode: effectiveMode,
                spread,
                themeStyles: styles,
                writingMode,
            }).then(() => {
                builtFlowRef.current = { continuous: effectiveContinuous, direction, readingMode: effectiveMode, spread, writingMode };
            }).catch((err) => console.warn("Flow switch failed:", err));
        }, 150);
        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [continuous, readingMode, spread, direction, writingMode]);

    // Actions
    const nextPage = useCallback(() => {
        sessionRef.current?.next();
    }, []);

    const prevPage = useCallback(() => {
        sessionRef.current?.prev();
    }, []);

    const display = useCallback((target: string) => {
        sessionRef.current?.display(target);
    }, []);

    const scrollBy = useCallback((delta: number) => {
        return sessionRef.current?.scrollBy(delta) ?? 0;
    }, []);

    const clearSelection = useCallback(() => {
        setSelection(null);
        try {
            sessionRef.current?.rendition?.getContents()?.forEach(c => {
                c.window?.getSelection()?.removeAllRanges();
            });
        } catch { /* Ignore */ }
    }, []);

    const closeFootnote = useCallback(() => {
        setActiveFootnote(null);
    }, []);

    const closeLightboxImage = useCallback(() => {
        setActiveLightboxImage(null);
    }, []);

    return {
        // State
        activeFootnote,
        activeLightboxImage,
        status,
        error,
        position,
        tocItems,
        selection,
        
        // Actions
        clearSelection,
        closeFootnote,
        closeLightboxImage,
        display,
        nextPage,
        prevPage,
        scrollBy,

        // Internal Escape Hatch
        _rendition: renditionReady >= 0 ? (sessionRef.current?.rendition ?? null) : null,
        _epubBook: renditionReady >= 0 ? (sessionRef.current?.epubBook ?? null) : null,
    };
};
