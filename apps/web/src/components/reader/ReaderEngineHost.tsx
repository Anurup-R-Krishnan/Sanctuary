import React, { useRef, useImperativeHandle, forwardRef, memo } from "react";

import type { Book } from "@/types";
import type { ReaderStatus, ReaderError, ReaderPosition, ReaderSelection } from "@/types/reader";
import type { TocItem, EpubRendition, EpubBookHandle } from "@/utils/epub";

import { useReaderEngine } from "@/hooks/useReaderEngine";
import { useSettings } from "@/store/useSettingsStore";
import { cx } from "@/utils/cx";

const ReaderFootnotePopover = React.lazy(() =>
  import("@/components/reader/ReaderFootnotePopover").then((m) => ({
    default: m.ReaderFootnotePopover,
  }))
);

const ReaderImageLightbox = React.lazy(() =>
  import("@/components/reader/ReaderImageLightbox").then((m) => ({
    default: m.ReaderImageLightbox,
  }))
);

export interface ReaderEngineRef {
    clearSelection: () => void;
    display: (target: string) => void;
    epubBook: EpubBookHandle | null;
    nextPage: () => void;
    prevPage: () => void;
    rendition: EpubRendition | null;
    scrollBy: (delta: number) => number;
}

interface ReaderEngineHostProps {
    book?: Book;
    onEngineStateChange: (state: {
        error: ReaderError | null;
        position: ReaderPosition;
        selection: ReaderSelection | null;
        status: ReaderStatus;
        tocItems: TocItem[];
    }) => void;
    onUpdateProgress: (id: string, progress: number, location: string) => void;
}

export const ReaderEngineHost = memo(forwardRef<ReaderEngineRef, ReaderEngineHostProps>(({
    book,
    onEngineStateChange,
    onUpdateProgress,
}, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const showScrollbar = useSettings((state) => state.showScrollbar);
    
    const {
        activeFootnote,
        activeLightboxImage,
        clearSelection,
        closeFootnote,
        closeLightboxImage,
        display,
        error,
        nextPage,
        position,
        prevPage,
        scrollBy,
        selection,
        status,
        tocItems,
        _epubBook,
        _rendition,
    } = useReaderEngine({ book, containerRef, onUpdateProgress });

    useImperativeHandle(ref, () => ({
        clearSelection,
        display,
        epubBook: _epubBook,
        nextPage,
        prevPage,
        rendition: _rendition,
        scrollBy,
    }), [nextPage, prevPage, display, clearSelection, _rendition, _epubBook, scrollBy]);

    // Sync engine state up to the UI shell.
    React.useEffect(() => {
        onEngineStateChange({
            error,
            position,
            selection,
            status,
            tocItems,
        });
    }, [status, error, position, tocItems, selection, onEngineStateChange]);

    return (
        <>
            <div ref={containerRef} className={cx("absolute inset-0 overflow-auto", !showScrollbar && "scrollbar-hide")} />
            {activeFootnote && (
                <React.Suspense fallback={null}>
                    <ReaderFootnotePopover
                        anchorRect={activeFootnote.anchorRect}
                        footnote={activeFootnote.footnote}
                        onClose={closeFootnote}
                        onNavigate={(href) => {
                            closeFootnote();
                            display(href);
                        }}
                    />
                </React.Suspense>
            )}
            {activeLightboxImage && (
                <React.Suspense fallback={null}>
                    <ReaderImageLightbox
                        image={activeLightboxImage}
                        onClose={closeLightboxImage}
                    />
                </React.Suspense>
            )}
        </>
    );
}));

ReaderEngineHost.displayName = "ReaderEngineHost";
