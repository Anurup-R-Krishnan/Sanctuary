import React, { useState } from "react";

export interface BarChartProps {
  data: { label: string; value: number }[];
  highlightIndex?: number;
  maxValue: number;
  target?: number;
  unit?: string;
}

export const BarChart: React.FC<BarChartProps> = ({ data, highlightIndex, maxValue, target, unit }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const scaleMax = Math.max(maxValue, target ?? 0, 1);
  const isEmpty = data.every((d) => d.value <= 0);
  const formatValue = (val: number) => (unit ? `${val} ${unit}` : `${val}`);
  const targetOffset = target && target > 0 ? (target / scaleMax) * 100 : null;

  return (
    <div>
      <div className="pt-5">
        <div className="relative h-32 border-b border-line">
          {targetOffset !== null && (
            <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-accent/55" style={{ bottom: `${targetOffset}%` }}>
              <span className="absolute -top-4 right-0 text-2xs text-accent">goal {formatValue(target!)}</span>
            </div>
          )}
          <div className="absolute inset-0 flex items-end gap-2 sm:gap-3">
            {data.map((d, idx) => {
              const isActive = hoveredIdx === idx || highlightIndex === idx;
              const height = d.value > 0 ? Math.max((d.value / scaleMax) * 100, 3) : 0;
              return (
                <div
                  aria-label={`${d.label}: ${formatValue(d.value)}`}
                  className="relative flex h-full flex-1 items-end justify-center outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  key={`${d.label}-${idx}`}
                  onBlur={() => setHoveredIdx(null)}
                  onFocus={() => setHoveredIdx(idx)}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  role="img"
                  tabIndex={0}
                >
                  {d.value > 0 && (
                    <span
                      className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-2xs tabular-nums ${isActive ? "font-semibold text-fg" : "text-fg-muted"}`}
                      style={{ bottom: `calc(${height}% + 3px)` }}
                    >
                      {d.value}
                    </span>
                  )}
                  <div
                    className={`w-full max-w-[2.75rem] rounded-t-[2px] transition-[height,background-color] duration-500 ${
                      highlightIndex === idx ? "bg-accent" : hoveredIdx === idx ? "bg-accent/80" : "bg-accent/40"
                    }`}
                    style={{ height: `${height}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-2 flex gap-2 sm:gap-3">
          {data.map((d, idx) => (
            <span
              className={`flex-1 text-center text-2xs uppercase tracking-[0.08em] ${highlightIndex === idx ? "font-semibold text-accent" : "text-fg-muted"}`}
              key={`${d.label}-${idx}`}
            >
              {d.label}
            </span>
          ))}
        </div>
      </div>
      {isEmpty && <p className="mt-3 text-center text-xs text-fg-muted">No reading time recorded yet.</p>}
    </div>
  );
};
