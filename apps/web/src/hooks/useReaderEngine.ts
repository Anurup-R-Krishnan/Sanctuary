import type { RefObject } from "react";

import { useState, useEffect, useRef, useCallback } from "react";

import type { Book } from "@/types";
import type { ReaderStatus, ReaderError, ReaderPosition, ReaderSelection } from "@/types/reader";
import type { TocItem } from "@/utils/epub";

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

    // Refs
    const sessionRef = useRef<ReaderSession | null>(null);
    const [renditionReady, setRenditionReady] = useState(0);
    const onUpdateProgressRef = useRef(onUpdateProgress);
    const themeControllerRef = useRef(new ReaderThemeController());

    // Settings Selector
    const themeConfig = useSettingsShallow<ReaderThemeConfig>((state) => ({
        fontSize: state.fontSize,
        lineHeight: state.lineHeight,
        fontPairing: state.fontPairing,
        textAlignment: state.textAlignment,
        hyphenation: state.hyphenation,
        readerForeground: state.readerForeground,
        readerBackground: state.readerBackground,
        continuous: state.continuous,
        pageMargin: state.pageMargin,
        paragraphSpacing: state.paragraphSpacing,
        maxTextWidth: state.maxTextWidth,
    }));
    const { continuous, spread, direction } = useSettingsShallow((state) => ({
        continuous: state.continuous,
        spread: state.spread,
        direction: state.direction,
    }));

    useEffect(() => {
        onUpdateProgressRef.current = onUpdateProgress;
    }, [onUpdateProgress]);

    // Theme Application
    useEffect(() => {
        if (!sessionRef.current?.rendition) return;
        const styles = themeControllerRef.current.buildStyles(themeConfig);
        try {
            sessionRef.current.rendition.themes.default(styles);
        } catch { /* benign */ }
    }, [themeConfig]);

    // Engine Initialization
    useEffect(() => {
        let mounted = true;
        const container = containerRef.current;

        if (!activeBlob || !container) {
            setStatus("idle");
            return;
        }

        const styles = themeControllerRef.current.buildStyles(themeConfig);
        
        sessionRef.current = new ReaderSession({
            bookId: activeBookId,
            blob: activeBlob,
            container,
            initialCfi: book.lastLocation,
            continuous,
            spread,
            direction,
            themeStyles: styles
        }, {
            onStatusChange: (s) => {
                if (!mounted) return;
                setStatus(s);
                if (["restoring-location", "ready", "generating-locations"].includes(s)) {
                    setRenditionReady(n => n + 1);
                }
            },
            onError: (err) => mounted && setError(err),
            onTocReady: (toc) => mounted && setTocItems(toc),
            onSelection: (sel) => mounted && setSelection(sel),
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
            }
        });

        return () => {
            mounted = false;
            sessionRef.current?.destroy();
            sessionRef.current = null;
        };
        // Re-init only when the book changes, or structural flow changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeBookId, activeBlob, containerRef, continuous, spread, direction]);

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
        if (!sessionRef.current?.epubBook) return;
        const total = sessionRef.current.totalLocations;
        const percentage = (Math.max(1, Math.min(page, total)) - 1) / total;
        const cfi = sessionRef.current.epubBook.locations.cfiFromPercentage(percentage);
        if (cfi) sessionRef.current.display(cfi);
    }, []);

    const clearSelection = useCallback(() => {
        setSelection(null);
        try {
            sessionRef.current?.rendition?.getContents()?.forEach(c => {
                c.window?.getSelection()?.removeAllRanges();
            });
        } catch { /* Ignore */ }
    }, []);

    return {
        // State
        status,
        error,
        position,
        tocItems,
        selection,
        
        // Actions
        nextPage,
        prevPage,
        display,
        goToPage,
        clearSelection,

        // Internal Escape Hatch
        _rendition: renditionReady >= 0 ? (sessionRef.current?.rendition ?? null) : null,
        _epubBook: renditionReady >= 0 ? (sessionRef.current?.epubBook ?? null) : null,
    };
};
