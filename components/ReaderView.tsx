import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
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
  Type,
  Loader2,
  AlertCircle,
  Search,
  Pilcrow,
  RemoveFormatting,
} from "lucide-react";
import ePub, { Book as EpubBook, Rendition } from "epubjs";

interface ReaderViewProps {
  book: Book;
  onClose: () => void;
  onUpdateProgress: (
    id: string,
    progress: number,
    lastLocation: string,
  ) => void;
  onAddBookmark?: (bookId: string, bookmark: Bookmark) => void;
  onRemoveBookmark?: (
    bookId: string,
    bookmarkId: string,
  ) => void;
}

const THEMES = [
  { id: "light", bg: "#ffffff", fg: "#1a1a1a", name: "Light" },
  { id: "cream", bg: "#faf6ed", fg: "#3d3929", name: "Cream" },
  { id: "sepia", bg: "#f4ecd8", fg: "#5b4636", name: "Sepia" },
  { id: "mint", bg: "#e8f5e9", fg: "#2e4a32", name: "Mint" },
  { id: "dusk", bg: "#2d2d3a", fg: "#c9c9d4", name: "Dusk" },
  { id: "dark", bg: "#1a1a1e", fg: "#e0e0e0", name: "Dark" },
  { id: "black", bg: "#000000", fg: "#b0b0b0", name: "AMOLED" },
];

const FONTS = [
  { id: "georgia", name: "Georgia", family: "Georgia, serif" },
  {
    id: "merriweather",
    name: "Merriweather",
    family: "'Merriweather', Georgia, serif",
  },
  {
    id: "crimson",
    name: "Crimson Pro",
    family: "'Crimson Pro', serif",
  },
  { id: "lora", name: "Lora", family: "'Lora', serif" },
  { id: "inter", name: "Inter", family: "'DM Sans', sans-serif" },
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
    textAlignment,
    setTextAlignment,
    readerForeground,
    readerBackground,
    setReaderForeground,
    setReaderBackground,
    dropCaps,
    setDropCaps,
    lineHeight,
    setLineHeight,
    pageMargin,
    setPageMargin,
    maxTextWidth,
    setMaxTextWidth,
    paragraphSpacing,
    setParagraphSpacing,
    hyphenation,
    setHyphenation,
  } = useSettings();

  const containerRef = useRef<HTMLDivElement>(null);
  const epubRef = useRef<EpubBook | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const styleIdRef = useRef("sanctuary-reader-styles");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toc, setToc] = useState<any[]>([]);
  const [progress, setProgress] = useState(book.progress || 0);
  const [chapter, setChapter] = useState("");
  const [panel, setPanel] = useState<
    "toc" | "settings" | "bookmarks" | "search" | null
  >(null);
  const [showUI, setShowUI] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontFamily, setFontFamily] = useState("crimson");
  const [readingTime, setReadingTime] = useState(0);
  const [time, setTime] = useState(new Date());
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const currentTheme =
    THEMES.find((t) => t.bg === readerBackground) || THEMES[0];
  const isDark = ["dusk", "dark", "black"].includes(
    currentTheme.id,
  );

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const generateCSS = useCallback(() => {
    const font = FONTS.find((f) => f.id === fontFamily) || FONTS[0];
    
    return `
      /* SANCTUARY READER - FORCE OVERRIDE ALL EPUB STYLES */
      
      /* Reset everything */
      *, *::before, *::after {
        box-sizing: border-box !important;
      }
      
      /* Root and HTML */
      html {
        background: ${readerBackground} !important;
        color: ${readerForeground} !important;
      }
      
      /* Body - the main container */
      body {
        background: ${readerBackground} !important;
        color: ${readerForeground} !important;
        font-family: ${font.family} !important;
        font-size: ${fontSize}px !important;
        line-height: ${lineHeight} !important;
        text-align: ${textAlignment} !important;
        margin: 0 !important;
        padding: ${pageMargin}px !important;
        max-width: none !important;
        width: 100% !important;
        min-height: 100% !important;
        -webkit-font-smoothing: antialiased !important;
        -moz-osx-font-smoothing: grayscale !important;
        text-rendering: optimizeLegibility !important;
        ${hyphenation ? `
        -webkit-hyphens: auto !important;
        -moz-hyphens: auto !important;
        -ms-hyphens: auto !important;
        hyphens: auto !important;
        ` : `
        -webkit-hyphens: none !important;
        -moz-hyphens: none !important;
        -ms-hyphens: none !important;
        hyphens: none !important;
        `}
        overflow-wrap: break-word !important;
        word-wrap: break-word !important;
      }
      
      /* All text elements */
      body, p, div, span, a, li, td, th, dt, dd, figcaption, caption, label,
      article, section, aside, header, footer, nav, main {
        color: ${readerForeground} !important;
        font-family: ${font.family} !important;
        line-height: ${lineHeight} !important;
      }
      
      /* Paragraphs */
      p {
        margin: 0 0 ${paragraphSpacing}px 0 !important;
        padding: 0 !important;
        font-size: ${fontSize}px !important;
        line-height: ${lineHeight} !important;
        text-indent: 0 !important;
        color: ${readerForeground} !important;
        background: transparent !important;
      }
      
      /* Drop caps - first paragraph */
      ${dropCaps ? `
      section > p:first-of-type::first-letter,
      article > p:first-of-type::first-letter,
      chapter > p:first-of-type::first-letter,
      div.chapter > p:first-of-type::first-letter,
      body > p:first-of-type::first-letter {
        font-size: 3.2em !important;
        font-family: ${font.family} !important;
        font-weight: 700 !important;
        float: left !important;
        line-height: 0.85 !important;
        margin: 0.05em 0.1em 0 0 !important;
        padding: 0 !important;
        color: ${readerForeground} !important;
      }
      ` : ''}
      
      /* Headings */
      h1, h2, h3, h4, h5, h6 {
        font-family: ${font.family} !important;
        color: ${readerForeground} !important;
        line-height: 1.3 !important;
        margin-top: 1.5em !important;
        margin-bottom: 0.75em !important;
        padding: 0 !important;
        background: transparent !important;
      }
      
      h1 { font-size: 1.8em !important; font-weight: 700 !important; }
      h2 { font-size: 1.5em !important; font-weight: 700 !important; }
      h3 { font-size: 1.25em !important; font-weight: 600 !important; }
      h4 { font-size: 1.1em !important; font-weight: 600 !important; }
      h5, h6 { font-size: 1em !important; font-weight: 600 !important; }
      
      /* Links */
      a, a:link, a:visited, a:hover, a:active {
        color: ${readerForeground} !important;
        text-decoration: underline !important;
        text-decoration-color: ${readerForeground}50 !important;
        text-underline-offset: 2px !important;
      }
      
      /* Lists */
      ul, ol {
        margin: 0 0 ${paragraphSpacing}px 1.5em !important;
        padding: 0 !important;
        color: ${readerForeground} !important;
      }
      
      li {
        margin-bottom: 0.25em !important;
        padding: 0 !important;
      }
      
      /* Blockquotes */
      blockquote {
        margin: 1em 0 1em 0 !important;
        padding: 0.5em 0 0.5em 1.25em !important;
        border-left: 3px solid ${readerForeground}40 !important;
        font-style: italic !important;
        color: ${readerForeground} !important;
        background: transparent !important;
      }
      
      blockquote p {
        margin-bottom: 0.5em !important;
      }
      
      /* Pre and code */
      pre, code, kbd, samp {
        font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace !important;
        font-size: 0.9em !important;
        background: ${readerForeground}10 !important;
        color: ${readerForeground} !important;
        border-radius: 4px !important;
      }
      
      code {
        padding: 0.15em 0.4em !important;
      }
      
      pre {
        padding: 1em !important;
        overflow-x: auto !important;
        margin: 1em 0 !important;
      }
      
      pre code {
        padding: 0 !important;
        background: transparent !important;
      }
      
      /* Images */
      img, svg, figure {
        max-width: 100% !important;
        height: auto !important;
        display: block !important;
        margin: 1em auto !important;
      }
      
      figure {
        margin: 1.5em 0 !important;
        padding: 0 !important;
      }
      
      figcaption {
        font-size: 0.85em !important;
        text-align: center !important;
        margin-top: 0.5em !important;
        opacity: 0.7 !important;
        color: ${readerForeground} !important;
      }
      
      /* Tables */
      table {
        width: 100% !important;
        border-collapse: collapse !important;
        margin: 1em 0 !important;
        font-size: 0.9em !important;
      }
      
      th, td {
        padding: 0.5em !important;
        border: 1px solid ${readerForeground}30 !important;
        text-align: left !important;
        color: ${readerForeground} !important;
      }
      
      th {
        background: ${readerForeground}10 !important;
        font-weight: 600 !important;
      }
      
      /* Horizontal rule */
      hr {
        border: none !important;
        height: 1px !important;
        background: ${readerForeground}30 !important;
        margin: 2em 0 !important;
      }
      
      /* Selection */
      ::selection {
        background: #f59e0b50 !important;
        color: inherit !important;
      }
      
      ::-moz-selection {
        background: #f59e0b50 !important;
        color: inherit !important;
      }
      
      /* Remove any text shadows or weird effects */
      * {
        text-shadow: none !important;
      }
      
      /* Ensure no weird backgrounds leak through */
      div, section, article, aside, header, footer, main, nav {
        background: transparent !important;
      }
      
      /* Handle epub specific elements */
      .calibre, .calibre1, .calibre2, .calibre3, .calibre4, .calibre5,
      .text, .chapter, .section, .part, .contents {
        background: transparent !important;
        color: ${readerForeground} !important;
        font-family: ${font.family} !important;
      }
      
      /* Poetry and verse formatting */
      .verse, .poem, .poetry, .stanza {
        font-style: italic !important;
        margin: 1em 2em !important;
        color: ${readerForeground} !important;
      }
      
      /* Emphasis */
      em, i {
        font-style: italic !important;
        color: inherit !important;
      }
      
      strong, b {
        font-weight: 700 !important;
        color: inherit !important;
      }
      
      /* Small text */
      small, .small {
        font-size: 0.85em !important;
        color: ${readerForeground} !important;
      }
      
      /* Subscript and superscript */
      sub, sup {
        font-size: 0.75em !important;
        line-height: 0 !important;
      }
      
      /* Definition lists */
      dl {
        margin: 1em 0 !important;
      }
      
      dt {
        font-weight: 600 !important;
        margin-top: 0.5em !important;
      }
      
      dd {
        margin-left: 1.5em !important;
        margin-bottom: 0.5em !important;
      }
      
      /* Abbreviations */
      abbr {
        text-decoration: none !important;
        border-bottom: 1px dotted ${readerForeground}50 !important;
      }
      
      /* Mark/highlight */
      mark {
        background: #f59e0b40 !important;
        color: inherit !important;
        padding: 0.1em 0.2em !important;
        border-radius: 2px !important;
      }
      
      /* Ensure consistent spacing */
      p + p {
        margin-top: 0 !important;
      }
    `;
  }, [
    fontSize,
    textAlignment,
    readerForeground,
    readerBackground,
    fontFamily,
    lineHeight,
    dropCaps,
    pageMargin,
    paragraphSpacing,
    hyphenation,
  ]);

  const injectStyles = useCallback((contents: any) => {
    if (!contents || !contents.document) return;
    
    const doc = contents.document;
    const css = generateCSS();
    
    const existingStyle = doc.getElementById(styleIdRef.current);
    if (existingStyle) {
      existingStyle.textContent = css;
      return;
    }
    
    const style = doc.createElement("style");
    style.id = styleIdRef.current;
    style.type = "text/css";
    style.textContent = css;
    
    const head = doc.head || doc.getElementsByTagName("head")[0];
    if (head) {
      head.appendChild(style);
    } else {
      doc.body.insertBefore(style, doc.body.firstChild);
    }
  }, [generateCSS]);

  useEffect(() => {
    if (!containerRef.current || !book.epubBlob) {
      if (!book.epubBlob) setError("Book content is missing");
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
        setToc(epub.navigation?.toc || []);

        const rendition = epub.renderTo(containerRef.current!, {
          width: "100%",
          height: "100%",
          flow: "paginated",
          manager: "default",
          spread: "none",
          allowScriptedContent: false,
          stylesheet: undefined,
          script: undefined,
        } as any);
        renditionRef.current = rendition;

        rendition.hooks.content.register((contents: any) => {
          if (!mounted) return;
          injectStyles(contents);
        });

        rendition.on("relocated", (location: any) => {
          if (!mounted) return;
          const pct = Math.round(
            (location.start?.percentage || 0) * 100,
          );
          setProgress(pct);
          const href = location.start?.href;
          if (href && epub.navigation?.toc) {
            const ch = epub.navigation.toc.find((t: any) =>
              href.includes(t.href?.split("#")[0]),
            );
            if (ch) setChapter(ch.label?.trim());
          }
          if (!book.isIncognito && location.start?.cfi) {
            onUpdateProgress(book.id, pct, location.start.cfi);
          }
        });

        epub.locations.generate(1000).then(() => {
          if (!mounted) return;
          const totalWords = (epub.locations.length() || 0) * 300;
          setReadingTime(Math.ceil(totalWords / 200));
        });

        if (book.lastLocation)
          await rendition.display(book.lastLocation);
        else await rendition.display();
        
        if (mounted) setLoading(false);
      } catch (e: any) {
        console.error("Failed to load epub:", e);
        if (mounted) {
          setError(e?.message || "Failed to load book");
          setLoading(false);
        }
      }
    };
    init();
    return () => {
      mounted = false;
      renditionRef.current?.destroy();
      epubRef.current?.destroy();
    };
  }, [book.id, book.epubBlob]);

  useEffect(() => {
    if (!renditionRef.current || loading) return;
    
    const rendition = renditionRef.current;
    const views = (rendition as any).views();
    
    if (views && views._views) {
      views._views.forEach((view: any) => {
        if (view && view.contents) {
          injectStyles(view.contents);
        }
      });
    }
  }, [injectStyles, loading, fontSize, fontFamily, readerBackground, readerForeground, lineHeight, paragraphSpacing, dropCaps, pageMargin, hyphenation, textAlignment]);

  const goNext = () => renditionRef.current?.next();
  const goPrev = () => renditionRef.current?.prev();
  const goTo = (href: string) => {
    renditionRef.current?.display(href);
    setPanel(null);
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (!q || !epubRef.current) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const book = epubRef.current as any;
      const results = await Promise.all(
        book.spine.spineItems.map((item: any) => 
          item.load(book.load.bind(book))
          .then((doc: any) => {
            const text = doc.textContent || "";
            const matches = [];
            let i = 0;
            while ((i = text.toLowerCase().indexOf(q.toLowerCase(), i)) !== -1) {
              const excerpt = text.substring(Math.max(0, i - 30), Math.min(text.length, i + q.length + 30));
              matches.push({
                cfi: item.cfiFromElement(doc.body),
                excerpt: "..." + excerpt + "...",
                href: item.href
              });
              i += q.length;
            }
            return matches;
          })
        )
      );
      setSearchResults(results.flat().slice(0, 50));
    } catch (e) {
      console.error("Search failed", e);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (panel) {
        if (e.key === "Escape") setPanel(null);
        return;
      }
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
      if (e.key === "Escape") setShowUI((s) => !s);
      if (e.key === "f" && !e.metaKey && !e.ctrlKey)
        toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const addBookmark = () => {
    const cfi = renditionRef.current?.location?.start?.cfi;
    if (!onAddBookmark || !cfi) return;
    onAddBookmark(book.id, {
      id: crypto.randomUUID(),
      cfi,
      title: chapter || `Page ${progress}%`,
      createdAt: new Date().toISOString(),
    });
  };

  const onSliderChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const pct = Number(e.target.value) / 100;
    const cfi =
      epubRef.current?.locations?.cfiFromPercentage(pct);
    if (cfi) renditionRef.current?.display(cfi);
  };

  const isBookmarked = book.bookmarks?.some((b) => {
    const currentCfi =
      renditionRef.current?.location?.start?.cfi;
    return currentCfi && b.cfi === currentCfi;
  });

  if (error) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center"
        style={{ background: readerBackground }}
      >
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2
            className="text-xl font-semibold mb-3"
            style={{ color: readerForeground }}
          >
            Unable to Open Book
          </h2>
          <p
            className="text-sm mb-8 opacity-60"
            style={{ color: readerForeground }}
          >
            {error}
          </p>
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium shadow-lg hover:shadow-xl transition-all"
          >
            Return to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col transition-colors duration-500"
      style={{ background: readerBackground }}
    >
      {/* Top Bar */}
      <header
        className={`absolute top-0 left-0 right-0 z-20 transition-all duration-300 transform ${showUI ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"}`}
      >
        <div
          className="flex items-center justify-between px-4 py-3 backdrop-blur-xl border-b border-black/5 dark:border-white/5"
          style={{ background: `${readerBackground}e6` }}
        >
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: readerForeground }}
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:inline font-sans">
              Library
            </span>
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPanel("toc")}
              className="p-2.5 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              style={{ color: readerForeground }}
              title="Contents"
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setPanel("search")}
              className="p-2.5 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              style={{ color: readerForeground }}
              title="Search"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={addBookmark}
              className={`p-2.5 rounded-xl transition-colors ${isBookmarked ? "text-amber-500" : ""}`}
              style={{
                color: isBookmarked
                  ? undefined
                  : readerForeground,
              }}
              title="Bookmark"
            >
              <BookmarkIcon
                className="w-5 h-5"
                fill={isBookmarked ? "currentColor" : "none"}
              />
            </button>
            <button
              onClick={() => setPanel("settings")}
              className="p-2.5 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              style={{ color: readerForeground }}
              title="Settings"
            >
              <Settings2 className="w-5 h-5" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/5 hidden sm:flex"
              style={{ color: readerForeground }}
              title="Fullscreen"
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5" />
              ) : (
                <Maximize2 className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Reader Area */}
      <main className="flex-1 relative overflow-hidden">
        {loading && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10"
            style={{ background: readerBackground }}
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 animate-pulse" />
              <Loader2 className="w-6 h-6 absolute inset-0 m-auto text-white animate-spin" />
            </div>
            <p
              className="text-sm opacity-50 font-medium"
              style={{ color: readerForeground }}
            >
              Opening book...
            </p>
          </div>
        )}

        <div 
          ref={containerRef}
          className="w-full h-full"
          style={{ opacity: loading ? 0 : 1 }}
          onClick={() => setShowUI((s) => !s)}
        />

        {/* Navigation Arrows */}
        {!loading && (
          <>
            <button
              onClick={goPrev}
              className={`absolute left-4 top-1/2 -translate-y-1/2 p-4 rounded-full transition-all duration-300 backdrop-blur-sm border border-black/5 shadow-sm group ${showUI ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"}`}
              style={{
                background: `${readerBackground}cc`,
                color: readerForeground,
              }}
            >
              <ChevronLeft className="w-6 h-6 opacity-60 group-hover:opacity-100 transition-opacity" />
            </button>
            <button
              onClick={goNext}
              className={`absolute right-4 top-1/2 -translate-y-1/2 p-4 rounded-full transition-all duration-300 backdrop-blur-sm border border-black/5 shadow-sm group ${showUI ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none"}`}
              style={{
                background: `${readerBackground}cc`,
                color: readerForeground,
              }}
            >
              <ChevronRight className="w-6 h-6 opacity-60 group-hover:opacity-100 transition-opacity" />
            </button>
          </>
        )}
      </main>

      {/* Bottom Bar */}
      <footer
        className={`absolute bottom-0 left-0 right-0 z-20 transition-all duration-300 transform ${showUI ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"}`}
      >
        <div
          className="px-4 py-5 backdrop-blur-xl border-t border-black/5 dark:border-white/5"
          style={{ background: `${readerBackground}e6` }}
        >
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-xs font-medium w-8 text-right" style={{color: readerForeground}}>{progress}%</span>
              <div className="relative flex-1 h-8 flex items-center group">
                <div 
                  className="absolute inset-x-0 h-1 rounded-full opacity-20" 
                  style={{background: readerForeground}}
                />
                <div 
                  className="absolute left-0 h-1 rounded-full bg-amber-500" 
                  style={{width: `${progress}%`}}
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={onSliderChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <span className="text-xs font-medium w-8" style={{color: readerForeground}}>100%</span>
            </div>

            <div
              className="flex items-center justify-between text-xs font-medium"
              style={{ color: `${readerForeground}80` }}
            >
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2" title="Reading time remaining">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{Math.ceil((readingTime * (100 - progress)) / 100)} min left</span>
                </div>
                <div className="flex items-center gap-2" title="Current chapter">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span className="max-w-[150px] truncate">{chapter || "Unknown Chapter"}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 opacity-80">
                <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Panels Overlay */}
      {panel && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 animate-fadeIn"
          onClick={() => setPanel(null)}
        />
      )}

      {/* Settings Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[360px] max-w-[90vw] z-50 shadow-2xl transition-transform duration-300 transform ${panel === "settings" ? "translate-x-0" : "translate-x-full"}`}
        style={{ background: readerBackground }}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-5 border-b border-black/5">
            <h3 className="font-semibold text-lg" style={{ color: readerForeground }}>Reading Settings</h3>
            <button onClick={() => setPanel(null)} className="p-2 hover:bg-black/5 rounded-lg"><X className="w-5 h-5" style={{ color: readerForeground }} /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Themes */}
            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-4 opacity-50" style={{ color: readerForeground }}>Appearance</h4>
              <div className="grid grid-cols-4 gap-3">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setReaderBackground(t.bg); setReaderForeground(t.fg); }}
                    className={`aspect-square rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${readerBackground === t.bg ? "border-amber-500 shadow-sm scale-105" : "border-black/5 hover:border-black/10"}`}
                    style={{ background: t.bg }}
                  >
                    <div className="w-4 h-4 rounded-full border border-black/10" style={{ background: t.fg }} />
                  </button>
                ))}
              </div>
            </section>

            {/* Font */}
            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-4 opacity-50" style={{ color: readerForeground }}>Typography</h4>
              <div className="grid grid-cols-1 gap-2 mb-4">
                {FONTS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFontFamily(f.id)}
                    className={`px-4 py-3 rounded-xl text-left transition-all flex items-center justify-between ${fontFamily === f.id ? "bg-amber-500 text-white shadow-md" : "hover:bg-black/5"}`}
                    style={{ fontFamily: f.family, color: fontFamily === f.id ? '#fff' : readerForeground }}
                  >
                    <span>{f.name}</span>
                    {fontFamily === f.id && <Type className="w-4 h-4" />}
                  </button>
                ))}
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <button onClick={() => setFontSize(Math.max(12, fontSize - 1))} className="p-3 rounded-xl hover:bg-black/5" style={{ color: readerForeground }}><Minus className="w-4 h-4" /></button>
                  <div className="flex-1 text-center font-medium" style={{ color: readerForeground }}>{fontSize}px</div>
                  <button onClick={() => setFontSize(Math.min(32, fontSize + 1))} className="p-3 rounded-xl hover:bg-black/5" style={{ color: readerForeground }}><Plus className="w-4 h-4" /></button>
                </div>
              </div>
            </section>

            {/* Layout */}
            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-4 opacity-50" style={{ color: readerForeground }}>Layout & Spacing</h4>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs opacity-70" style={{ color: readerForeground }}>
                    <span>Line Height</span>
                    <span>{lineHeight.toFixed(1)}</span>
                  </div>
                  <input type="range" min="1.2" max="2.4" step="0.1" value={lineHeight} onChange={(e) => setLineHeight(Number(e.target.value))} className="w-full accent-amber-500" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs opacity-70" style={{ color: readerForeground }}>
                    <span>Paragraph Spacing</span>
                    <span>{paragraphSpacing}px</span>
                  </div>
                  <input type="range" min="0" max="40" step="4" value={paragraphSpacing} onChange={(e) => setParagraphSpacing(Number(e.target.value))} className="w-full accent-amber-500" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs opacity-70" style={{ color: readerForeground }}>
                    <span>Max Width</span>
                    <span>{maxTextWidth}ch</span>
                  </div>
                  <input type="range" min="30" max="100" step="5" value={maxTextWidth} onChange={(e) => setMaxTextWidth(Number(e.target.value))} className="w-full accent-amber-500" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs opacity-70" style={{ color: readerForeground }}>
                    <span>Side Margin</span>
                    <span>{pageMargin}px</span>
                  </div>
                  <input type="range" min="0" max="200" step="10" value={pageMargin} onChange={(e) => setPageMargin(Number(e.target.value))} className="w-full accent-amber-500" />
                </div>
              </div>
            </section>

            {/* Toggles */}
            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-4 opacity-50" style={{ color: readerForeground }}>Options</h4>
              <div className="space-y-2">
                {[
                  { label: "Drop Caps", value: dropCaps, setter: setDropCaps, icon: Pilcrow },
                  { label: "Hyphenation", value: hyphenation, setter: setHyphenation, icon: RemoveFormatting },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => item.setter(!item.value)}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-black/5 transition-colors"
                  >
                    <div className="flex items-center gap-3" style={{ color: readerForeground }}>
                      <item.icon className="w-5 h-5 opacity-70" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <div className={`w-10 h-6 rounded-full transition-colors relative ${item.value ? "bg-amber-500" : "bg-black/20 dark:bg-white/20"}`}>
                      <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${item.value ? "translate-x-4" : "translate-x-0"}`} />
                    </div>
                  </button>
                ))}
              </div>
            </section>
            
            <button
              onClick={() => {
                setFontSize(19);
                setLineHeight(1.85);
                setTextAlignment("justify");
                setFontFamily("crimson");
                setReaderBackground("#ffffff");
                setReaderForeground("#1a1a1a");
                setPageMargin(40);
                setMaxTextWidth(60);
                setParagraphSpacing(18);
                setDropCaps(true);
              }}
              className="w-full py-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors hover:bg-black/5"
              style={{
                color: readerForeground,
                opacity: 0.6
              }}
            >
              <RotateCcw className="w-4 h-4" /> Reset to Defaults
            </button>
          </div>
        </div>
      </div>
      
      {/* TOC Panel */}
      <div className={`fixed top-0 left-0 h-full w-[320px] max-w-[85vw] z-50 shadow-2xl transition-transform duration-300 transform ${panel === "toc" ? "translate-x-0" : "-translate-x-full"}`} style={{ background: readerBackground }}>
        <div className="flex items-center justify-between p-5 border-b border-black/5">
          <h3 className="font-semibold text-lg" style={{ color: readerForeground }}>Contents</h3>
          <button onClick={() => setPanel(null)} className="p-2 hover:bg-black/5 rounded-lg"><X className="w-5 h-5" style={{ color: readerForeground }} /></button>
        </div>
        <div className="overflow-y-auto h-full pb-20">
          {toc.map((item, i) => (
            <button
              key={i}
              onClick={() => goTo(item.href)}
              className="w-full text-left px-6 py-4 text-sm hover:bg-black/5 border-b border-black/5 transition-colors"
              style={{ color: readerForeground }}
            >
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search Panel */}
      <div className={`fixed top-0 left-0 h-full w-[320px] max-w-[85vw] z-50 shadow-2xl transition-transform duration-300 transform ${panel === "search" ? "translate-x-0" : "-translate-x-full"}`} style={{ background: readerBackground }}>
        <div className="flex flex-col h-full">
          <div className="p-5 border-b border-black/5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg" style={{ color: readerForeground }}>Search</h3>
              <button onClick={() => setPanel(null)} className="p-2 hover:bg-black/5 rounded-lg"><X className="w-5 h-5" style={{ color: readerForeground }} /></button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" style={{color: readerForeground}} />
              <input 
                type="text" 
                placeholder="Find in book..." 
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-black/5 border-none focus:ring-2 ring-amber-500"
                style={{color: readerForeground}}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pb-20">
            {isSearching ? (
              <div className="flex items-center justify-center p-8 opacity-50">
                <Loader2 className="w-6 h-6 animate-spin" style={{color: readerForeground}} />
              </div>
            ) : (
              searchResults.map((result, i) => (
                <button
                  key={i}
                  onClick={() => goTo(result.href)}
                  className="w-full text-left px-6 py-4 hover:bg-black/5 border-b border-black/5 transition-colors"
                  style={{ color: readerForeground }}
                >
                  <p className="text-xs opacity-50 mb-1">Match {i + 1}</p>
                  <p className="text-sm line-clamp-3 font-serif opacity-80">{result.excerpt}</p>
                </button>
              ))
            )}
            {!isSearching && searchQuery && searchResults.length === 0 && (
              <div className="p-8 text-center opacity-50" style={{color: readerForeground}}>No results found</div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.1);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
}