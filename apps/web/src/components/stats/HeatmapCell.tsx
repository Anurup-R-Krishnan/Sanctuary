import React from "react";

interface HeatmapCellProps {
  level: number;
}

export const HeatmapCell = ({ level }: HeatmapCellProps) => {
  const colors = [
    "bg-line/40",
    "bg-accent/20",
    "bg-accent/45",
    "bg-accent",
  ];
  return <div className={`w-2.5 h-2.5 rounded-sm ${colors[level]} transition-colors`} />;
};
