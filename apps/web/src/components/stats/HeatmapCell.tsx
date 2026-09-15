import React from "react";

interface HeatmapCellProps {
  level: number;
}

export const HeatmapCell = ({ level }: HeatmapCellProps) => {
  const colors = [
    "bg-light-border/40 dark:bg-dark-border/40",
    "bg-light-accent/20 dark:bg-dark-accent/20",
    "bg-light-accent/45 dark:bg-dark-accent/45",
    "bg-light-accent dark:bg-dark-accent",
  ];
  return <div className={`w-2.5 h-2.5 rounded-sm ${colors[level]} transition-colors`} />;
};
