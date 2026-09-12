import React, { useEffect, useRef, useState } from "react";

import type { ReaderPosition } from "@/types/reader";

import { FoliateEpubAdapter } from "@/reader/foliate/FoliateEpubAdapter";
import { FoliateRendition } from "@/reader/foliate/FoliateRendition";

const THEMES = {
  dark: { bg: "#121212", fg: "#e0e0e0" },
  light: { bg: "#ffffff", fg: "#1a1a1a" },
  sepia: { bg: "#f8f1e3", fg: "#433422" },
};

export const FoliateTestHarness: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<FoliateRendition | null>(null);
  const adapterRef = useRef<FoliateEpubAdapter | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [toc, setToc] = useState<Array<{ href: string; id: string; label: string }>>([]);
  const [position, setPosition] = useState<ReaderPosition | null>(null);
  const [continuous, setContinuous] = useState(false);
  const [spread, setSpread] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [theme, setTheme] = useState<"dark" | "light" | "sepia">("light");

  useEffect(() => {
    let active = true;

    async function loadSampleBook() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/mobydick.epub");
        if (!res.ok) throw new Error(`Failed to fetch mobydick.epub: ${res.statusText}`);
        const blob = await res.blob();
        if (!active) return;

        const adapter = await FoliateEpubAdapter.create(blob);
        if (!active) {
          adapter.destroy();
          return;
        }
        adapterRef.current = adapter;
        setTitle(adapter.metadata.title || "Untitled");
        setAuthor(adapter.metadata.author || "Unknown");
        setToc(adapter.toc);

        if (containerRef.current) {
          const currentTheme = THEMES[theme];
          const rendition = await FoliateRendition.create(
            containerRef.current,
            adapter,
            {
              continuous,
              spread,
              direction: "auto",
              readerBackground: currentTheme.bg,
              themeStyles: {
                body: {
                  "font-size": `${fontSize}px`,
                  "line-height": "1.6",
                  color: currentTheme.fg,
                },
              },
            },
            currentTheme.bg
          );

          if (!active) {
            rendition.destroy();
            return;
          }

          renditionRef.current = rendition;

          rendition.on("relocated", (pos) => {
            if (active) setPosition(pos);
          });

          await rendition.display();
        }

        if (active) setLoading(false);
      } catch (err) {
        console.error("Failed to initialize Foliate test harness:", err);
        if (active) {
          setError(err instanceof Error ? err.message : "Unknown error initializing Foliate");
          setLoading(false);
        }
      }
    }

    loadSampleBook();

    return () => {
      active = false;
      renditionRef.current?.destroy();
      renditionRef.current = null;
      adapterRef.current?.destroy();
      adapterRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update layout / flow
  useEffect(() => {
    if (!renditionRef.current) return;
    const currentTheme = THEMES[theme];
    renditionRef.current.setFlow({
      continuous,
      spread,
      direction: "auto",
      readerBackground: currentTheme.bg,
      themeStyles: {
        body: {
          "font-size": `${fontSize}px`,
          "line-height": "1.6",
          color: currentTheme.fg,
        },
      },
    });
  }, [continuous, spread, fontSize, theme]);

  const handleNext = () => renditionRef.current?.next();
  const handlePrev = () => renditionRef.current?.prev();
  const handleJumpChapter = (href: string) => renditionRef.current?.display(href);

  return (
    <div className="flex flex-col h-screen w-screen bg-neutral-900 text-neutral-100 select-none">
      {/* Top Test Harness Control Bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-neutral-800/90 border-b border-neutral-700/80 backdrop-blur z-20">
        <div className="flex items-center gap-3">
          <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
            Foliate Spike
          </span>
          <div className="leading-tight">
            <h1 className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-[320px]">
              {title || "Loading EPUB..."}
            </h1>
            <p className="text-xs text-neutral-400 truncate">{author}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Chapter Selector */}
          {toc.length > 0 && (
            <select
              aria-label="Select Chapter"
              className="px-2 py-1 bg-neutral-700 text-white rounded border border-neutral-600 outline-none max-w-[150px]"
              onChange={(e) => handleJumpChapter(e.target.value)}
              value={position?.href || ""}
            >
              <option value="" disabled>Chapters ({toc.length})</option>
              {toc.map((item) => (
                <option key={item.id} value={item.href}>
                  {item.label}
                </option>
              ))}
            </select>
          )}

          {/* Mode Toggle */}
          <button
            type="button"
            onClick={() => setContinuous(!continuous)}
            className="px-2.5 py-1 rounded bg-neutral-700 hover:bg-neutral-600 font-medium"
          >
            {continuous ? "Scroll Mode" : "Paged Mode"}
          </button>

          {!continuous && (
            <button
              type="button"
              onClick={() => setSpread(!spread)}
              className={`px-2.5 py-1 rounded font-medium ${
                spread ? "bg-amber-600 text-white" : "bg-neutral-700 hover:bg-neutral-600"
              }`}
            >
              {spread ? "2 Columns" : "1 Column"}
            </button>
          )}

          {/* Font Size Slider */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-neutral-700 rounded">
            <span>Size:</span>
            <input
              type="range"
              min="14"
              max="28"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
              className="w-16 accent-amber-500"
            />
            <span className="w-5 font-mono">{fontSize}</span>
          </div>

          {/* Theme Presets */}
          <div className="flex items-center gap-1 bg-neutral-700 p-0.5 rounded">
            {(["light", "sepia", "dark"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={`px-2 py-0.5 rounded capitalize ${
                  theme === t ? "bg-neutral-900 text-amber-400 font-bold" : "text-neutral-300"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Prev / Next Page Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-500 font-semibold rounded"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-500 font-semibold rounded"
            >
              Next
            </button>
          </div>
        </div>
      </header>

      {/* Main Reading Container */}
      <main className="relative flex-1 w-full overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/80 z-30">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-neutral-300">Loading EPUB with Foliate-js engine...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-red-950/90 text-red-200 z-30 text-center">
            <h2 className="text-lg font-bold mb-2">Foliate Initialization Failed</h2>
            <p className="text-sm font-mono bg-black/40 p-3 rounded max-w-lg mb-4">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded font-medium"
            >
              Retry
            </button>
          </div>
        )}

        <div ref={containerRef} className="absolute inset-0 w-full h-full" />
      </main>

      {/* Bottom Status Capsule */}
      <footer className="flex items-center justify-between px-4 py-1.5 bg-neutral-800/90 border-t border-neutral-700 text-xs text-neutral-400 z-20">
        <div>
          <span>{position?.chapterLabel || "Reading"}</span>
        </div>
        <div className="flex items-center gap-4 font-mono">
          <span>Progress: {position?.bookProgress ?? 0}%</span>
          <span>
            Section {position?.location ?? 1} / {position?.totalLocations ?? 1}
          </span>
        </div>
      </footer>
    </div>
  );
};
