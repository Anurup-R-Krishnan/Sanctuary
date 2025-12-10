import React, { useState, useEffect, useRef, useCallback } from "react";
import { Book, Bookmark } from "../types";
import { useSettings } from "../context/SettingsContext";
import { ChevronLeft, List, Bookmark as BookmarkIcon, Clock, History, Keyboard, X, Sun, Moon, Minus, Plus, Type, AlignLeft, AlignJustify } from "lucide-react";
import ePub from "epubjs";

const FONT_PAIRINGS: Record<string, { heading: string; body: string }> = {
  "merriweather-georgia": { heading: "Merriweather, serif", body: "Georgia, serif" },
  "playfair-open-sans": { heading: "Playfair Display, serif", body: "Open Sans, sans-serif" },
  "abril-lato": { heading: "Abril Fatface, serif", body: "Lato, sans-serif" },
  "spectral-source-code": { heading: "Spectral, serif", body: "Source Code Pro, monospace" },
};

interface ReaderViewProps {
  book: Book;
  onClose: () => void;
  onUpdateProgress: (id: string, progress: number, lastLocation: string) => void;
  onAddBookmark?: (bookId: string, bookmark: Bookmark) => void;
  onRemoveBookmark?: (bookId: string, bookmarkId: string) => void;
}

const ReaderView: React.FC<ReaderViewProps> = ({ book, onClose, onUpdateProgress, onAddBookmark, onRemoveBookmark }) => {
  const {
    fontSize, setFontSize, lineHeight, immersiveMode, continuousMode, pageMargin, paragraphSpacing,
    textAlignment, setTextAlignment, fontPairing, dropCaps, maxTextWidth, hyphenation,
    readerForeground, readerBackground, readerAccent, setReaderForeground, setReaderBackground, reduceMotion,
  } = useSettings();

  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<any>(null);
  const bookRef = useRef<any>(null);
  const hideTimeoutRef = useRef<number | null>(null);
  const lastLocationRef = useRef<string | null>(book.lastLocation || null);
  const sessionStartRef = useRef<number>(Date.now());

  const [showControls, setShowControls] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [toc, setToc] = useState<any[]>([]);
  const [showToc, setShowToc] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sliderValue, setSliderValue] = useState(book.progress || 0);
  const [totalLocations, setTotalLocations] = useState(0);
  const [chapterTitle, setChapterTitle] = useState("");

  const { heading, body } = FONT_PAIRINGS[fontPairing] ?? FONT_PAIRINGS["merriweather-georgia"];

  // Session timer
  const [sessionTime, setSessionTime] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setSessionTime(Math.floor((Date.now() - sessionStartRef.current) / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (secs: number) => `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, "0")}`;

  // Estimated time
  const estimatedTimeLeft = React.useMemo(() => {
    const percent = currentLocation?.start?.percentage || 0;
    const pagesLeft = Math.round((1 - percent) * (book.totalPages || 250));
    const mins = Math.round(pagesLeft / 1.5);
    return mins < 60 ? `${mins}m left` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }, [currentLocation, book.totalPages]);

  // Theme presets
  const themePresets = [
    { name: "Light", bg: "#FFFFFF", fg: "#1a1a1a" },
    { name: "Sepia", bg: "#F4ECD8", fg: "#5C4B37" },
    { name: "Paper", bg: "#FAF9F6", fg: "#333333" },
    { name: "Dark", bg: "#1a1a1a", fg: "#E8E6E3" },
    { name: "Night", bg: "#0D1117", fg: "#C9D1D9" },
  ];

  const applyReaderTheme = useCallback(() => {
    if (!renditionRef.current) return;
    const themes = renditionRef.current.themes;
    const margin = Math.min(Math.max(pageMargin, 16), 80);
    const pGap = Math.max(Math.round(paragraphSpacing), 0);

    const styles: Record<string, Record<string, string>> = {
      "html, body": { background: `${readerBackground} !important`, color: `${readerForeground} !important`, margin: "0", padding: "0" },
      body: { 
        padding: `32px ${margin}px`, "max-width": `${maxTextWidth}ch`, margin: "0 auto",
        "font-family": body, "font-size": `${fontSize}px`, "line-height": `${lineHeight}`,
        "text-align": textAlignment, hyphens: hyphenation ? "auto" : "none",
        "-webkit-font-smoothing": "antialiased",
      },
      "h1,h2,h3,h4,h5,h6": { "font-family": heading, "font-weight": "700", "margin-top": `${pGap + 16}px`, "margin-bottom": `${pGap}px`, color: `${readerForeground} !important` },
      p: { "margin-bottom": `${pGap}px`, "text-indent": textAlignment === "justify" ? "1.5em" : "0", color: `${readerForeground} !important` },
      "p:first-of-type": { "text-indent": "0" },
      a: { color: `${readerAccent} !important` },
      blockquote: { "border-left": `3px solid ${readerAccent}`, "padding-left": "1em", "margin-left": "0", "font-style": "italic", opacity: "0.9" },
      img: { "max-width": "100%", height: "auto", "border-radius": "8px", margin: `${pGap}px auto`, display: "block" },
      "::selection": { background: `${readerAccent}40` },
    };

    if (dropCaps) {
      styles["p:first-of-type::first-letter"] = {
        "font-family": heading, "font-size": "3.5em", float: "left", "line-height": "0.8",
        "margin-right": "0.1em", "margin-top": "0.1em", "font-weight": "700", color: readerAccent,
      };
    }

    themes.register("custom", styles);
    themes.select("custom");
    themes.fontSize(`${fontSize}px`);

    const iframe = renditionRef.current?.manager?.container?.querySelector("iframe");
    if (iframe) { iframe.style.background = readerBackground; iframe.style.border = "none"; }
  }, [fontSize, lineHeight, pageMargin, paragraphSpacing, textAlignment, fontPairing, dropCaps, maxTextWidth, hyphenation, readerForeground, readerBackground, readerAccent, heading, body]);

  const applyThemeRef = useRef(applyReaderTheme);
  useEffect(() => { applyThemeRef.current = applyReaderTheme; }, [applyReaderTheme]);

  // Controls visibility
  const clearHideTimeout = useCallback(() => { if (hideTimeoutRef.current) { clearTimeout(hideTimeoutRef.current); hideTimeoutRef.current = null; } }, []);
  const scheduleHide = useCallback(() => {
    if (!immersiveMode) return;
    clearHideTimeout();
    hideTimeoutRef.current = window.setTimeout(() => setShowControls(false), 3000);
  }, [immersiveMode, clearHideTimeout]);
  const revealControls = useCallback(() => { setShowControls(true); scheduleHide(); }, [scheduleHide]);

  useEffect(() => () => clearHideTimeout(), [clearHideTimeout]);
  useEffect(() => { clearHideTimeout(); setShowControls(true); if (immersiveMode) scheduleHide(); }, [immersiveMode, clearHideTimeout, scheduleHide]);

  // Location change handler
  const onRelocated = useCallback((location: any) => {
    setCurrentLocation(location);
    const progress = Math.round(location.start.percentage * 100);
    const cfi = location.start.cfi;
    lastLocationRef.current = cfi;
    setSliderValue(progress);
    
    // Get chapter title
    if (bookRef.current?.navigation?.toc) {
      const chapter = bookRef.current.navigation.toc.find((t: any) => {
        const href = t.href.split("#")[0];
        return location.start.href?.includes(href);
      });
      setChapterTitle(chapter?.label || "");
    }
    
    if (!book.isIncognito) onUpdateProgress(book.id, progress, cfi);
  }, [book.id, book.isIncognito, onUpdateProgress]);

  // Initialize EPUB
  useEffect(() => {
    if (!viewerRef.current) return;
    setIsLoading(true);

    const epubBook = ePub();
    bookRef.current = epubBook;
    const rendition = epubBook.renderTo(viewerRef.current, {
      width: "100%", height: "100%", spread: "none",
      flow: continuousMode ? "scrolled-doc" : "paginated",
    });
    renditionRef.current = rendition;
    rendition.on("relocated", onRelocated);

    let cancelled = false;
    (async () => {
      try {
        await epubBook.open(await book.epubBlob.arrayBuffer(), "binary");
        await epubBook.ready;
        if (cancelled) return;
        setToc(epubBook.navigation?.toc || []);
        const locs = await epubBook.locations.generate(1024);
        setTotalLocations(locs.length);
        await rendition.display(book.lastLocation || undefined);
        applyThemeRef.current();
      } catch (e) { console.error("EPUB load error:", e); }
      finally { if (!cancelled) setIsLoading(false); }
    })();

    return () => {
      cancelled = true;
      try { rendition.off?.("relocated", onRelocated); rendition.destroy?.(); epubBook.destroy?.(); } catch {}
    };
  }, [book.id, book.epubBlob, book.lastLocation, onRelocated, continuousMode]);

  useEffect(() => { applyReaderTheme(); }, [applyReaderTheme]);

  useEffect(() => {
    const r = renditionRef.current;
    if (!r) return;
    r.flow(continuousMode ? "scrolled-doc" : "paginated");
    applyThemeRef.current();
    r.display(lastLocationRef.current || undefined);
  }, [continuousMode]);

  // Navigation
  const nextPage = () => { revealControls(); renditionRef.current?.next(); };
  const prevPage = () => { revealControls(); renditionRef.current?.prev(); };
  const goTo = (target: string) => { renditionRef.current?.display(target); setShowToc(false); setShowBookmarks(false); setShowHistory(false); revealControls(); };

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setSliderValue(val);
    if (bookRef.current?.locations && totalLocations > 0) {
      const cfi = bookRef.current.locations.cfiFromLocation(Math.floor((val / 100) * totalLocations));
      if (cfi) renditionRef.current?.display(cfi);
    }
  };

  const addBookmark = () => {
    if (!currentLocation || !onAddBookmark) return;
    onAddBookmark(book.id, {
      id: crypto.randomUUID(), cfi: currentLocation.start.cfi,
      title: chapterTitle || `Page ${currentLocation.start.displayed?.page || "?"}`,
      createdAt: new Date().toISOString(),
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const modal = showToc || showBookmarks || showHistory || showShortcuts || showSettings;
      if (modal && e.key === "Escape") { setShowToc(false); setShowBookmarks(false); setShowHistory(false); setShowShortcuts(false); setShowSettings(false); return; }
      if (modal) return;

      switch (e.key) {
        case "ArrowRight": case " ": e.preventDefault(); nextPage(); break;
        case "ArrowLeft": e.preventDefault(); prevPage(); break;
        case "t": case "T": e.preventDefault(); setShowToc(true); break;
        case "b": case "B": e.preventDefault(); setShowBookmarks(true); break;
        case "s": case "S": e.preventDefault(); setShowSettings(true); break;
        case "?": e.preventDefault(); setShowShortcuts(true); break;
        case "Escape": revealControls(); break;
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [showToc, showBookmarks, showHistory, showShortcuts, showSettings]);

  const progress = currentLocation ? Math.round(currentLocation.start.percentage * 100) : book.progress;
  const page = currentLocation?.start?.displayed?.page;
  const total = currentLocation?.start?.displayed?.total;

  // Modal component
  const Modal = ({ show, close, title, children, wide }: { show: boolean; close: () => void; title: string; children: React.ReactNode; wide?: boolean }) => {
    if (!show) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={close}>
        <div className={`bg-white dark:bg-dark-surface rounded-3xl shadow-2xl overflow-hidden flex flex-col ${wide ? "w-full max-w-2xl" : "w-full max-w-md"} max-h-[85vh]`} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-dark-card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            <button onClick={close} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: readerBackground }} onMouseMove={() => immersiveMode && revealControls()} onTouchStart={() => immersiveMode && revealControls()}>
      
      {/* Top Bar */}
      <header className={`flex-shrink-0 transition-all duration-300 ${showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"}`} style={{ background: `linear-gradient(to bottom, ${readerBackground}, transparent)` }}>
        <div className="flex items-center justify-between px-4 py-3 max-w-5xl mx-auto w-full">
          <button onClick={onClose} className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/90 dark:bg-dark-card/90 shadow-lg backdrop-blur-sm text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-dark-card transition-all">
            <ChevronLeft className="w-5 h-5" />
            <span className="font-medium text-sm hidden sm:inline">Library</span>
          </button>

          <div className="flex-1 text-center px-4 hidden md:block">
            <p className="text-sm font-medium truncate" style={{ color: readerForeground }}>{book.title}</p>
            {chapterTitle && <p className="text-xs opacity-60 truncate" style={{ color: readerForeground }}>{chapterTitle}</p>}
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full bg-white/90 dark:bg-dark-card/90 shadow-lg backdrop-blur-sm text-sm" style={{ color: readerForeground }}>
              <Clock className="w-4 h-4 opacity-60" />
              <span>{formatTime(sessionTime)}</span>
              <span className="opacity-40">•</span>
              <span className="opacity-70">{estimatedTimeLeft}</span>
            </div>
            <button onClick={() => setShowSettings(true)} className="p-2.5 rounded-full bg-white/90 dark:bg-dark-card/90 shadow-lg backdrop-blur-sm hover:bg-white dark:hover:bg-dark-card transition-all" title="Settings">
              <Type className="w-5 h-5" style={{ color: readerForeground }} />
            </button>
            <button onClick={addBookmark} className="p-2.5 rounded-full bg-white/90 dark:bg-dark-card/90 shadow-lg backdrop-blur-sm hover:bg-white dark:hover:bg-dark-card transition-all" title="Bookmark">
              <BookmarkIcon className="w-5 h-5" style={{ color: readerForeground }} />
            </button>
            <button onClick={() => setShowToc(true)} className="p-2.5 rounded-full bg-white/90 dark:bg-dark-card/90 shadow-lg backdrop-blur-sm hover:bg-white dark:hover:bg-dark-card transition-all" title="Contents">
              <List className="w-5 h-5" style={{ color: readerForeground }} />
            </button>
          </div>
        </div>
      </header>

      {/* Reader Content */}
      <main className="flex-1 relative overflow-hidden" onClick={() => immersiveMode ? revealControls() : setShowControls(c => !c)}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-3 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
              <p className="text-sm" style={{ color: readerForeground }}>Loading book...</p>
            </div>
          </div>
        )}
        <div ref={viewerRef} className={`w-full h-full max-w-5xl mx-auto transition-opacity duration-500 ${isLoading ? "opacity-0" : "opacity-100"}`} />
        
        {/* Page turn zones */}
        {!continuousMode && (
          <>
            <div onClick={e => { e.stopPropagation(); prevPage(); }} className="absolute left-0 top-0 w-1/4 h-full cursor-w-resize z-10" />
            <div onClick={e => { e.stopPropagation(); nextPage(); }} className="absolute right-0 top-0 w-1/4 h-full cursor-e-resize z-10" />
          </>
        )}
      </main>

      {/* Bottom Bar */}
      <footer className={`flex-shrink-0 transition-all duration-300 ${showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-full pointer-events-none"}`} style={{ background: `linear-gradient(to top, ${readerBackground}, transparent)` }}>
        <div className="px-4 py-4 max-w-3xl mx-auto w-full space-y-3">
          {/* Progress slider */}
          <div className="relative">
            <input type="range" min="0" max="100" value={sliderValue} onChange={handleSlider}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{ background: `linear-gradient(to right, ${readerAccent} ${sliderValue}%, ${readerForeground}15 ${sliderValue}%)` }} />
          </div>
          
          {/* Info row */}
          <div className="flex items-center justify-between text-sm" style={{ color: readerForeground }}>
            <span className="opacity-70">{continuousMode ? "Scroll" : `${page || "-"} / ${total || "-"}`}</span>
            <div className="flex items-center gap-4">
              <button onClick={() => setShowHistory(true)} className="opacity-60 hover:opacity-100 transition-opacity"><History className="w-4 h-4" /></button>
              <button onClick={() => setShowBookmarks(true)} className="opacity-60 hover:opacity-100 transition-opacity"><BookmarkIcon className="w-4 h-4" /></button>
              <button onClick={() => setShowShortcuts(true)} className="opacity-60 hover:opacity-100 transition-opacity"><Keyboard className="w-4 h-4" /></button>
            </div>
            <span className="font-medium">{progress}%</span>
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      <Modal show={showSettings} close={() => setShowSettings(false)} title="Reading Settings" wide>
        <div className="p-6 space-y-8">
          {/* Theme presets */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">Theme</label>
            <div className="flex gap-3">
              {themePresets.map(t => (
                <button key={t.name} onClick={() => { setReaderBackground(t.bg); setReaderForeground(t.fg); }}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${readerBackground === t.bg ? "border-blue-500 shadow-lg" : "border-gray-200 dark:border-dark-card hover:border-gray-300"}`}
                  style={{ background: t.bg }}>
                  <span className="text-xs font-medium" style={{ color: t.fg }}>{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Font size */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">Font Size: {fontSize}px</label>
            <div className="flex items-center gap-4">
              <button onClick={() => setFontSize(Math.max(14, fontSize - 2))} className="p-3 rounded-xl bg-gray-100 dark:bg-dark-card hover:bg-gray-200 dark:hover:bg-dark-card/80 transition-colors"><Minus className="w-5 h-5" /></button>
              <input type="range" min="14" max="28" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="flex-1 h-2 rounded-full appearance-none cursor-pointer bg-gray-200 dark:bg-dark-card" />
              <button onClick={() => setFontSize(Math.min(28, fontSize + 2))} className="p-3 rounded-xl bg-gray-100 dark:bg-dark-card hover:bg-gray-200 dark:hover:bg-dark-card/80 transition-colors"><Plus className="w-5 h-5" /></button>
            </div>
          </div>

          {/* Alignment */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">Alignment</label>
            <div className="flex gap-2">
              {[{ v: "left", i: AlignLeft }, { v: "justify", i: AlignJustify }].map(({ v, i: Icon }) => (
                <button key={v} onClick={() => setTextAlignment(v as "left" | "justify")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${textAlignment === v ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-200"}`}>
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium capitalize">{v}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* TOC Modal */}
      <Modal show={showToc} close={() => setShowToc(false)} title="Contents">
        <div className="p-2">
          {toc.length === 0 ? <p className="p-4 text-center text-gray-500">No table of contents</p> : (
            <ul className="space-y-1">
              {toc.map((item, i) => (
                <li key={i}>
                  <button onClick={() => goTo(item.href)} className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-card transition-colors text-gray-800 dark:text-gray-200">{item.label}</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      {/* Bookmarks Modal */}
      <Modal show={showBookmarks} close={() => setShowBookmarks(false)} title="Bookmarks">
        <div className="p-2">
          {!book.bookmarks?.length ? <p className="p-4 text-center text-gray-500">No bookmarks yet</p> : (
            <ul className="space-y-1">
              {book.bookmarks.map(bm => (
                <li key={bm.id} className="flex items-center gap-2">
                  <button onClick={() => goTo(bm.cfi)} className="flex-1 text-left px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-card transition-colors text-gray-800 dark:text-gray-200">{bm.title}</button>
                  {onRemoveBookmark && <button onClick={() => onRemoveBookmark(book.id, bm.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><X className="w-4 h-4" /></button>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      {/* History Modal */}
      <Modal show={showHistory} close={() => setShowHistory(false)} title="Reading History">
        <div className="p-2">
          {!book.locationHistory?.length ? <p className="p-4 text-center text-gray-500">No history yet</p> : (
            <ul className="space-y-1">
              {book.locationHistory.slice().reverse().map((cfi, i) => (
                <li key={i}>
                  <button onClick={() => goTo(cfi)} className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-card transition-colors flex items-center gap-3 text-gray-800 dark:text-gray-200">
                    <History className="w-4 h-4 opacity-50" />Previous location {i + 1}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      {/* Shortcuts Modal */}
      <Modal show={showShortcuts} close={() => setShowShortcuts(false)} title="Keyboard Shortcuts">
        <div className="p-6 space-y-4">
          {[["← / →", "Navigate pages"], ["Space", "Next page"], ["T", "Table of contents"], ["B", "Bookmarks"], ["S", "Settings"], ["?", "Shortcuts"], ["Esc", "Toggle controls"]].map(([k, d]) => (
            <div key={k} className="flex items-center justify-between">
              <kbd className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-dark-card text-sm font-mono text-gray-700 dark:text-gray-300">{k}</kbd>
              <span className="text-sm text-gray-600 dark:text-gray-400">{d}</span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default ReaderView;
