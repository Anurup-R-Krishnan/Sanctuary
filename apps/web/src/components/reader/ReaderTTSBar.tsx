import {
  Check,
  Gauge,
  Pause,
  Play,
  Search,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Volume2,
  X,
} from "lucide-react";
import React, { memo, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import type { SpeechState } from "@/hooks/useReaderSpeech";

import { IconButton } from "@/components/ui/IconButton";

interface ReaderTTSBarProps {
  activeVoiceURI?: string | null;
  onChangeParagraphPause?: (ms: number) => void;
  onChangeRate: (rate: number) => void;
  onChangeVoice?: (voiceURI: string) => void;
  onClose: () => void;
  onNextSentence: () => void;
  onPrevSentence: () => void;
  onTogglePlayPause: () => void;
  paragraphPauseMs?: number;
  speechState: SpeechState;
  voices?: SpeechSynthesisVoice[];
}

const SPEED_OPTIONS = [0.75, 1.0, 1.25, 1.5, 2.0];

const PAUSE_PRESETS = [
  { label: "Off", ms: 0 },
  { label: "Brisk", ms: 180 },
  { label: "Natural", ms: 350 },
  { label: "Relaxed", ms: 600 },
];

function ReaderTTSBarComponent({
  activeVoiceURI,
  onChangeParagraphPause,
  onChangeRate,
  onChangeVoice,
  onClose,
  onNextSentence,
  onPrevSentence,
  onTogglePlayPause,
  paragraphPauseMs = 350,
  speechState,
  voices = [],
}: ReaderTTSBarProps) {
  const { currentText, isPaused, isPlaying, rate } = speechState;
  const [showVoicePopover, setShowVoicePopover] = useState(false);
  const [voiceQuery, setVoiceQuery] = useState("");

  // Keyboard shortcut listener for Escape dismissal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (showVoicePopover) {
          setShowVoicePopover(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showVoicePopover, onClose]);

  const cycleSpeed = () => {
    const currentIdx = SPEED_OPTIONS.findIndex((r) => Math.abs(r - rate) < 0.05);
    const nextIdx = (currentIdx + 1) % SPEED_OPTIONS.length;
    onChangeRate(SPEED_OPTIONS[nextIdx]);
  };

  const sortedVoices = useMemo(() => {
    if (!voices || voices.length === 0) return [];
    return [...voices].sort((a, b) => {
      if (a.lang !== b.lang) return a.lang.localeCompare(b.lang);
      return a.name.localeCompare(b.name);
    });
  }, [voices]);

  const filteredVoices = useMemo(() => {
    if (!voiceQuery.trim()) return sortedVoices;
    const q = voiceQuery.toLowerCase();
    return sortedVoices.filter(
      (v) => v.name.toLowerCase().includes(q) || v.lang.toLowerCase().includes(q)
    );
  }, [sortedVoices, voiceQuery]);

  const activeVoice = useMemo(() => {
    return voices.find((v) => v.voiceURI === activeVoiceURI) || voices[0] || null;
  }, [voices, activeVoiceURI]);

  const handlePreviewVoice = (e: React.MouseEvent, voice: SpeechSynthesisVoice) => {
    e.stopPropagation();
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("Sanctuary natural reading voice preview.");
    utterance.voice = voice;
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-label="Text-to-speech controls"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[90] pointer-events-auto max-w-[92vw] sm:max-w-md w-full animate-slideUp"
      role="region"
    >
      <div className="bg-light-primary/95 dark:bg-dark-primary/95 backdrop-blur-2xl border border-light-border dark:border-dark-border shadow-2xl rounded-2xl px-4 py-3 flex flex-col gap-2 transition-all">
        {/* Voice Popover Panel */}
        {showVoicePopover && (
          <div className="border-b border-light-border dark:border-dark-border pb-3 mb-1 animate-fadeIn flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider">
                Voice & Audio Cadence
              </span>
              <button
                aria-label="Close voice settings"
                className="p-1 rounded text-light-text-muted hover:text-light-text dark:text-dark-text-muted dark:hover:text-dark-text transition-colors"
                onClick={() => setShowVoicePopover(false)}
                type="button"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Optional search input when multiple voices exist */}
            {sortedVoices.length > 5 && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-light-text-muted dark:text-dark-text-muted pointer-events-none" />
                <input
                  aria-label="Search available voices"
                  className="w-full pl-7 pr-3 py-1 text-xs rounded-lg bg-light-surface/60 dark:bg-dark-surface/60 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text placeholder:text-light-text-muted dark:placeholder:text-dark-text-muted focus:outline-none focus:ring-1 focus:ring-light-accent dark:focus:ring-dark-accent"
                  onChange={(e) => setVoiceQuery(e.target.value)}
                  placeholder="Filter voices..."
                  type="text"
                  value={voiceQuery}
                />
              </div>
            )}

            {/* Voice list */}
            {filteredVoices.length > 0 ? (
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {filteredVoices.map((v) => {
                  const isSelected = activeVoice?.voiceURI === v.voiceURI;
                  return (
                    <div
                      key={v.voiceURI}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-light-accent/15 text-light-accent dark:bg-dark-accent/20 dark:text-dark-accent font-semibold"
                          : "hover:bg-light-border/40 dark:hover:bg-dark-border/40 text-light-text dark:text-dark-text"
                      }`}
                      onClick={() => onChangeVoice?.(v.voiceURI)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onChangeVoice?.(v.voiceURI);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                        <span className="truncate">{v.name}</span>
                        <span className="text-[10px] text-light-text-muted dark:text-dark-text-muted opacity-80 flex-shrink-0">
                          {v.lang}
                        </span>
                      </div>
                      <button
                        aria-label={`Preview voice ${v.name}`}
                        className="p-1 rounded text-light-text-muted hover:text-light-text dark:text-dark-text-muted dark:hover:text-dark-text opacity-70 hover:opacity-100 flex-shrink-0"
                        onClick={(e) => handlePreviewVoice(e, v)}
                        title="Preview voice"
                        type="button"
                      >
                        <Volume2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-light-text-muted dark:text-dark-text-muted italic py-1">
                {sortedVoices.length === 0
                  ? "No system speech synthesis voices detected."
                  : "No voices match your filter."}
              </p>
            )}

            {/* Direct Playback Speed Selector */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-light-border dark:border-dark-border">
              <span className="text-xs text-light-text-muted dark:text-dark-text-muted font-medium">
                Playback Speed:
              </span>
              <div className="flex items-center gap-1">
                {SPEED_OPTIONS.map((opt) => {
                  const isCurrent = Math.abs(opt - rate) < 0.05;
                  return (
                    <button
                      key={opt}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        isCurrent
                          ? "bg-light-accent dark:bg-dark-accent text-white dark:text-black shadow-sm font-semibold"
                          : "bg-light-surface/60 dark:bg-dark-surface/60 border border-light-border/60 dark:border-dark-border/60 text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text hover:bg-light-border/40 dark:hover:bg-dark-border/40"
                      }`}
                      onClick={() => onChangeRate(opt)}
                      type="button"
                    >
                      {opt}x
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Natural paragraph pause options */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-xs text-light-text-muted dark:text-dark-text-muted font-medium">
                Paragraph Pause:
              </span>
              <div className="flex items-center gap-1">
                {PAUSE_PRESETS.map((preset) => (
                  <button
                    key={preset.ms}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      paragraphPauseMs === preset.ms
                        ? "bg-light-accent dark:bg-dark-accent text-white dark:text-black shadow-sm font-semibold"
                        : "bg-light-surface/60 dark:bg-dark-surface/60 border border-light-border/60 dark:border-dark-border/60 text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text hover:bg-light-border/40 dark:hover:bg-dark-border/40"
                    }`}
                    onClick={() => onChangeParagraphPause?.(preset.ms)}
                    type="button"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Top: Current sentence snippet */}
        {currentText && (
          <div className="text-xs text-light-text-muted dark:text-dark-text-muted truncate px-1 italic">
            &ldquo;{currentText}&rdquo;
          </div>
        )}

        {/* Bottom: Playback buttons */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <IconButton
              className="w-8 h-8 hover:bg-light-border/40 dark:hover:bg-dark-border/40 text-light-text-muted dark:text-dark-text-muted"
              icon={<SkipBack className="w-4 h-4" />}
              label="Previous sentence"
              onClick={onPrevSentence}
            />

            <button
              aria-label={isPlaying && !isPaused ? "Pause speech" : "Play speech"}
              className="w-10 h-10 rounded-full bg-light-accent dark:bg-dark-accent text-white dark:text-black flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-transform"
              onClick={onTogglePlayPause}
              title={isPlaying && !isPaused ? "Pause speech" : "Play speech"}
              type="button"
            >
              {isPlaying && !isPaused ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <IconButton
              className="w-8 h-8 hover:bg-light-border/40 dark:hover:bg-dark-border/40 text-light-text-muted dark:text-dark-text-muted"
              icon={<SkipForward className="w-4 h-4" />}
              label="Next sentence"
              onClick={onNextSentence}
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Voice & Audio Profile Button */}
            <button
              aria-expanded={showVoicePopover}
              aria-haspopup="dialog"
              aria-label="Voice and audio settings"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                showVoicePopover
                  ? "bg-light-accent dark:bg-dark-accent text-white dark:text-black shadow-sm font-semibold"
                  : "bg-light-surface/60 dark:bg-dark-surface/60 border border-light-border/60 dark:border-dark-border/60 text-light-text dark:text-dark-text hover:bg-light-border/40 dark:hover:bg-dark-border/40"
              }`}
              onClick={() => setShowVoicePopover(!showVoicePopover)}
              title={activeVoice?.name || "Select voice"}
              type="button"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span className="max-w-[70px] truncate hidden sm:inline">
                {activeVoice?.name?.split(" ")[0] || "Voice"}
              </span>
            </button>

            {/* Speed toggle button */}
            <button
              aria-label={`Playback speed ${rate}x, click to cycle`}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-light-surface/60 dark:bg-dark-surface/60 border border-light-border/60 dark:border-dark-border/60 text-light-text dark:text-dark-text hover:bg-light-border/40 dark:hover:bg-dark-border/40 transition-colors"
              onClick={cycleSpeed}
              title={`Playback speed ${rate}x`}
              type="button"
            >
              <Gauge className="w-3 h-3" />
              <span>{rate}x</span>
            </button>

            <div className="w-px h-4 bg-light-border dark:bg-dark-border" />

            {/* Close button */}
            <IconButton
              className="w-8 h-8 hover:bg-light-border/40 dark:hover:bg-dark-border/40 text-light-text-muted dark:text-dark-text-muted"
              icon={<X className="w-4 h-4" />}
              label="Close audio controls (Esc)"
              onClick={onClose}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export const ReaderTTSBar = memo(ReaderTTSBarComponent);
