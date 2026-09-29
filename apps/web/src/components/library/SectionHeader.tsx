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
      <div className="mb-3 flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />}
        <h3 className="label-caps">{title}</h3>
        {count !== undefined && <span className="text-xs tabular-nums text-fg-muted">· {count}</span>}
        <span aria-hidden="true" className="ml-2 h-px flex-1 bg-line/70" />
      </div>
    );
  }

  return (
    <div className="mb-5 flex items-baseline gap-3 border-b border-line pb-3">
      {Icon && <Icon className="h-4 w-4 self-center text-accent" strokeWidth={1.75} />}
      <h3 className="font-display text-2xl font-medium tracking-tight text-fg">{title}</h3>
      {count !== undefined && <span className="folio text-sm tabular-nums text-fg-muted">{count}</span>}
    </div>
  );
};
