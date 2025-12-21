import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Book, Bookmark } from "../types";
import { useSettings } from "../context/SettingsContext";
import { ReaderSettings } from "./ReaderSettings";
import ePub, { Book as EpubBook, Rendition } from "epubjs";

interface ReaderViewProps {
  book: Book;
  onClose: () => void;
  onUpdateProgress: (id: string, progress: number, lastLocation: string) => void;
  onAddBookmark?: (bookId: string, bookmark: Bookmark) => void;
  onRemoveBookmark?: (bookId: string, bookmarkId: string) => void;
}

interface ReadingHistoryEntry {
  cfi: string;
  chapter: string;
  timestamp: number;
  percentage: number;
}

interface BookStats {
  wordCount: number;
  charCount: number;
  chapterCount: number;
  estimatedTime: { slow: number; medium: number; fast: number };
  fileSize: string;
}



const TYPEFACES = [
  { id: "charter", family: "Charter, 'Bitstream Charter', Georgia, serif", label: "Charter" },
  { id: "system", family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", label: "System" },
  { id: "palatino", family: "'Palatino Linotype', Palatino, 'Book Antiqua', serif", label: "Palatino" },
  { id: "bookerly", family: "Bookerly, 'Iowan Old Style', Georgia, serif", label: "Bookerly" },
  { id: "opendyslexic", family: "'OpenDyslexic', sans-serif", label: "Dyslexic" },
];

const KEYBOARD_SHORTCUTS = [
  { key: "→ / Space", action: "Next page" },
  { key: "←", action: "Previous page" },
  { key: "Escape", action: "Toggle immersive mode" },
  { key: "Ctrl/Cmd + K", action: "Open command bar" },
  { key: "G", action: "Quick jump to position" },
  { key: "H", action: "Toggle highlight mode" },
  { key: "T", action: "Open table of contents" },
  { key: "B", action: "Add bookmark" },
  { key: "T", action: "Open table of contents" },
  { key: "B", action: "Add bookmark" },
  { key: "S", action: "Open settings" },
  { key: "D", action: "Toggle dual page view" },
  { key: "D", action: "Toggle dual page view" },
  { key: "V", action: "Toggle scroll mode" },
  { key: "M", action: "Toggle mini map" },
  { key: "I", action: "Show book statistics" },
  { key: "?", action: "Show this help" },
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
    readerAccent,
  } = useSettings();

  const containerRef = useRef<HTMLDivElement>(null);
  const epubRef = useRef<EpubBook | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cacheTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gestureStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [position, setPosition] = useState(book.progress || 0);
  const [currentChapter, setCurrentChapter] = useState("");
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [chapterProgress, setChapterProgress] = useState(0);
  const [totalLocations, setTotalLocations] = useState(0);

  const [activeDrawer, setActiveDrawer] = useState<"navigation" | "appearance" | "annotations" | "history" | "stats" | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchHits, setSearchHits] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const [immersive, setImmersive] = useState(false);
  const [selectedTypeface, setSelectedTypeface] = useState("charter");
  const [textScale, setTextScale] = useState(fontSize);
  const [spacing, setSpacing] = useState(lineHeight);
  const [columnWidth, setColumnWidth] = useState(700);
  const [paragraphStyle, setParagraphStyle] = useState<"indent" | "block">("block");

  const [highlightMode, setHighlightMode] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<{ cfi: string; text: string; rect: DOMRect } | null>(null);

  const [quickJumpVisible, setQuickJumpVisible] = useState(false);
  const [quickJumpValue, setQuickJumpValue] = useState(position);

  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [dualPageMode, setDualPageMode] = useState(false);
  const [scrollMode, setScrollMode] = useState(false);

  const [readingHistory, setReadingHistory] = useState<ReadingHistoryEntry[]>([]);
  const [bookStats, setBookStats] = useState<BookStats | null>(null);

  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });

  const [dictionaryResult, setDictionaryResult] = useState<{ word: string; definition: string; phonetic?: string } | null>(null);
  const [wikiResult, setWikiResult] = useState<{ title: string; extract: string; url: string } | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupPosition, setLookupPosition] = useState<{ x: number; y: number } | null>(null);

  const [syncCode, setSyncCode] = useState<string | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);

  const reducedMotion = useMemo(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return false;
  }, []);

  const atmosphere = useMemo(() => {
    const brightness =
      parseInt(readerBackground.slice(1, 3), 16) * 0.299 +
      parseInt(readerBackground.slice(3, 5), 16) * 0.587 +
      parseInt(readerBackground.slice(5, 7), 16) * 0.114;
    return brightness < 128 ? "dark" : "light";
  }, [readerBackground]);





  const uiColor = readerForeground;
  const uiColorMuted = `${readerForeground}80`;
  const surfaceBg = readerBackground;
  const borderColor = `${readerForeground}20`;

  const animationClass = reducedMotion ? "" : "transition-all duration-300";
  const fadeClass = reducedMotion ? "" : "animate-fadeIn";
  const slideClass = reducedMotion ? "" : "animate-slideDown";

  const buildStyles = useCallback(() => {
    const typeface = TYPEFACES.find((t) => t.id === selectedTypeface) || TYPEFACES[0];
    const align = textAlignment || "justify";
    const indent = paragraphStyle === "indent";

    return `
      @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,500;0,600;1,400&display=swap');
      
      html, body {
        background: ${readerBackground} !important;
        color: ${readerForeground} !important;
        font-family: ${typeface.family} !important;
        font-size: ${textScale}px !important;
        line-height: ${spacing} !important;
        margin: 0 !important;
        padding: ${pageMargin + 24}px ${pageMargin + 32}px !important;
        max-width: ${columnWidth}px !important;
        margin-left: auto !important;
        margin-right: auto !important;
        -webkit-font-smoothing: antialiased !important;
        text-rendering: optimizeLegibility !important;
        font-feature-settings: 'kern' 1, 'liga' 1 !important;
      }
      
      p {
        margin: ${indent ? "0" : `0 0 ${paragraphSpacing}px 0`} !important;
        text-indent: ${indent ? "1.5em" : "0"} !important;
        color: ${readerForeground} !important;
        text-align: ${align} !important;
        ${hyphenation ? "hyphens: auto; -webkit-hyphens: auto;" : ""}
        orphans: 3 !important;
        widows: 3 !important;
      }
      
      p + p {
        margin-top: ${indent ? "0" : `${paragraphSpacing}px`} !important;
      }
      
      ${dropCaps ? `
        section > p:first-of-type::first-letter,
        .chapter > p:first-of-type::first-letter {
          font-size: 3.5em !important;
          float: left !important;
          line-height: 0.8 !important;
          margin: 0.05em 0.12em 0 0 !important;
          font-weight: 500 !important;
          color: ${readerAccent} !important;
          text-indent: 0 !important;
        }
      ` : ""}
      
      h1, h2, h3, h4, h5, h6 {
        font-family: ${typeface.family} !important;
        color: ${readerForeground} !important;
        margin-top: 1.8em !important;
        margin-bottom: 0.6em !important;
        font-weight: 600 !important;
        letter-spacing: -0.02em !important;
        text-indent: 0 !important;
      }
      
      a {
        color: ${readerAccent} !important;
        text-decoration: none !important;
        border-bottom: 1px solid ${readerAccent}40 !important;
      }
      
      blockquote {
        border-left: 3px solid ${readerAccent}50 !important;
        padding-left: 1.5em !important;
        margin: 1.2em 0 !important;
        margin-left: 0 !important;
        font-style: italic !important;
        opacity: 0.9 !important;
        text-indent: 0 !important;
      }
      
      img {
        max-width: 100% !important;
        height: auto !important;
        border-radius: 8px !important;
        margin: 1.5em auto !important;
        display: block !important;
        cursor: zoom-in !important;
      }
      
      ::selection {
        background: ${readerAccent}30 !important;
      }
      
      *, div, section, article {
        background: transparent !important;
        color: ${readerForeground} !important;
      }
      
      .reader-highlight-amber { background: rgba(245, 158, 11, 0.35) !important; border-radius: 2px; }
      .reader-highlight-emerald { background: rgba(16, 185, 129, 0.35) !important; border-radius: 2px; }
      .reader-highlight-rose { background: rgba(244, 63, 94, 0.3) !important; border-radius: 2px; }
      .reader-highlight-violet { background: rgba(139, 92, 246, 0.35) !important; border-radius: 2px; }
    `;
  }, [
    textScale,
    spacing,
    readerForeground,
    readerBackground,
    selectedTypeface,
    pageMargin,
    paragraphSpacing,
    dropCaps,
    hyphenation,
    textAlignment,
    readerAccent,
    columnWidth,
    paragraphStyle,
  ]);

  const applyStyles = useCallback(
    (contents: any) => {
      if (!contents?.document) return;
      const doc = contents.document;
      const css = buildStyles();
      let styleEl = doc.getElementById("reader-custom-styles");
      if (styleEl) {
        styleEl.textContent = css;
      } else {
        styleEl = doc.createElement("style");
        styleEl.id = "reader-custom-styles";
        styleEl.textContent = css;
        (doc.head || doc.body).appendChild(styleEl);
      }

      const images = doc.querySelectorAll("img");
      images.forEach((img: HTMLImageElement) => {
        img.style.cursor = "zoom-in";
        img.addEventListener("click", (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          setZoomedImage(img.src);
          setImageScale(1);
          setImagePosition({ x: 0, y: 0 });
        });
      });
    },
    [buildStyles]
  );

  const cacheAdjacentChapters = useCallback(() => {
    if (!renditionRef.current || !epubRef.current) return;
    const epub = epubRef.current as any;
    const spine = epub.spine;
    if (!spine?.spineItems) return;

    const currentHref = renditionRef.current.location?.start?.href;
    if (!currentHref) return;

    const currentIndex = spine.spineItems.findIndex((item: any) => currentHref.includes(item.href));
    if (currentIndex === -1) return;

    const indicesToCache = [currentIndex - 2, currentIndex - 1, currentIndex + 1, currentIndex + 2].filter(
      (i) => i >= 0 && i < spine.spineItems.length
    );

    indicesToCache.forEach((idx) => {
      const item = spine.spineItems[idx];
      if (item && !item.document) {
        item.load(epub.load.bind(epub)).catch(() => { });
      }
    });
  }, []);

  const calculateBookStats = useCallback(async () => {
    if (!epubRef.current) return;
    const epub = epubRef.current as any;

    let totalWords = 0;
    let totalChars = 0;

    try {
      for (const item of epub.spine.spineItems) {
        try {
          const doc = await item.load(epub.load.bind(epub));
          const text = doc.textContent || "";
          totalChars += text.length;
          totalWords += text.split(/\s+/).filter((w: string) => w.length > 0).length;
        } catch { }
      }

      const fileSize = book.epubBlob ? (book.epubBlob.size / 1024 / 1024).toFixed(2) + " MB" : "Unknown";

      setBookStats({
        wordCount: totalWords,
        charCount: totalChars,
        chapterCount: chapters.length,
        estimatedTime: {
          slow: Math.ceil(totalWords / 150),
          medium: Math.ceil(totalWords / 250),
          fast: Math.ceil(totalWords / 400),
        },
        fileSize,
      });
    } catch { }
  }, [chapters.length, book.epubBlob]);

  const addToHistory = useCallback(
    (cfi: string, chapter: string, percentage: number) => {
      setReadingHistory((prev) => {
        const newEntry: ReadingHistoryEntry = {
          cfi,
          chapter,
          timestamp: Date.now(),
          percentage,
        };
        const filtered = prev.filter((e) => e.cfi !== cfi);
        return [newEntry, ...filtered].slice(0, 50);
      });
    },
    []
  );

  const lookupWord = useCallback(async (word: string, x: number, y: number) => {
    setLookupLoading(true);
    setLookupPosition({ x, y });
    setDictionaryResult(null);
    setWikiResult(null);

    try {
      const dictResponse = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      if (dictResponse.ok) {
        const data = await dictResponse.json();
        if (data && data[0]) {
          const entry = data[0];
          const meaning = entry.meanings?.[0];
          const definition = meaning?.definitions?.[0]?.definition || "No definition found";
          setDictionaryResult({
            word: entry.word,
            definition,
            phonetic: entry.phonetic,
          });
        }
      }
    } catch { }

    try {
      const wikiResponse = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(word)}`
      );
      if (wikiResponse.ok) {
        const data = await wikiResponse.json();
        if (data.type === "standard" && data.extract) {
          setWikiResult({
            title: data.title,
            extract: data.extract.slice(0, 300) + (data.extract.length > 300 ? "..." : ""),
            url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(word)}`,
          });
        }
      }
    } catch { }

    setLookupLoading(false);
  }, []);

  const generateSyncCode = useCallback(() => {
    const currentCfi = renditionRef.current?.location?.start?.cfi;
    if (!currentCfi) return;

    const syncData = {
      bookId: book.id,
      cfi: currentCfi,
      progress: position,
      timestamp: Date.now(),
    };

    const encoded = btoa(JSON.stringify(syncData));
    setSyncCode(encoded);
    setShowSyncModal(true);
  }, [book.id, position]);

  const applySyncCode = useCallback(
    (code: string) => {
      try {
        const decoded = JSON.parse(atob(code));
        if (decoded.cfi) {
          renditionRef.current?.display(decoded.cfi);
          setShowSyncModal(false);
        }
      } catch { }
    },
    []
  );

  const recreateRendition = useCallback(() => {
    if (!containerRef.current || !epubRef.current) return;

    if (renditionRef.current) {
      renditionRef.current.destroy();
    }

    const rendition = epubRef.current.renderTo(containerRef.current, {
      width: "100%",
      height: "100%",
      flow: scrollMode ? "scrolled" : "paginated",
      spread: dualPageMode ? "auto" : "none",
      manager: scrollMode ? "continuous" : "default",
    } as any);

    renditionRef.current = rendition;

    (rendition as any).hooks.content.register((contents: any) => {
      applyStyles(contents);
    });

    rendition.on("relocated", handleRelocated);

    (rendition as any).on("selected", handleSelected);

    rendition.on("click", handleClick);

    if (book.lastLocation) {
      rendition.display(book.lastLocation);
    } else {
      rendition.display();
    }
  }, [scrollMode, dualPageMode, applyStyles, book.lastLocation]);

  const handleRelocated = useCallback(
    (loc: any) => {
      setPendingSelection(null);
      setDictionaryResult(null);
      setWikiResult(null);

      const pct = Math.round((loc.start?.percentage || 0) * 100);
      setPosition(pct);
      setQuickJumpValue(pct);

      const href = loc.start?.href;
      const epub = epubRef.current;
      if (href && epub?.navigation?.toc) {
        const foundIndex = epub.navigation.toc.findIndex((t: any) => href.includes(t.href?.split("#")[0]));
        if (foundIndex !== -1) {
          setCurrentChapter(epub.navigation.toc[foundIndex].label?.trim() || "");
          setCurrentChapterIndex(foundIndex);

          const chapterCount = epub.navigation.toc.length;
          if (chapterCount > 1) {
            const chapterStart = foundIndex / chapterCount;
            const chapterEnd = (foundIndex + 1) / chapterCount;
            const currentPct = loc.start?.percentage || 0;
            const chapterPct = ((currentPct - chapterStart) / (chapterEnd - chapterStart)) * 100;
            setChapterProgress(Math.max(0, Math.min(100, chapterPct)));
          }
        }
      }

      if (!book.isIncognito && loc.start?.cfi) {
        addToHistory(loc.start.cfi, currentChapter, pct);

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
          onUpdateProgress(book.id, pct, loc.start.cfi);
        }, 400);
      }

      if (cacheTimeoutRef.current) clearTimeout(cacheTimeoutRef.current);
      cacheTimeoutRef.current = setTimeout(cacheAdjacentChapters, 500);
    },
    [book.id, book.isIncognito, currentChapter, onUpdateProgress, addToHistory, cacheAdjacentChapters]
  );

  const handleSelected = useCallback(
    (cfiRange: string, contents: any) => {
      const range = contents.range(cfiRange);
      const rect = range.getBoundingClientRect();
      const text = range.toString().trim();

      if (text.length > 0) {
        if (highlightMode) {
          setPendingSelection({ cfi: cfiRange, text, rect });
        } else if (text.split(/\s+/).length <= 3) {
          const word = text.split(/\s+/)[0].replace(/[^a-zA-Z]/g, "");
          if (word.length > 2) {
            lookupWord(word, rect.x + rect.width / 2, rect.y);
          }
        }
      }
    },
    [highlightMode, lookupWord]
  );

  const handleClick = useCallback(() => {
    setPendingSelection(null);
    setDictionaryResult(null);
    setWikiResult(null);
    setLookupPosition(null);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !book.epubBlob) {
      if (!book.epubBlob) setFailed("Book data unavailable. Please add the book again.");
      return;
    }

    let active = true;
    setReady(false);
    setFailed(null);

    const initialize = async () => {
      try {
        const buffer = await book.epubBlob.arrayBuffer();
        if (!active) return;

        const epub = ePub(buffer);
        epubRef.current = epub;

        await epub.ready;
        if (!active) return;

        setChapters(epub.navigation?.toc || []);

        const rendition = epub.renderTo(containerRef.current!, {
          width: "100%",
          height: "100%",
          flow: scrollMode ? "scrolled" : "paginated",
          spread: dualPageMode ? "auto" : "none",
          manager: scrollMode ? "continuous" : "default",
        } as any);

        renditionRef.current = rendition;

        (rendition as any).hooks.content.register((contents: any) => {
          if (active) applyStyles(contents);
        });

        rendition.on("relocated", (loc: any) => {
          if (!active) return;
          handleRelocated(loc);
        });

        (rendition as any).on("selected", (cfiRange: string, contents: any) => {
          if (!active) return;
          handleSelected(cfiRange, contents);
        });

        rendition.on("click", handleClick);

        epub.locations.generate(1024).then(() => {
          if (!active) return;
          setTotalLocations(epub.locations.length());
        });

        if (book.lastLocation) {
          await rendition.display(book.lastLocation);
        } else {
          await rendition.display();
        }

        if (active) {
          setReady(true);
          setTimeout(cacheAdjacentChapters, 1000);
        }
      } catch (err: any) {
        if (active) {
          setFailed(err?.message || "Failed to open the book.");
          setReady(false);
        }
      }
    };

    initialize();

    return () => {
      active = false;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (cacheTimeoutRef.current) clearTimeout(cacheTimeoutRef.current);
      renditionRef.current?.destroy();
      epubRef.current?.destroy();
    };
  }, [book.id, book.epubBlob]);

  useEffect(() => {
    if (!renditionRef.current || !ready) return;
    const views = (renditionRef.current as any).views();
    if (views?._views) {
      views._views.forEach((v: any) => {
        if (v?.contents) applyStyles(v.contents);
      });
    }
  }, [
    applyStyles,
    ready,
    textScale,
    selectedTypeface,
    readerBackground,
    readerForeground,
    spacing,
    paragraphSpacing,
    dropCaps,
    pageMargin,
    hyphenation,
    textAlignment,
    columnWidth,
    paragraphStyle,
  ]);

  useEffect(() => {
    if (ready && epubRef.current) {
      recreateRendition();
    }
  }, [scrollMode, dualPageMode]);

  const navigateForward = useCallback(() => renditionRef.current?.next(), []);
  const navigateBack = useCallback(() => renditionRef.current?.prev(), []);

  const jumpTo = useCallback((href: string) => {
    renditionRef.current?.display(href);
    setActiveDrawer(null);
    setCommandBarOpen(false);
  }, []);

  const jumpToPercent = useCallback((pct: number) => {
    const cfi = epubRef.current?.locations?.cfiFromPercentage(pct / 100);
    if (cfi) renditionRef.current?.display(cfi);
  }, []);

  const executeSearch = useCallback(async (query: string) => {
    setSearchTerm(query);
    if (!query.trim() || !epubRef.current) {
      setSearchHits([]);
      return;
    }

    setSearching(true);
    try {
      const epub = epubRef.current as any;
      const allHits = await Promise.all(
        epub.spine.spineItems.map(async (item: any) => {
          try {
            const doc = await item.load(epub.load.bind(epub));
            const content = doc.textContent || "";
            const hits: any[] = [];
            let idx = 0;
            const lowerQuery = query.toLowerCase();
            const lowerContent = content.toLowerCase();

            while ((idx = lowerContent.indexOf(lowerQuery, idx)) !== -1) {
              const start = Math.max(0, idx - 40);
              const end = Math.min(content.length, idx + query.length + 40);
              hits.push({
                snippet: (start > 0 ? "..." : "") + content.substring(start, end) + (end < content.length ? "..." : ""),
                href: item.href,
              });
              idx += query.length;
            }
            return hits;
          } catch {
            return [];
          }
        })
      );
      setSearchHits(allHits.flat().slice(0, 50));
    } catch {
      setSearchHits([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const createBookmark = useCallback(() => {
    const cfi = renditionRef.current?.location?.start?.cfi;
    if (!onAddBookmark || !cfi) return;
    onAddBookmark(book.id, {
      id: crypto.randomUUID(),
      cfi,
      title: currentChapter || `Position ${position}%`,
      createdAt: new Date().toISOString(),
    });
  }, [book.id, currentChapter, position, onAddBookmark]);

  const removeBookmark = useCallback(
    (id: string) => {
      if (onRemoveBookmark) onRemoveBookmark(book.id, id);
    },
    [book.id, onRemoveBookmark]
  );

  const hasBookmarkHere = useMemo(() => {
    const cfi = renditionRef.current?.location?.start?.cfi;
    return book.bookmarks?.some((b) => b.cfi === cfi);
  }, [book.bookmarks, position]);

  const applyHighlight = useCallback(
    (color: string) => {
      if (!pendingSelection) return;
      (renditionRef.current as any)?.annotations.add("highlight", pendingSelection.cfi, {}, null, `reader-highlight-${color}`);
      setPendingSelection(null);
    },
    [pendingSelection]
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "?") {
        e.preventDefault();
        setShowShortcuts((s) => !s);
        return;
      }

      if (e.key === "Escape") {
        if (showShortcuts) {
          setShowShortcuts(false);
          return;
        }
        if (zoomedImage) {
          setZoomedImage(null);
          return;
        }
        if (activeDrawer) {
          setActiveDrawer(null);
          return;
        }
        if (commandBarOpen) {
          setCommandBarOpen(false);
          return;
        }
        if (quickJumpVisible) {
          setQuickJumpVisible(false);
          return;
        }
        if (showSyncModal) {
          setShowSyncModal(false);
          return;
        }
        setImmersive((i) => !i);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandBarOpen((c) => !c);
        return;
      }

      if (activeDrawer || commandBarOpen || showShortcuts || zoomedImage) return;

      switch (e.key) {
        case "ArrowRight":
        case " ":
          e.preventDefault();
          navigateForward();
          break;
        case "ArrowLeft":
          e.preventDefault();
          navigateBack();
          break;
        case "g":
          setQuickJumpVisible(true);
          break;
        case "h":
          setHighlightMode((m) => !m);
          break;
        case "t":
          setActiveDrawer("navigation");
          break;
        case "b":
          createBookmark();
          break;
        case "s":
          setActiveDrawer("appearance");
          break;
        case "d":
          setDualPageMode((d) => !d);
          break;
        case "v":
          setScrollMode((s) => !s);
          break;
        case "m":
          setShowMiniMap((m) => !m);
          break;
        case "i":
          if (!bookStats) calculateBookStats();
          setActiveDrawer("stats");
          break;
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [
    activeDrawer,
    commandBarOpen,
    quickJumpVisible,
    showShortcuts,
    zoomedImage,
    showSyncModal,
    navigateForward,
    navigateBack,
    createBookmark,
    bookStats,
    calculateBookStats,
  ]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    gestureStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!gestureStartRef.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - gestureStartRef.current.x;
      const dy = touch.clientY - gestureStartRef.current.y;
      const dt = Date.now() - gestureStartRef.current.time;
      gestureStartRef.current = null;

      if (Math.abs(dy) > Math.abs(dx) * 2 && Math.abs(dy) > 60 && dt < 400) {
        if (dy < 0) {
          setActiveDrawer("appearance");
        } else {
          setActiveDrawer(null);
        }
        return;
      }

      if (Math.abs(dx) > 50 && dt < 300) {
        if (dx > 0) navigateBack();
        else navigateForward();
      }
    },
    [navigateForward, navigateBack]
  );

  const handleImageWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setImageScale((s) => Math.max(0.5, Math.min(3, s + delta)));
  }, []);

  const handleImageDrag = useCallback(
    (e: React.MouseEvent) => {
      if (e.buttons !== 1) return;
      setImagePosition((p) => ({
        x: p.x + e.movementX,
        y: p.y + e.movementY,
      }));
    },
    []
  );

  const estimatedTimeLeft = useMemo(() => {
    if (totalLocations === 0) return null;
    const remaining = Math.ceil(((totalLocations * (100 - position)) / 100) * 250) / 200;
    if (remaining >= 60) return `${Math.floor(remaining / 60)}h ${Math.round(remaining % 60)}m`;
    return `${Math.round(remaining)}m`;
  }, [totalLocations, position]);

  const miniMapData = useMemo(() => {
    if (!chapters.length) return [];
    return chapters.map((ch, i) => ({
      label: ch.label,
      href: ch.href,
      hasBookmark: book.bookmarks?.some((b) => b.cfi.includes(ch.href?.split("#")[0] || "")),
      isCurrent: i === currentChapterIndex,
      position: (i / chapters.length) * 100,
    }));
  }, [chapters, book.bookmarks, currentChapterIndex]);

  if (failed) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: readerBackground }}>
        <div className="max-w-sm text-center p-8">
          <div
            className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ background: `${readerForeground}10` }}
          >
            <svg className="w-8 h-8" style={{ color: readerForeground }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="text-lg font-medium mb-2" style={{ color: readerForeground }}>
            Unable to Open
          </p>
          <p className="text-sm opacity-60 mb-8" style={{ color: readerForeground }}>
            {failed}
          </p>
          <button
            onClick={onClose}
            className={`px-6 py-3 rounded-full text-sm font-medium ${reducedMotion ? "" : "transition-transform active:scale-95"}`}
            style={{ background: readerAccent, color: "#fff" }}
          >
            Return to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col select-none"
      style={{ background: readerBackground }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-30 ${animationClass} ${immersive ? "opacity-0 -translate-y-full pointer-events-none" : "opacity-100 translate-y-0"
          }`}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onClose}
            className={`w-10 h-10 rounded-full flex items-center justify-center ${animationClass}`}
            style={{ background: `${uiColor}08` }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={uiColorMuted} strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="absolute left-1/2 -translate-x-1/2 text-center max-w-[180px]">
            <p className="text-xs font-medium truncate" style={{ color: uiColorMuted }}>
              {book.title}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCommandBarOpen(true)}
              className={`w-10 h-10 rounded-full flex items-center justify-center ${animationClass}`}
              style={{ background: `${uiColor}08` }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={uiColorMuted} strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </button>

            <button
              onClick={generateSyncCode}
              className={`w-10 h-10 rounded-full flex items-center justify-center ${animationClass}`}
              style={{ background: `${uiColor}08` }}
              title="Sync position"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={uiColorMuted} strokeWidth="2">
                <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c-1.657 0-3-4.03-3-9s1.343-9 3-9m0 18c1.657 0 3-4.03 3-9s-1.343-9-3-9m-9 9a9 9 0 019-9" />
              </svg>
            </button>

            <button
              onClick={() => setActiveDrawer(activeDrawer === "navigation" ? null : "navigation")}
              className={`w-10 h-10 rounded-full flex items-center justify-center ${animationClass}`}
              style={{ background: activeDrawer === "navigation" ? `${readerAccent}20` : `${uiColor}08` }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={activeDrawer === "navigation" ? readerAccent : uiColorMuted}
                strokeWidth="2"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <button
              onClick={() => setShowSettings(true)}
              className={`w-10 h-10 rounded-full flex items-center justify-center ${animationClass}`}
              style={{ background: showSettings ? `${readerAccent}20` : `${uiColor}08` }}
              title="Settings"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={showSettings ? readerAccent : uiColorMuted}
                strokeWidth="2"
              >
                <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Reader */}
      <main className="flex-1 relative overflow-hidden">
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center z-20" style={{ background: readerBackground }}>
            <div className="flex flex-col items-center gap-4">
              <div
                className={`w-12 h-12 rounded-full border-2 border-t-transparent ${reducedMotion ? "" : "animate-spin"}`}
                style={{ borderColor: `${readerAccent}40`, borderTopColor: "transparent" }}
              />
              <p className="text-sm" style={{ color: uiColorMuted }}>
                Preparing your book
              </p>
            </div>
          </div>
        )}

        <div
          ref={containerRef}
          className={`w-full h-full ${animationClass}`}
          style={{ opacity: ready ? 1 : 0 }}
          onClick={() => {
            if (pendingSelection) {
              setPendingSelection(null);
              return;
            }
            if (dictionaryResult || wikiResult) {
              setDictionaryResult(null);
              setWikiResult(null);
              setLookupPosition(null);
              return;
            }
            if (!activeDrawer && !commandBarOpen) setImmersive((i) => !i);
          }}
        />

        {/* Touch Zones */}
        {ready && !activeDrawer && !commandBarOpen && (
          <>
            <div
              className="absolute left-0 top-0 w-1/4 h-full z-10 cursor-w-resize"
              onClick={(e) => {
                e.stopPropagation();
                navigateBack();
              }}
            />
            <div
              className="absolute right-0 top-0 w-1/4 h-full z-10 cursor-e-resize"
              onClick={(e) => {
                e.stopPropagation();
                navigateForward();
              }}
            />
          </>
        )}

        {/* Mini Map */}
        {showMiniMap && ready && (
          <div
            className={`absolute right-2 top-1/2 -translate-y-1/2 z-20 w-3 rounded-full ${fadeClass}`}
            style={{ background: `${uiColor}10`, height: "60%" }}
          >
            {miniMapData.map((item, i) => (
              <button
                key={i}
                onClick={() => jumpTo(item.href)}
                className={`absolute left-0 w-full h-2 rounded-full ${animationClass}`}
                style={{
                  top: `${item.position}%`,
                  background: item.isCurrent ? readerAccent : item.hasBookmark ? "#f59e0b" : "transparent",
                }}
                title={item.label}
              />
            ))}
            <div
              className="absolute left-0 w-full h-1 rounded-full"
              style={{
                top: `${position}%`,
                background: readerAccent,
                boxShadow: `0 0 4px ${readerAccent}`,
              }}
            />
          </div>
        )}

        {/* Highlight Toolbar */}
        {pendingSelection && highlightMode && (
          <div
            className={`absolute z-50 ${fadeClass}`}
            style={{
              top: pendingSelection.rect.top - 56,
              left: pendingSelection.rect.left + pendingSelection.rect.width / 2,
              transform: "translateX(-50%)",
            }}
          >
            <div className="flex items-center gap-1 p-2 rounded-2xl shadow-xl" style={{ background: surfaceBg, border: `1px solid ${borderColor}` }}>
              {["amber", "emerald", "rose", "violet"].map((color) => (
                <button
                  key={color}
                  onClick={(e) => {
                    e.stopPropagation();
                    applyHighlight(color);
                  }}
                  className={`w-7 h-7 rounded-full ${animationClass} hover:scale-110 active:scale-95`}
                  style={{
                    background: color === "amber" ? "#f59e0b" : color === "emerald" ? "#10b981" : color === "rose" ? "#f43f5e" : "#8b5cf6",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Dictionary/Wiki Popup */}
        {lookupPosition && (dictionaryResult || wikiResult || lookupLoading) && (
          <div
            className={`absolute z-50 w-72 ${fadeClass}`}
            style={{
              top: lookupPosition.y - 10,
              left: Math.min(Math.max(lookupPosition.x - 144, 16), window.innerWidth - 304),
              transform: "translateY(-100%)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-2xl shadow-2xl overflow-hidden" style={{ background: surfaceBg, border: `1px solid ${borderColor}` }}>
              {lookupLoading ? (
                <div className="p-4 flex items-center justify-center">
                  <div
                    className={`w-6 h-6 rounded-full border-2 border-t-transparent ${reducedMotion ? "" : "animate-spin"}`}
                    style={{ borderColor: `${readerAccent}40`, borderTopColor: "transparent" }}
                  />
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {dictionaryResult && (
                    <div>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-semibold" style={{ color: uiColor }}>
                          {dictionaryResult.word}
                        </span>
                        {dictionaryResult.phonetic && (
                          <span className="text-xs" style={{ color: uiColorMuted }}>
                            {dictionaryResult.phonetic}
                          </span>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: uiColorMuted }}>
                        {dictionaryResult.definition}
                      </p>
                    </div>
                  )}
                  {wikiResult && (
                    <div className={dictionaryResult ? "pt-3 border-t" : ""} style={{ borderColor }}>
                      <p className="text-xs font-medium mb-1" style={{ color: readerAccent }}>
                        Wikipedia
                      </p>
                      <p className="text-sm leading-relaxed" style={{ color: uiColorMuted }}>
                        {wikiResult.extract}
                      </p>
                      <a
                        href={wikiResult.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs mt-2 inline-block"
                        style={{ color: readerAccent }}
                      >
                        Read more
                      </a>
                    </div>
                  )}
                  {!dictionaryResult && !wikiResult && (
                    <p className="text-sm" style={{ color: uiColorMuted }}>
                      No results found
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>


      {/* Overlays */}
      {(activeDrawer || commandBarOpen || showShortcuts || showSyncModal) && (
        <div
          className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm ${fadeClass}`}
          onClick={() => {
            setActiveDrawer(null);
            setCommandBarOpen(false);
            setShowShortcuts(false);
            setShowSyncModal(false);
          }}
        />
      )}

      {/* Command Bar */}
      {commandBarOpen && (
        <div className={`fixed inset-x-4 top-16 z-50 max-w-xl mx-auto ${slideClass}`}>
          <div className="rounded-2xl shadow-2xl overflow-hidden" style={{ background: surfaceBg, border: `1px solid ${borderColor}` }}>
            <div className="p-3">
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: `${uiColor}05` }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={uiColorMuted} strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Search or jump to chapter..."
                  value={searchTerm}
                  onChange={(e) => executeSearch(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-sm"
                  style={{ color: uiColor }}
                  autoFocus
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setSearchHits([]);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={uiColorMuted} strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto">
              {searching ? (
                <div className="flex items-center justify-center py-6">
                  <div
                    className={`w-5 h-5 rounded-full border-2 border-t-transparent ${reducedMotion ? "" : "animate-spin"}`}
                    style={{ borderColor: `${readerAccent}40`, borderTopColor: "transparent" }}
                  />
                </div>
              ) : searchTerm ? (
                searchHits.length > 0 ? (
                  <div className="py-1">
                    {searchHits.map((hit, i) => (
                      <button
                        key={i}
                        onClick={() => jumpTo(hit.href)}
                        className={`w-full text-left px-4 py-2.5 ${animationClass} hover:bg-black/5`}
                      >
                        <p className="text-sm leading-relaxed" style={{ color: uiColorMuted }}>
                          {hit.snippet}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-sm" style={{ color: uiColorMuted }}>
                      No matches found
                    </p>
                  </div>
                )
              ) : (
                <div className="py-1">
                  <p className="px-4 py-1.5 text-[10px] font-medium uppercase tracking-wide" style={{ color: uiColorMuted }}>
                    Chapters
                  </p>
                  {chapters.slice(0, 8).map((ch, i) => (
                    <button
                      key={i}
                      onClick={() => jumpTo(ch.href)}
                      className={`w-full text-left px-4 py-2.5 ${animationClass} hover:bg-black/5`}
                    >
                      <p className="text-sm" style={{ color: uiColor }}>
                        {ch.label}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Drawer */}
      <div
        className={`fixed top-0 left-0 h-full w-72 max-w-[80vw] z-50 ${animationClass} ${activeDrawer === "navigation" || activeDrawer === "annotations" || activeDrawer === "history"
          ? "translate-x-0"
          : "-translate-x-full"
          }`}
        style={{ background: surfaceBg }}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor }}>
            <p className="text-sm font-medium" style={{ color: uiColor }}>
              {activeDrawer === "navigation" ? "Contents" : activeDrawer === "annotations" ? "Bookmarks" : "History"}
            </p>
            <button
              onClick={() => setActiveDrawer(null)}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: `${uiColor}08` }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={uiColorMuted} strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex border-b" style={{ borderColor }}>
            {[
              { id: "navigation", label: "Chapters" },
              { id: "annotations", label: "Bookmarks" },
              { id: "history", label: "History" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveDrawer(tab.id as any)}
                className={`flex-1 py-2.5 text-xs font-medium ${animationClass}`}
                style={{
                  color: activeDrawer === tab.id ? readerAccent : uiColorMuted,
                  borderBottom: activeDrawer === tab.id ? `2px solid ${readerAccent}` : "2px solid transparent",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeDrawer === "navigation" && (
              <>
                {chapters.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-6">
                    <p className="text-sm" style={{ color: uiColorMuted }}>
                      No table of contents
                    </p>
                  </div>
                ) : (
                  chapters.map((ch, i) => (
                    <button
                      key={i}
                      onClick={() => jumpTo(ch.href)}
                      className={`w-full text-left px-4 py-3 border-b ${animationClass} hover:bg-black/5`}
                      style={{
                        borderColor: `${borderColor}50`,
                        background: i === currentChapterIndex ? `${readerAccent}10` : "transparent",
                      }}
                    >
                      <p className="text-sm" style={{ color: i === currentChapterIndex ? readerAccent : uiColor }}>
                        {ch.label}
                      </p>
                    </button>
                  ))
                )}
              </>
            )}

            {activeDrawer === "annotations" && (
              <>
                {!book.bookmarks?.length ? (
                  <div className="flex flex-col items-center justify-center h-full p-6">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={`${uiColor}20`} strokeWidth="1.5" className="mb-3">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                    </svg>
                    <p className="text-sm" style={{ color: uiColorMuted }}>
                      No bookmarks yet
                    </p>
                  </div>
                ) : (
                  book.bookmarks.map((bm) => (
                    <div
                      key={bm.id}
                      className={`flex items-center gap-2 px-4 py-3 border-b ${animationClass} hover:bg-black/5`}
                      style={{ borderColor: `${borderColor}50` }}
                    >
                      <button onClick={() => jumpTo(bm.cfi)} className="flex-1 text-left">
                        <p className="text-sm" style={{ color: uiColor }}>
                          {bm.title}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: uiColorMuted }}>
                          {new Date(bm.createdAt).toLocaleDateString()}
                        </p>
                      </button>
                      <button
                        onClick={() => removeBookmark(bm.id)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center opacity-50 hover:opacity-100 ${animationClass}`}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </>
            )}

            {activeDrawer === "history" && (
              <>
                {readingHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-6">
                    <p className="text-sm" style={{ color: uiColorMuted }}>
                      No reading history yet
                    </p>
                  </div>
                ) : (
                  readingHistory.map((entry, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        renditionRef.current?.display(entry.cfi);
                        setActiveDrawer(null);
                      }}
                      className={`w-full text-left px-4 py-3 border-b ${animationClass} hover:bg-black/5`}
                      style={{ borderColor: `${borderColor}50` }}
                    >
                      <p className="text-sm" style={{ color: uiColor }}>
                        {entry.chapter || `Position ${entry.percentage}%`}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: uiColorMuted }}>
                        {new Date(entry.timestamp).toLocaleTimeString()} - {entry.percentage}%
                      </p>
                    </button>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      </div>


      {/* Stats Drawer */ }
  <div
    className={`fixed bottom-0 left-0 right-0 z-50 ${animationClass} ${activeDrawer === "stats" ? "translate-y-0" : "translate-y-full"
      }`}
    style={{ background: surfaceBg, borderRadius: "20px 20px 0 0" }}
  >
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium" style={{ color: uiColor }}>
          Book Statistics
        </p>
        <button onClick={() => setActiveDrawer(null)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${uiColor}08` }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={uiColorMuted} strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {bookStats ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl" style={{ background: `${uiColor}05` }}>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: uiColorMuted }}>
              Words
            </p>
            <p className="text-lg font-semibold mt-1" style={{ color: uiColor }}>
              {bookStats.wordCount.toLocaleString()}
            </p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: `${uiColor}05` }}>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: uiColorMuted }}>
              Characters
            </p>
            <p className="text-lg font-semibold mt-1" style={{ color: uiColor }}>
              {bookStats.charCount.toLocaleString()}
            </p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: `${uiColor}05` }}>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: uiColorMuted }}>
              Chapters
            </p>
            <p className="text-lg font-semibold mt-1" style={{ color: uiColor }}>
              {bookStats.chapterCount}
            </p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: `${uiColor}05` }}>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: uiColorMuted }}>
              File Size
            </p>
            <p className="text-lg font-semibold mt-1" style={{ color: uiColor }}>
              {bookStats.fileSize}
            </p>
          </div>
          <div className="col-span-2 p-3 rounded-xl" style={{ background: `${uiColor}05` }}>
            <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: uiColorMuted }}>
              Reading Time Estimate
            </p>
            <div className="flex justify-between">
              <div className="text-center">
                <p className="text-xs" style={{ color: uiColorMuted }}>
                  Slow
                </p>
                <p className="text-sm font-medium" style={{ color: uiColor }}>
                  {Math.floor(bookStats.estimatedTime.slow / 60)}h {bookStats.estimatedTime.slow % 60}m
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs" style={{ color: uiColorMuted }}>
                  Medium
                </p>
                <p className="text-sm font-medium" style={{ color: uiColor }}>
                  {Math.floor(bookStats.estimatedTime.medium / 60)}h {bookStats.estimatedTime.medium % 60}m
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs" style={{ color: uiColorMuted }}>
                  Fast
                </p>
                <p className="text-sm font-medium" style={{ color: uiColor }}>
                  {Math.floor(bookStats.estimatedTime.fast / 60)}h {bookStats.estimatedTime.fast % 60}m
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-8">
          <div
            className={`w-6 h-6 rounded-full border-2 border-t-transparent ${reducedMotion ? "" : "animate-spin"}`}
            style={{ borderColor: `${readerAccent}40`, borderTopColor: "transparent" }}
          />
        </div>
      )}
    </div>
  </div>

  {/* Quick Jump Modal */ }
  {
    quickJumpVisible && (
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm ${fadeClass}`}
        onClick={() => setQuickJumpVisible(false)}
      >
        <div
          className={`w-64 rounded-2xl p-5 shadow-2xl ${reducedMotion ? "" : "animate-scaleIn"}`}
          style={{ background: surfaceBg }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm font-medium mb-4 text-center" style={{ color: uiColor }}>
            Jump to Position
          </p>
          <div className="flex items-center gap-3 mb-5">
            <span className="text-2xl font-semibold tabular-nums" style={{ color: readerAccent }}>
              {quickJumpValue}%
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={quickJumpValue}
              onChange={(e) => setQuickJumpValue(Number(e.target.value))}
              className="flex-1"
              style={{ accentColor: readerAccent }}
            />
          </div>
          <button
            onClick={() => {
              jumpToPercent(quickJumpValue);
              setQuickJumpVisible(false);
            }}
            className={`w-full py-2.5 rounded-xl text-sm font-medium ${animationClass}`}
            style={{ background: readerAccent, color: "#fff" }}
          >
            Go
          </button>
        </div>
      </div>
    )
  }

  {/* Shortcuts Modal */ }
  {
    showShortcuts && (
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm ${fadeClass}`}
        onClick={() => setShowShortcuts(false)}
      >
        <div
          className={`w-80 max-w-[90vw] rounded-2xl shadow-2xl overflow-hidden ${reducedMotion ? "" : "animate-scaleIn"}`}
          style={{ background: surfaceBg }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor }}>
            <p className="text-sm font-medium" style={{ color: uiColor }}>
              Keyboard Shortcuts
            </p>
            <button onClick={() => setShowShortcuts(false)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: `${uiColor}08` }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={uiColorMuted} strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto p-3 space-y-1">
            {KEYBOARD_SHORTCUTS.map((shortcut, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-2 rounded-lg" style={{ background: i % 2 === 0 ? `${uiColor}03` : "transparent" }}>
                <span className="text-xs" style={{ color: uiColorMuted }}>
                  {shortcut.action}
                </span>
                <kbd
                  className="px-2 py-1 rounded text-[10px] font-mono"
                  style={{ background: `${uiColor}08`, color: uiColor }}
                >
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  {/* Sync Modal */ }
  {
    showSyncModal && (
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm ${fadeClass}`}
        onClick={() => setShowSyncModal(false)}
      >
        <div
          className={`w-80 max-w-[90vw] rounded-2xl p-5 shadow-2xl ${reducedMotion ? "" : "animate-scaleIn"}`}
          style={{ background: surfaceBg }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm font-medium mb-4 text-center" style={{ color: uiColor }}>
            Sync Reading Position
          </p>

          {syncCode && (
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: uiColorMuted }}>
                Your sync code
              </p>
              <div
                className="p-3 rounded-xl font-mono text-xs break-all"
                style={{ background: `${uiColor}05`, color: uiColor }}
              >
                {syncCode}
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(syncCode)}
                className={`w-full mt-2 py-2 rounded-lg text-xs font-medium ${animationClass}`}
                style={{ background: `${readerAccent}15`, color: readerAccent }}
              >
                Copy to Clipboard
              </button>
            </div>
          )}

          <div className="pt-4 border-t" style={{ borderColor }}>
            <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: uiColorMuted }}>
              Restore from code
            </p>
            <input
              type="text"
              placeholder="Paste sync code here"
              className="w-full px-3 py-2 rounded-lg text-xs border-none outline-none"
              style={{ background: `${uiColor}05`, color: uiColor }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  applySyncCode((e.target as HTMLInputElement).value);
                }
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  {/* Image Zoom Modal */ }
  {
    zoomedImage && (
      <div
        className={`fixed inset-0 z-[60] flex items-center justify-center bg-black/90 ${fadeClass}`}
        onClick={() => setZoomedImage(null)}
        onWheel={handleImageWheel}
      >
        <button
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
          onClick={() => setZoomedImage(null)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <img
          src={zoomedImage}
          alt="Zoomed"
          className={`max-w-[90vw] max-h-[90vh] object-contain cursor-move ${animationClass}`}
          style={{
            transform: `scale(${imageScale}) translate(${imagePosition.x}px, ${imagePosition.y}px)`,
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseMove={handleImageDrag}
          draggable={false}
        />

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 backdrop-blur">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setImageScale((s) => Math.max(0.5, s - 0.25));
            }}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M5 12h14" />
            </svg>
          </button>
          <span className="text-white text-sm tabular-nums w-12 text-center">{Math.round(imageScale * 100)}%</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setImageScale((s) => Math.min(3, s + 0.25));
            }}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setImageScale(1);
              setImagePosition({ x: 0, y: 0 });
            }}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M3 12a9 9 0 1018 0 9 9 0 00-18 0" />
              <path d="M14 9l-5 5M9 9l5 5" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-slideDown { animation: slideDown 0.25s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.2s ease-out; }
        input[type="range"] { -webkit-appearance: none; background: transparent; }
        input[type="range"]::-webkit-slider-track { height: 4px; border-radius: 2px; background: ${uiColor}15; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: ${readerAccent}; margin-top: -6px; cursor: pointer; }
      `}</style>
<ReaderSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div >
  );
}