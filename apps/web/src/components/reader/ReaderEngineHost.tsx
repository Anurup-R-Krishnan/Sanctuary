import React, { useRef, useImperativeHandle, forwardRef, memo } from "react";

import type { Book } from "@/types";
import type { ReaderStatus, ReaderError, ReaderPosition, ReaderSelection } from "@/types/reader";
import type { TocItem, EpubRendition, EpubBookHandle } from "@/utils/epub";

import { useReaderEngine } from "@/hooks/useReaderEngine";
import { useSettings } from "@/store/useSettingsStore";
import { cx } from "@/utils/cx";

export interface ReaderEngineRef {
    clearSelection: () => void;
    display: (target: string) => void;
    epubBook: EpubBookHandle | null;
    goToPage: (page: number) => void;
    nextPage: () => void;
    prevPage: () => void;
    rendition: EpubRendition | null;
}

interface ReaderEngineHostProps {
    book?: Book;
    onEngineStateChange: (state: {
        status: ReaderStatus;
        error: ReaderError | null;
        position: ReaderPosition;
        tocItems: TocItem[];
        selection: ReaderSelection | null;
    }) => void;
    onUpdateProgress: (id: string, progress: number, location: string) => void;
}

export const ReaderEngineHost = memo(forwardRef<ReaderEngineRef, ReaderEngineHostProps>(({
    book,
    onUpdateProgress,
    onEngineStateChange,
}, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const showScrollbar = useSettings((state) => state.showScrollbar);
    
    const {
        status,
        error,
        position,
        tocItems,
        selection,
        nextPage,
        prevPage,
        display,
        goToPage,
        clearSelection,
        _rendition,
        _epubBook,
    } = useReaderEngine({ book, containerRef, onUpdateProgress });

    useImperativeHandle(ref, () => ({
        nextPage,
        prevPage,
        display,
        goToPage,
        clearSelection,
        rendition: _rendition,
        epubBook: _epubBook,
    }), [nextPage, prevPage, display, goToPage, clearSelection, _rendition, _epubBook]);

    // Sync engine state up to the UI shell.
    // We use a layout effect equivalent pattern by calling it during render
    // or using a highly responsive effect to prevent tearing.
    // To avoid React warnings about updating during render, we use an effect.
    React.useEffect(() => {
        onEngineStateChange({
            status,
            error,
            position,
            tocItems,
            selection,
        });
    }, [status, error, position, tocItems, selection, onEngineStateChange]);

    return <div ref={containerRef} className={cx("absolute inset-0 overflow-auto", !showScrollbar && "scrollbar-hide")} />;
}));

ReaderEngineHost.displayName = "ReaderEngineHost";
