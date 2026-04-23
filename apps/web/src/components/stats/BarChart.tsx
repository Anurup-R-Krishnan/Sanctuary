import React from "react";

interface BarChartProps {
  data: { label: string; value: number }[];
  maxValue: number;
}

export const BarChart = ({ data, maxValue }: BarChartProps) => (
  <div className="flex items-end gap-1.5 h-28">
    {data.map((d) => (
      <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
        <div className="w-full bg-black/[0.03] dark:bg-white/[0.03] rounded-t flex-1 flex items-end min-h-0">
          <div
            className="w-full bg-gradient-to-t from-light-accent to-amber-500 dark:from-dark-accent dark:to-amber-400 rounded-t transition-all duration-500"
            style={{ height: `${maxValue > 0 ? (d.value / maxValue) * 100 : 0}%` }}
          />
        </div>
        <span className="text-[9px] text-light-text-muted dark:text-dark-text-muted font-medium">{d.label}</span>
      </div>
    ))}
  </div>
);
