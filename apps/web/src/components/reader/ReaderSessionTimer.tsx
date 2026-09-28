import { Check, Pause, Timer } from 'lucide-react';
import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useSettingsShallow } from '@/store/useSettingsStore';
import { useStatsStore } from '@/store/useStatsStore';
import {
  calculateProgressRing,
  calculateSessionProgress,
  formatClock,
  isUserInactive,
} from '@/utils/readingTimerEngine';
import { toLocalDateKey } from '@/utils/stats';

const ReaderSessionTimerModal = lazy(() => import('./ReaderSessionTimerModal'));

export interface ReaderSessionTimerProps {
  className?: string;
}

export function ReaderSessionTimer({ className = '' }: ReaderSessionTimerProps) {
  const {
    dailyGoal,
    readerAccent,
    readerForeground,
    sessionBudgetMinutes,
    setSessionBudgetMinutes,
  } = useSettingsShallow((state) => ({
    dailyGoal: state.dailyGoal,
    readerAccent: state.readerAccent,
    readerForeground: state.readerForeground,
    sessionBudgetMinutes: state.sessionBudgetMinutes,
    setSessionBudgetMinutes: state.setSessionBudgetMinutes,
  }));

  const sessions = useStatsStore((state) => state.sessions);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isIdle, setIsIdle] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const lastActivityRef = useRef<number>(Date.now());

  // Activity listeners to detect user interaction and reset idle timer
  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIsIdle(false);
  }, []);

  useEffect(() => {
    const events = ['pointermove', 'keydown', 'touchstart', 'wheel', 'scroll'];
    let lastRecorded = 0;

    const handler = () => {
      const now = Date.now();
      if (now - lastRecorded > 2000) {
        lastRecorded = now;
        recordActivity();
      }
    };

    events.forEach((evt) => window.addEventListener(evt, handler, { passive: true }));
    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handler));
    };
  }, [recordActivity]);

  // Session timer tick interval with idle protection
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState !== 'visible') return;

      const inactive = isUserInactive(lastActivityRef.current, Date.now(), 120000);
      if (inactive) {
        setIsIdle(true);
        return;
      }

      setIsIdle(false);
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Compute prior completed minutes today from stored sessions
  const todayPriorMinutes = useMemo(() => {
    const todayKey = toLocalDateKey(new Date());
    return sessions
      .filter((s) => s.date === todayKey)
      .reduce((acc, s) => acc + s.duration / 60, 0);
  }, [sessions]);

  // Calculate session & daily progress mathematics
  const progress = useMemo(() => {
    return calculateSessionProgress(
      elapsedSeconds,
      sessionBudgetMinutes,
      todayPriorMinutes,
      dailyGoal
    );
  }, [elapsedSeconds, sessionBudgetMinutes, todayPriorMinutes, dailyGoal]);

  // SVG Circular progress ring calculation
  const ringRadius = 8.5;
  const ringStroke = 2;
  const ring = calculateProgressRing(progress.sessionPercent, ringRadius, ringStroke);

  return (
    <>
      <button
        aria-label={`Reading session timer: ${
          sessionBudgetMinutes > 0
            ? `${formatClock(progress.remainingSeconds)} remaining`
            : `${formatClock(progress.elapsedSeconds)} read`
        }`}
        className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-instant hover:scale-105 active:scale-95 border border-line ${className}`}
        onClick={() => setIsModalOpen(true)}
        style={{ color: readerForeground }}
        title="Open Reading Session Timer"
        type="button"
      >
        {/* Circular Progress Ring */}
        <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 -rotate-90" viewBox="0 0 22 22">
            {/* Background track circle */}
            <circle
              className="opacity-20"
              cx="11"
              cy="11"
              fill="transparent"
              r={ringRadius}
              stroke="currentColor"
              strokeWidth={ringStroke}
            />
            {/* Active progress stroke */}
            <circle
              className="transition-all duration-500 ease-out"
              cx="11"
              cy="11"
              fill="transparent"
              r={ringRadius}
              stroke={progress.isSessionGoalMet ? '#10B981' : readerAccent || 'currentColor'}
              strokeDasharray={ring.circumference}
              strokeDashoffset={ring.dashoffset}
              strokeLinecap="round"
              strokeWidth={ringStroke}
            />
          </svg>

          {/* Center icon or state indicator */}
          <div className="absolute inset-0 flex items-center justify-center">
            {isIdle ? (
              <Pause className="w-2.5 h-2.5 text-amber-500 animate-pulse" />
            ) : progress.isSessionGoalMet ? (
              <Check className="w-2.5 h-2.5 text-emerald-500 font-bold" />
            ) : (
              <Timer className="w-2 h-2 opacity-70 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        </div>

        {/* Duration Clock */}
        <span className="font-mono text-xs tracking-tight font-medium opacity-80 group-hover:opacity-100 transition-opacity">
          {sessionBudgetMinutes > 0
            ? formatClock(progress.remainingSeconds)
            : formatClock(progress.elapsedSeconds)}
        </span>

        {isIdle && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
        )}
      </button>

      {/* Code-split Popover Modal */}
      {isModalOpen && (
        <Suspense fallback={null}>
          <ReaderSessionTimerModal
            dailyGoalMinutes={progress.dailyGoalMinutes}
            dailyPercent={progress.dailyPercent}
            elapsedSeconds={progress.elapsedSeconds}
            isDailyGoalMet={progress.isDailyGoalMet}
            isIdle={isIdle}
            isOpen={isModalOpen}
            isSessionGoalMet={progress.isSessionGoalMet}
            onClose={() => setIsModalOpen(false)}
            remainingSeconds={progress.remainingSeconds}
            sessionBudgetMinutes={sessionBudgetMinutes}
            sessionPercent={progress.sessionPercent}
            setSessionBudgetMinutes={setSessionBudgetMinutes}
            todayMinutesTotal={progress.todayMinutesTotal}
          />
        </Suspense>
      )}
    </>
  );
}

export default ReaderSessionTimer;
