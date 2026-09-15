import {
  FastForward,
  Pause,
  Play,
  Rewind,
  RotateCcw,
  Sliders,
  X,
  Zap,
} from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";

import type { RsvpToken } from "@/utils/rsvpTokenEngine";

import {
  calculateTokenDuration,
  estimateRsvpDurationMs,
  formatDuration,
  tokenizeRsvpText,
} from "@/utils/rsvpTokenEngine";

export interface ReaderSpeedReaderModalProps {
  chapterLabel?: string;
  initialWpm?: number;
  isOpen: boolean;
  onClose: () => void;
  rawText: string;
}

const WPM_PRESETS = [250, 350, 450, 600];

const SAMPLE_PASSAGE =
  "Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, 'and what is the use of a book,' thought Alice 'without pictures or conversations?'";

export function ReaderSpeedReaderModal({
  chapterLabel,
  initialWpm = 350,
  isOpen,
  onClose,
  rawText,
}: ReaderSpeedReaderModalProps) {
  const [wpm, setWpm] = useState<number>(initialWpm);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showSpeedCustomizer, setShowSpeedCustomizer] = useState<boolean>(false);
  const [sampleText, setSampleText] = useState<string>("");

  // Tokenize the provided or sample raw text
  const activeRawText = useMemo(() => {
    if (rawText && rawText.trim().length > 0) return rawText;
    return sampleText;
  }, [rawText, sampleText]);

  const tokens = useMemo<RsvpToken[]>(
    () => tokenizeRsvpText(activeRawText),
    [activeRawText]
  );

  // Reset playback position whenever modal opens or text changes
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setIsPlaying(false);
      setShowSpeedCustomizer(false);
      if (rawText && rawText.trim().length > 0) {
        setSampleText("");
      }
    }
  }, [isOpen, rawText]);

  // RSVP sequential playback timer
  useEffect(() => {
    if (!isOpen || !isPlaying || tokens.length === 0) return;

    if (currentIndex >= tokens.length - 1) {
      setIsPlaying(false);
      return;
    }

    const currentToken = tokens[currentIndex];
    const duration = calculateTokenDuration(
      currentToken?.durationMultiplier ?? 1.0,
      wpm
    );

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => {
        if (prev + 1 >= tokens.length) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, duration);

    return () => clearTimeout(timer);
  }, [isOpen, isPlaying, currentIndex, tokens, wpm]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" &&
        target.getAttribute("type") !== "range"
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentIndex((prev) => Math.max(0, prev - (e.shiftKey ? 1 : 10)));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentIndex((prev) =>
          Math.min(tokens.length - 1, prev + (e.shiftKey ? 1 : 10))
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setWpm((prev) => Math.min(1000, prev + 25));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setWpm((prev) => Math.max(100, prev - 25));
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, tokens.length]);

  const handleTogglePlay = useCallback(() => {
    if (tokens.length === 0) return;
    if (currentIndex >= tokens.length - 1) {
      setCurrentIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  }, [currentIndex, tokens.length]);

  const handleRewind = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 10));
  }, []);

  const handleForward = useCallback(() => {
    setCurrentIndex((prev) => Math.min(tokens.length - 1, prev + 10));
  }, [tokens.length]);

  const handleRestart = useCallback(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
  }, []);

  // Surrounding context window for peripheral continuity
  const contextSnippet = useMemo(() => {
    if (tokens.length === 0) return "";
    const start = Math.max(0, currentIndex - 3);
    const end = Math.min(tokens.length, currentIndex + 4);
    return tokens
      .slice(start, end)
      .map((t) => t.raw)
      .join(" ");
  }, [tokens, currentIndex]);

  const remainingMs = useMemo(
    () => estimateRsvpDurationMs(tokens.slice(currentIndex), wpm),
    [tokens, currentIndex, wpm]
  );

  const currentToken = tokens[currentIndex];

  if (!isOpen) return null;

  return createPortal(
    <div
      aria-labelledby="rsvp-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-fadeIn"
      role="dialog"
    >
      <button
        aria-label="Dismiss speed reader modal"
        className="fixed inset-0 bg-transparent cursor-default border-none"
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />
      <div className="relative z-10 w-full max-w-xl bg-light-primary dark:bg-dark-primary text-light-text dark:text-dark-text border border-light-border dark:border-dark-border rounded-3xl shadow-2xl overflow-hidden flex flex-col p-5 sm:p-7 gap-5 animate-scaleUp">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between gap-3 border-b border-light-border dark:border-dark-border pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-light-accent/15 dark:bg-dark-accent/15 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-light-accent dark:text-dark-accent" />
            </div>
            <div className="min-w-0">
              <h2
                className="text-sm sm:text-base font-semibold truncate"
                id="rsvp-modal-title"
              >
                {chapterLabel || "Speed Reader (RSVP)"}
              </h2>
              <span className="text-[11px] text-light-text-muted dark:text-dark-text-muted block truncate">
                {tokens.length} words · {formatDuration(remainingMs)} remaining
              </span>
            </div>
          </div>

          <button
            aria-label="Close speed reader"
            className="p-2 rounded-full hover:bg-light-border/40 dark:hover:bg-dark-border/40 transition-colors text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text"
            onClick={onClose}
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Central RSVP Fixed Focal Display Box */}
        {tokens.length === 0 ? (
          <div className="h-44 sm:h-52 flex flex-col items-center justify-center gap-3 text-sm text-light-text-muted dark:text-dark-text-muted text-center px-4 bg-light-surface/30 dark:bg-dark-surface/30 rounded-2xl border border-dashed border-light-border dark:border-dark-border">
            <p>No readable text found in this chapter or selection.</p>
            <button
              type="button"
              onClick={() => setSampleText(SAMPLE_PASSAGE)}
              className="px-3.5 py-1.5 text-xs font-medium rounded-xl bg-light-accent/10 dark:bg-dark-accent/15 text-light-accent dark:text-dark-accent hover:bg-light-accent/20 dark:hover:bg-dark-accent/25 transition-all active:scale-95"
            >
              Load Sample Passage
            </button>
          </div>
        ) : (
          <div className="relative flex flex-col items-center justify-center bg-light-surface/40 dark:bg-dark-surface/40 border border-light-border dark:border-dark-border rounded-2xl h-44 sm:h-52 select-none overflow-hidden px-4">
            {/* Top Reticle Notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-0.5 h-3.5 bg-light-accent dark:bg-dark-accent rounded-full opacity-60 pointer-events-none" />

            {/* Fixed Horizontal ORP Word Anchor Container */}
            <div className="flex items-baseline w-full max-w-lg text-3xl sm:text-4xl md:text-5xl font-sans tracking-normal leading-none my-auto">
              {/* Left Segment: right-aligned up to the focal letter */}
              <div className="flex-1 text-right truncate text-light-text dark:text-dark-text opacity-95">
                {currentToken?.left || ""}
              </div>

              {/* Center ORP Letter: anchored precisely at the central axis */}
              <div className="w-auto shrink-0 font-bold text-light-accent dark:text-dark-accent px-0.5 transition-colors">
                {currentToken?.orp || ""}
              </div>

              {/* Right Segment: left-aligned from the focal letter */}
              <div className="flex-1 text-left truncate text-light-text dark:text-dark-text opacity-95">
                {currentToken?.right || ""}
              </div>
            </div>

            {/* Bottom Reticle Notch */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-0.5 h-3.5 bg-light-accent dark:bg-dark-accent rounded-full opacity-60 pointer-events-none" />
          </div>
        )}

        {/* Peripheral Context Line */}
        {tokens.length > 0 && (
          <div className="text-center text-xs text-light-text-muted dark:text-dark-text-muted opacity-60 truncate px-4">
            “{contextSnippet}”
          </div>
        )}

        {/* Scrubber Progress Slider */}
        {tokens.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] font-medium text-light-text-muted dark:text-dark-text-muted">
              <span>Word {currentIndex + 1} of {tokens.length}</span>
              <span>{Math.round(((currentIndex + 1) / tokens.length) * 100)}%</span>
            </div>
            <input
              aria-label="Speed reading progress"
              className="w-full h-1.5 bg-light-border/60 dark:bg-dark-border/60 rounded-lg appearance-none cursor-pointer accent-light-accent dark:accent-dark-accent"
              max={Math.max(0, tokens.length - 1)}
              min={0}
              onChange={(e) => setCurrentIndex(Number(e.target.value))}
              type="range"
              value={currentIndex}
            />
          </div>
        )}

        {/* Primary Controls & Speed Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            <button
              aria-label="Restart from beginning"
              className="p-2.5 rounded-full hover:bg-light-border/40 dark:hover:bg-dark-border/40 active:scale-95 transition-all text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text disabled:opacity-30 disabled:pointer-events-none"
              disabled={tokens.length === 0}
              onClick={handleRestart}
              title="Restart"
              type="button"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              aria-label="Rewind 10 words (Left Arrow)"
              className="p-2.5 rounded-full hover:bg-light-border/40 dark:hover:bg-dark-border/40 active:scale-95 transition-all text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text disabled:opacity-30 disabled:pointer-events-none"
              disabled={tokens.length === 0}
              onClick={handleRewind}
              title="Rewind 10 words"
              type="button"
            >
              <Rewind className="w-4 h-4" />
            </button>

            <button
              aria-label={isPlaying ? "Pause (Space)" : "Play (Space)"}
              className="px-5 py-2.5 rounded-full bg-light-accent dark:bg-dark-accent text-white dark:text-black font-semibold flex items-center gap-2 shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
              disabled={tokens.length === 0}
              onClick={handleTogglePlay}
              type="button"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span className="text-sm">Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span className="text-sm">Play</span>
                </>
              )}
            </button>

            <button
              aria-label="Forward 10 words (Right Arrow)"
              className="p-2.5 rounded-full hover:bg-light-border/40 dark:hover:bg-dark-border/40 active:scale-95 transition-all text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text disabled:opacity-30 disabled:pointer-events-none"
              disabled={tokens.length === 0}
              onClick={handleForward}
              title="Forward 10 words"
              type="button"
            >
              <FastForward className="w-4 h-4" />
            </button>
          </div>

          {/* Speed Presets & Customizer */}
          <div className="flex items-center gap-1.5">
            {WPM_PRESETS.map((preset) => (
              <button
                aria-label={`Set speed to ${preset} words per minute`}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                  wpm === preset
                    ? "bg-light-accent/20 dark:bg-dark-accent/20 text-light-accent dark:text-dark-accent font-semibold"
                    : "bg-light-border/40 dark:bg-dark-border/40 text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text"
                }`}
                key={preset}
                onClick={() => setWpm(preset)}
                type="button"
              >
                {preset}
              </button>
            ))}

            <button
              aria-label="Custom speed slider"
              className={`p-1.5 rounded-lg transition-all ${
                showSpeedCustomizer
                  ? "bg-light-accent/20 dark:bg-dark-accent/20 text-light-accent dark:text-dark-accent"
                  : "bg-light-border/40 dark:bg-dark-border/40 text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text"
              }`}
              onClick={() => setShowSpeedCustomizer((prev) => !prev)}
              title="Custom Speed"
              type="button"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Custom Speed Slider Popover/Drawer */}
        {showSpeedCustomizer && (
          <div className="flex items-center gap-3 p-3 bg-light-surface/50 dark:bg-dark-surface/50 border border-light-border dark:border-dark-border rounded-xl animate-fadeIn">
            <span className="text-xs font-medium text-light-text-muted dark:text-dark-text-muted shrink-0 w-16">
              {wpm} WPM
            </span>
            <input
              aria-label="Custom words per minute"
              className="w-full h-1.5 bg-light-border/60 dark:bg-dark-border/60 rounded-lg appearance-none cursor-pointer accent-light-accent dark:accent-dark-accent"
              max={900}
              min={100}
              onChange={(e) => setWpm(Number(e.target.value))}
              step={25}
              type="range"
              value={wpm}
            />
          </div>
        )}

        {/* Bottom Keyboard Hint Bar */}
        <div className="text-[11px] text-light-text-muted dark:text-dark-text-muted text-center pt-1 border-t border-light-border/60 dark:border-dark-border/60">
          <span className="font-mono bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border shadow-2xs px-1.5 py-0.5 rounded mr-1">Space</span> toggle play ·{" "}
          <span className="font-mono bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border shadow-2xs px-1.5 py-0.5 rounded mr-1">←/→</span> ±10 words ·{" "}
          <span className="font-mono bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border shadow-2xs px-1.5 py-0.5 rounded mr-1">↑/↓</span> ±25 WPM ·{" "}
          <span className="font-mono bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border shadow-2xs px-1.5 py-0.5 rounded mr-1">Esc</span> close
        </div>
      </div>
    </div>,
    document.body
  );
}
