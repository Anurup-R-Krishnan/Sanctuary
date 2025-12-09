import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  MouseEvent,
  TouchEvent,
} from "react";
import { Book } from "../types";
import { useSettings } from "../context/SettingsContext";
import { ChevronLeftIcon } from "./icons/ChevronLeftIcon";
import ePub from "epubjs";

const FONT_PAIRINGS: Record<
  string,
  { heading: string; body: string }
> = {
  "merriweather-georgia": {
    heading: "Merriweather, serif",
    body: "Georgia, serif",
  },
  "playfair-open-sans": {
    heading: "Playfair Display, serif",
    body: "Open Sans, sans-serif",
  },
  "abril-lato": {
    heading: "Abril Fatface, serif",
    body: "Lato, sans-serif",
  },
  "spectral-source-code": {
    heading: "Spectral, serif",
    body: "Source Code Pro, monospace",
  },
};

const getFontPairing = (key: string) =>
  FONT_PAIRINGS[key] ?? FONT_PAIRINGS["merriweather-georgia"];

interface ReaderViewProps {
  book: Book;
  onClose: () => void;
  onUpdateProgress: (
    id: string,
    progress: number,
    lastLocation: string,
  ) => void;
}

const ReaderView: React.FC<ReaderViewProps> = ({
  book,
  onClose,
  onUpdateProgress,
}) => {
  const {
    fontSize,
    lineHeight,
    immersiveMode,
    continuousMode,
    pageMargin,
    paragraphSpacing,
    textAlignment,
    fontPairing,
    dropCaps,
    readerForeground,
    readerBackground,
    readerAccent,
  } = useSettings();
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<any>(null);
  const bookRef = useRef<any>(null);
  const hideControlsTimeoutRef = useRef<number | null>(null);
  const lastLocationRef = useRef<string | null>(
    book.lastLocation || null,
  );
  const [showControls, setShowControls] = useState<boolean>(
    () => !immersiveMode,
  );
  const [currentLocation, setCurrentLocation] =
    useState<any>(null);
  const [toc, setToc] = useState<any[]>([]);
  const [showToc, setShowToc] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const applyReaderTheme = useCallback(() => {
    if (!renditionRef.current) {
      return;
    }

    const { heading, body } = getFontPairing(fontPairing);
    const themes = renditionRef.current.themes;
    const containerDoc =
      renditionRef.current?.manager?.container?.ownerDocument ??
      renditionRef.current?.book?.render?.document;
    if (containerDoc?.documentElement) {
      containerDoc.documentElement.style.setProperty(
        "--reader-foreground",
        readerForeground,
      );
      containerDoc.documentElement.style.setProperty(
        "--reader-background",
        readerBackground,
      );
      containerDoc.documentElement.style.setProperty(
        "--reader-accent",
        readerAccent,
      );
    }
    const clampedPageMargin = Math.min(
      Math.max(pageMargin, 12),
      96,
    );
    const paragraphGap = Math.max(
      Math.round(paragraphSpacing),
      0,
    );
    const secondaryParagraphGap =
      paragraphGap > 0
        ? Math.max(Math.round(paragraphGap * 0.6), 4)
        : 0;
    const headingGap = Math.max(
      paragraphGap + 8,
      Math.round(paragraphGap * 1.5),
    );

    // Comprehensive theme override to replace all default EPUB styles
    const themeStyles: Record<
      string,
      Record<string, string>
    > = {
      // Reset all elements to base styles
      "*": {
        "box-sizing": "border-box",
        margin: "0",
        padding: "0",
        "font-family": "inherit",
        "font-size": "inherit",
        "line-height": "inherit",
        color: "inherit",
        background: "transparent",
        border: "none",
        outline: "none",
      },
      html: {
        background: "var(--reader-background, transparent)",
        color: "var(--reader-foreground, inherit)",
        "min-height": "100%",
        "font-family": body,
        "font-size": "16px",
        "line-height": "1.5",
        "-webkit-text-size-adjust": "100%",
        "-moz-text-size-adjust": "100%",
        "text-size-adjust": "100%",
      },
      body: {
        margin: "0 auto",
        padding: `0 ${clampedPageMargin}px`,
        "text-align": textAlignment,
        "max-width": "48rem",
        "font-family": body,
        "line-height": `${lineHeight}`,
        background: "var(--reader-background, transparent)",
        color: "var(--reader-foreground, inherit)",
        "-webkit-font-smoothing": "antialiased",
        "-moz-osx-font-smoothing": "grayscale",
        "scroll-behavior": "smooth",
        "word-wrap": "break-word",
        "overflow-wrap": "break-word",
      },
      // Headings
      h1: {
        "font-family": heading,
        "font-size": "2em",
        "font-weight": "bold",
        "text-align": textAlignment,
        "margin-top": `${headingGap}px`,
        "margin-bottom": `${headingGap}px`,
        color:
          "var(--reader-heading, var(--reader-foreground, inherit))",
      },
      h2: {
        "font-family": heading,
        "font-size": "1.5em",
        "font-weight": "bold",
        "text-align": textAlignment,
        "margin-top": `${headingGap}px`,
        "margin-bottom": `${headingGap}px`,
        color:
          "var(--reader-heading, var(--reader-foreground, inherit))",
      },
      h3: {
        "font-family": heading,
        "font-size": "1.25em",
        "font-weight": "bold",
        "text-align": textAlignment,
        "margin-top": `${headingGap}px`,
        "margin-bottom": `${headingGap}px`,
        color:
          "var(--reader-heading, var(--reader-foreground, inherit))",
      },
      "h4, h5, h6": {
        "font-family": heading,
        "font-weight": "bold",
        "text-align": textAlignment,
        "margin-top": `${headingGap}px`,
        "margin-bottom": `${headingGap}px`,
        color:
          "var(--reader-heading, var(--reader-foreground, inherit))",
      },
      // Paragraphs and text
      p: {
        "margin-top": "0px",
        "margin-bottom": `${paragraphGap}px`,
        "text-align": textAlignment,
        "font-family": body,
        "line-height": `${lineHeight}`,
        color: "var(--reader-foreground, inherit)",
        "text-indent": "0",
        orphans: "2",
        widows: "2",
      },
      "p + p": {
        "margin-top": paragraphGap
          ? `${secondaryParagraphGap}px`
          : "0px",
      },
      // Lists
      ul: {
        "margin-bottom": `${paragraphGap}px`,
        "padding-left": "1.5em",
        "text-align": textAlignment,
      },
      ol: {
        "margin-bottom": `${paragraphGap}px`,
        "padding-left": "1.5em",
        "text-align": textAlignment,
      },
      li: {
        "margin-bottom": "0.25em",
        "text-align": textAlignment,
        "letter-spacing": "0.02em",
      },
      // Links
      a: {
        color:
          "var(--reader-link, var(--reader-accent, inherit))",
        "text-decoration": "underline",
        "text-decoration-color":
          "var(--reader-accent, currentColor)",
      },
      "a:hover": {
        "text-decoration": "none",
      },
      // Blockquotes
      blockquote: {
        "border-left":
          "3px solid var(--reader-accent, currentColor)",
        padding: "0.5em 1em",
        "margin-left": "0",
        "margin-right": "0",
        "margin-bottom": `${paragraphGap}px`,
        "font-style": "italic",
        opacity: "0.9",
        background:
          "rgba(var(--reader-accent-rgb, 59, 130, 246), 0.05)",
      },
      // Images
      img: {
        "max-width": "100%",
        height: "auto",
        "border-radius": "0.375rem",
        "box-shadow":
          "0 20px 45px -30px rgba(15, 23, 42, 0.45)",
        margin: `${paragraphGap}px 0`,
        display: "block",
      },
      // Tables
      table: {
        width: "100%",
        "border-collapse": "collapse",
        "margin-bottom": `${paragraphGap}px`,
      },
      th: {
        "font-weight": "bold",
        "text-align": "left",
        padding: "0.5em",
        border: "1px solid var(--reader-accent, #e5e7eb)",
      },
      td: {
        padding: "0.5em",
        border: "1px solid var(--reader-accent, #e5e7eb)",
      },
      // Code and pre
      code: {
        "font-family": "monospace",
        background:
          "rgba(var(--reader-accent-rgb, 59, 130, 246), 0.1)",
        padding: "0.125em 0.25em",
        "border-radius": "0.25em",
        "font-size": "0.875em",
      },
      pre: {
        "font-family": "monospace",
        background:
          "rgba(var(--reader-accent-rgb, 59, 130, 246), 0.1)",
        padding: "1em",
        "border-radius": "0.375rem",
        "margin-bottom": `${paragraphGap}px`,
        "overflow-x": "auto",
        "white-space": "pre-wrap",
        "word-wrap": "break-word",
      },
      // Emphasis
      strong: {
        "font-weight": "bold",
      },
      em: {
        "font-style": "italic",
      },
      // Horizontal rule
      hr: {
        border: "none",
        "border-top": "1px solid var(--reader-accent, #e5e7eb)",
        margin: `${paragraphGap}px 0`,
      },
      // Typography enhancements
      "p, li": {
        "letter-spacing": "0.02em",
      },
      // Selection
      "::selection": {
        background:
          "var(--reader-accent, rgba(59, 130, 246, 0.35))",
        color: "var(--reader-background, #ffffff)",
      },
      "::-moz-selection": {
        background:
          "var(--reader-accent, rgba(59, 130, 246, 0.35))",
        color: "var(--reader-background, #ffffff)",
      },
      // Drop caps
    };

    themeStyles["p:first-of-type::first-letter"] = dropCaps
      ? {
          "font-family": heading,
          "font-size": `${fontSize * 2.4}px`,
          "line-height": "0.85",
          float: "left",
          margin: "0 0.25em 0.05em 0",
          "font-weight": "700",
          "padding-top": "0.1em",
          color: "var(--reader-accent, inherit)",
        }
      : {
          "font-family": body,
          "font-size": "inherit",
          "line-height": "inherit",
          float: "none",
          margin: "0",
          "font-weight": "inherit",
        };

    // Override epub.js default styles completely
    themes.register("sanctuary-custom", themeStyles);
    themes.select("sanctuary-custom");
    themes.fontSize(`${fontSize}px`);

    // Force override any remaining defaults
    if (renditionRef.current.themes.default) {
      renditionRef.current.themes.default("*", {
        margin: "0",
        padding: "0",
        "font-family": body,
        "font-size": `${fontSize}px`,
        "line-height": `${lineHeight}`,
        color: readerForeground,
        background: readerBackground,
      });
    }

    // Additional iframe override
    const iframe =
      renditionRef.current?.manager?.container?.querySelector(
        "iframe",
      );
    if (iframe) {
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "none";
      iframe.style.background = readerBackground;
      iframe.style.setProperty(
        "--reader-foreground",
        readerForeground,
      );
      iframe.style.setProperty(
        "--reader-background",
        readerBackground,
      );
      iframe.style.setProperty("--reader-accent", readerAccent);
    }
  }, [
    fontSize,
    lineHeight,
    pageMargin,
    paragraphSpacing,
    textAlignment,
    fontPairing,
    dropCaps,
    readerForeground,
    readerBackground,
    readerAccent,
  ]);

  const applyReaderThemeRef = useRef(applyReaderTheme);

  useEffect(() => {
    applyReaderThemeRef.current = applyReaderTheme;
  }, [applyReaderTheme]);

  const clearHideControlsTimeout = useCallback(() => {
    if (hideControlsTimeoutRef.current !== null) {
      window.clearTimeout(hideControlsTimeoutRef.current);
      hideControlsTimeoutRef.current = null;
    }
  }, []);

  const scheduleHideControls = useCallback(() => {
    if (!immersiveMode) {
      return;
    }
    clearHideControlsTimeout();
    hideControlsTimeoutRef.current = window.setTimeout(() => {
      setShowControls(false);
      hideControlsTimeoutRef.current = null;
    }, 3000);
  }, [immersiveMode, clearHideControlsTimeout]);

  const toggleControls = useCallback(() => {
    setShowControls((prev) => {
      const next = !prev;
      if (next) {
        scheduleHideControls();
      } else {
        clearHideControlsTimeout();
      }
      return next;
    });
  }, [scheduleHideControls, clearHideControlsTimeout]);

  const revealControls = useCallback(() => {
    setShowControls(true);
    scheduleHideControls();
  }, [scheduleHideControls]);

  const handlePointerActivity = useCallback(() => {
    if (!immersiveMode) {
      return;
    }
    revealControls();
  }, [immersiveMode, revealControls]);

  useEffect(() => {
    return () => {
      clearHideControlsTimeout();
    };
  }, [clearHideControlsTimeout]);

  useEffect(() => {
    clearHideControlsTimeout();
    if (immersiveMode) {
      setShowControls(false);
    } else {
      setShowControls(true);
    }
  }, [immersiveMode, clearHideControlsTimeout]);

  const onRelocated = useCallback(
    (location: any) => {
      setCurrentLocation(location);
      const progress = location.start.percentage;
      const cfi = location.start.cfi;
      lastLocationRef.current = cfi;
      onUpdateProgress(
        book.id,
        Math.round(progress * 100),
        cfi,
      );
    },
    [book.id, onUpdateProgress],
  );

  useEffect(() => {
    if (!viewerRef.current) return;
    setIsLoading(true);

    const viewerElement = viewerRef.current;
    viewerElement.style.width = "100%";
    viewerElement.style.height = "100%";
    viewerElement.style.margin = "0";
    viewerElement.style.padding = "0";
    viewerElement.style.maxWidth = "none";
    viewerElement.style.background = "transparent";
    viewerElement.style.setProperty(
      "--reader-foreground",
      readerForeground,
    );
    viewerElement.style.setProperty(
      "--reader-background",
      readerBackground,
    );
    viewerElement.style.setProperty(
      "--reader-accent",
      readerAccent,
    );

    const epubBook = ePub();
    bookRef.current = epubBook;
    const rendition = epubBook.renderTo(viewerRef.current, {
      width: "100%",
      height: "100%",
      spread: "none", // Disable spreads for better control
      flow: continuousMode ? "scrolled-doc" : "paginated",
    });
    renditionRef.current = rendition;

    const renditionContainer = rendition?.manager?.container as
      | HTMLElement
      | undefined;
    if (renditionContainer) {
      renditionContainer.style.width = "100%";
      renditionContainer.style.height = "100%";
      renditionContainer.style.margin = "0";
      renditionContainer.style.padding = "0";
      renditionContainer.style.maxWidth = "none";
      renditionContainer.style.background = "transparent";
      renditionContainer.style.setProperty(
        "--reader-foreground",
        readerForeground,
      );
      renditionContainer.style.setProperty(
        "--reader-background",
        readerBackground,
      );
      renditionContainer.style.setProperty(
        "--reader-accent",
        readerAccent,
      );
    }

    rendition.on("relocated", onRelocated);

    let isCancelled = false;

    const initialize = async () => {
      let blobUrl: string | null = null;
      try {
        // Create blob URL for epub.js compatibility
        blobUrl = URL.createObjectURL(book.epubBlob);
        await epubBook.open(blobUrl);
        await epubBook.ready;

        if (isCancelled) {
          return;
        }

        setToc(epubBook.navigation?.toc || []);

        const initialLocation = book.lastLocation || undefined;
        // Flow and spread are now set in renderTo options above
        await rendition.display(initialLocation);
        lastLocationRef.current = initialLocation ?? null;
        applyReaderThemeRef.current();

        // Force iframe styles override
        const iframe =
          rendition?.manager?.container?.querySelector(
            "iframe",
          );
        if (iframe) {
          iframe.style.width = "100%";
          iframe.style.height = "100%";
          iframe.style.border = "none";
          iframe.style.background = readerBackground;
          iframe.style.setProperty(
            "--reader-foreground",
            readerForeground,
          );
          iframe.style.setProperty(
            "--reader-background",
            readerBackground,
          );
          iframe.style.setProperty(
            "--reader-accent",
            readerAccent,
          );
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Failed to load EPUB:", err);
          // Fallback: try direct blob loading
          try {
            await epubBook.open(book.epubBlob);
            await epubBook.ready;
            await rendition.display(initialLocation);
            lastLocationRef.current = initialLocation ?? null;
            applyReaderThemeRef.current();
          } catch (fallbackErr) {
            console.error(
              "Fallback EPUB loading also failed:",
              fallbackErr,
            );
          }
        }
      } finally {
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
        }
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    initialize();

    return () => {
      isCancelled = true;
      try {
        rendition.off?.("relocated", onRelocated);
      } catch {}
      try {
        rendition.destroy?.();
      } catch {}
      try {
        epubBook.destroy?.();
      } catch {}
      bookRef.current = null;
    };
  }, [
    book.id,
    onRelocated,
    continuousMode,
    readerForeground,
    readerBackground,
    readerAccent,
  ]);

  useEffect(() => {
    if (viewerRef.current) {
      viewerRef.current.style.setProperty(
        "--reader-foreground",
        readerForeground,
      );
      viewerRef.current.style.setProperty(
        "--reader-background",
        readerBackground,
      );
      viewerRef.current.style.setProperty(
        "--reader-accent",
        readerAccent,
      );
    }

    const container =
      (renditionRef.current?.manager?.container as
        | HTMLElement
        | undefined) ?? undefined;

    if (container) {
      container.style.setProperty(
        "--reader-foreground",
        readerForeground,
      );
      container.style.setProperty(
        "--reader-background",
        readerBackground,
      );
      container.style.setProperty(
        "--reader-accent",
        readerAccent,
      );
    }

    applyReaderTheme();
  }, [
    applyReaderTheme,
    readerForeground,
    readerBackground,
    readerAccent,
  ]);

  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition) {
      return;
    }
    rendition.flow(
      continuousMode ? "scrolled-doc" : "paginated",
    );
    rendition.spread(continuousMode ? "none" : "auto");
    applyReaderThemeRef.current();
    const targetCfi =
      lastLocationRef.current ?? book.lastLocation ?? undefined;
    lastLocationRef.current = targetCfi ?? null;
    if (targetCfi) {
      rendition.display(targetCfi);
    } else {
      rendition.display();
    }
  }, [continuousMode, book.lastLocation, applyReaderTheme]);

  const nextPage = () => {
    revealControls();
    renditionRef.current?.next();
  };
  const prevPage = () => {
    revealControls();
    renditionRef.current?.prev();
  };
  const goToChapter = (href: string) => {
    renditionRef.current?.display(href);
    setShowToc(false);
    revealControls();
  };

  const scrollContinuous = useCallback(
    (distance: number) => {
      if (!continuousMode) {
        return;
      }
      const container =
        (renditionRef.current?.manager?.container as
          | HTMLElement
          | undefined) ?? viewerRef.current;
      if (!container) {
        return;
      }
      const scroller = container as HTMLElement;
      if (typeof scroller.scrollBy === "function") {
        scroller.scrollBy({
          top: distance,
          behavior: "smooth",
        });
      } else {
        scroller.scrollTop += distance;
      }
      const threshold = Math.max(
        scroller.clientHeight * 0.1,
        48,
      );
      if (
        distance > 0 &&
        scroller.scrollHeight -
          (scroller.scrollTop + scroller.clientHeight) <
          threshold
      ) {
        renditionRef.current?.next();
      } else if (
        distance < 0 &&
        scroller.scrollTop < threshold
      ) {
        renditionRef.current?.prev();
      }
    },
    [continuousMode],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.getAttribute("contenteditable") === "true")
      ) {
        return;
      }

      if (showToc) {
        if (event.key === "Escape") {
          setShowToc(false);
          revealControls();
        }
        return;
      }

      switch (event.key) {
        case "ArrowRight":
          event.preventDefault();
          renditionRef.current?.next();
          if (immersiveMode) {
            revealControls();
          }
          break;
        case "ArrowLeft":
          event.preventDefault();
          renditionRef.current?.prev();
          if (immersiveMode) {
            revealControls();
          }
          break;
        case "ArrowDown": {
          event.preventDefault();
          if (continuousMode) {
            const viewportHeight =
              typeof window !== "undefined"
                ? window.innerHeight
                : 600;
            scrollContinuous(viewportHeight * 0.8);
            if (immersiveMode) {
              revealControls();
            }
          } else {
            renditionRef.current?.next();
            if (immersiveMode) {
              revealControls();
            }
          }
          break;
        }
        case "ArrowUp": {
          event.preventDefault();
          if (continuousMode) {
            const viewportHeight =
              typeof window !== "undefined"
                ? window.innerHeight
                : 600;
            scrollContinuous(-viewportHeight * 0.8);
            if (immersiveMode) {
              revealControls();
            }
          } else {
            renditionRef.current?.prev();
            if (immersiveMode) {
              revealControls();
            }
          }
          break;
        }
        case "PageDown": {
          event.preventDefault();
          if (continuousMode) {
            const viewportHeight =
              typeof window !== "undefined"
                ? window.innerHeight
                : 600;
            scrollContinuous(viewportHeight);
            if (immersiveMode) {
              revealControls();
            }
          } else {
            renditionRef.current?.next();
            if (immersiveMode) {
              revealControls();
            }
          }
          break;
        }
        case "PageUp": {
          event.preventDefault();
          if (continuousMode) {
            const viewportHeight =
              typeof window !== "undefined"
                ? window.innerHeight
                : 600;
            scrollContinuous(-viewportHeight);
            if (immersiveMode) {
              revealControls();
            }
          } else {
            renditionRef.current?.prev();
            if (immersiveMode) {
              revealControls();
            }
          }
          break;
        }
        case " ":
          event.preventDefault();
          if (event.shiftKey) {
            renditionRef.current?.prev();
          } else {
            renditionRef.current?.next();
          }
          if (immersiveMode) {
            revealControls();
          }
          break;
        case "Enter":
          event.preventDefault();
          if (immersiveMode) {
            revealControls();
          } else {
            toggleControls();
          }
          break;
        case "t":
        case "T":
        case "o":
        case "O":
          event.preventDefault();
          setShowToc(true);
          revealControls();
          break;
        case "Escape":
          revealControls();
          break;
        case "c":
        case "C":
          event.preventDefault();
          if (immersiveMode) {
            revealControls();
          } else {
            toggleControls();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    showToc,
    immersiveMode,
    revealControls,
    toggleControls,
    continuousMode,
    scrollContinuous,
  ]);

  useEffect(() => {
    if (!continuousMode) {
      return;
    }

    const container =
      (renditionRef.current?.manager?.container as
        | HTMLElement
        | undefined) ?? viewerRef.current;

    if (!container) {
      return;
    }

    let ticking = false;

    const handleScroll = () => {
      if (ticking) {
        return;
      }
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        if (!continuousMode || !container) {
          return;
        }
        const threshold = Math.max(
          container.clientHeight * 0.1,
          48,
        );
        if (
          container.scrollHeight -
            (container.scrollTop + container.clientHeight) <
          threshold
        ) {
          renditionRef.current?.next();
        } else if (container.scrollTop < threshold) {
          renditionRef.current?.prev();
        }
      });
    };

    container.addEventListener("scroll", handleScroll);
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [continuousMode]);

  const handleReaderTap = useCallback(
    (
      event:
        | MouseEvent<HTMLDivElement>
        | TouchEvent<HTMLDivElement>,
    ) => {
      event.stopPropagation();
      if (immersiveMode) {
        revealControls();
      } else {
        toggleControls();
      }
    },
    [immersiveMode, revealControls, toggleControls],
  );

  const progressPercent = currentLocation
    ? Math.round(currentLocation.start.percentage * 100)
    : book.progress;
  const currentPage = currentLocation?.start.displayed.page;
  const totalPages = currentLocation?.start.displayed.total;

  return (
    <div
      className="fixed inset-0 bg-light-primary dark:bg-dark-primary z-[60] animate-[fadeIn_0.5s_ease-out]"
      onMouseMove={handlePointerActivity}
      onTouchStart={handlePointerActivity}
    >
      {/* Header Controls */}
      <div
        className={`fixed top-0 left-0 right-0 p-4 z-20 transition-all duration-300 ${
          showControls
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-full"
        }`}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center space-x-2 text-light-text dark:text-dark-text hover:text-light-accent dark:hover:text-dark-accent transition-colors p-2 rounded-full bg-light-surface/50 dark:bg-dark-surface/50 backdrop-blur-sm"
          >
            <ChevronLeftIcon className="w-6 h-6" />
            <span className="font-medium">Library</span>
          </button>
          <button
            onClick={() => {
              setShowToc(true);
              revealControls();
            }}
            className="p-2 rounded-full bg-light-surface/50 dark:bg-dark-surface/50 backdrop-blur-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-light-text dark:text-dark-text"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className="h-full flex justify-center items-center"
        onClick={handleReaderTap}
      >
        {isLoading && (
          <div className="text-light-text-muted dark:text-dark-text-muted">
            Loading Book...
          </div>
        )}
        <div
          id="viewer"
          ref={viewerRef}
          className={`w-full h-full max-w-4xl reader-content transition-opacity duration-300 ${
            isLoading ? "opacity-0" : "opacity-100"
          }`}
        ></div>
      </div>
      {!continuousMode && (
        <>
          <div
            onClick={prevPage}
            className="absolute left-0 top-0 h-full w-1/5 z-10"
          ></div>
          <div
            onClick={nextPage}
            className="absolute right-0 top-0 h-full w-1/5 z-10"
          ></div>
        </>
      )}

      {/* Footer Controls */}
      <div
        className={`fixed bottom-0 left-0 right-0 p-4 z-20 transition-all duration-300 ${
          showControls
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-full"
        }`}
      >
        <div className="max-w-3xl mx-auto flex flex-col items-center space-y-2">
          <div className="w-full flex items-center justify-between text-sm text-light-text-muted dark:text-dark-text-muted bg-light-surface/50 dark:bg-dark-surface/50 backdrop-blur-sm p-2 rounded-full">
            <span>
              {continuousMode
                ? "Scroll Position"
                : `Page ${currentPage || "-"} of ${totalPages || "-"}`}
            </span>
            <span>
              {continuousMode
                ? `${progressPercent}% Read`
                : `${progressPercent}% Complete`}
            </span>
          </div>
          <div className="w-full h-1 bg-black/10 dark:bg-white/10 rounded-full">
            <div
              className="h-1 bg-light-accent dark:bg-dark-accent rounded-full"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Table of Contents Modal */}
      {showToc && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center"
          onClick={() => {
            setShowToc(false);
            revealControls();
          }}
        >
          <div
            className="bg-light-surface dark:bg-dark-surface w-full max-w-md max-h-[80vh] rounded-2xl shadow-soft-xl dark:shadow-dark-soft-xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-serif font-semibold p-4 border-b border-light-primary dark:border-dark-primary">
              Contents
            </h3>
            <ul className="overflow-y-auto p-2">
              {toc.map((item, index) => (
                <li key={index}>
                  <button
                    onClick={() => {
                      goToChapter(item.href);
                      revealControls();
                    }}
                    className="w-full text-left p-3 rounded-lg hover:bg-light-primary dark:hover:bg-dark-primary transition-colors"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReaderView;
