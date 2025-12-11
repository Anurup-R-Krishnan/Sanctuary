import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Book, Bookmark } from "../types";
import { useSettings } from "../context/SettingsContext";
import {
  ChevronLeft,
  ChevronRight,
  List,
  Bookmark as BookmarkIcon,
  Settings2,
  X,
  Minus,
  Plus,
  Maximize2,
  Minimize2,
  BookOpen,
  Clock,
  RotateCcw,
  Loader2,
  AlertCircle,
  Search,
  Sun,
  Moon,
  Type,
  AlignLeft,
  AlignJustify,
  Sparkles,
  Palette,
  BookMarked,
  Trash2,
  Eye,
  EyeOff,
  Columns,
  FileText,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Home,
} from "lucide-react";
import ePub, { Book as EpubBook, Rendition } from "epubjs";

interface ReaderViewProps {
  book: Book;
  onClose: () => void;
  onUpdateProgress: (id: string, progress: number, lastLocation: string) => void;
  onAddBookmark?: (bookId: string, bookmark: Bookmark) => void;
  onRemoveBookmark?: (bookId: string, bookmarkId: string) => void;
}

// Premium theme presets
const THEMES = [
  { id: "paper", bg: "#ffffff", fg: "#1a1a1a", name: "Paper", icon: "☀️" },
  { id: "cream", bg: "#fdf8f0", fg: "#3d3929", name: "Cream", icon: "🌾" },
  { id: "sepia", bg: "#f4ecd8", fg: "#5b4636", name: "Sepia", icon: "📜" },
  { id: "sage", bg: "#e8efe5", fg: "#2d3a29", name: "Sage", icon: "🌿" },
  { id: "dusk", bg: "#2d2d3a", fg: "#c9c9d4", name: "Dusk", icon: "🌆" },
  { id: "midnight", bg: "#1a1a1e", fg: "#e0e0e0", name: "Midnight", icon: "🌙" },
  { id: "amoled", bg: "#000000", fg: "#b0b0b0", name: "AMOLED", icon: "⬛" },
  { id: "ocean", bg: "#1a2634", fg: "#a8c7d8", name: "Ocean", icon: "🌊" },
];

// Premium font options
const FONTS = [
  { id: "crimson", name: "Crimson Pro", family: "'Crimson Pro', serif", style: "Classic" },
  { id: "georgia", name: "Georgia", family: "Georgia, serif", style: "Traditional" },
  { id: "inter", name: "Inter", family: "'Inter', sans-serif", style: "Modern" },
  { id: "literata", name: "Literata", family: "'Literata', serif", style: "Book" },
  { id: "atkinson", name: "Atkinson", family: "'Atkinson Hyperlegible', sans-serif", style: "Accessible" },
];

export default function ReaderView({
  book,
  onClose,
  onUpdateProgress,
  onAddBookmark,
  onRemoveBookmark,
}: ReaderViewProps) {
  const {
    fontSize,
    setFontSize,
    lineHeight,
    setLineHeight,
    readerForeground,
    readerBackground,
    setReaderForeground,
    setReaderBackground,
    pageMargin,
    setPageMargin,
    paragraphSpacing,
    setParagraphSpacing,
    dropCaps,
    setDropCaps,
    hyphenation,
    setHyphenation,
    textAlignment,
    setTextAlignment,
    continuousMode,
    setContinuousMode,
  } = useSettings();

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const epubRef = useRef<EpubBook | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const progressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Core states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toc, setToc] = useState<any[]>([]);
  const [progress, setProgress] = useState(book.progress || 0);
  const [chapter, setChapter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // UI states
  const [panel, setPanel] = useState<"toc" | "settings" | "search" | "bookmarks" | null>(null);
  const [settingsTab, setSettingsTab] = useState<"theme" | "typography" | "layout">("theme");
  const [showUI, setShowUI] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontFamily, setFontFamily] = useState("crimson");

  // Reading stats
  const [readingTime, setReadingTime] = useState(0);
  const [sessionStartTime] = useState(Date.now());

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Determine if theme is dark
  const isDarkTheme = useMemo(() => {
    const brightness =
      parseInt(readerBackground.slice(1, 3), 16) * 0.299 +
      parseInt(readerBackground.slice(3, 5), 16) * 0.587 +
      parseInt(readerBackground.slice(5, 7), 16) * 0.114;
    return brightness < 128;
  }, [readerBackground]);

  // Generate reader CSS
  const generateCSS = useCallback(() => {
    const font = FONTS.find((f) => f.id === fontFamily) || FONTS[0];
    const alignment = textAlignment || "justify";

    return `
      @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,500;0,7..72,600;1,7..72,400&display=swap');
      
      html, body {
        background: ${readerBackground} !important;
        color: ${readerForeground} !important;
        font-family: ${font.family} !important;
        font-size: ${fontSize}px !important;
        line-height: ${lineHeight} !important;
        margin: 0 !important;
        padding: ${pageMargin}px !important;
        transition: background 0.3s ease, color 0.3s ease !important;
        -webkit-font-smoothing: antialiased !important;
        text-rendering: optimizeLegibility !important;
      }
      
      p {
        margin: 0 0 ${paragraphSpacing}px 0 !important;
        color: ${readerForeground} !important;
        text-align: ${alignment} !important;
        ${hyphenation ? "hyphens: auto !important; -webkit-hyphens: auto !important;" : ""}
        word-wrap: break-word !important;
        orphans: 2 !important;
        widows: 2 !important;
      }
      
      ${dropCaps
        ? `
        section > p:first-of-type::first-letter,
        .chapter > p:first-of-type::first-letter,
        body > p:first-of-type::first-letter {
          font-size: 3.5em !important;
          float: left !important;
          line-height: 0.8 !important;
          margin: 0.05em 0.12em 0 0 !important;
          font-weight: 600 !important;
          color: ${readerForeground} !important;
        }
      `
        : ""
      }
      
      h1, h2, h3, h4, h5, h6 {
        font-family: ${font.family} !important;
        color: ${readerForeground} !important;
        margin-top: 1.5em !important;
        margin-bottom: 0.5em !important;
        font-weight: 600 !important;
        letter-spacing: -0.02em !important;
      }
      
      h1 { font-size: 2em !important; }
      h2 { font-size: 1.6em !important; }
      h3 { font-size: 1.3em !important; }
      
      a {
        color: ${readerForeground} !important;
        text-decoration: underline !important;
        text-decoration-color: ${readerForeground}40 !important;
        text-underline-offset: 3px !important;
        transition: text-decoration-color 0.2s ease !important;
      }
      
      a:hover {
        text-decoration-color: ${readerForeground} !important;
      }
      
      blockquote {
        border-left: 3px solid ${readerForeground}30 !important;
        padding-left: 1.5em !important;
        margin-left: 0 !important;
        font-style: italic !important;
        opacity: 0.9 !important;
      }
      
      img {
        max-width: 100% !important;
        height: auto !important;
        border-radius: 8px !important;
        margin: 1em auto !important;
        display: block !important;
      }
      
      ::selection {
        background: rgba(184, 149, 108, 0.35) !important;
        color: inherit !important;
      }
      
      code, pre {
        font-family: 'JetBrains Mono', 'Fira Code', monospace !important;
        font-size: 0.9em !important;
        background: ${readerForeground}08 !important;
        padding: 0.2em 0.4em !important;
        border-radius: 4px !important;
      }
      
      pre {
        padding: 1em !important;
        overflow-x: auto !important;
      }
      
      hr {
        border: none !important;
        height: 1px !important;
        background: ${readerForeground}20 !important;
        margin: 2em 0 !important;
      }
      
      *, div, section, article, main, aside, nav, header, footer {
        background: transparent !important;
        color: ${readerForeground} !important;
      }
      
      table {
        border-collapse: collapse !important;
        margin: 1em 0 !important;
      }
      
      th, td {
        border: 1px solid ${readerForeground}20 !important;
        padding: 0.5em 1em !important;
      }
    `;
  }, [
    fontSize,
    lineHeight,
    readerForeground,
    readerBackground,
    fontFamily,
    pageMargin,
    paragraphSpacing,
    dropCaps,
    hyphenation,
    textAlignment,
  ]);

  // Inject styles into epub iframe
  const injectStyles = useCallback(
    (contents: any) => {
      if (!contents?.document) return;
      const doc = contents.document;
      const css = generateCSS();
      let style = doc.getElementById("sanctuary-reader-styles");
      if (style) {
        style.textContent = css;
        return;
      }
      style = doc.createElement("style");
      style.id = "sanctuary-reader-styles";
      style.textContent = css;
      (doc.head || doc.body).appendChild(style);
    },
    [generateCSS]
  );

  // Initialize EPUB
  useEffect(() => {
    if (!containerRef.current || !book.epubBlob) {
      if (!book.epubBlob) setError("Book content is missing. Please re-add the book.");
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    const init = async () => {
      try {
        const buffer = await book.epubBlob.arrayBuffer();
        if (!mounted) return;

        const epub = ePub(buffer);
        epubRef.current = epub;

        await epub.ready;
        if (!mounted) return;

        // Set table of contents
        setToc(epub.navigation?.toc || []);

        // Create rendition
        const rendition = epub.renderTo(containerRef.current!, {
          width: "100%",
          height: "100%",
          flow: continuousMode ? "scrolled" : "paginated",
          spread: "none",
          manager: continuousMode ? "continuous" : "default",
        } as any);

        renditionRef.current = rendition;

        // Hook into content loading to inject styles
        rendition.hooks.content.register((contents: any) => {
          if (mounted) injectStyles(contents);
        });

        // Handle location changes
        rendition.on("relocated", (loc: any) => {
          if (!mounted) return;

          const pct = Math.round((loc.start?.percentage || 0) * 100);
          setProgress(pct);

          // Update chapter name
          const href = loc.start?.href;
          if (href && epub.navigation?.toc) {
            const foundChapter = epub.navigation.toc.find((t: any) =>
              href.includes(t.href?.split("#")[0])
            );
            if (foundChapter) {
              setChapter(foundChapter.label?.trim() || "");
            }
          }

          // Debounced progress save
          if (!book.isIncognito && loc.start?.cfi) {
            if (progressTimeoutRef.current) {
              clearTimeout(progressTimeoutRef.current);
            }
            progressTimeoutRef.current = setTimeout(() => {
              onUpdateProgress(book.id, pct, loc.start.cfi);
            }, 500);
          }
        });

        // Generate locations for accurate page numbers
        epub.locations.generate(1024).then(() => {
          if (!mounted) return;
          const totalLocations = epub.locations.length();
          setTotalPages(totalLocations);
          // Estimate reading time: ~250 words per page, ~200 WPM
          setReadingTime(Math.ceil((totalLocations * 250) / 200));
        });

        // Display from last location or start
        if (book.lastLocation) {
          await rendition.display(book.lastLocation);
        } else {
          await rendition.display();
        }

        if (mounted) setLoading(false);
      } catch (e: any) {
        console.error("EPUB initialization failed:", e);
        if (mounted) {
          setError(e?.message || "Failed to load book. The file may be corrupted.");
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
      if (progressTimeoutRef.current) {
        clearTimeout(progressTimeoutRef.current);
      }
      renditionRef.current?.destroy();
      epubRef.current?.destroy();
    };
  }, [book.id, book.epubBlob, continuousMode]);

  // Re-inject styles when settings change
  useEffect(() => {
    if (!renditionRef.current || loading) return;
    const views = (renditionRef.current as any).views();
    if (views?._views) {
      views._views.forEach((v: any) => {
        if (v?.contents) injectStyles(v.contents);
      });
    }
  }, [
    injectStyles,
    loading,
    fontSize,
    fontFamily,
    readerBackground,
    readerForeground,
    lineHeight,
    paragraphSpacing,
    dropCaps,
    pageMargin,
    hyphenation,
    textAlignment,
  ]);

  // Navigation functions
  const goNext = useCallback(() => {
    renditionRef.current?.next();
  }, []);

  const goPrev = useCallback(() => {
    renditionRef.current?.prev();
  }, []);

  const goTo = useCallback((href: string) => {
    renditionRef.current?.display(href);
    setPanel(null);
  }, []);

  const goToPercentage = useCallback((pct: number) => {
    const cfi = epubRef.current?.locations?.cfiFromPercentage(pct);
    if (cfi) renditionRef.current?.display(cfi);
  }, []);

  // Search functionality
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim() || !epubRef.current) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const epub = epubRef.current as any;
      const results = await Promise.all(
        epub.spine.spineItems.map(async (item: any) => {
          try {
            const doc = await item.load(epub.load.bind(epub));
            const text = doc.textContent || "";
            const matches: any[] = [];
            let idx = 0;
            const lowerQuery = query.toLowerCase();
            const lowerText = text.toLowerCase();

            while ((idx = lowerText.indexOf(lowerQuery, idx)) !== -1) {
              const start = Math.max(0, idx - 50);
              const end = Math.min(text.length, idx + query.length + 50);
              matches.push({
                excerpt: (start > 0 ? "..." : "") + text.substring(start, end) + (end < text.length ? "..." : ""),
                href: item.href,
                index: idx,
              });
              idx += query.length;
            }
            return matches;
          } catch {
            return [];
          }
        })
      );
      setSearchResults(results.flat().slice(0, 100));
    } catch (e) {
      console.error("Search failed:", e);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if in search input
      if (e.target instanceof HTMLInputElement) return;

      if (panel) {
        if (e.key === "Escape") setPanel(null);
        return;
      }

      switch (e.key) {
        case "ArrowRight":
        case " ":
          e.preventDefault();
          goNext();
          break;
        case "ArrowLeft":
          e.preventDefault();
          goPrev();
          break;
        case "Escape":
          setShowUI((s) => !s);
          break;
        case "f":
          if (!e.metaKey && !e.ctrlKey) toggleFullscreen();
          break;
        case "t":
          if (!e.metaKey && !e.ctrlKey) setPanel("toc");
          break;
        case "s":
          if (!e.metaKey && !e.ctrlKey) setPanel("settings");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [panel, goNext, goPrev]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Handle fullscreen changes from other sources
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Bookmark handling
  const handleAddBookmark = useCallback(() => {
    const cfi = renditionRef.current?.location?.start?.cfi;
    if (!onAddBookmark || !cfi) return;
    onAddBookmark(book.id, {
      id: crypto.randomUUID(),
      cfi,
      title: chapter || `Page ${progress}%`,
      createdAt: new Date().toISOString(),
    });
  }, [book.id, chapter, progress, onAddBookmark]);

  const handleRemoveBookmark = useCallback(
    (bookmarkId: string) => {
      if (onRemoveBookmark) {
        onRemoveBookmark(book.id, bookmarkId);
      }
    },
    [book.id, onRemoveBookmark]
  );

  const isCurrentLocationBookmarked = useMemo(() => {
    const currentCfi = renditionRef.current?.location?.start?.cfi;
    return book.bookmarks?.some((b) => b.cfi === currentCfi);
  }, [book.bookmarks, progress]);

  // Calculate session time
  const sessionTime = useMemo(() => {
    const minutes = Math.floor((Date.now() - sessionStartTime) / 60000);
    return minutes;
  }, [sessionStartTime, progress]);

  // Estimated time remaining
  const timeRemaining = useMemo(() => {
    const remaining = Math.ceil((readingTime * (100 - progress)) / 100);
    if (remaining >= 60) {
      return `${Math.floor(remaining / 60)}h ${remaining % 60}m`;
    }
    return `${remaining} min`;
  }, [readingTime, progress]);

  // Slider change handler
  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const pct = Number(e.target.value) / 100;
      goToPercentage(pct);
    },
    [goToPercentage]
  );

  // Error state
  if (error) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center"
        style={{ background: readerBackground }}
      >
        <div className="text-center p-8 max-w-md animate-fadeInUp">
          <div className="w-20 h-20 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-serif font-semibold mb-4" style={{ color: readerForeground }}>
            Unable to Open Book
          </h2>
          <p className="text-base mb-10 opacity-60 leading-relaxed" style={{ color: readerForeground }}>
            {error}
          </p>
          <button
            onClick={onClose}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 transition-all duration-300 hover:-translate-y-1"
          >
            Return to Library
          </button>
        </div>
      </div>
    );
  }

  // Panel overlay background opacity
  const overlayBg = isDarkTheme ? "bg-black/40" : "bg-black/20";

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col transition-colors duration-500"
      style={{ background: readerBackground }}
    >
      {/* ═══════════════════════════════════════════════════════════════════════
          TOP NAVIGATION BAR
      ═══════════════════════════════════════════════════════════════════════ */}
      <header
        className={`absolute top-0 left-0 right-0 z-30 transition-all duration-500 ease-out ${showUI ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
          }`}
      >
        <div
          className="flex items-center justify-between px-6 py-4 backdrop-blur-2xl border-b"
          style={{
            background: `${readerBackground}e6`,
            borderColor: `${readerForeground}10`,
          }}
        >
          {/* Left: Back button */}
          <button
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:scale-105"
            style={{ color: readerForeground }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
              style={{ background: `${readerForeground}08` }}
            >
              <Home className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium hidden sm:inline opacity-80">Library</span>
          </button>

          {/* Center: Book info */}
          <div className="absolute left-1/2 -translate-x-1/2 text-center hidden md:block max-w-md">
            <h1
              className="text-sm font-semibold truncate"
              style={{ color: readerForeground }}
            >
              {book.title}
            </h1>
            <p
              className="text-xs opacity-50 truncate mt-0.5"
              style={{ color: readerForeground }}
            >
              {book.author}
            </p>
          </div>

          {/* Right: Action buttons */}
          <div className="flex items-center gap-1">
            {[
              { icon: List, action: () => setPanel(panel === "toc" ? null : "toc"), label: "Contents", active: panel === "toc" },
              { icon: Search, action: () => setPanel(panel === "search" ? null : "search"), label: "Search", active: panel === "search" },
              {
                icon: BookmarkIcon,
                action: handleAddBookmark,
                label: "Bookmark",
                active: isCurrentLocationBookmarked,
                fill: isCurrentLocationBookmarked,
              },
              {
                icon: BookMarked,
                action: () => setPanel(panel === "bookmarks" ? null : "bookmarks"),
                label: "Bookmarks",
                active: panel === "bookmarks",
                hidden: !book.bookmarks?.length,
              },
              { icon: Settings2, action: () => setPanel(panel === "settings" ? null : "settings"), label: "Settings", active: panel === "settings" },
              {
                icon: isFullscreen ? Minimize2 : Maximize2,
                action: toggleFullscreen,
                label: isFullscreen ? "Exit Fullscreen" : "Fullscreen",
                hiddenMobile: true,
              },
            ]
              .filter((btn) => !btn.hidden)
              .map((btn, i) => (
                <button
                  key={i}
                  onClick={btn.action}
                  className={`p-3 rounded-xl transition-all duration-200 hover:scale-105 ${btn.hiddenMobile ? "hidden sm:flex" : "flex"
                    }`}
                  style={{
                    color: btn.active ? "#b8956c" : readerForeground,
                    background: btn.active ? `${readerForeground}08` : "transparent",
                  }}
                  title={btn.label}
                >
                  <btn.icon className="w-5 h-5" fill={btn.fill ? "currentColor" : "none"} />
                </button>
              ))}
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════
          MAIN READER AREA
      ═══════════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 relative overflow-hidden">
        {/* Loading state */}
        {loading && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-20"
            style={{ background: readerBackground }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400/30 to-orange-500/30 rounded-3xl blur-2xl scale-150 animate-pulse" />
              <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-2xl shadow-amber-500/30">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-base font-medium" style={{ color: readerForeground }}>
                Opening your book...
              </p>
              <p className="text-sm opacity-40 mt-1" style={{ color: readerForeground }}>
                {book.title}
              </p>
            </div>
          </div>
        )}

        {/* EPUB container */}
        <div
          ref={containerRef}
          className="w-full h-full transition-opacity duration-500"
          style={{ opacity: loading ? 0 : 1 }}
          onClick={() => setShowUI((s) => !s)}
        />

        {/* Navigation arrows */}
        {!loading && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className={`absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 group transition-all duration-500 ${showUI ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
            >
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl backdrop-blur-xl border flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-active:scale-95"
                style={{
                  background: `${readerBackground}cc`,
                  borderColor: `${readerForeground}10`,
                  color: readerForeground,
                }}
              >
                <ChevronLeft className="w-6 h-6 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className={`absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 group transition-all duration-500 ${showUI ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
            >
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl backdrop-blur-xl border flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-active:scale-95"
                style={{
                  background: `${readerBackground}cc`,
                  borderColor: `${readerForeground}10`,
                  color: readerForeground,
                }}
              >
                <ChevronRight className="w-6 h-6 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          </>
        )}
      </main>

      {/* ═══════════════════════════════════════════════════════════════════════
          BOTTOM PROGRESS BAR
      ═══════════════════════════════════════════════════════════════════════ */}
      <footer
        className={`absolute bottom-0 left-0 right-0 z-30 transition-all duration-500 ease-out ${showUI ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
          }`}
      >
        <div
          className="px-6 py-5 backdrop-blur-2xl border-t"
          style={{
            background: `${readerBackground}e6`,
            borderColor: `${readerForeground}10`,
          }}
        >
          <div className="max-w-3xl mx-auto space-y-4">
            {/* Progress slider */}
            <div className="flex items-center gap-4">
              <span
                className="text-sm font-semibold w-12 text-right tabular-nums"
                style={{ color: readerForeground }}
              >
                {progress}%
              </span>
              <div className="relative flex-1 h-8 flex items-center group">
                {/* Track background */}
                <div
                  className="absolute inset-x-0 h-1.5 rounded-full"
                  style={{ background: `${readerForeground}15` }}
                />
                {/* Filled track */}
                <div
                  className="absolute left-0 h-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
                {/* Thumb indicator */}
                <div
                  className="absolute h-4 w-4 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30 transition-transform duration-150 group-hover:scale-125"
                  style={{ left: `calc(${progress}% - 8px)` }}
                />
                {/* Invisible range input */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={handleSliderChange}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer"
                />
              </div>
              <span
                className="text-sm font-semibold w-12 tabular-nums"
                style={{ color: readerForeground }}
              >
                100%
              </span>
            </div>

            {/* Stats row */}
            <div
              className="flex items-center justify-between text-xs"
              style={{ color: `${readerForeground}80` }}
            >
              <div className="flex items-center gap-5">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 opacity-60" />
                  <span className="font-medium">{timeRemaining} left</span>
                </span>
                <span className="flex items-center gap-2 max-w-[200px]">
                  <BookOpen className="w-4 h-4 opacity-60 shrink-0" />
                  <span className="font-medium truncate">{chapter || "—"}</span>
                </span>
              </div>
              <div className="flex items-center gap-5">
                {sessionTime > 0 && (
                  <span className="hidden sm:flex items-center gap-2">
                    <Sparkles className="w-4 h-4 opacity-60" />
                    <span className="font-medium">{sessionTime}m this session</span>
                  </span>
                )}
                <span className="font-medium tabular-nums">
                  {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* ═══════════════════════════════════════════════════════════════════════
          PANEL OVERLAY
      ═══════════════════════════════════════════════════════════════════════ */}
      {panel && (
        <div
          className={`fixed inset-0 ${overlayBg} backdrop-blur-sm z-40 animate-fadeIn`}
          onClick={() => setPanel(null)}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SETTINGS PANEL
      ═══════════════════════════════════════════════════════════════════════ */}
      <div
        className={`fixed top-0 right-0 h-full w-[380px] max-w-[92vw] z-50 shadow-2xl transition-transform duration-500 ease-out ${panel === "settings" ? "translate-x-0" : "translate-x-full"
          }`}
        style={{ background: readerBackground }}
      >
        <div className="flex flex-col h-full">
          {/* Panel header */}
          <div
            className="flex items-center justify-between px-6 py-5 border-b"
            style={{ borderColor: `${readerForeground}10` }}
          >
            <h3 className="font-serif text-xl font-semibold" style={{ color: readerForeground }}>
              Reading Settings
            </h3>
            <button
              onClick={() => setPanel(null)}
              className="p-2.5 rounded-xl transition-colors"
              style={{ color: readerForeground }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Settings tabs */}
          <div
            className="flex gap-1 px-6 py-3 border-b"
            style={{ borderColor: `${readerForeground}08` }}
          >
            {[
              { id: "theme", icon: Palette, label: "Theme" },
              { id: "typography", icon: Type, label: "Text" },
              { id: "layout", icon: FileText, label: "Layout" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSettingsTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200`}
                style={{
                  background: settingsTab === tab.id ? `${readerForeground}10` : "transparent",
                  color: settingsTab === tab.id ? readerForeground : `${readerForeground}60`,
                }}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Settings content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Theme tab */}
            {settingsTab === "theme" && (
              <>
                <section>
                  <h4
                    className="text-xs font-bold uppercase tracking-wider mb-4 opacity-50"
                    style={{ color: readerForeground }}
                  >
                    Color Theme
                  </h4>
                  <div className="grid grid-cols-4 gap-3">
                    {THEMES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setReaderBackground(t.bg);
                          setReaderForeground(t.fg);
                        }}
                        className={`aspect-square rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-1.5 hover:scale-105 ${readerBackground === t.bg ? "ring-2 ring-amber-500 ring-offset-2" : ""
                          }`}
                        style={{
                          background: t.bg,
                          borderColor: readerBackground === t.bg ? "#b8956c" : `${t.fg}15`,
                          ringOffsetColor: readerBackground,
                        }}
                      >
                        <span className="text-lg">{t.icon}</span>
                        <span className="text-[10px] font-medium" style={{ color: t.fg }}>
                          {t.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              </>
            )}

            {/* Typography tab */}
            {settingsTab === "typography" && (
              <>
                <section>
                  <h4
                    className="text-xs font-bold uppercase tracking-wider mb-4 opacity-50"
                    style={{ color: readerForeground }}
                  >
                    Font Family
                  </h4>
                  <div className="space-y-2">
                    {FONTS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setFontFamily(f.id)}
                        className={`w-full px-5 py-4 rounded-2xl text-left transition-all duration-200 border ${fontFamily === f.id ? "border-amber-500/50" : ""
                          }`}
                        style={{
                          fontFamily: f.family,
                          background: fontFamily === f.id ? `${readerForeground}08` : "transparent",
                          color: readerForeground,
                          borderColor: fontFamily === f.id ? "#b8956c50" : `${readerForeground}10`,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base">{f.name}</span>
                          <span
                            className="text-xs opacity-40"
                            style={{ fontFamily: "'Inter', sans-serif" }}
                          >
                            {f.style}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <h4
                    className="text-xs font-bold uppercase tracking-wider mb-4 opacity-50"
                    style={{ color: readerForeground }}
                  >
                    Font Size
                  </h4>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setFontSize(Math.max(12, fontSize - 1))}
                      className="w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                      style={{ background: `${readerForeground}08`, color: readerForeground }}
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <div className="flex-1 text-center">
                      <span
                        className="text-3xl font-semibold tabular-nums"
                        style={{ color: readerForeground }}
                      >
                        {fontSize}
                      </span>
                      <span className="text-sm opacity-40 ml-1" style={{ color: readerForeground }}>
                        px
                      </span>
                    </div>
                    <button
                      onClick={() => setFontSize(Math.min(32, fontSize + 1))}
                      className="w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                      style={{ background: `${readerForeground}08`, color: readerForeground }}
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </section>

                <section>
                  <h4
                    className="text-xs font-bold uppercase tracking-wider mb-4 opacity-50"
                    style={{ color: readerForeground }}
                  >
                    Text Alignment
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "left", icon: AlignLeft, label: "Left" },
                      { id: "justify", icon: AlignJustify, label: "Justify" },
                    ].map((align) => (
                      <button
                        key={align.id}
                        onClick={() => setTextAlignment(align.id as any)}
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all duration-200 border`}
                        style={{
                          background: textAlignment === align.id ? `${readerForeground}08` : "transparent",
                          color: readerForeground,
                          borderColor: textAlignment === align.id ? "#b8956c50" : `${readerForeground}10`,
                        }}
                      >
                        <align.icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{align.label}</span>
                      </button>
                    ))}
                  </div>
                </section>
              </>
            )}

            {/* Layout tab */}
            {settingsTab === "layout" && (
              <>
                {[
                  {
                    label: "Line Height",
                    value: lineHeight,
                    min: 1.2,
                    max: 2.4,
                    step: 0.1,
                    set: setLineHeight,
                    format: (v: number) => v.toFixed(1),
                  },
                  {
                    label: "Paragraph Spacing",
                    value: paragraphSpacing,
                    min: 0,
                    max: 40,
                    step: 4,
                    set: setParagraphSpacing,
                    format: (v: number) => `${v}px`,
                  },
                  {
                    label: "Page Margin",
                    value: pageMargin,
                    min: 0,
                    max: 100,
                    step: 10,
                    set: setPageMargin,
                    format: (v: number) => `${v}px`,
                  },
                ].map((setting, i) => (
                  <section key={i}>
                    <div
                      className="flex justify-between items-center text-sm mb-3"
                      style={{ color: readerForeground }}
                    >
                      <span className="opacity-70">{setting.label}</span>
                      <span className="font-semibold tabular-nums">{setting.format(setting.value)}</span>
                    </div>
                    <input
                      type="range"
                      min={setting.min}
                      max={setting.max}
                      step={setting.step}
                      value={setting.value}
                      onChange={(e) => setting.set(Number(e.target.value))}
                      className="w-full range-input"
                    />
                  </section>
                ))}

                <section className="space-y-3">
                  <h4
                    className="text-xs font-bold uppercase tracking-wider mb-4 opacity-50"
                    style={{ color: readerForeground }}
                  >
                    Options
                  </h4>
                  {[
                    { label: "Drop Caps", value: dropCaps, set: setDropCaps, description: "Decorative first letter" },
                    { label: "Hyphenation", value: hyphenation, set: setHyphenation, description: "Break long words" },
                  ].map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => opt.set(!opt.value)}
                      className="w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-200"
                      style={{ background: `${readerForeground}05` }}
                    >
                      <div>
                        <span className="text-sm font-medium block" style={{ color: readerForeground }}>
                          {opt.label}
                        </span>
                        <span className="text-xs opacity-40" style={{ color: readerForeground }}>
                          {opt.description}
                        </span>
                      </div>
                      <div
                        className={`w-12 h-7 rounded-full transition-all duration-300 relative ${opt.value ? "bg-gradient-to-r from-amber-500 to-orange-500" : ""
                          }`}
                        style={{ background: opt.value ? undefined : `${readerForeground}20` }}
                      >
                        <div
                          className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${opt.value ? "translate-x-5" : ""
                            }`}
                        />
                      </div>
                    </button>
                  ))}
                </section>
              </>
            )}

            {/* Reset button */}
            <button
              onClick={() => {
                setFontSize(19);
                setLineHeight(1.85);
                setFontFamily("crimson");
                setReaderBackground("#ffffff");
                setReaderForeground("#1a1a1a");
                setPageMargin(40);
                setParagraphSpacing(18);
                setDropCaps(true);
                setHyphenation(true);
                setTextAlignment("justify");
              }}
              className="w-full py-4 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200 border"
              style={{
                color: `${readerForeground}60`,
                borderColor: `${readerForeground}10`,
              }}
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TABLE OF CONTENTS PANEL
      ═══════════════════════════════════════════════════════════════════════ */}
      <div
        className={`fixed top-0 left-0 h-full w-[340px] max-w-[88vw] z-50 shadow-2xl transition-transform duration-500 ease-out ${panel === "toc" ? "translate-x-0" : "-translate-x-full"
          }`}
        style={{ background: readerBackground }}
      >
        <div className="flex flex-col h-full">
          <div
            className="flex items-center justify-between px-6 py-5 border-b"
            style={{ borderColor: `${readerForeground}10` }}
          >
            <h3 className="font-serif text-xl font-semibold" style={{ color: readerForeground }}>
              Contents
            </h3>
            <button
              onClick={() => setPanel(null)}
              className="p-2.5 rounded-xl transition-colors"
              style={{ color: readerForeground }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {toc.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <List className="w-12 h-12 opacity-20 mb-4" style={{ color: readerForeground }} />
                <p className="text-sm opacity-40" style={{ color: readerForeground }}>
                  No table of contents available
                </p>
              </div>
            ) : (
              toc.map((item, i) => (
                <button
                  key={i}
                  onClick={() => goTo(item.href)}
                  className="w-full text-left px-6 py-4 text-sm transition-all duration-200 border-b hover:pl-8"
                  style={{
                    color: readerForeground,
                    borderColor: `${readerForeground}05`,
                  }}
                >
                  <span className="opacity-80">{item.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SEARCH PANEL
      ═══════════════════════════════════════════════════════════════════════ */}
      <div
        className={`fixed top-0 left-0 h-full w-[340px] max-w-[88vw] z-50 shadow-2xl transition-transform duration-500 ease-out ${panel === "search" ? "translate-x-0" : "-translate-x-full"
          }`}
        style={{ background: readerBackground }}
      >
        <div className="flex flex-col h-full">
          <div
            className="px-6 py-5 border-b space-y-4"
            style={{ borderColor: `${readerForeground}10` }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl font-semibold" style={{ color: readerForeground }}>
                Search
              </h3>
              <button
                onClick={() => setPanel(null)}
                className="p-2.5 rounded-xl transition-colors"
                style={{ color: readerForeground }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-40"
                style={{ color: readerForeground }}
              />
              <input
                type="text"
                placeholder="Find in book..."
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                style={{
                  background: `${readerForeground}08`,
                  color: readerForeground,
                }}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                autoFocus={panel === "search"}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isSearching ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin opacity-40" style={{ color: readerForeground }} />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="py-2">
                <p
                  className="px-6 py-3 text-xs font-medium opacity-40"
                  style={{ color: readerForeground }}
                >
                  {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} found
                </p>
                {searchResults.map((result, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(result.href)}
                    className="w-full text-left px-6 py-4 border-b transition-all duration-200 hover:pl-8"
                    style={{
                      color: readerForeground,
                      borderColor: `${readerForeground}05`,
                    }}
                  >
                    <p className="text-sm leading-relaxed opacity-70">{result.excerpt}</p>
                  </button>
                ))}
              </div>
            ) : searchQuery ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <Search className="w-12 h-12 opacity-20 mb-4" style={{ color: readerForeground }} />
                <p className="text-sm opacity-40" style={{ color: readerForeground }}>
                  No results found for "{searchQuery}"
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <Search className="w-12 h-12 opacity-20 mb-4" style={{ color: readerForeground }} />
                <p className="text-sm opacity-40" style={{ color: readerForeground }}>
                  Type to search within this book
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          BOOKMARKS PANEL
      ═══════════════════════════════════════════════════════════════════════ */}
      <div
        className={`fixed top-0 left-0 h-full w-[340px] max-w-[88vw] z-50 shadow-2xl transition-transform duration-500 ease-out ${panel === "bookmarks" ? "translate-x-0" : "-translate-x-full"
          }`}
        style={{ background: readerBackground }}
      >
        <div className="flex flex-col h-full">
          <div
            className="flex items-center justify-between px-6 py-5 border-b"
            style={{ borderColor: `${readerForeground}10` }}
          >
            <h3 className="font-serif text-xl font-semibold" style={{ color: readerForeground }}>
              Bookmarks
            </h3>
            <button
              onClick={() => setPanel(null)}
              className="p-2.5 rounded-xl transition-colors"
              style={{ color: readerForeground }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {!book.bookmarks?.length ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <BookmarkIcon className="w-12 h-12 opacity-20 mb-4" style={{ color: readerForeground }} />
                <p className="text-sm opacity-40" style={{ color: readerForeground }}>
                  No bookmarks yet
                </p>
                <p className="text-xs opacity-30 mt-1" style={{ color: readerForeground }}>
                  Tap the bookmark icon to save your place
                </p>
              </div>
            ) : (
              book.bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className="flex items-center gap-3 px-6 py-4 border-b hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  style={{ borderColor: `${readerForeground}05` }}
                >
                  <button
                    onClick={() => goTo(bm.cfi)}
                    className="flex-1 text-left"
                  >
                    <p className="text-sm font-medium" style={{ color: readerForeground }}>
                      {bm.title}
                    </p>
                    <p className="text-xs opacity-40 mt-0.5" style={{ color: readerForeground }}>
                      {new Date(bm.createdAt).toLocaleDateString()}
                    </p>
                  </button>
                  <button
                    onClick={() => handleRemoveBookmark(bm.id)}
                    className="p-2 rounded-lg opacity-40 hover:opacity-100 hover:text-red-500 transition-all"
                    style={{ color: readerForeground }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
