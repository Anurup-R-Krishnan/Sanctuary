import {
  ChevronDown,
  ChevronUp,
  Crosshair,
  Minus,
  Pause,
  Play,
  Plus,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  AUTO_SCROLL_PRESETS,
  calculatePacerGuidelineY,
  clampVelocity,
  stepVelocity,
} from "@/utils/autoScrollEngine";

export interface ReaderAutoScrollControllerProps {
  isActive: boolean;
  isPacerEnabled: boolean;
  isPlaying: boolean;
  onClose: () => void;
  onSpeedChange: (velocityPxPerSec: number) => void;
  onTogglePacer: () => void;
  onTogglePlay: () => void;
  velocityPxPerSec: number;
}

export const ReaderAutoScrollController: React.FC<
  ReaderAutoScrollControllerProps
> = ({
  isActive,
  isPacerEnabled,
  isPlaying,
  onClose,
  onSpeedChange,
  onTogglePacer,
  onTogglePlay,
  velocityPxPerSec,
}) => {
  const [showPresets, setShowPresets] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== "undefined" ? window.innerHeight : 800
  );

  useEffect(() => {
    const handleResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Keyboard shortcut listener within auto-scroll controller
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        onTogglePlay();
      } else if (e.key === "[" || e.key === "-") {
        e.preventDefault();
        onSpeedChange(stepVelocity(velocityPxPerSec, "down"));
      } else if (e.key === "]" || e.key === "=" || e.key === "+") {
        e.preventDefault();
        onSpeedChange(stepVelocity(velocityPxPerSec, "up"));
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (showPresets) {
          setShowPresets(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, isPlaying, velocityPxPerSec, showPresets, onTogglePlay, onSpeedChange, onClose]);

  if (!isActive || typeof document === "undefined") return null;

  const pacerY = calculatePacerGuidelineY(viewportHeight);

  return createPortal(
    <>
      {/* Visual Reading Pacer Guideline Hairline */}
      {isPacerEnabled && isPlaying && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed left-0 right-0 z-40 transition-transform duration-75 ease-out"
          style={{ top: `${pacerY}px` }}
        >
          <div className="relative w-full flex items-center justify-center">
            <div className="w-full h-[1.5px] bg-gradient-to-r from-transparent via-light-accent/60 dark:via-dark-accent/60 to-transparent shadow-[0_0_8px_rgba(166,126,80,0.4)] dark:shadow-[0_0_8px_rgba(200,160,106,0.4)]" />
            <div className="absolute w-2 h-2 rounded-full bg-light-accent dark:bg-dark-accent ring-2 ring-light-accent/20 dark:ring-dark-accent/20 shadow-sm" />
          </div>
        </div>
      )}

      {/* Floating Controller Dock */}
      <div
        aria-label="Auto-scroll controls"
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 select-none animate-fade-in pointer-events-auto"
        role="region"
      >
        {/* Preset Selector Popover */}
        {showPresets && (
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-light-primary/95 dark:bg-dark-primary/95 backdrop-blur-xl border border-light-border dark:border-dark-border shadow-2xl animate-scale-in">
            {AUTO_SCROLL_PRESETS.map((preset) => {
              const isSelected =
                Math.abs(preset.velocityPxPerSec - velocityPxPerSec) < 3;
              return (
                <button
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-light-accent dark:bg-dark-accent text-white dark:text-black shadow-sm font-semibold"
                      : "text-light-text-muted hover:text-light-text dark:text-dark-text-muted dark:hover:text-dark-text hover:bg-light-border/40 dark:hover:bg-dark-border/40"
                  }`}
                  key={preset.id}
                  onClick={() => {
                    onSpeedChange(preset.velocityPxPerSec);
                    setShowPresets(false);
                  }}
                  type="button"
                >
                  {preset.label}
                  <span className="ml-1 text-[10px] opacity-70">
                    {preset.velocityPxPerSec}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Primary Floating Capsule */}
        <div className="flex items-center gap-1.5 p-1.5 px-2.5 rounded-full bg-light-primary/95 dark:bg-dark-primary/95 backdrop-blur-xl border border-light-border dark:border-dark-border shadow-2xl text-light-text dark:text-dark-text">
          {/* Play/Pause Button */}
          <button
            aria-label={isPlaying ? "Pause auto-scroll (Space)" : "Start auto-scroll (Space)"}
            className={`p-2 rounded-full transition-colors flex items-center justify-center ${
              isPlaying
                ? "bg-light-accent dark:bg-dark-accent text-white dark:text-black shadow-sm hover:opacity-90"
                : "bg-light-surface/80 dark:bg-dark-surface/80 text-light-text dark:text-dark-text hover:bg-light-border/40 dark:hover:bg-dark-border/40"
            }`}
            onClick={onTogglePlay}
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            type="button"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <div className="w-px h-5 bg-light-border dark:bg-dark-border mx-0.5" />

          {/* Speed Stepper Controls */}
          <div className="flex items-center gap-1">
            <button
              aria-label="Decrease scroll speed ([)"
              className="p-1.5 rounded-full text-light-text-muted hover:text-light-text dark:text-dark-text-muted dark:hover:text-dark-text hover:bg-light-border/40 dark:hover:bg-dark-border/40 transition-colors"
              onClick={() => onSpeedChange(stepVelocity(velocityPxPerSec, "down"))}
              title="Decrease speed ([)"
              type="button"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <button
              aria-expanded={showPresets}
              aria-haspopup="listbox"
              aria-label={`Scroll speed: ${clampVelocity(velocityPxPerSec)} pixels per second. Click to toggle speed presets.`}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-light-text dark:text-dark-text hover:bg-light-border/40 dark:hover:bg-dark-border/40 transition-colors tabular-nums"
              onClick={() => setShowPresets((prev) => !prev)}
              title="Click to select speed preset"
              type="button"
            >
              <span>{clampVelocity(velocityPxPerSec)} px/s</span>
              {showPresets ? (
                <ChevronDown className="w-3 h-3 text-light-text-muted dark:text-dark-text-muted" />
              ) : (
                <ChevronUp className="w-3 h-3 text-light-text-muted dark:text-dark-text-muted" />
              )}
            </button>

            <button
              aria-label="Increase scroll speed (])"
              className="p-1.5 rounded-full text-light-text-muted hover:text-light-text dark:text-dark-text-muted dark:hover:text-dark-text hover:bg-light-border/40 dark:hover:bg-dark-border/40 transition-colors"
              onClick={() => onSpeedChange(stepVelocity(velocityPxPerSec, "up"))}
              title="Increase speed (])"
              type="button"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-px h-5 bg-light-border dark:bg-dark-border mx-0.5" />

          {/* Visual Pacer Guideline Toggle */}
          <button
            aria-label={isPacerEnabled ? "Disable pacer line" : "Enable pacer line"}
            className={`p-1.5 rounded-full transition-colors ${
              isPacerEnabled
                ? "bg-light-accent/15 text-light-accent dark:bg-dark-accent/20 dark:text-dark-accent border border-light-accent/30 dark:border-dark-accent/30"
                : "text-light-text-muted hover:text-light-text dark:text-dark-text-muted dark:hover:text-dark-text hover:bg-light-border/40 dark:hover:bg-dark-border/40"
            }`}
            onClick={onTogglePacer}
            title={isPacerEnabled ? "Disable pacer line" : "Enable pacer line"}
            type="button"
          >
            <Crosshair className="w-4 h-4" />
          </button>

          {/* Close Auto-Scroll Dock */}
          <button
            aria-label="Exit auto-scroll (Esc)"
            className="p-1.5 rounded-full text-light-text-muted hover:text-light-text dark:text-dark-text-muted dark:hover:text-dark-text hover:bg-light-border/40 dark:hover:bg-dark-border/40 transition-colors ml-0.5"
            onClick={onClose}
            title="Exit auto-scroll (Esc)"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>,
    document.body
  );
};
