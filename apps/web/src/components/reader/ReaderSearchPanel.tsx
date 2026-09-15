import { Search, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import React, { useState, useEffect, useRef, useMemo } from "react";

import type { ReaderSearchState } from "@/types/reader";

import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";

interface ReaderSearchPanelProps {
    isOpen: boolean;
    onClear: () => void;
    onClose: () => void;
    onGoToResult: (index: number) => void;
    onNext: () => void;
    onPrev: () => void;
    onSearch: (query: string) => void;
    searchState: ReaderSearchState;
}

interface SafeHighlightProps {
    query: string;
    text: string;
}

function SafeHighlight({ query, text }: SafeHighlightProps) {
    const parts = useMemo(() => {
        if (!query || query.trim().length === 0) {
            return [<span key="all">{text}</span>];
        }
        // Escape regex special characters to avoid injection
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`(${escaped})`, "gi");
        const segments: React.ReactNode[] = [];
        let lastIndex = 0;
        let match;
        let key = 0;
        const source = text;
        while ((match = regex.exec(source)) !== null) {
            if (match.index > lastIndex) {
                segments.push(<span key={`seg-${key++}`}>{source.slice(lastIndex, match.index)}</span>);
            }
            segments.push(
                <mark key={`mark-${key++}`} className="bg-yellow-200 dark:bg-yellow-900/50 text-inherit rounded-sm px-0.5">
                    {match[0]}
                </mark>
            );
            lastIndex = regex.lastIndex;
            if (match.index === regex.lastIndex) {
                regex.lastIndex++;
            }
        }
        if (lastIndex < source.length) {
            segments.push(<span key={`seg-end-${key++}`}>{source.slice(lastIndex)}</span>);
        }
        return segments.length > 0 ? segments : [<span key="empty" />];
    }, [text, query]);

    return <>{parts}</>;
}

export function ReaderSearchPanel({
    isOpen,
    onClose,
    searchState,
    onSearch,
    onClear,
    onNext,
    onPrev,
    onGoToResult,
}: ReaderSearchPanelProps) {
    const [inputValue, setInputValue] = useState(searchState.query);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsContainerRef = useRef<HTMLDivElement>(null);

    // Sync input with external state
    useEffect(() => {
        setInputValue(searchState.query);
    }, [searchState.query]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Scroll active result into view
    useEffect(() => {
        if (isOpen && searchState.activeIndex >= 0 && resultsContainerRef.current) {
            const activeEl = resultsContainerRef.current.children[searchState.activeIndex] as HTMLElement;
            if (activeEl) {
                activeEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
        }
    }, [isOpen, searchState.activeIndex]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch(inputValue);
    };

    const handleClear = () => {
        setInputValue("");
        onClear();
        inputRef.current?.focus();
    };

    if (!isOpen) return null;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-light-border dark:border-dark-border flex flex-wrap items-center gap-2">
                <form onSubmit={handleSubmit} className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-text-muted dark:text-dark-text-muted" />
                    <Input
                        ref={inputRef}
                        type="text"
                        placeholder="Search book..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="pl-9 pr-8 py-2 bg-light-surface/60 dark:bg-dark-surface/60 border-light-border dark:border-dark-border focus:bg-transparent"
                    />
                    {inputValue && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-light-text-muted hover:text-light-text dark:text-dark-text-muted dark:hover:text-dark-text"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </form>
                <IconButton icon={<X className="w-5 h-5" />} label="Close search" onClick={onClose} variant="ghost" />
            </div>

            {/* Results Navigation (if we have results) */}
            {searchState.results.length > 0 && (
                <div className="px-4 py-2 bg-light-surface/60 dark:bg-dark-surface/60 border-b border-light-border dark:border-dark-border flex items-center justify-between text-xs text-light-text-muted dark:text-dark-text-muted">
                    <span>
                        {searchState.activeIndex + 1} of {searchState.results.length} matches
                    </span>
                    <div className="flex flex-wrap items-center gap-1">
                        <button type="button" aria-label="Previous match" onClick={onPrev} className="p-1 hover:bg-light-border/40 dark:hover:bg-dark-border/40 rounded">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button type="button" aria-label="Next match" onClick={onNext} className="p-1 hover:bg-light-border/40 dark:hover:bg-dark-border/40 rounded">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden" ref={resultsContainerRef}>
                {searchState.isSearching ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-3 text-light-text-muted dark:text-dark-text-muted">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="text-sm">Searching...</span>
                    </div>
                ) : searchState.error ? (
                    <div className="p-6 text-center text-sm text-light-text-muted dark:text-dark-text-muted">
                        {searchState.error}
                    </div>
                ) : searchState.results.length > 0 ? (
                    <div className="flex flex-col">
                        {searchState.results.map((result, index) => {
                            const isActive = index === searchState.activeIndex;
                            return (
                                <button
                                    key={result.id}
                                    onClick={() => onGoToResult(index)}
                                    className={`text-left p-4 border-b border-light-border/60 dark:border-dark-border/60 transition-colors ${
                                        isActive
                                            ? "bg-light-accent/10 dark:bg-dark-accent/10 border-l-2 border-l-light-accent dark:border-l-dark-accent"
                                            : "hover:bg-light-surface/60 dark:hover:bg-dark-surface/60 border-l-2 border-l-transparent"
                                    }`}
                                >
                                    <div className="text-xs font-medium text-light-accent dark:text-dark-accent mb-1 truncate">
                                        {result.chapterLabel}
                                    </div>
                                    <div className="text-sm text-light-text dark:text-dark-text line-clamp-3 leading-relaxed">
                                        <SafeHighlight text={result.excerpt} query={searchState.query} />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ) : searchState.query ? (
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-fadeIn">
                        <div className="w-14 h-14 mb-4 rounded-2xl bg-light-surface/60 dark:bg-dark-surface/60 flex items-center justify-center border border-light-border dark:border-dark-border">
                            <Search className="w-6 h-6 text-light-text-muted dark:text-dark-text-muted" strokeWidth={1.5} />
                        </div>
                        <p className="text-light-text dark:text-dark-text font-medium">No matches found</p>
                        <p className="mt-1 text-sm text-light-text-muted dark:text-dark-text-muted">Try a different search term.</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-fadeIn">
                        <div className="w-14 h-14 mb-4 rounded-2xl bg-light-surface/60 dark:bg-dark-surface/60 flex items-center justify-center border border-light-border dark:border-dark-border">
                            <Search className="w-6 h-6 text-light-text-muted dark:text-dark-text-muted" strokeWidth={1.5} />
                        </div>
                        <p className="text-light-text dark:text-dark-text font-medium">Search your book</p>
                        <p className="mt-1 text-sm text-light-text-muted dark:text-dark-text-muted">Enter a term to search the entire book.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
