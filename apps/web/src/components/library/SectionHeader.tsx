import React from "react";

interface SectionHeaderProps {
  count?: number;
  icon?: React.ElementType;
  title: string;
}

export const SectionHeader = ({
  title,
  count,
  icon: Icon,
}: SectionHeaderProps) => (
  <div className="flex items-center gap-2 mb-4">
    {Icon && <Icon className="w-5 h-5 text-light-accent dark:text-dark-accent" strokeWidth={1.75} />}
    <h3 className="text-2xl font-serif font-medium tracking-tight text-light-text dark:text-dark-text">{title}</h3>
    {count !== undefined && (
      <span className="px-2 py-0.5 rounded-full bg-light-accent/10 dark:bg-dark-accent/10 text-xs font-medium text-light-accent dark:text-dark-accent tabular-nums">
        {count}
      </span>
    )}
  </div>
);
