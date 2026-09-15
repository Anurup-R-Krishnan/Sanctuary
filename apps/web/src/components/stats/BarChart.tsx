import React, { useState } from "react";

export interface BarChartProps {
  data: { label: string; value: number }[];
  maxValue: number;
  unit?: string;
}

export const BarChart: React.FC<BarChartProps> = ({ data, maxValue, unit }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const formatValue = (val: number) => {
    if (unit) return `${val} ${unit}`;
    return `${val}`;
  };

  return (
    <div aria-label="Activity bar chart" className="flex items-end gap-1.5 h-32 pt-6 relative" role="region">
      {data.map((d, idx) => {
        const isHovered = hoveredIdx === idx;
        const barHeight = maxValue > 0 ? (d.value / maxValue) * 100 : 0;

        return (
          <div
            aria-label={`${d.label}: ${formatValue(d.value)}`}
            className="flex-1 flex flex-col items-center gap-1.5 group relative cursor-pointer outline-none"
            key={d.label}
            onBlur={() => setHoveredIdx(null)}
            onFocus={() => setHoveredIdx(idx)}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            role="graphics-symbol"
            tabIndex={0}
          >
            {/* Tooltip */}
            {isHovered && (
              <div
                className="absolute -top-7 left-1/2 -translate-x-1/2 z-20 px-2 py-0.5 rounded-md bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 text-[10px] font-semibold tracking-wide whitespace-nowrap shadow-md pointer-events-none animate-fadeIn"
                role="tooltip"
              >
                <span className="opacity-75 mr-1">{d.label}:</span>
                <span>{formatValue(d.value)}</span>
              </div>
            )}

            {/* Bar Rail & Fill */}
            <div className="w-full bg-light-border/60 dark:bg-dark-border/60 rounded-t flex-1 flex items-end min-h-0 overflow-hidden">
              <div
                className={`w-full bg-gradient-to-t from-light-accent to-amber-500 dark:from-dark-accent dark:to-amber-400 rounded-t transition-all duration-300 ${
                  isHovered ? "opacity-100 brightness-110 shadow-xs" : "opacity-85 group-hover:opacity-100"
                }`}
                style={{ height: `${Math.max(barHeight, d.value > 0 ? 4 : 0)}%` }}
              />
            </div>

            {/* Axis Label */}
            <span
              className={`text-[9px] font-medium transition-colors ${
                isHovered
                  ? "text-light-text dark:text-dark-text font-bold"
                  : "text-light-text-muted dark:text-dark-text-muted"
              }`}
            >
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};
