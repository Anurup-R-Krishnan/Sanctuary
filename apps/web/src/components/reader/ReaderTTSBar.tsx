import {
  Check,
  Gauge,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Volume2,
  X,
} from "lucide-react";
import React, { memo, useMemo, useState } from "react";

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

  return (
    <div
      aria-label="Text-to-speech controls"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[90] pointer-events-auto max-w-[92vw] sm:max-w-md w-full animate-slideUp"
      role="region"
    >
      <div className="bg-light-surface/95 dark:bg-dark-surface/95 backdrop-blur-2xl border border-black/10 dark:border-white/10 shadow-2xl rounded-2xl px-4 py-3 flex flex-col gap-2 transition-all">
        {/* Voice Popover Panel */}
        {showVoicePopover && (
          <div className="border-b border-black/10 dark:border-white/10 pb-3 mb-1 animate-fadeIn flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider">
                Voice & Audio Cadence
              </span>
              <button
                aria-label="Close voice settings"
                className="p-1 rounded text-light-text-muted hover:text-light-text dark:text-dark-text-muted dark:hover:text-dark-text"
                onClick={() => setShowVoicePopover(false)}
                type="button"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Voice list */}
            {sortedVoices.length > 0 ? (
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {sortedVoices.map((v) => {
                  const isSelected = activeVoice?.voiceURI === v.voiceURI;
                  return (
                    <div
                      key={v.voiceURI}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-[rgb(var(--accent))]/15 text-[rgb(var(--accent))] font-medium"
                          : "hover:bg-black/5 dark:hover:bg-white/5 text-light-text dark:text-dark-text"
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
              <p className="text-xs text-light-text-muted dark:text-dark-text-muted italic">
                No system speech synthesis voices detected.
              </p>
            )}

            {/* Natural paragraph pause options */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-black/5 dark:border-white/5">
              <span className="text-xs text-light-text-muted dark:text-dark-text-muted font-medium">
                Paragraph Pause:
              </span>
              <div className="flex items-center gap-1">
                {PAUSE_PRESETS.map((preset) => (
                  <button
                    key={preset.ms}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      paragraphPauseMs === preset.ms
                        ? "bg-[rgb(var(--accent))] text-white shadow-sm"
                        : "bg-black/5 dark:bg-white/5 text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text"
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
              className="w-8 h-8 hover:bg-black/5 dark:hover:bg-white/5 text-light-text-muted dark:text-dark-text-muted"
              icon={<SkipBack className="w-4 h-4" />}
              label="Previous sentence"
              onClick={onPrevSentence}
            />

            <button
              aria-label={isPlaying && !isPaused ? "Pause speech" : "Play speech"}
              className="w-10 h-10 rounded-full bg-light-accent dark:bg-dark-accent text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-transform"
              onClick={onTogglePlayPause}
              type="button"
            >
              {isPlaying && !isPaused ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <IconButton
              className="w-8 h-8 hover:bg-black/5 dark:hover:bg-white/5 text-light-text-muted dark:text-dark-text-muted"
              icon={<SkipForward className="w-4 h-4" />}
              label="Next sentence"
              onClick={onNextSentence}
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Voice & Audio Profile Button */}
            <button
              aria-label="Voice and audio profiles"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                showVoicePopover
                  ? "bg-[rgb(var(--accent))] text-white shadow-sm"
                  : "bg-black/5 dark:bg-white/10 text-light-text dark:text-dark-text hover:bg-black/10 dark:hover:bg-white/20"
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
              aria-label={`Playback speed ${rate}x, click to change`}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-black/5 dark:bg-white/10 text-light-text dark:text-dark-text hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
              onClick={cycleSpeed}
              type="button"
            >
              <Gauge className="w-3 h-3" />
              <span>{rate}x</span>
            </button>

            <div className="w-px h-4 bg-black/10 dark:bg-white/10" />

            {/* Close button */}
            <IconButton
              className="w-8 h-8 hover:bg-black/5 dark:hover:bg-white/5 text-light-text-muted dark:text-dark-text-muted"
              icon={<X className="w-4 h-4" />}
              label="Close audio controls"
              onClick={onClose}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export const ReaderTTSBar = memo(ReaderTTSBarComponent);
