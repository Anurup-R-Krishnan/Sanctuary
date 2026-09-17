import React, { useEffect, useRef, useState } from "react";

import type { ReaderPosition } from "@/types/reader";

import { FoliateDocumentAdapter } from "@/reader/foliate/FoliateDocumentAdapter";
import { FoliateEpubAdapter } from "@/reader/foliate/FoliateEpubAdapter";
import { FoliateRendition } from "@/reader/foliate/FoliateRendition";
import { parseMarkdownToBook } from "@/reader/formats/MarkdownParser";

const THEMES = {
  light: { bg: "#ffffff", fg: "#1a1a1a" },
  sepia: { bg: "#f4ecd8", fg: "#5c4b37" },
  dark: { bg: "#1a1a1a", fg: "#e0e0e0" },
  oled: { bg: "#000000", fg: "#e2e2e2" },
};

const SAMPLE_MARKDOWN = `---
title: "The Architecture of Sanctuary"
author: "Sanctuary Engineering"
date: "2026-09-17"
tags: [architecture, reader, python, mermaid]
---

# The Architecture of Sanctuary

Welcome to Sanctuary's multi-format continuous reader engine.

## Python Execution Core

\`\`\`python
import asyncio
from typing import Dict, Any

class ReaderPipeline:
    """Core multi-format reader engine coordinator."""
    def __init__(self, book_id: str):
        self.book_id = book_id
        self.cache: Dict[str, Any] = {}

    async def fetch_manifest(self) -> Dict[str, Any]:
        """Fetch, verify, and decrypt book sections."""
        await asyncio.sleep(0.01)
        return {"id": self.book_id, "sections": 12, "status": "active"}
\`\`\`

## System Architecture Diagram

\`\`\`mermaid
graph TD;
    Client[Sanctuary Web UI] --> Worker[Cloudflare Worker API];
    Worker --> D1[(D1 Database & Vectorize)];
    Worker --> R2[(R2 Vault Storage)];
    Client --> Foliate[Foliate Engine];
    Foliate --> Parser[Multi-Format Parser Pipeline];
\`\`\`

## Interactive Checklist

- [x] Deep ZIP signature sniffing (EPUB, CBZ, FBZ)
- [x] PalmDOC vs AZW3/KF8 boundary disambiguation
- [x] ChatGPT-style luxury code cards with clipboard copy
- [x] Theme-adaptive color-mix variables (Sepia, Paper, OLED)
- [ ] Offline SQLite vector indexing
`;

export const FoliateTestHarness: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<FoliateRendition | null>(null);
  const adapterRef = useRef<FoliateDocumentAdapter | FoliateEpubAdapter | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [toc, setToc] = useState<Array<{ href: string; id: string; label: string }>>([]);
  const [position, setPosition] = useState<ReaderPosition | null>(null);
  const [continuous, setContinuous] = useState(true);
  const [spread, setSpread] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [theme, setTheme] = useState<"light" | "sepia" | "dark" | "oled">("sepia");
  const [sampleBook, setSampleBook] = useState<"markdown" | "epub">("markdown");

  useEffect(() => {
    let active = true;

    async function loadSampleBook() {
      try {
        setLoading(true);
        setError(null);

        let adapter: FoliateDocumentAdapter | FoliateEpubAdapter;
        if (sampleBook === "markdown") {
          const rawBook = await parseMarkdownToBook(SAMPLE_MARKDOWN, "The Architecture of Sanctuary");
          adapter = new FoliateDocumentAdapter(rawBook, "markdown");
        } else {
          const res = await fetch("/mobydick.epub");
          if (!res.ok) throw new Error(`Failed to fetch mobydick.epub: ${res.statusText}`);
          const blob = await res.blob();
          if (!active) return;
          adapter = await FoliateEpubAdapter.create(blob);
        }

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
              continuous: sampleBook === "markdown" ? true : continuous,
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
  }, [sampleBook]);

  // Update layout / flow
  useEffect(() => {
    if (!renditionRef.current) return;
    const currentTheme = THEMES[theme];
    renditionRef.current.setFlow({
      continuous: sampleBook === "markdown" ? true : continuous,
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
  }, [continuous, spread, fontSize, theme, sampleBook]);

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

          {/* Book Format Switcher */}
          <div className="flex items-center gap-1 bg-neutral-700 p-0.5 rounded">
            <button
              type="button"
              onClick={() => setSampleBook("markdown")}
              className={`px-2 py-0.5 rounded font-medium ${
                sampleBook === "markdown" ? "bg-amber-600 text-white" : "text-neutral-300 hover:text-white"
              }`}
            >
              Markdown
            </button>
            <button
              type="button"
              onClick={() => setSampleBook("epub")}
              className={`px-2 py-0.5 rounded font-medium ${
                sampleBook === "epub" ? "bg-amber-600 text-white" : "text-neutral-300 hover:text-white"
              }`}
            >
              EPUB
            </button>
          </div>

          {/* Theme Presets */}
          <div className="flex items-center gap-1 bg-neutral-700 p-0.5 rounded">
            {(["light", "sepia", "dark", "oled"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={`px-2 py-0.5 rounded capitalize ${
                  theme === t ? "bg-neutral-900 text-amber-400 font-bold" : "text-neutral-300 hover:text-white"
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
