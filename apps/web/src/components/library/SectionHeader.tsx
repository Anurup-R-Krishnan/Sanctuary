import React from "react";

interface SectionHeaderProps {
  count?: number;
  icon?: React.ElementType;
  title: string;
  variant?: "primary" | "quiet";
}

export const SectionHeader = ({
  title,
  count,
  icon: Icon,
  variant = "primary",
}: SectionHeaderProps) => {
  if (variant === "quiet") {
    return (
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="w-3.5 h-3.5 text-light-text-muted dark:text-dark-text-muted" strokeWidth={1.75} />}
        <h3 className="text-xs font-semibold uppercase tracking-wide text-light-text-muted dark:text-dark-text-muted">{title}</h3>
        {count !== undefined && (
          <span className="text-xs text-light-text-muted/60 dark:text-dark-text-muted/60 tabular-nums">{count}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mb-4">
      {Icon && <Icon className="w-5 h-5 text-light-accent dark:text-dark-accent" strokeWidth={1.75} />}
      <h3 className="text-2xl font-sans font-bold tracking-tight text-light-text dark:text-dark-text">{title}</h3>
      {count !== undefined && (
        <span className="px-2 py-0.5 rounded-full bg-light-accent/10 dark:bg-dark-accent/10 text-xs font-medium text-light-accent dark:text-dark-accent tabular-nums">
          {count}
        </span>
      )}
    </div>
  );
};
