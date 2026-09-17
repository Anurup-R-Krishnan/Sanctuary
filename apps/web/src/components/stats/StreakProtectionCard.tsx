import { Flame, Info, RotateCcw, Shield, ShieldAlert, ShieldCheck, Trophy } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

import type { ReadingSession } from '@/types';
import type { StreakStatus } from '@/utils/streakEngine';

import {
  calculateSmartStreak,
  createStreakRepairChallenge,
  evaluateRepairChallengeProgress,
  loadStreakRepairChallenge,
  loadStreakShieldState,
  MAX_SHIELD_CAPACITY,
  saveStreakRepairChallenge,
  saveStreakShieldState,
  toLocalDateKey,
} from '@/utils/streakEngine';

export interface StreakProtectionCardProps {
  dailyGoal: number;
  sessions: ReadingSession[];
}

const STATUS_CONFIG: Record<StreakStatus, { badge: string; color: string; label: string }> = {
  active_today: {
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    color: '#10b981',
    label: 'Active Today',
  },
  broken: {
    badge: 'bg-ink-500/10 text-ink-600 dark:text-ink-400 border-ink-500/20',
    color: '#71717a',
    label: 'Streak Lapsed',
  },
  pending_today: {
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    color: '#f59e0b',
    label: 'Read Today to Keep',
  },
  protected_by_shield: {
    badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    color: '#0284c7',
    label: 'Shield Protected',
  },
  repaired: {
    badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    color: '#a855f7',
    label: 'Streak Restored',
  },
};

export function StreakProtectionCard({ dailyGoal, sessions }: StreakProtectionCardProps) {
  const [shields, setShields] = useState(() => loadStreakShieldState());
  const [challenge, setChallenge] = useState(() => loadStreakRepairChallenge());
  const [showExplanation, setShowExplanation] = useState(false);

  const sessionDates = useMemo(() => new Set(sessions.map((s) => s.date)), [sessions]);

  // Calculate today's reading minutes
  const todayKey = useMemo(() => toLocalDateKey(new Date()), []);
  const todayReadingMinutes = useMemo(() => {
    return sessions
      .filter((s) => s.date === todayKey)
      .reduce((total, s) => total + Math.round(s.duration / 60), 0);
  }, [sessions, todayKey]);

  // Compute smart streak
  const smartStreak = useMemo(() => {
    return calculateSmartStreak(sessionDates, {
      availableShields: shields.availableShields,
      dailyGoalMinutes: dailyGoal,
      earnedShieldCount: shields.earnedShieldCount,
      repairChallenge: challenge,
      usedShieldDates: shields.usedShieldDates,
    });
  }, [sessionDates, shields, dailyGoal, challenge]);

  // Sync back state changes if shields were consumed or earned
  useEffect(() => {
    if (
      smartStreak.shields.availableShields !== shields.availableShields ||
      smartStreak.shields.earnedShieldCount !== shields.earnedShieldCount ||
      smartStreak.shields.usedShieldDates.length !== shields.usedShieldDates.length
    ) {
      saveStreakShieldState(smartStreak.shields);
      setShields(smartStreak.shields);
    }
  }, [smartStreak.shields, shields]);

  // Check progress on active repair challenge
  useEffect(() => {
    if (challenge && !challenge.completed) {
      const updated = evaluateRepairChallengeProgress(challenge, todayReadingMinutes);
      if (updated.progressMinutes !== challenge.progressMinutes || updated.completed !== challenge.completed) {
        saveStreakRepairChallenge(updated);
        setChallenge(updated);
      }
    }
  }, [challenge, todayReadingMinutes]);

  const handleStartChallenge = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const newChallenge = createStreakRepairChallenge(toLocalDateKey(yesterday), dailyGoal);
    saveStreakRepairChallenge(newChallenge);
    setChallenge(newChallenge);
  };

  const handleDismissChallenge = () => {
    saveStreakRepairChallenge(null);
    setChallenge(null);
  };

  const statusConfig = STATUS_CONFIG[smartStreak.status];
  const nextMilestone = smartStreak.flame.nextMilestone;

  // Calculate milestone progress percentage
  const milestoneProgress = useMemo(() => {
    if (!nextMilestone) return 100;
    const previousTierThreshold = nextMilestone.daysRequired - (nextMilestone.daysRemaining + smartStreak.currentStreak);
    const totalRequiredInTier = nextMilestone.daysRequired - Math.max(0, previousTierThreshold);
    const currentInTier = totalRequiredInTier - nextMilestone.daysRemaining;
    return Math.min(100, Math.max(0, Math.round((currentInTier / totalRequiredInTier) * 100)));
  }, [nextMilestone, smartStreak.currentStreak]);

  return (
    <div className="p-6 rounded-3xl bg-light-surface/40 dark:bg-dark-surface/40 border border-light-border dark:border-dark-border flex flex-col gap-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-light-border/60 dark:border-dark-border/60">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
            style={{ backgroundColor: `${smartStreak.flame.color}20` }}
          >
            <span>{smartStreak.flame.icon}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-light-text dark:text-dark-text tracking-tight">
                {smartStreak.currentStreak} {smartStreak.currentStreak === 1 ? 'Day' : 'Days'}
              </h3>
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${statusConfig.badge}`}
              >
                {statusConfig.label}
              </span>
            </div>
            <p className="text-xs font-medium text-light-text-muted dark:text-dark-text-muted mt-0.5">
              {smartStreak.flame.label} · Best Streak: {smartStreak.longestStreak} days
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowExplanation(!showExplanation)}
          type="button"
          className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text bg-light-surface dark:bg-dark-surface hover:bg-light-surface/80 dark:hover:bg-dark-surface/80 border border-light-border/60 dark:border-dark-border/60 transition-colors"
          title="Learn how grace shields protect your reading habits"
        >
          <Info className="w-3.5 h-3.5" />
          <span>How Shields Work</span>
        </button>
      </div>

      {/* Motivational message banner */}
      <div className="text-xs font-medium text-light-text/90 dark:text-dark-text/90 bg-light-surface/60 dark:bg-dark-surface/60 px-3.5 py-2.5 rounded-xl border border-light-border dark:border-dark-border flex items-center gap-2">
        <Flame className="w-4 h-4 shrink-0 text-amber-500" />
        <span>{smartStreak.statusMessage}</span>
      </div>

      {/* Explanation Accordion Drawer */}
      {showExplanation && (
        <div className="text-xs space-y-2 text-light-text-muted dark:text-dark-text-muted bg-amber-500/5 dark:bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20">
          <p className="font-semibold text-light-text dark:text-dark-text">
            🛡️ Grace Shields: Reading Streak Protection
          </p>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li>
              You earn <strong>1 Grace Shield</strong> for every 7 days of reading, storing up to a maximum of 2 shields.
            </li>
            <li>
              If you miss a single reading day due to travel or illness, 1 shield is <strong>automatically used</strong> to bridge the gap and keep your streak intact.
            </li>
            <li>
              If your streak breaks without a shield, you get a <strong>24-hour Streak Repair Challenge</strong> to restore your progress by completing double your daily reading goal.
            </li>
          </ul>
        </div>
      )}

      {/* Main Grid: Grace Shields & Flame Milestone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Grace Shields Reserve Card */}
        <div className="p-4 rounded-2xl bg-light-surface/60 dark:bg-dark-surface/60 border border-light-border dark:border-dark-border flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider">
                Grace Shields
              </span>
              <span className="text-xs font-bold text-light-text dark:text-dark-text">
                {smartStreak.shields.availableShields} / {MAX_SHIELD_CAPACITY} Ready
              </span>
            </div>

            <div className="flex gap-2.5 mt-3">
              {Array.from({ length: MAX_SHIELD_CAPACITY }).map((_, idx) => {
                const isAvailable = idx < smartStreak.shields.availableShields;
                return (
                  <div
                    key={idx}
                    className={`flex-1 py-3 px-3 rounded-xl flex items-center justify-center gap-2 border transition-all ${
                      isAvailable
                        ? 'bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400'
                        : 'bg-light-surface/30 dark:bg-dark-surface/30 border-light-border/60 dark:border-dark-border/60 text-light-text-muted/40 dark:text-dark-text-muted/40'
                    }`}
                  >
                    {isAvailable ? (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        <span className="text-xs font-bold">Shield {idx + 1}</span>
                      </>
                    ) : (
                      <>
                        <Shield className="w-5 h-5" />
                        <span className="text-xs font-medium">Empty</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3 text-[11px] text-light-text-muted dark:text-dark-text-muted flex items-center justify-between">
            <span>Next shield at {((smartStreak.shields.earnedShieldCount + 1) * 7)} total reading days</span>
            {smartStreak.shields.lastShieldUsedDate && (
              <span className="text-[10px] opacity-75">Used: {smartStreak.shields.lastShieldUsedDate}</span>
            )}
          </div>
        </div>

        {/* Flame Milestone Tier Card */}
        <div className="p-4 rounded-2xl bg-light-surface/60 dark:bg-dark-surface/60 border border-light-border dark:border-dark-border flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider">
                Milestone Tier
              </span>
              <span className="text-xs font-bold" style={{ color: smartStreak.flame.color }}>
                {smartStreak.flame.label}
              </span>
            </div>

            {nextMilestone ? (
              <div className="mt-3">
                <div className="flex justify-between text-xs font-medium text-light-text-muted dark:text-dark-text-muted mb-1.5">
                  <span className="flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5" />
                    Next: {nextMilestone.tierLabel}
                  </span>
                  <span className="font-bold text-light-text dark:text-dark-text">
                    {nextMilestone.daysRemaining} {nextMilestone.daysRemaining === 1 ? 'day' : 'days'} left
                  </span>
                </div>
                <div className="h-2.5 w-full bg-light-border/60 dark:bg-dark-border/60 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      backgroundColor: smartStreak.flame.color,
                      width: `${milestoneProgress}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-3 py-2 px-3 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-semibold flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                <span>Diamond Status Achieved! Over 100 days of consistent reading.</span>
              </div>
            )}
          </div>

          <p className="mt-3 text-[11px] text-light-text-muted dark:text-dark-text-muted">
            Tiers: Bronze (3d) · Silver (7d) · Gold (14d) · Amethyst (30d) · Diamond (100d)
          </p>
        </div>
      </div>

      {/* Active Streak Repair Challenge Banner */}
      {challenge && (
        <div
          className={`p-4 rounded-2xl border flex flex-col gap-3 ${
            challenge.completed
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-purple-500/10 border-purple-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCcw className={`w-4 h-4 ${challenge.completed ? 'text-emerald-500' : 'text-purple-500'}`} />
              <span className="text-xs font-bold text-light-text dark:text-dark-text">
                {challenge.completed ? 'Streak Repair Complete!' : '24-Hour Streak Repair Challenge'}
              </span>
            </div>
            {!challenge.completed && (
              <button
                onClick={handleDismissChallenge}
                type="button"
                className="text-[11px] text-light-text-muted hover:text-light-text dark:text-dark-text-muted dark:hover:text-dark-text underline"
              >
                Dismiss
              </button>
            )}
          </div>

          <p className="text-xs text-light-text-muted dark:text-dark-text-muted">
            {challenge.completed
              ? 'Congratulations! You read double your target and restored your reading streak.'
              : `Read ${challenge.targetMinutes} minutes today to repair your lapsed streak from ${challenge.lapsedDate}.`}
          </p>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-light-border/60 dark:bg-dark-border/60 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  challenge.completed ? 'bg-emerald-500' : 'bg-purple-500'
                }`}
                style={{
                  width: `${Math.min(100, Math.round((challenge.progressMinutes / challenge.targetMinutes) * 100))}%`,
                }}
              />
            </div>
            <span className="text-xs font-bold tabular-nums text-light-text dark:text-dark-text">
              {challenge.progressMinutes} / {challenge.targetMinutes} min
            </span>
          </div>
        </div>
      )}

      {/* Offer Challenge if Streak is Broken and No Active Challenge */}
      {smartStreak.status === 'broken' && !challenge && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-xs font-bold text-light-text dark:text-dark-text">Streak Lapsed Recently?</p>
              <p className="text-[11px] text-light-text-muted dark:text-dark-text-muted">
                Take the 24-hour Streak Repair Challenge (read {Math.max(30, dailyGoal * 2)} min) to restore it!
              </p>
            </div>
          </div>
          <button
            onClick={handleStartChallenge}
            type="button"
            className="self-start sm:self-center px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors shadow-sm"
          >
            Start Repair Challenge
          </button>
        </div>
      )}
    </div>
  );
}
