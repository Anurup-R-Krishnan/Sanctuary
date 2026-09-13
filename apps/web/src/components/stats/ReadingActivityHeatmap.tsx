import {
  Calendar,
  Clock,
  Flame,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  Timer,
  TrendingUp,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

import type { ReadingSession } from '@/types';
import type { ActivityDayCell } from '@/utils/readingActivityEngine';

import {
  calculateCircadianDistribution,
  calculateReadingVelocity,
  generateActivityGrid,
} from '@/utils/readingActivityEngine';

export interface ReadingActivityHeatmapProps {
  dailyTargetMinutes?: number;
  sessions: ReadingSession[];
}

const CELL_BG_CLASSES = [
  'bg-black/[0.04] dark:bg-white/[0.06] border-black/[0.02] dark:border-white/[0.04]',
  'bg-emerald-500/30 dark:bg-emerald-500/35 border-emerald-500/20',
  'bg-emerald-500/55 dark:bg-emerald-500/55 border-emerald-500/30',
  'bg-emerald-600/80 dark:bg-emerald-500/75 border-emerald-600/40',
  'bg-emerald-600 dark:bg-emerald-400 border-emerald-600 dark:border-emerald-400',
];

export const ReadingActivityHeatmap: React.FC<ReadingActivityHeatmapProps> = ({
  dailyTargetMinutes = 30,
  sessions,
}) => {
  const [selectedHorizon, setSelectedHorizon] = useState<'annual' | 'recent'>('recent');
  const [activeCell, setActiveCell] = useState<ActivityDayCell | null>(null);

  const weeksCount = selectedHorizon === 'annual' ? 52 : 14;

  const gridData = useMemo(() => {
    return generateActivityGrid(sessions, weeksCount, dailyTargetMinutes);
  }, [sessions, weeksCount, dailyTargetMinutes]);

  const circadian = useMemo(() => {
    return calculateCircadianDistribution(sessions);
  }, [sessions]);

  const velocity = useMemo(() => {
    return calculateReadingVelocity(sessions);
  }, [sessions]);

  const formatMinutesDuration = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div className="space-y-6">
      {/* Heatmap Card */}
      <div className="p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] space-y-4">
        {/* Card Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-semibold text-light-text dark:text-dark-text tracking-wide">
                Reading Consistency Matrix
              </h3>
            </div>
            <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-0.5">
              {gridData.totalActiveDays} active reading days · {formatMinutesDuration(gridData.totalMinutes)} total
            </p>
          </div>

          <div className="flex items-center bg-black/[0.04] dark:bg-white/[0.06] p-0.5 rounded-lg text-xs font-medium self-start sm:self-auto">
            <button
              className={`px-2.5 py-1 rounded-md transition-all ${
                selectedHorizon === 'recent'
                  ? 'bg-white dark:bg-stone-800 shadow-xs text-light-text dark:text-dark-text font-semibold'
                  : 'text-light-text-muted dark:text-dark-text-muted hover:text-light-text'
              }`}
              onClick={() => setSelectedHorizon('recent')}
              type="button"
            >
              14 Weeks
            </button>
            <button
              className={`px-2.5 py-1 rounded-md transition-all ${
                selectedHorizon === 'annual'
                  ? 'bg-white dark:bg-stone-800 shadow-xs text-light-text dark:text-dark-text font-semibold'
                  : 'text-light-text-muted dark:text-dark-text-muted hover:text-light-text'
              }`}
              onClick={() => setSelectedHorizon('annual')}
              type="button"
            >
              Full Year
            </button>
          </div>
        </div>

        {/* Heatmap Grid Container */}
        <div className="overflow-x-auto pb-2 -mx-2 px-2">
          <div className="inline-block min-w-full">
            {/* Month Labels Row */}
            <div className="flex text-[10px] text-light-text-muted dark:text-dark-text-muted mb-1.5 h-4 relative">
              <div className="w-6 shrink-0" /> {/* Day labels column spacer */}
              <div className="flex gap-1 flex-1 relative">
                {gridData.monthLabels.map((m, idx) => (
                  <span
                    className="absolute font-medium text-stone-500 dark:text-stone-400"
                    key={idx}
                    style={{ left: `${m.weekIndex * 15}px` }}
                  >
                    {m.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Grid with Day Labels */}
            <div className="flex gap-2">
              {/* Day of Week Labels (Mon, Wed, Fri) */}
              <div className="flex flex-col justify-between text-[9px] text-light-text-muted dark:text-dark-text-muted w-5 py-0.5 select-none shrink-0 leading-none h-[92px]">
                <span>Mon</span>
                <span>Wed</span>
                <span>Fri</span>
                <span>Sun</span>
              </div>

              {/* Week Columns */}
              <div className="flex gap-1">
                {gridData.cells.map((week, wi) => (
                  <div className="flex flex-col gap-1" key={`w-${wi}`}>
                    {week.map((cell) => {
                      const isHovered = activeCell?.dateKey === cell.dateKey;
                      const intensityClass = CELL_BG_CLASSES[cell.intensity];

                      return (
                        <button
                          aria-label={`${cell.formattedDate}: ${cell.minutes} minutes`}
                          className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs transition-all border ${intensityClass} ${
                            cell.isToday
                              ? 'ring-1 ring-emerald-500 ring-offset-1 dark:ring-offset-stone-900'
                              : ''
                          } ${isHovered ? 'scale-125 z-10 shadow-sm ring-1 ring-black/30 dark:ring-white/40' : ''}`}
                          key={cell.dateKey}
                          onClick={() => setActiveCell(cell)}
                          onFocus={() => setActiveCell(cell)}
                          onMouseEnter={() => setActiveCell(cell)}
                          type="button"
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Legend & Active Cell Details Footer */}
        <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="text-light-text dark:text-dark-text font-medium min-h-[1.25rem] flex items-center gap-1.5">
            {activeCell ? (
              <>
                <span className="font-semibold text-light-text dark:text-dark-text">
                  {activeCell.formattedDate}:
                </span>
                <span className="text-light-text-muted dark:text-dark-text-muted">
                  {activeCell.minutes > 0
                    ? `${activeCell.minutes} min · ${activeCell.pages} pages (${activeCell.sessionCount} sessions)`
                    : 'No reading recorded'}
                </span>
              </>
            ) : (
              <span className="text-light-text-muted dark:text-dark-text-muted text-[11px]">
                Hover or tap any square to inspect daily reading time
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-light-text-muted dark:text-dark-text-muted self-end sm:self-auto">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                className={`w-2.5 h-2.5 rounded-xs border ${CELL_BG_CLASSES[level]}`}
                key={level}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Reading Velocity Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-light-text-muted dark:text-dark-text-muted uppercase tracking-wide">
              Peak Hour
            </span>
            <p className="text-lg font-bold text-light-text dark:text-dark-text mt-0.5">
              {velocity.peakReadingHourLabel}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] flex items-start gap-3">
          <div className="p-2 rounded-lg bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-light-text-muted dark:text-dark-text-muted uppercase tracking-wide">
              Top Reading Day
            </span>
            <p className="text-lg font-bold text-light-text dark:text-dark-text mt-0.5">
              {velocity.bestDayOfWeek}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
            <Timer className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-light-text-muted dark:text-dark-text-muted uppercase tracking-wide">
              Avg Session
            </span>
            <p className="text-lg font-bold text-light-text dark:text-dark-text mt-0.5">
              {velocity.averageMinutesPerSession}m
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] flex items-start gap-3">
          <div className="p-2 rounded-lg bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-light-text-muted dark:text-dark-text-muted uppercase tracking-wide">
              Longest Session
            </span>
            <p className="text-lg font-bold text-light-text dark:text-dark-text mt-0.5">
              {formatMinutesDuration(velocity.longestSessionMinutes)}
            </p>
          </div>
        </div>
      </div>

      {/* Circadian Time-of-Day Rhythm Breakdown */}
      <div className="p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wide">
              Circadian Reading Rhythm
            </h4>
            <p className="text-xs text-light-text dark:text-dark-text font-medium mt-0.5 capitalize">
              Primary window: {circadian.peakPeriod}
            </p>
          </div>
        </div>

        {/* Stacked Percentage Bar */}
        <div className="h-3 w-full rounded-full overflow-hidden flex bg-black/[0.04] dark:bg-white/[0.06]">
          {circadian.morningPercent > 0 && (
            <div
              className="bg-amber-400 dark:bg-amber-500 transition-all"
              style={{ width: `${circadian.morningPercent}%` }}
              title={`Morning: ${circadian.morningPercent}%`}
            />
          )}
          {circadian.afternoonPercent > 0 && (
            <div
              className="bg-sky-400 dark:bg-sky-500 transition-all"
              style={{ width: `${circadian.afternoonPercent}%` }}
              title={`Afternoon: ${circadian.afternoonPercent}%`}
            />
          )}
          {circadian.eveningPercent > 0 && (
            <div
              className="bg-indigo-500 dark:bg-indigo-400 transition-all"
              style={{ width: `${circadian.eveningPercent}%` }}
              title={`Evening: ${circadian.eveningPercent}%`}
            />
          )}
          {circadian.nightPercent > 0 && (
            <div
              className="bg-violet-600 dark:bg-violet-500 transition-all"
              style={{ width: `${circadian.nightPercent}%` }}
              title={`Night: ${circadian.nightPercent}%`}
            />
          )}
        </div>

        {/* Legend Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-amber-400/15 text-amber-600 dark:text-amber-400">
              <Sunrise className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-semibold text-light-text dark:text-dark-text">Morning</p>
              <p className="text-[11px] text-light-text-muted dark:text-dark-text-muted">
                {circadian.morningPercent}% ({formatMinutesDuration(circadian.morningMinutes)})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-sky-400/15 text-sky-600 dark:text-sky-400">
              <Sun className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-semibold text-light-text dark:text-dark-text">Afternoon</p>
              <p className="text-[11px] text-light-text-muted dark:text-dark-text-muted">
                {circadian.afternoonPercent}% ({formatMinutesDuration(circadian.afternoonMinutes)})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
              <Sunset className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-semibold text-light-text dark:text-dark-text">Evening</p>
              <p className="text-[11px] text-light-text-muted dark:text-dark-text-muted">
                {circadian.eveningPercent}% ({formatMinutesDuration(circadian.eveningMinutes)})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-violet-500/15 text-violet-600 dark:text-violet-400">
              <Moon className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-semibold text-light-text dark:text-dark-text">Night</p>
              <p className="text-[11px] text-light-text-muted dark:text-dark-text-muted">
                {circadian.nightPercent}% ({formatMinutesDuration(circadian.nightMinutes)})
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
