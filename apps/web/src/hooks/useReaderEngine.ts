import type { RefObject } from "react";

import { useState, useEffect, useRef, useCallback } from "react";

import type { Book } from "@/types";
import type { ReaderStatus, ReaderError, ReaderPosition, ReaderSelection } from "@/types/reader";
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
        cfi: "", href: "", chapterLabel: "", bookProgress: 0, chapterProgress: 0,
        location: 1, totalLocations: 1, displayedPage: 1, displayedPages: 1
    });
    const [tocItems, setTocItems] = useState<TocItem[]>([]);
    const [selection, setSelection] = useState<ReaderSelection | null>(null);
    const [activeFootnote, setActiveFootnote] = useState<{
        anchorRect: { bottom: number; height: number; left: number; right: number; top: number; width: number } | null;
        footnote: ResolvedFootnote;
    } | null>(null);

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
        hyphenation: state.hyphenation,
        letterSpacing: state.letterSpacing,
        lineHeight: state.lineHeight,
        maxTextWidth: state.maxTextWidth,
        pageMargin: state.pageMargin,
        paragraphSpacing: state.paragraphSpacing,
        readerBackground: state.readerBackground,
        readerForeground: state.readerForeground,
        textAlignment: state.textAlignment,
    }));
    const { continuous, spread, direction, writingMode } = useSettingsShallow((state) => ({
        continuous: state.continuous,
        direction: state.direction,
        spread: state.spread,
        writingMode: state.writingMode,
    }));
    const builtFlowRef = useRef({ continuous, direction, spread, writingMode });

    useEffect(() => {
        onUpdateProgressRef.current = onUpdateProgress;
    }, [onUpdateProgress]);

    // Theme Application
    useEffect(() => {
        if (!sessionRef.current?.rendition) return;
        const styles = themeControllerRef.current.buildStyles(themeConfig);
        try {
            sessionRef.current.rendition.themes.default(styles, themeConfig.bionicReading);
        } catch { /* benign */ }
        // Also update iframe/container background to prevent flash on next page turn
        sessionRef.current.updateReaderBackground(themeConfig.readerBackground);
    }, [themeConfig]);

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

        const styles = themeControllerRef.current.buildStyles(themeConfig);
        builtFlowRef.current = { continuous, direction, spread, writingMode };

        sessionRef.current = new ReaderSession({
            bionicReading: themeConfig.bionicReading,
            blob: activeBlob,
            bookId: activeBookId,
            container,
            continuous,
            direction,
            initialCfi: book.lastLocation,
            readerBackground: themeConfig.readerBackground,
            spread,
            themeStyles: styles,
            writingMode,
        }, {
            onError: (err) => mounted && setError(err),
            onFootnote: (data) => {
                if (!mounted) return;
                setActiveFootnote(data);
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

    // Fast layout-mode switch: reuse the parsed book, only rebuild the view.
    // Debounced so rapid toggling collapses into a single re-render.
    useEffect(() => {
        if (
            builtFlowRef.current.continuous === continuous &&
            builtFlowRef.current.spread === spread &&
            builtFlowRef.current.direction === direction &&
            builtFlowRef.current.writingMode === writingMode
        ) {
            return;
        }
        const timer = window.setTimeout(() => {
            const session = sessionRef.current;
            if (!session?.epubBook) {
                // Book hasn't finished parsing yet; the creation effect
                // already used the latest values, so just record them.
                builtFlowRef.current = { continuous, direction, spread, writingMode };
                return;
            }
            const styles = themeControllerRef.current.buildStyles(themeConfig);
            session.setFlow({
                bionicReading: themeConfig.bionicReading,
                continuous,
                direction,
                readerBackground: themeConfig.readerBackground,
                spread,
                themeStyles: styles,
                writingMode,
            }).then(() => {
                builtFlowRef.current = { continuous, direction, spread, writingMode };
            }).catch((err) => console.warn("Flow switch failed:", err));
        }, 150);
        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [continuous, spread, direction, writingMode]);

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

    const goToPage = useCallback((page: number) => {
        if (!sessionRef.current) return;
        if (typeof sessionRef.current.goToPage === "function") {
            sessionRef.current.goToPage(page);
            return;
        }
        if (!sessionRef.current.epubBook) return;
        const total = sessionRef.current.totalLocations;
        
        // Prevent crashes if locations aren't generated yet or total is invalid
        if (total <= 1 || !sessionRef.current.epubBook.locations.length()) {
             return;
        }

        const percentage = (Math.max(1, Math.min(page, total)) - 1) / total;
        try {
            const cfi = sessionRef.current.epubBook.locations.cfiFromPercentage(percentage);
            if (cfi) sessionRef.current.display(cfi);
        } catch {
            // Ignore cfi bounds errors
        }
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

    return {
        // State
        activeFootnote,
        status,
        error,
        position,
        tocItems,
        selection,
        
        // Actions
        clearSelection,
        closeFootnote,
        display,
        goToPage,
        nextPage,
        prevPage,

        // Internal Escape Hatch
        _rendition: renditionReady >= 0 ? (sessionRef.current?.rendition ?? null) : null,
        _epubBook: renditionReady >= 0 ? (sessionRef.current?.epubBook ?? null) : null,
    };
};
