import {
  Bell,
  BellOff,
  Check,
  CheckCircle2,
  Clock,
  Flame,
  PauseCircle,
  Volume2,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { createPortal } from 'react-dom';

import {
  formatClock,
  formatDurationCompact,
  playSessionCompletionChime,
} from '@/utils/readingTimerEngine';

export interface ReaderSessionTimerModalProps {
  dailyGoalMinutes: number;
  dailyPercent: number;
  elapsedSeconds: number;
  isDailyGoalMet: boolean;
  isIdle: boolean;
  isOpen: boolean;
  isSessionGoalMet: boolean;
  onClose: () => void;
  remainingSeconds: number;
  sessionBudgetMinutes: number;
  sessionChimeEnabled: boolean;
  sessionPercent: number;
  setSessionBudgetMinutes: (minutes: number) => void;
  setSessionChimeEnabled: (enabled: boolean) => void;
  todayMinutesTotal: number;
}

const PRESET_BUDGET_OPTIONS: readonly number[] = [15, 20, 25, 30, 45, 60, 90, 0];

export function ReaderSessionTimerModal({
  dailyGoalMinutes,
  dailyPercent,
  elapsedSeconds,
  isDailyGoalMet,
  isIdle,
  isOpen,
  isSessionGoalMet,
  onClose,
  remainingSeconds,
  sessionBudgetMinutes,
  sessionChimeEnabled,
  sessionPercent,
  setSessionBudgetMinutes,
  setSessionChimeEnabled,
  todayMinutesTotal,
}: ReaderSessionTimerModalProps) {
  const [isPlayingChime, setIsPlayingChime] = useState(false);
  const [customInput, setCustomInput] = useState('');

  // Keyboard accessibility: Escape key dismisses modal
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePreviewChime = async () => {
    setIsPlayingChime(true);
    await playSessionCompletionChime();
    setTimeout(() => {
      setIsPlayingChime(false);
    }, 1600);
  };

  const parsedCustom = parseInt(customInput, 10);
  const isValidCustom = !isNaN(parsedCustom) && parsedCustom >= 1 && parsedCustom <= 180;

  const handleApplyCustom = () => {
    if (isValidCustom) {
      setSessionBudgetMinutes(parsedCustom);
      setCustomInput('');
    }
  };

  const isCustomActive =
    sessionBudgetMinutes > 0 && !PRESET_BUDGET_OPTIONS.includes(sessionBudgetMinutes);

  return createPortal(
    <div
      aria-labelledby="reading-timer-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in pointer-events-auto"
      role="dialog"
    >
      {/* Accessible Backdrop dismiss target */}
      <button
        aria-label="Dismiss reading session timer modal"
        className="fixed inset-0 bg-transparent cursor-default"
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />

      <div className="relative z-10 w-full max-w-md p-6 rounded-2xl bg-light-primary dark:bg-dark-primary border border-light-border dark:border-dark-border shadow-2xl space-y-5 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-light-border/60 dark:border-dark-border/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-light-accent/10 dark:bg-dark-accent/10 text-light-accent dark:text-dark-accent">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2
                className="text-base font-semibold text-light-text dark:text-dark-text"
                id="reading-timer-modal-title"
              >
                Reading Session Timer
              </h2>
              <p className="text-xs text-light-text-muted dark:text-dark-text-muted">
                Focus target &amp; daily habit tracking
              </p>
            </div>
          </div>
          <button
            aria-label="Close session timer dialog"
            className="p-1.5 rounded-lg text-light-text-muted hover:text-light-text dark:hover:text-dark-text hover:bg-light-border/40 dark:hover:bg-dark-border/40 transition-colors"
            onClick={onClose}
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Session Status */}
        <div className="p-4 rounded-xl bg-light-secondary dark:bg-dark-secondary/60 border border-light-border/40 dark:border-dark-border/40 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-light-text-muted dark:text-dark-text-muted font-medium flex items-center gap-1.5">
              {isIdle ? (
                <>
                  <PauseCircle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    Idle (paused)
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Session Active</span>
                </>
              )}
            </span>
            <span className="font-mono text-xs font-semibold text-light-text dark:text-dark-text">
              {sessionBudgetMinutes > 0
                ? `${formatClock(remainingSeconds)} left`
                : `${formatClock(elapsedSeconds)} read`}
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-bold font-mono tracking-tight text-light-text dark:text-dark-text">
              {formatDurationCompact(elapsedSeconds)}
            </span>
            <span className="text-xs text-light-text-muted dark:text-dark-text-muted">
              {sessionBudgetMinutes > 0
                ? `Target: ${sessionBudgetMinutes}m (${sessionPercent}%)`
                : 'Untimed session'}
            </span>
          </div>

          {/* Session Progress Bar */}
          {sessionBudgetMinutes > 0 && (
            <div className="w-full h-1.5 rounded-full bg-light-border/60 dark:bg-dark-border/60 overflow-hidden mt-1.5">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  isSessionGoalMet
                    ? 'bg-emerald-500'
                    : 'bg-light-accent dark:bg-dark-accent'
                }`}
                style={{ width: `${sessionPercent}%` }}
              />
            </div>
          )}

          {isSessionGoalMet && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium pt-1">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Session budget achieved! Outstanding focus.</span>
            </div>
          )}
        </div>

        {/* Quick Session Budget Presets & Custom Duration */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-light-text-muted dark:text-dark-text-muted">
              Session Target
            </label>
            {isCustomActive && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-light-accent/15 dark:bg-dark-accent/15 text-light-accent dark:text-dark-accent border border-light-accent/20">
                Custom ({sessionBudgetMinutes}m)
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {PRESET_BUDGET_OPTIONS.map((mins) => {
              const isSelected = sessionBudgetMinutes === mins;
              return (
                <button
                  className={`px-2 py-2 rounded-xl text-xs font-medium border transition-all duration-instant flex items-center justify-center gap-1 ${
                    isSelected
                      ? 'bg-light-accent dark:bg-dark-accent text-white border-transparent shadow-xs'
                      : 'border-light-border dark:border-dark-border hover:bg-light-border/40 dark:hover:bg-dark-border/40 text-light-text dark:text-dark-text'
                  }`}
                  key={mins}
                  onClick={() => setSessionBudgetMinutes(mins)}
                  type="button"
                >
                  {isSelected && <Check className="w-3 h-3 shrink-0" />}
                  <span>{mins === 0 ? 'Open' : `${mins}m`}</span>
                </button>
              );
            })}
          </div>

          {/* Custom Duration Input */}
          <div className="flex items-center gap-2 pt-0.5">
            <input
              aria-label="Custom session target minutes"
              className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-light-surface/60 dark:bg-dark-surface/60 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text placeholder:text-light-text-muted dark:placeholder:text-dark-text-muted focus:outline-none focus:ring-1 focus:ring-light-accent dark:focus:ring-dark-accent font-mono transition-all"
              max={180}
              min={1}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleApplyCustom();
                }
              }}
              placeholder="Custom target (1–180 min)…"
              type="number"
              value={customInput}
            />
            <button
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-light-accent dark:bg-dark-accent text-white hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none transition-all duration-instant shadow-xs"
              disabled={!isValidCustom}
              onClick={handleApplyCustom}
              type="button"
            >
              Set
            </button>
          </div>
        </div>

        {/* Daily Reading Goal Card */}
        <div className="p-3.5 rounded-xl border border-light-border dark:border-dark-border bg-light-surface/60 dark:bg-dark-surface/60 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-medium text-light-text dark:text-dark-text">
              <Flame className="w-4 h-4 text-orange-500" />
              <span>Today&apos;s Reading Goal</span>
            </div>
            <span className="font-semibold text-light-text dark:text-dark-text">
              {todayMinutesTotal} / {dailyGoalMinutes}m
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-light-border/60 dark:bg-dark-border/60 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                isDailyGoalMet
                  ? 'bg-emerald-500'
                  : 'bg-orange-500'
              }`}
              style={{ width: `${dailyPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-light-text-muted dark:text-dark-text-muted">
            <span>{dailyPercent}% completed today</span>
            {isDailyGoalMet ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                Daily Goal Met 🎉
              </span>
            ) : (
              <span>
                {Math.max(0, Math.round(dailyGoalMinutes - todayMinutesTotal))}m remaining
              </span>
            )}
          </div>
        </div>

        {/* Chime Settings */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2.5">
            <button
              aria-label={
                sessionChimeEnabled
                  ? 'Disable completion chime'
                  : 'Enable completion chime'
              }
              className={`p-2 rounded-xl border transition-colors ${
                sessionChimeEnabled
                  ? 'bg-light-accent/10 dark:bg-dark-accent/10 border-light-accent/30 dark:border-dark-accent/30 text-light-accent dark:text-dark-accent'
                  : 'border-light-border dark:border-dark-border text-light-text-muted dark:text-dark-text-muted'
              }`}
              onClick={() => setSessionChimeEnabled(!sessionChimeEnabled)}
              type="button"
            >
              {sessionChimeEnabled ? (
                <Bell className="w-4 h-4" />
              ) : (
                <BellOff className="w-4 h-4" />
              )}
            </button>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-medium text-light-text dark:text-dark-text">
                  Completion Chime
                </p>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${
                    sessionChimeEnabled
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-light-surface/80 dark:bg-dark-surface/80 border border-light-border/60 dark:border-dark-border/60 text-light-text-muted dark:text-dark-text-muted'
                  }`}
                >
                  {sessionChimeEnabled ? 'On' : 'Off'}
                </span>
              </div>
              <p className="text-[10px] text-light-text-muted dark:text-dark-text-muted">
                Plays a chime when your reading session ends
              </p>
            </div>
          </div>

          <button
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border border-light-border dark:border-dark-border hover:bg-light-border/40 dark:hover:bg-dark-border/40 text-light-text dark:text-dark-text flex items-center gap-1.5 transition-opacity ${
              isPlayingChime ? 'opacity-60 pointer-events-none' : ''
            }`}
            onClick={handlePreviewChime}
            type="button"
          >
            <Volume2 className="w-3.5 h-3.5 text-light-accent dark:text-dark-accent" />
            <span>{isPlayingChime ? 'Playing...' : 'Test'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ReaderSessionTimerModal;
