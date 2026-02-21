import { useState, useEffect, useRef, useCallback } from "react";
import type { RefObject } from "react";
import type { Book } from "@/types";
import { useSettingsShallow } from "@/context/SettingsContext";

interface UseReaderEngineProps {
    book: Book;
    containerRef: RefObject<HTMLDivElement | null>;
    onUpdateProgress: (id: string, progress: number, location: string) => void;
}

type TocItem = {
    id?: string;
    href: string;
    label: string;
    subitems?: TocItem[];
};

type EpubLocation = {
    start: {
        cfi: string;
    };
};

type EpubNavigation = {
    toc?: TocItem[];
};

type EpubLocations = {
    generate: (chars: number) => Promise<void>;
    length: () => number;
    percentageFromCfi: (cfi: string) => number;
    cfiFromPercentage: (percentage: number) => string | undefined;
};

type EpubRendition = {
    display: (target?: string) => Promise<void> | void;
    next: () => void;
    prev: () => void;
    on: (event: "relocated", cb: (location: EpubLocation) => void) => void;
    destroy: () => void;
    themes: {
        default: (styles: Record<string, Record<string, string>>) => void;
    };
    hooks?: {
        content?: {
            register: (cb: (contents: { document: Document }) => void) => void;
        };
    };
};

type EpubBookHandle = {
    loaded: {
        navigation: Promise<EpubNavigation>;
    };
    renderTo: (container: HTMLDivElement, options: Record<string, unknown>) => EpubRendition;
    locations: EpubLocations;
    destroy: () => void;
};

const READER_THEME = {
    textWidthCh: 96,
    pageMarginPx: 28,
    paragraphSpacingPx: 14,
} as const;

const FONT_FAMILY_BY_PAIRING: Record<string, string> = {
    "merriweather-georgia": "'Merriweather', Georgia, serif",
    "crimson-pro": "'Crimson Pro', Georgia, serif",
    "libre-baskerville": "'Libre Baskerville', Georgia, serif",
    "lora": "'Lora', Georgia, serif",
    "source-serif": "'Source Serif Pro', Georgia, serif",
    "inter": "'Inter', system-ui, sans-serif",
};

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

    const {
        fontSize, lineHeight, fontPairing, textAlignment, hyphenation,
        readerForeground, readerBackground,
        continuous, spread, reduceMotion, pageMargin, paragraphSpacing, maxTextWidth
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
        maxTextWidth: state.maxTextWidth,
    }));

    useEffect(() => {
        onUpdateProgressRef.current = onUpdateProgress;
    }, [onUpdateProgress]);

    useEffect(() => {
        startLocationRef.current = book.lastLocation;
    }, [book.id, book.lastLocation]);

    // Initialize ePub
    useEffect(() => {
        let mounted = true;
        const startLocation = startLocationRef.current;

        const init = async () => {
            try {
                if (!activeBlob) {
                    setIsLoading(false);
                    return;
                }

                setIsLoading(true);
                const ePub = (await import("epubjs")).default;

                if (!containerRef.current || !mounted) return;

                const arrayBuffer = await activeBlob.arrayBuffer();
                bookRef.current = ePub(arrayBuffer) as unknown as EpubBookHandle;

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

                // Some EPUBs incorrectly mark CSS/font assets with invalid MIME types.
                // Remove blob-linked stylesheet tags and rely on our controlled theme styles.
                renditionRef.current.hooks?.content?.register((contents) => {
                    const links = contents.document.querySelectorAll("link[rel='stylesheet'][href^='blob:']");
                    links.forEach((link) => link.remove());
                });

                // Display book
                if (startLocation) {
                    await renditionRef.current.display(startLocation);
                } else {
                    await renditionRef.current.display();
                }

                // Handle location changes
                renditionRef.current.on("relocated", (location: EpubLocation) => {
                    if (!mounted) return;
                    const cfi = location.start.cfi;
                    setCurrentCfi(cfi);

                    if (bookRef.current?.locations?.length()) {
                        const percent = bookRef.current.locations.percentageFromCfi(cfi);
                        const generatedPages = Math.max(1, bookRef.current.locations.length());
                        const page = Math.max(1, Math.ceil(percent * generatedPages));
                        setCurrentPage(page);
                        onUpdateProgressRef.current(activeBookId, page, cfi);
                    }
                });

                // Generate locations
                const generateLocations = () => {
                    bookRef.current?.locations.generate(1024).then(() => {
                        if (mounted && bookRef.current) {
                            setTotalPages(Math.max(1, bookRef.current.locations.length()));
                        }
                    }).catch((err: unknown) => console.warn("Location generation failed:", err));
                };
                if (typeof window !== "undefined" && "requestIdleCallback" in window) {
                    (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number })
                        .requestIdleCallback(generateLocations, { timeout: 1200 });
                } else {
                    setTimeout(generateLocations, 0);
                }

                setIsLoading(false);
            } catch (err) {
                console.error("Init error:", err);
                if (mounted) {
                    setIsLoading(false);
                }
            }
        };

        init();

        return () => {
            mounted = false;
            if (renditionRef.current) renditionRef.current.destroy();
            if (bookRef.current) bookRef.current.destroy();
        };
    }, [activeBookId, activeBlob, continuous, spread, containerRef]);

    // Navigation methods
    const nextPage = useCallback(() => {
        if (!renditionRef.current) return;
        if (continuous && containerRef.current) {
            const container = containerRef.current;
            const { scrollTop, scrollHeight, clientHeight } = container;
            if (scrollTop + clientHeight >= scrollHeight - 50) {
                renditionRef.current.next();
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


    // Get font family string
    const getFontFamily = useCallback(() => {
        return FONT_FAMILY_BY_PAIRING[fontPairing] || FONT_FAMILY_BY_PAIRING["merriweather-georgia"];
    }, [fontPairing]);

    // Apply current settings to rendition
    const applyStyles = useCallback(() => {
        if (!renditionRef.current) return;

        const fontFamily = getFontFamily();

        renditionRef.current.themes.default({
            "body": {
                "font-family": fontFamily,
                "font-size": `${fontSize}px`,
                "line-height": `${lineHeight}`,
                "color": readerForeground,
                "background-color": readerBackground,
                "padding-top": `${Math.max(0, pageMargin)}px`,
                "padding-bottom": `${Math.max(0, pageMargin)}px`,
                "padding-left": `${continuous ? Math.max(0, pageMargin) : 0}px`,
                "padding-right": `${continuous ? Math.max(0, pageMargin) : 0}px`,
                ...(continuous ? {
                    "max-width": `${Math.max(50, maxTextWidth)}ch`,
                    "margin": "0 auto",
                    "padding-bottom": "2em",
                } : {
                    "max-width": "none",
                    "margin": "0",
                    "padding-bottom": "2em",
                }),
            },
            "p": {
                "font-family": "inherit",
                "font-size": "inherit",
                "line-height": "inherit",
                "color": "inherit",
                "margin-bottom": `${Math.max(0, paragraphSpacing)}px`,
                "text-align": textAlignment,
                "hyphens": hyphenation ? "auto" : "none",
            },
        });
    }, [fontSize, lineHeight, textAlignment, readerForeground, readerBackground, hyphenation, getFontFamily, continuous, pageMargin, paragraphSpacing, maxTextWidth]);

    // Apply styles when settings change
    useEffect(() => {
        applyStyles();
    }, [applyStyles]);

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
