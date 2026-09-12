import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Gauge,
  X,
} from "lucide-react";
import React, { memo } from "react";

import type { SpeechState } from "@/hooks/useReaderSpeech";

import { IconButton } from "@/components/ui/IconButton";

interface ReaderTTSBarProps {
  onChangeRate: (rate: number) => void;
  onClose: () => void;
  onNextSentence: () => void;
  onPrevSentence: () => void;
  onTogglePlayPause: () => void;
  speechState: SpeechState;
}

const SPEED_OPTIONS = [0.75, 1.0, 1.25, 1.5, 2.0];

function ReaderTTSBarComponent({
  speechState,
  onTogglePlayPause,
  onNextSentence,
  onPrevSentence,
  onChangeRate,
  onClose,
}: ReaderTTSBarProps) {
  const { isPlaying, isPaused, currentText, rate } = speechState;

  const cycleSpeed = () => {
    const currentIdx = SPEED_OPTIONS.findIndex((r) => Math.abs(r - rate) < 0.05);
    const nextIdx = (currentIdx + 1) % SPEED_OPTIONS.length;
    onChangeRate(SPEED_OPTIONS[nextIdx]);
  };

  return (
    <div
      role="region"
      aria-label="Text-to-speech controls"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[90] pointer-events-auto max-w-[92vw] sm:max-w-md w-full animate-slideUp"
    >
      <div className="bg-light-surface/95 dark:bg-dark-surface/95 backdrop-blur-2xl border border-black/10 dark:border-white/10 shadow-2xl rounded-2xl px-4 py-3 flex flex-col gap-2 transition-all">
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
              icon={<SkipBack className="w-4 h-4" />}
              onClick={onPrevSentence}
              label="Previous sentence"
              className="w-8 h-8 hover:bg-black/5 dark:hover:bg-white/5 text-light-text-muted dark:text-dark-text-muted"
            />

            <button
              type="button"
              onClick={onTogglePlayPause}
              aria-label={isPlaying && !isPaused ? "Pause speech" : "Play speech"}
              className="w-10 h-10 rounded-full bg-light-accent dark:bg-dark-accent text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-transform"
            >
              {isPlaying && !isPaused ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <IconButton
              icon={<SkipForward className="w-4 h-4" />}
              onClick={onNextSentence}
              label="Next sentence"
              className="w-8 h-8 hover:bg-black/5 dark:hover:bg-white/5 text-light-text-muted dark:text-dark-text-muted"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Speed toggle button */}
            <button
              type="button"
              onClick={cycleSpeed}
              aria-label={`Playback speed ${rate}x, click to change`}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-black/5 dark:bg-white/10 text-light-text dark:text-dark-text hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
            >
              <Gauge className="w-3 h-3" />
              <span>{rate}x</span>
            </button>

            <div className="w-px h-4 bg-black/10 dark:bg-white/10" />

            {/* Close button */}
            <IconButton
              icon={<X className="w-4 h-4" />}
              onClick={onClose}
              label="Close audio controls"
              className="w-8 h-8 hover:bg-black/5 dark:hover:bg-white/5 text-light-text-muted dark:text-dark-text-muted"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export const ReaderTTSBar = memo(ReaderTTSBarComponent);
