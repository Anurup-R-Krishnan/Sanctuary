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
        {Icon && <Icon className="w-3.5 h-3.5 text-fg-muted" strokeWidth={1.75} />}
        <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{title}</h3>
        {count !== undefined && (
          <span className="text-xs text-fg-muted/60 tabular-nums">{count}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mb-4">
      {Icon && <Icon className="w-5 h-5 text-accent" strokeWidth={1.75} />}
      <h3 className="font-display font-medium text-2xl tracking-tight text-fg">{title}</h3>
      {count !== undefined && (
        <span className="px-2 py-0.5 rounded-full bg-accent/10 text-xs font-medium text-accent tabular-nums">
          {count}
        </span>
      )}
    </div>
  );
};
