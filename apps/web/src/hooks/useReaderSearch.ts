import { useState, useCallback, useRef, useEffect } from "react";

import type { ReaderSearchState, ReaderSearchResult } from "@/types/reader";
import type { EpubBookHandle, EpubSpineSection } from "@/utils/epub";

interface UseReaderSearchProps {
    display: (cfi: string) => void;
    epubBook: EpubBookHandle | null;
}

export const useReaderSearch = ({ epubBook, display }: UseReaderSearchProps) => {
    const [searchState, setSearchState] = useState<ReaderSearchState>({
        query: "",
        results: [],
        activeIndex: -1,
        isSearching: false,
        error: null,
    });

    const activeQueryRef = useRef<string>("");
    const spineCacheRef = useRef<Map<string, string>>(new Map());

    useEffect(() => {
        const currentCache = spineCacheRef.current;
        return () => {
            currentCache.clear();
        };
    }, [epubBook]);

    const performSearch = useCallback(async (query: string) => {
        const trimmed = query.trim();
        if (!trimmed) {
            setSearchState({ query: "", results: [], activeIndex: -1, isSearching: false, error: null });
            activeQueryRef.current = "";
            return;
        }

        if (!epubBook || (!epubBook.spine && typeof (epubBook as unknown as { search?: unknown }).search !== "function")) {
            setSearchState(s => ({ ...s, error: "Search is not supported in this book." }));
            return;
        }

        activeQueryRef.current = trimmed;
        setSearchState(s => ({ ...s, query: trimmed, results: [], activeIndex: -1, isSearching: true, error: null }));

        const candidate = epubBook as unknown as { search?: (q: string) => Promise<ReaderSearchResult[]> };
        if (typeof candidate.search === "function") {
            try {
                const results = await candidate.search(trimmed);
                if (activeQueryRef.current === trimmed) {
                    setSearchState({
                        activeIndex: results.length > 0 ? 0 : -1,
                        error: results.length === 0 ? "No matches found." : null,
                        isSearching: false,
                        query: trimmed,
                        results,
                    });
                }
            } catch {
                if (activeQueryRef.current === trimmed) {
                    setSearchState(s => ({ ...s, error: "An error occurred while searching.", isSearching: false }));
                }
            }
            return;
        }

        const results: ReaderSearchResult[] = [];
        const searchAborted = false;

        const processSection = async (section: EpubSpineSection) => {
            if (searchAborted || activeQueryRef.current !== trimmed) return;
            try {
                if (section.load) {
                    await section.load(epubBook.load);
                }
                
                if (searchAborted || activeQueryRef.current !== trimmed) return;
                
                if (section.find) {
                    const matches = section.find(trimmed);
                    if (matches && matches.length > 0) {
                        const href = section.href || "";
                        
                        // Grab chapter title from TOC if possible, otherwise use href
                        let chapterLabel = "Unknown Chapter";
                        if (epubBook.navigation?.get) {
                            const tocItem = epubBook.navigation.get(href);
                            if (tocItem && tocItem.label) {
                                chapterLabel = tocItem.label.trim();
                            }
                        }

                        matches.forEach((match, index) => {
                            if (match.cfi) {
                                results.push({
                                    id: `${href}-${index}`,
                                    cfi: match.cfi,
                                    excerpt: match.excerpt || "",
                                    href,
                                    chapterLabel
                                });
                            }
                        });
                    }
                }
            } catch (err) {
                console.warn(`Failed to search section ${section.href}:`, err);
            } finally {
                if (section.unload) {
                    section.unload();
                }
            }
        };

        try {
            const promises: Promise<void>[] = [];
            epubBook.spine.each((section) => {
                promises.push(processSection(section));
            });
            await Promise.all(promises);

            if (activeQueryRef.current === trimmed) {
                setSearchState({
                    query: trimmed,
                    results,
                    activeIndex: results.length > 0 ? 0 : -1,
                    isSearching: false,
                    error: results.length === 0 ? "No matches found." : null,
                });
            }
        } catch {
            if (activeQueryRef.current === trimmed) {
                setSearchState(s => ({ ...s, isSearching: false, error: "An error occurred while searching." }));
            }
        }
    }, [epubBook]);

    const clearSearch = useCallback(() => {
        activeQueryRef.current = "";
        try {
            const candidate = epubBook as unknown as { clearSearch?: () => void };
            if (typeof candidate?.clearSearch === "function") {
                candidate.clearSearch();
            }
        } catch {
            // benign
        }
        setSearchState({ query: "", results: [], activeIndex: -1, isSearching: false, error: null });
    }, [epubBook]);

    const goToResult = useCallback((index: number) => {
        setSearchState(s => {
            if (s.results.length === 0 || index < 0 || index >= s.results.length) return s;
            const result = s.results[index];
            display(result.cfi);
            return { ...s, activeIndex: index };
        });
    }, [display]);

    const nextResult = useCallback(() => {
        setSearchState(s => {
            if (s.results.length === 0) return s;
            const nextIndex = (s.activeIndex + 1) % s.results.length;
            const result = s.results[nextIndex];
            display(result.cfi);
            return { ...s, activeIndex: nextIndex };
        });
    }, [display]);

    const prevResult = useCallback(() => {
        setSearchState(s => {
            if (s.results.length === 0) return s;
            const prevIndex = (s.activeIndex - 1 + s.results.length) % s.results.length;
            const result = s.results[prevIndex];
            display(result.cfi);
            return { ...s, activeIndex: prevIndex };
        });
    }, [display]);

    return {
        searchState,
        performSearch,
        clearSearch,
        goToResult,
        nextResult,
        prevResult
    };
};
