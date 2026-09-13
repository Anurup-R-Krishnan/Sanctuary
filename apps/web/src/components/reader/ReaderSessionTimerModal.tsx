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

const BUDGET_OPTIONS: readonly number[] = [15, 20, 30, 45, 60, 0];

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

  if (!isOpen) return null;

  const handlePreviewChime = async () => {
    setIsPlayingChime(true);
    await playSessionCompletionChime();
    setTimeout(() => {
      setIsPlayingChime(false);
    }, 1600);
  };

  return (
    <div
      aria-labelledby="reading-timer-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in pointer-events-auto"
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

      <div className="relative z-10 w-full max-w-md p-6 rounded-2xl bg-light-primary dark:bg-dark-primary border border-light-border dark:border-dark-border shadow-2xl space-y-6 animate-scale-in">
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
            className="p-1.5 rounded-lg text-light-text-muted hover:text-light-text dark:hover:text-dark-text hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
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
            <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden mt-1.5">
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

        {/* Quick Session Budget Selector */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-light-text-muted dark:text-dark-text-muted">
            Session Target
          </label>
          <div className="grid grid-cols-3 gap-2">
            {BUDGET_OPTIONS.map((mins) => {
              const isSelected = sessionBudgetMinutes === mins;
              return (
                <button
                  className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all duration-instant flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? 'bg-light-accent dark:bg-dark-accent text-white border-transparent shadow-sm'
                      : 'border-light-border dark:border-dark-border hover:bg-black/5 dark:hover:bg-white/5 text-light-text dark:text-dark-text'
                  }`}
                  key={mins}
                  onClick={() => setSessionBudgetMinutes(mins)}
                  type="button"
                >
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                  <span>{mins === 0 ? 'Open' : `${mins} min`}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Daily Reading Goal Card */}
        <div className="p-3.5 rounded-xl border border-light-border dark:border-dark-border bg-black/[0.02] dark:bg-white/[0.02] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-medium text-light-text dark:text-dark-text">
              <Flame className="w-4 h-4 text-orange-500" />
              <span>Today&apos;s Reading Goal</span>
            </div>
            <span className="font-semibold text-light-text dark:text-dark-text">
              {todayMinutesTotal} / {dailyGoalMinutes}m
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
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
          <div className="flex items-center gap-2">
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
              <p className="text-xs font-medium text-light-text dark:text-dark-text">
                Completion Chime
              </p>
              <p className="text-[10px] text-light-text-muted dark:text-dark-text-muted">
                Gentle 528 Hz solfeggio relaxation tone
              </p>
            </div>
          </div>

          <button
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border border-light-border dark:border-dark-border hover:bg-black/5 dark:hover:bg-white/5 text-light-text dark:text-dark-text flex items-center gap-1.5 transition-opacity ${
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
    </div>
  );
}

export default ReaderSessionTimerModal;
