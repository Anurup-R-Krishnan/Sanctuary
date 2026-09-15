import {
  CloudRain,
  Disc,
  Flame,
  Pause,
  Play,
  Radio,
  Timer,
  Volume2,
  VolumeX,
  Waves,
  Wind,
  X,
} from "lucide-react";
import React, { memo, useEffect, useRef } from "react";

import {
  SOUNDSCAPES,
  type SoundscapeType,
} from "@/audio/ambientTypes";
import { IconButton } from "@/components/ui/IconButton";
import { useAmbientSoundStore } from "@/store/useAmbientSoundStore";
import { cx } from "@/utils/cx";

interface ReaderAmbientSoundPopoverProps {
  onClose: () => void;
}

const SLEEP_TIMER_OPTIONS = [
  { label: "Off", minutes: null },
  { label: "15m", minutes: 15 },
  { label: "30m", minutes: 30 },
  { label: "45m", minutes: 45 },
  { label: "60m", minutes: 60 },
];

function getSoundscapeIcon(id: SoundscapeType) {
  switch (id) {
    case "fireplace":
      return Flame;
    case "pink-noise":
      return Disc;
    case "rain":
      return CloudRain;
    case "waves":
      return Waves;
    case "white-noise":
      return Radio;
    case "wind":
      return Wind;
  }
}

function ReaderAmbientSoundPopoverComponent({
  onClose,
}: ReaderAmbientSoundPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  const activeSoundscape = useAmbientSoundStore((s) => s.activeSoundscape);
  const isPlaying = useAmbientSoundStore((s) => s.isPlaying);
  const pause = useAmbientSoundStore((s) => s.pause);
  const play = useAmbientSoundStore((s) => s.play);
  const setSleepTimer = useAmbientSoundStore((s) => s.setSleepTimer);
  const setVolume = useAmbientSoundStore((s) => s.setVolume);
  const sleepTimerEndsAt = useAmbientSoundStore((s) => s.sleepTimerEndsAt);
  const sleepTimerMinutes = useAmbientSoundStore((s) => s.sleepTimerMinutes);
  const togglePlay = useAmbientSoundStore((s) => s.togglePlay);
  const volume = useAmbientSoundStore((s) => s.volume);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Remaining minutes calculator
  const remainingMinutes =
    sleepTimerEndsAt && sleepTimerEndsAt > Date.now()
      ? Math.max(1, Math.ceil((sleepTimerEndsAt - Date.now()) / (60 * 1000)))
      : null;

  return (
    <div
      aria-label="Ambient soundscapes panel"
      aria-modal="true"
      className="pointer-events-auto fixed right-4 top-16 sm:right-6 sm:top-20 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-light-border dark:border-dark-border bg-light-surface/95 dark:bg-dark-surface/95 p-4 sm:p-5 shadow-2xl backdrop-blur-2xl transition-all duration-instant animate-fadeIn"
      ref={popoverRef}
      role="dialog"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-light-border dark:border-dark-border">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-light-accent/15 dark:bg-dark-accent/15 text-light-accent dark:text-dark-accent">
            <Waves className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-light-text dark:text-dark-text">
              Ambient Soundscapes
            </h3>
            <p className="text-[11px] text-light-text-muted dark:text-dark-text-muted">
              {isPlaying && activeSoundscape
                ? `Playing ${SOUNDSCAPES.find((s) => s.id === activeSoundscape)?.label}`
                : "Procedural acoustic masking"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <IconButton
            className="text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text"
            icon={isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            label={isPlaying ? "Pause audio" : "Play audio"}
            onClick={togglePlay}
            size="sm"
            variant="ghost"
          />
          <IconButton
            className="text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text"
            icon={<X className="w-4 h-4" />}
            label="Close soundscapes"
            onClick={onClose}
            size="sm"
            variant="ghost"
          />
        </div>
      </div>

      {/* Soundscape Options Grid */}
      <div className="grid grid-cols-2 gap-2 my-3.5">
        {SOUNDSCAPES.map((soundscape) => {
          const Icon = getSoundscapeIcon(soundscape.id);
          const isSelected = activeSoundscape === soundscape.id;
          const isActivePlaying = isSelected && isPlaying;

          return (
            <button
              className={cx(
                "group relative flex flex-col items-start gap-1 p-2.5 rounded-xl border text-left transition-all duration-instant",
                isSelected
                  ? "border-light-accent dark:border-dark-accent bg-light-accent/10 dark:bg-dark-accent/10"
                  : "border-light-border dark:border-dark-border hover:border-light-accent/40 dark:hover:border-dark-accent/40 bg-light-surface/40 dark:bg-dark-surface/40"
              )}
              key={soundscape.id}
              onClick={() => {
                if (isActivePlaying) {
                  pause();
                } else {
                  play(soundscape.id);
                }
              }}
              type="button"
            >
              <div className="flex items-center justify-between w-full">
                <Icon
                  className={cx(
                    "w-4 h-4 transition-colors",
                    isSelected
                      ? "text-light-accent dark:text-dark-accent"
                      : "text-light-text-muted dark:text-dark-text-muted group-hover:text-light-text dark:group-hover:text-dark-text"
                  )}
                />
                {isActivePlaying && (
                  <span className="flex items-center gap-0.5 h-3">
                    <span className="w-0.5 h-2 bg-light-accent dark:bg-dark-accent rounded-full animate-pulse" />
                    <span className="w-0.5 h-3 bg-light-accent dark:bg-dark-accent rounded-full animate-pulse delay-75" />
                    <span className="w-0.5 h-1.5 bg-light-accent dark:bg-dark-accent rounded-full animate-pulse delay-150" />
                  </span>
                )}
              </div>
              <span
                className={cx(
                  "text-xs font-semibold tracking-tight",
                  isSelected
                    ? "text-light-accent dark:text-dark-accent"
                    : "text-light-text dark:text-dark-text"
                )}
              >
                {soundscape.label}
              </span>
              <span className="text-[10px] line-clamp-1 leading-tight text-light-text-muted dark:text-dark-text-muted">
                {soundscape.description}
              </span>
            </button>
          );
        })}
      </div>

      {/* Volume Slider */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-light-border/60 dark:border-dark-border/60">
        <div className="flex items-center justify-between text-xs font-medium text-light-text-muted dark:text-dark-text-muted">
          <span className="flex items-center gap-1.5">
            {volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
            Volume
          </span>
          <span className="font-mono text-[11px]">{volume}%</span>
        </div>
        <input
          aria-label="Soundscape volume"
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-light-border/60 dark:bg-dark-border/60 accent-light-accent dark:accent-dark-accent outline-none"
          max={100}
          min={0}
          onChange={(e) => setVolume(parseInt(e.target.value, 10))}
          step={1}
          type="range"
          value={volume}
        />
      </div>

      {/* Sleep Timer */}
      <div className="flex flex-col gap-1.5 pt-3 mt-2 border-t border-light-border/60 dark:border-dark-border/60">
        <div className="flex items-center justify-between text-xs font-medium text-light-text-muted dark:text-dark-text-muted">
          <span className="flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5" />
            Sleep Timer
          </span>
          {remainingMinutes !== null && (
            <span className="font-mono text-[11px] text-light-accent dark:text-dark-accent">
              {remainingMinutes}m left
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {SLEEP_TIMER_OPTIONS.map((opt) => {
            const isSelected = sleepTimerMinutes === opt.minutes;
            return (
              <button
                className={cx(
                  "flex-1 py-1 rounded-lg text-[11px] font-medium border transition-all duration-instant",
                  isSelected
                    ? "border-light-accent dark:border-dark-accent bg-light-accent/15 dark:bg-dark-accent/15 text-light-accent dark:text-dark-accent"
                    : "border-light-border dark:border-dark-border hover:border-light-accent/40 dark:hover:border-dark-accent/40 text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text bg-light-surface/40 dark:bg-dark-surface/40"
                )}
                key={opt.label}
                onClick={() => setSleepTimer(opt.minutes)}
                type="button"
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const ReaderAmbientSoundPopover = memo(
  ReaderAmbientSoundPopoverComponent
);
