import {
  Check,
  Flame,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Timer,
  X,
} from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  calculateSprintProgress,
  estimateSprintWords,
  FOCUS_SPRINT_PRESETS,
  type FocusSprintDuration,
  formatSprintTime,
} from "@/utils/focusSprintEngine";

export interface ReaderZenFocusOverlayProps {
  initialMinutes?: FocusSprintDuration;
  isOpen: boolean;
  onClose: () => void;
  readingSpeedWpm?: number | null;
}

export function ReaderZenFocusOverlay({
  initialMinutes = 25,
  isOpen,
  onClose,
  readingSpeedWpm,
}: ReaderZenFocusOverlayProps) {
  const [selectedDuration, setSelectedDuration] =
    useState<FocusSprintDuration>(initialMinutes);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false);
  const [isHudVisible, setIsHudVisible] = useState<boolean>(true);

  const startWallTimeRef = useRef<number>(Date.now());
  const baseElapsedRef = useRef<number>(0);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Progress metrics
  const { isCompleted, progressPercent, remainingSeconds } =
    calculateSprintProgress(elapsedSeconds, selectedDuration);

  // Reset sprint state when overlay is opened or duration changes
  useEffect(() => {
    if (isOpen) {
      startWallTimeRef.current = Date.now();
      baseElapsedRef.current = 0;
      setElapsedSeconds(0);
      setIsRunning(true);
      setShowCompletionModal(false);
      setIsHudVisible(true);
    }
  }, [isOpen, selectedDuration]);

  // Wall-clock sprint countdown timer (drift-free across tab backgrounding/throttling)
  useEffect(() => {
    if (!isOpen || !isRunning || isCompleted) return;

    const tick = () => {
      const currentSegment = Math.max(
        0,
        Math.floor((Date.now() - startWallTimeRef.current) / 1000)
      );
      setElapsedSeconds(baseElapsedRef.current + currentSegment);
    };

    tick();
    const interval = setInterval(tick, 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        tick();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isOpen, isRunning, isCompleted]);

  // Handle sprint completion
  useEffect(() => {
    if (isCompleted && !showCompletionModal && isOpen) {
      setIsRunning(false);
      setShowCompletionModal(true);
    }
  }, [isCompleted, showCompletionModal, isOpen]);

  // Auto-hide HUD on idle
  const resetHideTimer = useCallback(() => {
    setIsHudVisible(true);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = setTimeout(() => {
      setIsHudVisible(false);
    }, 3500);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerMove = () => resetHideTimer();
    window.addEventListener("pointermove", handlePointerMove);
    resetHideTimer();

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [isOpen, resetHideTimer]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "z" || e.key === "Z") {
        if (!e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleToggleRunning = useCallback(() => {
    setIsRunning((prev) => {
      const next = !prev;
      if (next) {
        startWallTimeRef.current = Date.now();
      } else {
        const currentSegment = Math.max(
          0,
          Math.floor((Date.now() - startWallTimeRef.current) / 1000)
        );
        baseElapsedRef.current += currentSegment;
      }
      return next;
    });
  }, []);

  const handleRestartSprint = useCallback(() => {
    startWallTimeRef.current = Date.now();
    baseElapsedRef.current = 0;
    setElapsedSeconds(0);
    setIsRunning(true);
    setShowCompletionModal(false);
  }, []);

  const handleDurationSelect = useCallback((duration: FocusSprintDuration) => {
    setSelectedDuration(duration);
    startWallTimeRef.current = Date.now();
    baseElapsedRef.current = 0;
    setElapsedSeconds(0);
    setIsRunning(true);
    setShowCompletionModal(false);
  }, []);

  const estimatedWords = estimateSprintWords(
    elapsedSeconds,
    readingSpeedWpm
  );

  if (!isOpen) return null;

  return (
    <>
      {/* 1. Ambient Edge Vignette (Non-interactive) */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[58] pointer-events-none transition-opacity duration-700 ease-out shadow-[inset_0_0_90px_25px_rgba(0,0,0,0.22)] dark:shadow-[inset_0_0_110px_35px_rgba(0,0,0,0.45)]"
      />

      {/* 2. Top Hairline Sprint Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-[2.5px] z-[62] bg-line/40 pointer-events-none overflow-hidden">
        <div
          className="h-full bg-accent transition-[width] duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 3. Floating Auto-Hiding Zen HUD */}
      <div
        className={`fixed top-4 right-4 z-[65] pointer-events-auto transition-all duration-300 ${
          isHudVisible
            ? "opacity-100 translate-y-0"
            : "opacity-40 hover:opacity-100 translate-y-0"
        }`}
      >
        <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-page/90 backdrop-blur-xl border border-line shadow-lg text-fg">
          {/* Zen Icon Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-accent">
            <Moon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Zen Focus</span>
          </div>

          <div className="w-px h-4 bg-line mx-0.5" />

          {/* Sprint Timer Display */}
          <div className="flex items-center gap-1.5 px-2 text-xs font-mono font-medium tabular-nums">
            <Timer className="w-3.5 h-3.5 text-fg-muted" />
            <span>{formatSprintTime(remainingSeconds)}</span>
          </div>

          {/* Play/Pause Toggle */}
          <button
            aria-label={isRunning ? "Pause focus sprint" : "Resume focus sprint"}
            className="p-1.5 rounded-full hover:bg-line/40 transition-colors text-fg-muted hover:text-fg"
            onClick={handleToggleRunning}
            title={isRunning ? "Pause" : "Resume"}
            type="button"
          >
            {isRunning ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
          </button>

          {/* Restart Sprint */}
          <button
            aria-label="Restart sprint timer"
            className="p-1.5 rounded-full hover:bg-line/40 transition-colors text-fg-muted hover:text-fg"
            onClick={handleRestartSprint}
            title="Restart Sprint"
            type="button"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-line mx-0.5" />

          {/* Exit Zen Button */}
          <button
            aria-label="Exit Zen Focus Mode (Esc or Z)"
            className="p-1.5 rounded-full hover:bg-line/40 transition-colors text-fg-muted hover:text-fg"
            onClick={onClose}
            title="Exit Zen Mode (Esc or Z)"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. Sprint Completion Celebration Modal */}
      {showCompletionModal && (
        <div
          aria-labelledby="sprint-complete-title"
          aria-modal="true"
          className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
          role="dialog"
        >
          <div className="relative w-full max-w-sm p-6 sm:p-7 rounded-3xl bg-page border border-line shadow-2xl flex flex-col items-center text-center gap-4 animate-scaleUp text-fg">
            {/* Celebration Icon */}
            <div className="w-12 h-12 rounded-2xl bg-accent/15 flex items-center justify-center text-accent">
              <Flame className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3
                className="text-lg font-bold tracking-tight"
                id="sprint-complete-title"
              >
                Focus Sprint Completed!
              </h3>
              <p className="text-xs text-fg-muted leading-relaxed">
                You dedicated {selectedDuration} uninterrupted minutes to deep reading.
              </p>
            </div>

            {/* Performance Stats Pill */}
            <div className="w-full p-3 rounded-2xl bg-surface/50 border border-line flex items-center justify-around text-center">
              <div>
                <span className="text-lg font-bold font-mono text-accent block">
                  {selectedDuration}m
                </span>
                <span className="text-2xs text-fg-muted font-medium">
                  Sprint Duration
                </span>
              </div>
              <div className="w-px h-8 bg-line" />
              <div>
                <span className="text-lg font-bold font-mono text-accent block">
                  ~{estimatedWords}
                </span>
                <span className="text-2xs text-fg-muted font-medium">
                  Words Read
                </span>
              </div>
            </div>

            {/* Duration Selector for Next Sprint */}
            <div className="w-full space-y-1.5 text-left">
              <span className="text-xs font-medium text-fg-muted">
                Start Next Sprint:
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {FOCUS_SPRINT_PRESETS.map((dur) => (
                  <button
                    aria-label={`Start ${dur} minute sprint`}
                    className={`py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      selectedDuration === dur
                        ? "bg-accent text-white dark:text-black font-semibold shadow-sm"
                        : "bg-line/40 text-fg-muted hover:text-fg"
                    }`}
                    key={dur}
                    onClick={() => handleDurationSelect(dur)}
                    type="button"
                  >
                    {dur}m
                  </button>
                ))}
              </div>
            </div>

            {/* Close Button */}
            <button
              aria-label="Continue reading in Zen Mode"
              className="w-full py-2.5 rounded-full bg-accent text-white dark:text-black text-sm font-semibold hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2 mt-1 shadow-md"
              onClick={() => setShowCompletionModal(false)}
              type="button"
            >
              <Check className="w-4 h-4" strokeWidth={2.5} />
              Continue Reading
            </button>
          </div>
        </div>
      )}
    </>
  );
}
