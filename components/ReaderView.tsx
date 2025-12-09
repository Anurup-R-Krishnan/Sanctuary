import React, { useState, useEffect, useRef, useCallback, MouseEvent, TouchEvent } from "react";
import { Book } from "../types";
import { useSettings } from "../context/SettingsContext";
import { ChevronLeftIcon } from "./icons/ChevronLeftIcon";
import ePub from "epubjs";

const FONT_PAIRINGS: Record<string, { heading: string; body: string }> = {
  "merriweather-georgia": { heading: "Merriweather, serif", body: "Georgia, serif" },
  "playfair-open-sans": { heading: "Playfair Display, serif", body: "Open Sans, sans-serif" },
  "abril-lato": { heading: "Abril Fatface, serif", body: "Lato, sans-serif" },
  "spectral-source-code": { heading: "Spectral, serif", body: "Source Code Pro, monospace" },
};

const getFontPairing = (key: string) => FONT_PAIRINGS[key] ?? FONT_PAIRINGS["merriweather-georgia"];

interface ReaderViewProps {
  book: Book;
  onClose: () => void;
  onUpdateProgress: (id: string, progress: number, lastLocation: string) => void;
}

const ReaderView: React.FC<ReaderViewProps> = ({ book, onClose, onUpdateProgress }) => {
  const {
    fontSize, lineHeight, immersiveMode, continuousMode, pageMargin, paragraphSpacing,
    textAlignment, fontPairing, dropCaps, maxTextWidth, hyphenation,
    readerForeground, readerBackground, readerAccent, reduceMotion,
  } = useSettings();

  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<any>(null);
  const bookRef = useRef<any>(null);
  const hideControlsTimeoutRef = useRef<number | null>(null);
  const lastLocationRef = useRef<string | null>(book.lastLocation || null);
  const [showControls, setShowControls] = useState<boolean>(() => !immersiveMode);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [toc, setToc] = useState<any[]>([]);
  const [showToc, setShowToc] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const applyReaderTheme = useCallback(() => {
    if (!renditionRef.current) return;

    const { heading, body } = getFontPairing(fontPairing);
    const themes = renditionRef.current.themes;
    const clampedPageMargin = Math.min(Math.max(pageMargin, 12), 96);
    const paragraphGap = Math.max(Math.round(paragraphSpacing), 0);
    const headingGap = Math.max(paragraphGap + 8, Math.round(paragraphGap * 1.5));

    // Comprehensive theme override - makes EPUB look native to site
    const themeStyles: Record<string, Record<string, string>> = {
      "*": {
        "box-sizing": "border-box",
        margin: "0",
        padding: "0",
        "font-family": "inherit",
        color: "inherit",
        background: "transparent !important",
        border: "none",
      },
      html: {
        background: `${readerBackground} !important`,
        color: readerForeground,
        "min-height": "100%",
        "font-family": body,
        "-webkit-text-size-adjust": "100%",
      },
      body: {
        margin: "0 auto",
        padding: `0 ${clampedPageMargin}px`,
        "text-align": textAlignment,
        "max-width": `${maxTextWidth}ch`,
        "font-family": body,
        "line-height": `${lineHeight}`,
        background: `${readerBackground} !important`,
        color: `${readerForeground} !important`,
        "-webkit-font-smoothing": "antialiased",
        hyphens: hyphenation ? "auto" : "none",
        "-webkit-hyphens": hyphenation ? "auto" : "none",
      },
      h1: {
        "font-family": heading,
        "font-size": "2em",
        "font-weight": "bold",
        "text-align": textAlignment,
        "margin-top": `${headingGap}px`,
        "margin-bottom": `${headingGap}px`,
        color: `${readerForeground} !important`,
      },
      h2: {
        "font-family": heading,
        "font-size": "1.5em",
        "font-weight": "bold",
        "margin-top": `${headingGap}px`,
        "margin-bottom": `${headingGap}px`,
        color: `${readerForeground} !important`,
      },
      "h3, h4, h5, h6": {
        "font-family": heading,
        "font-weight": "bold",
        "margin-top": `${headingGap}px`,
        "margin-bottom": `${headingGap}px`,
        color: `${readerForeground} !important`,
      },
      p: {
        "margin-top": "0",
        "margin-bottom": `${paragraphGap}px`,
        "text-align": textAlignment,
        "font-family": body,
        "line-height": `${lineHeight}`,
        color: `${readerForeground} !important`,
        "letter-spacing": "0.02em",
      },
      "ul, ol": {
        "margin-bottom": `${paragraphGap}px`,
        "padding-left": "1.5em",
        color: `${readerForeground} !important`,
      },
      li: {
        "margin-bottom": "0.25em",
        color: `${readerForeground} !important`,
      },
      a: {
        color: `${readerAccent} !important`,
        "text-decoration": "underline",
      },
      blockquote: {
        "border-left": `3px solid ${readerAccent}`,
        padding: "0.5em 1em",
        "margin-left": "0",
        "margin-bottom": `${paragraphGap}px`,
        "font-style": "italic",
        opacity: "0.9",
      },
      img: {
        "max-width": "100%",
        height: "auto",
        "border-radius": "0.375rem",
        margin: `${paragraphGap}px 0`,
        display: "block",
      },
      code: {
        "font-family": "monospace",
        background: `${readerAccent}15`,
        padding: "0.125em 0.25em",
        "border-radius": "0.25em",
        "font-size": "0.875em",
      },
      pre: {
        "font-family": "monospace",
        background: `${readerAccent}15`,
        padding: "1em",
        "border-radius": "0.375rem",
        "margin-bottom": `${paragraphGap}px`,
        "overflow-x": "auto",
      },
      hr: {
        border: "none",
        "border-top": `1px solid ${readerAccent}40`,
        margin: `${paragraphGap}px 0`,
      },
      "::selection": {
        background: `${readerAccent}50`,
      },
    };

    // Drop caps styling
    themeStyles["p:first-of-type::first-letter"] = dropCaps
      ? {
          "font-family": heading,
          "font-size": `${fontSize * 2.4}px`,
          "line-height": "0.85",
          float: "left",
          margin: "0 0.25em 0.05em 0",
          "font-weight": "700",
          color: `${readerAccent} !important`,
        }
      : {};

    themes.register("sanctuary-custom", themeStyles);
    themes.select("sanctuary-custom");
    themes.fontSize(`${fontSize}px`);

    // Force iframe background
    const iframe = renditionRef.current?.manager?.container?.querySelector("iframe");
    if (iframe) {
      iframe.style.background = readerBackground;
      iframe.style.border = "none";
    }
  }, [fontSize, lineHeight, pageMargin, paragraphSpacing, textAlignment, fontPairing, dropCaps, maxTextWidth, hyphenation, readerForeground, readerBackground, readerAccent]);

  const applyReaderThemeRef = useRef(applyReaderTheme);
  useEffect(() => { applyReaderThemeRef.current = applyReaderTheme; }, [applyReaderTheme]);

  const clearHideControlsTimeout = useCallback(() => {
    if (hideControlsTimeoutRef.current !== null) {
      window.clearTimeout(hideControlsTimeoutRef.current);
      hideControlsTimeoutRef.current = null;
    }
  }, []);

  const scheduleHideControls = useCallback(() => {
    if (!immersiveMode) return;
    clearHideControlsTimeout();
    hideControlsTimeoutRef.current = window.setTimeout(() => {
      setShowControls(false);
      hideControlsTimeoutRef.current = null;
    }, 3000);
  }, [immersiveMode, clearHideControlsTimeout]);

  const toggleControls = useCallback(() => {
    setShowControls((prev) => {
      const next = !prev;
      if (next) scheduleHideControls();
      else clearHideControlsTimeout();
      return next;
    });
  }, [scheduleHideControls, clearHideControlsTimeout]);

  const revealControls = useCallback(() => {
    setShowControls(true);
    scheduleHideControls();
  }, [scheduleHideControls]);

  const handlePointerActivity = useCallback(() => {
    if (!immersiveMode) return;
    revealControls();
  }, [immersiveMode, revealControls]);

  useEffect(() => () => clearHideControlsTimeout(), [clearHideControlsTimeout]);

  useEffect(() => {
    clearHideControlsTimeout();
    setShowControls(!immersiveMode);
  }, [immersiveMode, clearHideControlsTimeout]);

  const onRelocated = useCallback((location: any) => {
    setCurrentLocation(location);
    const progress = location.start.percentage;
    const cfi = location.start.cfi;
    lastLocationRef.current = cfi;
    onUpdateProgress(book.id, Math.round(progress * 100), cfi);
  }, [book.id, onUpdateProgress]);

  useEffect(() => {
    if (!viewerRef.current) return;
    setIsLoading(true);

    const viewerElement = viewerRef.current;
    viewerElement.style.width = "100%";
    viewerElement.style.height = "100%";
    viewerElement.style.background = readerBackground;

    const epubBook = ePub();
    bookRef.current = epubBook;
    const rendition = epubBook.renderTo(viewerRef.current, {
      width: "100%",
      height: "100%",
      spread: "none",
      flow: continuousMode ? "scrolled-doc" : "paginated",
    });
    renditionRef.current = rendition;

    rendition.on("relocated", onRelocated);

    let isCancelled = false;

    const initialize = async () => {
      let blobUrl: string | null = null;
      try {
        blobUrl = URL.createObjectURL(book.epubBlob);
        await epubBook.open(blobUrl);
        await epubBook.ready;

        if (isCancelled) return;

        setToc(epubBook.navigation?.toc || []);
        const initialLocation = book.lastLocation || undefined;
        await rendition.display(initialLocation);
        lastLocationRef.current = initialLocation ?? null;
        applyReaderThemeRef.current();
      } catch (err) {
        if (!isCancelled) {
          console.error("Failed to load EPUB:", err);
          try {
            const fallbackUrl = URL.createObjectURL(book.epubBlob);
            await epubBook.open(fallbackUrl);
            await epubBook.ready;
            await rendition.display(book.lastLocation || undefined);
            applyReaderThemeRef.current();
            URL.revokeObjectURL(fallbackUrl);
          } catch (fallbackErr) {
            console.error("Fallback EPUB loading failed:", fallbackErr);
          }
        }
      } finally {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        if (!isCancelled) setIsLoading(false);
      }
    };

    initialize();

    return () => {
      isCancelled = true;
      try { rendition.off?.("relocated", onRelocated); } catch {}
      try { rendition.destroy?.(); } catch {}
      try { epubBook.destroy?.(); } catch {}
      bookRef.current = null;
    };
  }, [book.id, onRelocated, continuousMode, readerBackground]);

  useEffect(() => {
    applyReaderTheme();
  }, [applyReaderTheme]);

  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition) return;
    rendition.flow(continuousMode ? "scrolled-doc" : "paginated");
    rendition.spread(continuousMode ? "none" : "auto");
    applyReaderThemeRef.current();
    const targetCfi = lastLocationRef.current ?? book.lastLocation ?? undefined;
    if (targetCfi) rendition.display(targetCfi);
    else rendition.display();
  }, [continuousMode, book.lastLocation]);

  const nextPage = () => { revealControls(); renditionRef.current?.next(); };
  const prevPage = () => { revealControls(); renditionRef.current?.prev(); };
  const goToChapter = (href: string) => { renditionRef.current?.display(href); setShowToc(false); revealControls(); };

  const scrollContinuous = useCallback((distance: number) => {
    if (!continuousMode) return;
    const container = (renditionRef.current?.manager?.container as HTMLElement | undefined) ?? viewerRef.current;
    if (!container) return;
    container.scrollBy({ top: distance, behavior: reduceMotion ? "auto" : "smooth" });
  }, [continuousMode, reduceMotion]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.getAttribute("contenteditable") === "true")) return;

      if (showToc) {
        if (event.key === "Escape") { setShowToc(false); revealControls(); }
        return;
      }

      switch (event.key) {
        case "ArrowRight": event.preventDefault(); renditionRef.current?.next(); if (immersiveMode) revealControls(); break;
        case "ArrowLeft": event.preventDefault(); renditionRef.current?.prev(); if (immersiveMode) revealControls(); break;
        case "ArrowDown":
        case "PageDown":
          event.preventDefault();
          if (continuousMode) scrollContinuous(window.innerHeight * 0.8);
          else renditionRef.current?.next();
          if (immersiveMode) revealControls();
          break;
        case "ArrowUp":
        case "PageUp":
          event.preventDefault();
          if (continuousMode) scrollContinuous(-window.innerHeight * 0.8);
          else renditionRef.current?.prev();
          if (immersiveMode) revealControls();
          break;
        case " ":
          event.preventDefault();
          if (event.shiftKey) renditionRef.current?.prev();
          else renditionRef.current?.next();
          if (immersiveMode) revealControls();
          break;
        case "Enter": case "Escape": event.preventDefault(); revealControls(); break;
        case "t": case "T": case "o": case "O": event.preventDefault(); setShowToc(true); revealControls(); break;
        case "c": case "C": event.preventDefault(); toggleControls(); break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showToc, immersiveMode, revealControls, toggleControls, continuousMode, scrollContinuous]);

  const handleReaderTap = useCallback((event: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (immersiveMode) revealControls();
    else toggleControls();
  }, [immersiveMode, revealControls, toggleControls]);

  const progressPercent = currentLocation ? Math.round(currentLocation.start.percentage * 100) : book.progress;
  const currentPage = currentLocation?.start.displayed.page;
  const totalPages = currentLocation?.start.displayed.total;

  const transitionClass = reduceMotion ? "" : "transition-all duration-300";

  return (
    <div
      className={`fixed inset-0 z-[60] ${reduceMotion ? "" : "animate-[fadeIn_0.5s_ease-out]"}`}
      style={{ background: readerBackground }}
      onMouseMove={handlePointerActivity}
      onTouchStart={handlePointerActivity}
    >
      {/* Header Controls */}
      <div className={`fixed top-0 left-0 right-0 p-4 z-20 ${transitionClass} ${showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full"}`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center space-x-2 p-2 rounded-full bg-light-surface/50 dark:bg-dark-surface/50 backdrop-blur-sm"
            style={{ color: readerForeground }}
          >
            <ChevronLeftIcon className="w-6 h-6" />
            <span className="font-medium">Library</span>
          </button>
          <button
            onClick={() => { setShowToc(true); revealControls(); }}
            className="p-2 rounded-full bg-light-surface/50 dark:bg-dark-surface/50 backdrop-blur-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke={readerForeground}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="h-full flex justify-center items-center" onClick={handleReaderTap}>
        {isLoading && <div style={{ color: readerForeground }} className="opacity-60">Loading Book...</div>}
        <div
          id="viewer"
          ref={viewerRef}
          className={`w-full h-full max-w-4xl reader-content ${transitionClass} ${isLoading ? "opacity-0" : "opacity-100"}`}
          style={{ background: readerBackground }}
        />
      </div>

      {!continuousMode && (
        <>
          <div onClick={prevPage} className="absolute left-0 top-0 h-full w-1/5 z-10" />
          <div onClick={nextPage} className="absolute right-0 top-0 h-full w-1/5 z-10" />
        </>
      )}

      {/* Footer Controls */}
      <div className={`fixed bottom-0 left-0 right-0 p-4 z-20 ${transitionClass} ${showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-full"}`}>
        <div className="max-w-3xl mx-auto flex flex-col items-center space-y-2">
          <div
            className="w-full flex items-center justify-between text-sm p-2 rounded-full bg-light-surface/50 dark:bg-dark-surface/50 backdrop-blur-sm"
            style={{ color: readerForeground }}
          >
            <span>{continuousMode ? "Scroll Position" : `Page ${currentPage || "-"} of ${totalPages || "-"}`}</span>
            <span>{progressPercent}% Complete</span>
          </div>
          <div className="w-full h-1 rounded-full" style={{ background: `${readerForeground}20` }}>
            <div className="h-1 rounded-full" style={{ width: `${progressPercent}%`, background: readerAccent }} />
          </div>
        </div>
      </div>

      {/* Table of Contents Modal */}
      {showToc && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center"
          onClick={() => { setShowToc(false); revealControls(); }}
        >
          <div
            className="bg-light-surface dark:bg-dark-surface w-full max-w-md max-h-[80vh] rounded-2xl shadow-soft-xl dark:shadow-dark-soft-xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-serif font-semibold p-4 border-b border-light-primary dark:border-dark-primary">Contents</h3>
            <ul className="overflow-y-auto p-2">
              {toc.map((item, index) => (
                <li key={index}>
                  <button
                    onClick={() => { goToChapter(item.href); revealControls(); }}
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
