import React from "react";

import { cx } from "@/utils/cx";

export interface ToggleProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
    checked: boolean;
    label: string;
    onChange: (v: boolean) => void;
}

export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
    ({ checked, className, label, onChange, ...props }, ref) => (
        <button
            aria-checked={checked}
            aria-label={label}
            className={cx(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-fast outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page",
                checked ? "border-accent bg-accent" : "border-line bg-subtle hover:border-fg-muted/40",
                className
            )}
            onClick={() => onChange(!checked)}
            ref={ref}
            role="switch"
            type="button"
            {...props}
        >
            <span
                className={cx(
                    "absolute top-1/2 h-[18px] w-[18px] -translate-y-1/2 rounded-full bg-surface-raised shadow-[0_1px_2px_rgba(60,42,20,0.25)] transition-[left] duration-fast ease-out",
                    checked ? "left-[22px]" : "left-[2px]"
                )}
            />
        </button>
    )
);

Toggle.displayName = "Toggle";
