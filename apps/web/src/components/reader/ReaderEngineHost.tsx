import React, { useRef, useImperativeHandle, useEffect, forwardRef, memo } from "react";

import type { Book } from "@/types";
import type { TocItem } from "@/utils/epub";

import { useReaderEngine } from "@/hooks/useReaderEngine";

export interface ReaderEngineState {
    isLoading: boolean;
    currentCfi: string;
    totalPages: number;
    currentPage: number;
    tocItems: TocItem[];
}

export interface ReaderEngineRef {
    nextPage: () => void;
    prevPage: () => void;
    display: (target: string) => void;
    goToPage: (page: number) => void;
}

interface ReaderEngineHostProps {
    book: Book;
    onUpdateProgress: (id: string, progress: number, location: string) => void;
    onEngineStateChange: (state: ReaderEngineState) => void;
}

export const ReaderEngineHost = memo(forwardRef<ReaderEngineRef, ReaderEngineHostProps>(({
    book,
    onUpdateProgress,
    onEngineStateChange,
}, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    
    const {
        isLoading,
        currentCfi,
        totalPages,
        currentPage,
        tocItems,
        nextPage,
        prevPage,
        display,
        goToPage,
    } = useReaderEngine({ book, containerRef, onUpdateProgress });

    useImperativeHandle(ref, () => ({
        nextPage,
        prevPage,
        display,
        goToPage,
    }), [nextPage, prevPage, display, goToPage]);

    // Sync engine state up to the UI shell
    useEffect(() => {
        onEngineStateChange({
            isLoading,
            currentCfi,
            totalPages,
            currentPage,
            tocItems,
        });
    }, [isLoading, currentCfi, totalPages, currentPage, tocItems, onEngineStateChange]);

    return <div ref={containerRef} className="absolute inset-0 overflow-auto" />;
}));

ReaderEngineHost.displayName = "ReaderEngineHost";
