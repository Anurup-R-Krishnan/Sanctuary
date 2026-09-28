import type { ReactNode } from "react";

interface PageHeaderProps {
  actions?: ReactNode;
  description?: ReactNode;
  eyebrow?: string;
  title: string;
}

export function PageHeader({ actions, description, eyebrow, title }: PageHeaderProps) {
  return (
    <header className="border-b border-line pb-5">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          {eyebrow && <p className="label-caps">{eyebrow}</p>}
          <h1 className="mt-1.5 font-display text-4xl font-medium tracking-[-0.025em] text-fg sm:text-[2.75rem] sm:leading-[1.05]">
            {title}
          </h1>
          {description && <p className="mt-2 text-sm text-fg-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
