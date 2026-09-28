import React, { useMemo, useState } from "react";

import type { ReadingSession } from "@/types";
import type { ActivityDayCell } from "@/utils/readingActivityEngine";

import {
  calculateCircadianDistribution,
  calculateReadingVelocity,
  generateActivityGrid,
} from "@/utils/readingActivityEngine";

export interface ReadingActivityHeatmapProps {
  dailyTargetMinutes?: number;
  sessions: ReadingSession[];
}

const INTENSITY_CLASSES = ["bg-line/45", "bg-accent/25", "bg-accent/45", "bg-accent/70", "bg-accent"];
const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];
const MIN_LABEL_GAP = 3;

function formatMinutes(total: number): string {
  const minutes = Math.round(total);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
}

function describeCell(cell: ActivityDayCell): string {
  if (cell.isFuture) return cell.formattedDate;
  if (cell.minutes <= 0) return `${cell.formattedDate} · no reading`;
  const sessions = `${cell.sessionCount} ${cell.sessionCount === 1 ? "session" : "sessions"}`;
  return `${cell.formattedDate} · ${formatMinutes(cell.minutes)} · ${sessions}`;
}

export const ReadingActivityHeatmap: React.FC<ReadingActivityHeatmapProps> = ({ dailyTargetMinutes = 30, sessions }) => {
  const [horizon, setHorizon] = useState<"annual" | "recent">("recent");
  const [activeCell, setActiveCell] = useState<ActivityDayCell | null>(null);
  const weeksCount = horizon === "annual" ? 52 : 18;

  const grid = useMemo(() => generateActivityGrid(sessions, weeksCount, dailyTargetMinutes), [sessions, weeksCount, dailyTargetMinutes]);
  const circadian = useMemo(() => calculateCircadianDistribution(sessions), [sessions]);
  const velocity = useMemo(() => calculateReadingVelocity(sessions), [sessions]);
  const hasSessions = sessions.length > 0 && grid.totalMinutes > 0;

  const monthLabels = useMemo(() => {
    const kept: typeof grid.monthLabels = [];
    for (const label of grid.monthLabels) {
      const previous = kept[kept.length - 1];
      if (!previous || label.weekIndex - previous.weekIndex >= MIN_LABEL_GAP) kept.push(label);
    }
    return kept;
  }, [grid]);

  const periods = [
    { label: "Morning", minutes: circadian.morningMinutes, percent: circadian.morningPercent, shade: "bg-accent/35" },
    { label: "Afternoon", minutes: circadian.afternoonMinutes, percent: circadian.afternoonPercent, shade: "bg-accent/55" },
    { label: "Evening", minutes: circadian.eveningMinutes, percent: circadian.eveningPercent, shade: "bg-accent/80" },
    { label: "Night", minutes: circadian.nightMinutes, percent: circadian.nightPercent, shade: "bg-fg/60" },
  ];

  const cellSize = horizon === "annual" ? 11 : 16;
  const cellGap = horizon === "annual" ? 2 : 3;
  const gridWidth = grid.weeksCount * (cellSize + cellGap) - cellGap;
  const columnStyle = { gap: `${cellGap}px`, gridTemplateColumns: `repeat(${grid.weeksCount}, ${cellSize}px)` };
  const rowStyle = { gap: `${cellGap}px`, gridTemplateRows: `repeat(7, ${cellSize}px)` };

  return (
    <div className="space-y-8">
      <section className="paper-card p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="label-caps">Reading activity</h3>
            <p className="mt-1.5 font-display text-2xl font-medium text-fg">
              {grid.totalActiveDays} {grid.totalActiveDays === 1 ? "day" : "days"}
              <span className="ml-2 text-base font-normal text-fg-muted">· {formatMinutes(grid.totalMinutes)} read</span>
            </p>
          </div>
          <div className="flex rounded-lg border border-line bg-subtle p-0.5 text-xs font-medium">
            {(["recent", "annual"] as const).map((value) => (
              <button
                aria-pressed={horizon === value}
                className={`rounded-md px-3 py-1 transition-colors ${horizon === value ? "bg-surface-raised text-fg shadow-sm" : "text-fg-muted hover:text-fg"}`}
                key={value}
                onClick={() => setHorizon(value)}
                type="button"
              >
                {value === "recent" ? "18 weeks" : "Year"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-2">
          <div className="grid shrink-0 pt-5 text-3xs text-fg-muted" style={rowStyle}>
            {DAY_LABELS.map((label, index) => (
              <span className="flex items-center leading-none" key={index}>{label}</span>
            ))}
          </div>
          <div className="min-w-0 overflow-x-auto" style={{ width: gridWidth, maxWidth: "100%" }}>
            <div className="relative mb-1.5 h-3.5 text-3xs text-fg-muted" style={{ width: gridWidth }}>
              {monthLabels.map((label) => (
                <span
                  className="absolute top-0 leading-none"
                  key={`${label.label}-${label.weekIndex}`}
                  style={{ left: `${(label.weekIndex / grid.weeksCount) * 100}%` }}
                >
                  {label.label}
                </span>
              ))}
            </div>
            <div className="grid" style={columnStyle}>
              {grid.cells.map((week, weekIndex) => (
                <div className="grid" key={weekIndex} style={rowStyle}>
                  {week.map((cell) => (
                    <button
                      aria-label={describeCell(cell)}
                      className={`h-full w-full rounded-[2px] transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
                        cell.isFuture ? "bg-transparent" : INTENSITY_CLASSES[cell.intensity] ?? INTENSITY_CLASSES[0]
                      } ${cell.isToday ? "ring-1 ring-fg/50" : ""} ${activeCell?.dateKey === cell.dateKey ? "ring-2 ring-accent" : ""}`}
                      disabled={cell.isFuture}
                      key={cell.dateKey}
                      onBlur={() => setActiveCell(null)}
                      onFocus={() => setActiveCell(cell)}
                      onMouseEnter={() => setActiveCell(cell)}
                      onMouseLeave={() => setActiveCell(null)}
                      type="button"
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-xs text-fg-muted">
          <span className="tabular-nums">{activeCell ? describeCell(activeCell) : "Hover or focus a day for details."}</span>
          <span className="flex items-center gap-1.5">
            Less
            {INTENSITY_CLASSES.map((shade) => (
              <span className={`h-2.5 w-2.5 rounded-[2px] ${shade}`} key={shade} />
            ))}
            More
          </span>
        </div>
      </section>

      {hasSessions ? (
        <>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
            {[
              { label: "Most read at", value: velocity.peakReadingHourLabel },
              { label: "Best day", value: velocity.bestDayOfWeek },
              { label: "Average session", value: formatMinutes(velocity.averageMinutesPerSession) },
              { label: "Longest session", value: formatMinutes(velocity.longestSessionMinutes) },
            ].map((item) => (
              <div className="bg-surface-raised px-4 py-4" key={item.label}>
                <dt className="label-caps">{item.label}</dt>
                <dd className="mt-1.5 font-display text-xl font-medium text-fg">{item.value}</dd>
              </div>
            ))}
          </dl>

          <section className="paper-card p-5 sm:p-6">
            <h3 className="label-caps">Time of day</h3>
            <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-line/45">
              {periods.map((period) => (
                <div className={period.shade} key={period.label} style={{ width: `${period.percent}%` }} />
              ))}
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {periods.map((period) => (
                <li className="flex items-center gap-2" key={period.label}>
                  <span className={`h-2.5 w-2.5 rounded-full ${period.shade}`} />
                  <span className="text-sm text-fg">{period.label}</span>
                  <span className="ml-auto text-xs tabular-nums text-fg-muted">
                    {period.percent}% · {formatMinutes(period.minutes)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <p className="text-center text-sm text-fg-muted">
          No reading sessions yet. Time you spend in the reader will show up here.
        </p>
      )}
    </div>
  );
};
