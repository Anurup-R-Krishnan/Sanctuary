import React from "react";

interface SectionHeaderProps {
  title: string;
  count?: number;
  icon?: React.ElementType;
}

export const SectionHeader = ({
  title,
  count,
  icon: Icon,
}: SectionHeaderProps) => (
  <div className="flex items-center gap-2 mb-4">
    {Icon && <Icon className="w-4 h-4 text-light-accent dark:text-dark-accent" strokeWidth={1.75} />}
    <h3 className="text-sm font-semibold text-light-text dark:text-dark-text">{title}</h3>
    {count !== undefined && (
      <span className="px-1.5 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.04] text-[10px] font-medium text-light-text-muted dark:text-dark-text-muted tabular-nums">
        {count}
      </span>
    )}
  </div>
);
