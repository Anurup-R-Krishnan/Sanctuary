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
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, isPlaying, velocityPxPerSec, onTogglePlay, onSpeedChange, onClose]);

  if (!isActive) return null;

  const pacerY = calculatePacerGuidelineY(viewportHeight);

  return (
    <>
      {/* Visual Reading Pacer Guideline Hairline */}
      {isPacerEnabled && isPlaying && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed left-0 right-0 z-40 transition-transform duration-75 ease-out"
          style={{ top: `${pacerY}px` }}
        >
          <div className="relative w-full flex items-center justify-center">
            <div className="w-full h-[1.5px] bg-gradient-to-r from-transparent via-primary/50 to-transparent shadow-[0_0_8px_rgba(var(--color-primary),0.4)]" />
            <div className="absolute w-2 h-2 rounded-full bg-primary/80 ring-2 ring-primary/20 shadow-sm" />
          </div>
        </div>
      )}

      {/* Floating Controller Dock */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 select-none animate-fade-in pointer-events-auto">
        {/* Preset Selector Popover */}
        {showPresets && (
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-surface-elevated/95 backdrop-blur-xl border border-border shadow-2xl animate-scale-in">
            {AUTO_SCROLL_PRESETS.map((preset) => {
              const isSelected =
                Math.abs(preset.velocityPxPerSec - velocityPxPerSec) < 3;
              return (
                <button
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-text-muted hover:text-text hover:bg-surface-hover"
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
        <div className="flex items-center gap-1.5 p-1.5 px-2.5 rounded-full bg-surface-elevated/95 backdrop-blur-xl border border-border shadow-2xl text-text">
          {/* Play/Pause Button */}
          <button
            aria-label={isPlaying ? "Pause auto-scroll" : "Start auto-scroll"}
            className={`p-2 rounded-full transition-colors flex items-center justify-center ${
              isPlaying
                ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                : "bg-surface-hover text-text hover:bg-surface-hover/80"
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

          <div className="w-px h-5 bg-border mx-0.5" />

          {/* Speed Stepper Controls */}
          <div className="flex items-center gap-1">
            <button
              aria-label="Decrease scroll speed"
              className="p-1.5 rounded-full text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
              onClick={() => onSpeedChange(stepVelocity(velocityPxPerSec, "down"))}
              title="Decrease speed ([)"
              type="button"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <button
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-text hover:bg-surface-hover transition-colors tabular-nums"
              onClick={() => setShowPresets((prev) => !prev)}
              title="Click to select speed preset"
              type="button"
            >
              <span>{clampVelocity(velocityPxPerSec)} px/s</span>
              {showPresets ? (
                <ChevronDown className="w-3 h-3 text-text-muted" />
              ) : (
                <ChevronUp className="w-3 h-3 text-text-muted" />
              )}
            </button>

            <button
              aria-label="Increase scroll speed"
              className="p-1.5 rounded-full text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
              onClick={() => onSpeedChange(stepVelocity(velocityPxPerSec, "up"))}
              title="Increase speed (])"
              type="button"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-px h-5 bg-border mx-0.5" />

          {/* Visual Pacer Guideline Toggle */}
          <button
            aria-label={isPacerEnabled ? "Disable pacer line" : "Enable pacer line"}
            className={`p-1.5 rounded-full transition-colors ${
              isPacerEnabled
                ? "bg-primary/10 text-primary border border-primary/30"
                : "text-text-muted hover:text-text hover:bg-surface-hover"
            }`}
            onClick={onTogglePacer}
            title="Toggle Ocular Pacer Line"
            type="button"
          >
            <Crosshair className="w-4 h-4" />
          </button>

          {/* Close Auto-Scroll Dock */}
          <button
            aria-label="Exit auto-scroll"
            className="p-1.5 rounded-full text-text-muted hover:text-text hover:bg-surface-hover transition-colors ml-0.5"
            onClick={onClose}
            title="Exit auto-scroll (Esc)"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
};
