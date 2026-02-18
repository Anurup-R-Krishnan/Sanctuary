import { useState, useEffect, useRef, useCallback } from "react";
import type { RefObject } from "react";
import type { Book } from "@/types";
import { useSettings } from "@/context/SettingsContext";

interface UseReaderEngineProps {
    book: Book;
    containerRef: RefObject<HTMLDivElement | null>;
    onUpdateProgress: (id: string, progress: number, location: string) => void;
}

export const useReaderEngine = ({ book, containerRef, onUpdateProgress }: UseReaderEngineProps) => {
    const [isReady, setIsReady] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [currentCfi, setCurrentCfi] = useState<string>("");
    const [totalPages, setTotalPages] = useState(book.totalPages || 100);
    const [currentPage, setCurrentPage] = useState(book.progress || 1);
    const [tocItems, setTocItems] = useState<any[]>([]);
    const chapterTitle = "";

    const renditionRef = useRef<any>(null);
    const bookRef = useRef<any>(null);

    const {
        fontSize, lineHeight, fontPairing, textAlignment, maxTextWidth, hyphenation,
        pageMargin, paragraphSpacing, readerForeground, readerBackground,
        continuous, spread, brightness, grayscale, reduceMotion
    } = useSettings();

    // Initialize ePub
    useEffect(() => {
        let mounted = true;

        const init = async () => {
            try {
                if (!book || !book.epubBlob) return;

                setIsLoading(true);
                const ePub = (await import("epubjs")).default;

                if (!containerRef.current || !mounted) return;

                const arrayBuffer = await book.epubBlob.arrayBuffer();
                bookRef.current = ePub(arrayBuffer);

                // Extract TOC
                const navigation = await bookRef.current.loaded.navigation;
                if (navigation?.toc) {
                    setTocItems(navigation.toc);
                }

                // Create rendition
                renditionRef.current = bookRef.current.renderTo(containerRef.current, {
                    width: "100%",
                    height: continuous ? "auto" : "100%",
                    spread: continuous ? "none" : (spread ? "always" : "none"),
                    flow: continuous ? "scrolled-doc" : "paginated",
                });

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

                    if (bookRef.current?.locations?.length()) {
                        const percent = bookRef.current.locations.percentageFromCfi(cfi);
                        const generatedPages = Math.max(1, bookRef.current.locations.length());
                        const page = Math.max(1, Math.ceil(percent * generatedPages));
                        setCurrentPage(page);
                        onUpdateProgress(book.id, page, cfi);
                    }
                });

                // Generate locations
                bookRef.current.locations.generate(1024).then(() => {
                    if (mounted) {
                        setTotalPages(Math.max(1, bookRef.current.locations.length()));
                    }
                }).catch((err: any) => console.warn("Location generation failed:", err));

                setIsLoading(false);
                setIsReady(true);
            } catch (err) {
                console.error("Init error:", err);
                if (mounted) setIsLoading(false);
            }
        };

        init();

        return () => {
            mounted = false;
            if (renditionRef.current) renditionRef.current.destroy();
            if (bookRef.current) bookRef.current.destroy();
        };
    }, [book, continuous, spread, containerRef, onUpdateProgress]);

    // Navigation methods
    const nextPage = useCallback(() => {
        if (!renditionRef.current) return;
        if (continuous && containerRef.current) {
            const container = containerRef.current;
            const { scrollTop, scrollHeight, clientHeight } = container;
            if (scrollTop + clientHeight >= scrollHeight - 50) {
                renditionRef.current.next();
                setTimeout(() => container.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' } as any), 100);
            } else {
                container.scrollBy({ top: window.innerHeight * 0.8, behavior: reduceMotion ? 'auto' : 'smooth' });
            }
        } else {
            renditionRef.current.next();
        }
    }, [continuous, reduceMotion, containerRef]);

    const prevPage = useCallback(() => {
        if (!renditionRef.current) return;
        if (continuous && containerRef.current) {
            const container = containerRef.current;
            if (container.scrollTop <= 0) {
                renditionRef.current.prev();
            } else {
                container.scrollBy({ top: -window.innerHeight * 0.8, behavior: reduceMotion ? 'auto' : 'smooth' });
            }
        } else {
            renditionRef.current.prev();
        }
    }, [continuous, reduceMotion, containerRef]);

    const display = useCallback((target: string) => {
        if (renditionRef.current) renditionRef.current.display(target);
    }, []);

    const goToPage = useCallback((page: number) => {
        if (!bookRef.current || !renditionRef.current) return;
        const percentage = (page - 1) / totalPages;
        const cfi = bookRef.current.locations.cfiFromPercentage(percentage);
        if (cfi) renditionRef.current.display(cfi);
    }, [totalPages]);

    // Helper to flatten TOC
    const flattenToc = useCallback((items: any[]) => {
        return items.reduce((acc: any[], item: any) => {
            acc.push(item);
            if (item.subitems) {
                acc.push(...flattenToc(item.subitems));
            }
            return acc;
        }, []);
    }, []);

    const prevChapter = useCallback(() => {
        if (!renditionRef.current || !tocItems.length) return;
        const flat = flattenToc(tocItems);
        const currentIndex = flat.findIndex((item: any) => item.label.trim() === chapterTitle.trim());
        if (currentIndex > 0) {
            renditionRef.current.display(flat[currentIndex - 1].href);
        }
    }, [tocItems, chapterTitle, flattenToc]);

    const nextChapter = useCallback(() => {
        if (!renditionRef.current || !tocItems.length) return;
        const flat = flattenToc(tocItems);
        const currentIndex = flat.findIndex((item: any) => item.label.trim() === chapterTitle.trim());
        if (currentIndex !== -1 && currentIndex < flat.length - 1) {
            renditionRef.current.display(flat[currentIndex + 1].href);
        }
    }, [tocItems, chapterTitle, flattenToc]);


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

        const fontFamily = getFontFamily();

        renditionRef.current.themes.default({
            "body": {
                "font-family": `${fontFamily} !important`,
                "font-size": `${fontSize}px !important`,
                "line-height": `${lineHeight} !important`,
                "color": `${readerForeground} !important`,
                "background-color": `${readerBackground} !important`,
                "filter": `brightness(${brightness}%) grayscale(${grayscale ? 1 : 0}) !important`,
                "padding-top": `${pageMargin}px !important`,
                "padding-bottom": `${pageMargin}px !important`,
                "padding-left": `${continuous ? pageMargin : 0}px !important`,
                "padding-right": `${continuous ? pageMargin : 0}px !important`,
                ...(continuous ? {
                    "max-width": `${maxTextWidth}ch !important`,
                    "margin": "0 auto !important",
                    "padding-bottom": "2em !important",
                } : {
                    "max-width": "none !important",
                    "margin": "0 !important",
                    "padding-bottom": "2em !important",
                }),
            },
            "p": {
                "font-family": "inherit !important",
                "font-size": "inherit !important",
                "line-height": "inherit !important",
                "color": "inherit !important",
                "margin-bottom": `${paragraphSpacing}px !important`,
                "text-align": `${textAlignment} !important`,
                "hyphens": hyphenation ? "auto !important" : "none !important",
            },
        });
    }, [fontSize, lineHeight, textAlignment, readerForeground, readerBackground, pageMargin, maxTextWidth, hyphenation, paragraphSpacing, getFontFamily, continuous, grayscale, brightness]);

    // Apply styles when settings change
    useEffect(() => {
        applyStyles();
    }, [applyStyles]);

    // Re-render on layout change (continuous/spread)
    useEffect(() => {
        if (!isReady || !renditionRef.current || !bookRef.current || !containerRef.current) return;

        const reload = async () => {
            // Destroy current rendition
            renditionRef.current.destroy();

            // Re-render
            renditionRef.current = bookRef.current.renderTo(containerRef.current, {
                width: "100%",
                height: continuous ? "auto" : "100%",
                spread: continuous ? "none" : (spread ? "always" : "none"),
                flow: continuous ? "scrolled-doc" : "paginated",
            });

            await renditionRef.current.display(currentCfi || undefined);
            applyStyles();

            // Re-attach listeners
            renditionRef.current.on("relocated", (location: any) => {
                setCurrentCfi(location.start.cfi);
                // Update progress logic here...
            });
        };

        reload();
    }, [continuous, spread, isReady, containerRef, currentCfi, applyStyles, book.id, onUpdateProgress]);

    return {
        isReady,
        isLoading,
        currentCfi,
        totalPages,
        currentPage,
        tocItems,
        chapterTitle,
        renditionRef,
        bookRef,
        nextPage,
        prevPage,
        display,
        goToPage,
        nextChapter,
        prevChapter
    };
};
