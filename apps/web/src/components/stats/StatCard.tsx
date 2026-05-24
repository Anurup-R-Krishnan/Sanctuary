import React from "react";

interface StatCardProps {
  accent?: boolean;
  icon: React.ElementType;
  label: string;
  subtext?: string;
  value: string | number;
}

export const StatCard = ({
  icon: Icon,
  label,
  value,
  subtext,
  accent = false,
}: StatCardProps) => (
  <div
    className={`p-4 rounded-xl border transition-colors ${
      accent
        ? "bg-gradient-to-br from-light-accent/6 to-amber-500/6 dark:from-dark-accent/8 dark:to-amber-400/8 border-light-accent/15 dark:border-dark-accent/15"
        : "bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.04] dark:border-white/[0.04]"
    }`}
  >
    <div className="flex items-start gap-3">
      <div
        className={`p-2 rounded-lg ${
          accent ? "bg-light-accent/12 dark:bg-dark-accent/12" : "bg-black/[0.04] dark:bg-white/[0.04]"
        }`}
      >
        <Icon
          className={`w-4 h-4 ${
            accent ? "text-light-accent dark:text-dark-accent" : "text-light-text-muted dark:text-dark-text-muted"
          }`}
          strokeWidth={1.75}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-light-text-muted dark:text-dark-text-muted uppercase tracking-wide font-medium">
          {label}
        </p>
        <p className="text-xl font-bold text-light-text dark:text-dark-text tabular-nums mt-0.5">{value}</p>
        {subtext && (
          <p className="text-[11px] text-light-text-muted/60 dark:text-dark-text-muted/60 mt-0.5">{subtext}</p>
        )}
      </div>
    </div>
  </div>
);
