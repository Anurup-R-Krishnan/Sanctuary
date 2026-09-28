import { Check } from "lucide-react";
import React from "react";

import { cx } from "@/utils/cx";

export interface ToggleProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
    checked: boolean;
    icon?: React.ElementType;
    label?: string;
    onChange: (v: boolean) => void;
    sublabel?: string;
}

export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
    ({ checked, onChange, label, sublabel, icon: Icon, className, ...props }, ref) => {
        return (
            <button
                ref={ref}
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={cx(
                    "group w-full text-left flex items-center justify-between p-4 rounded-2xl transition-all duration-instant cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent",
                    checked
                        ? "bg-accent/10 border border-accent/20"
                        : "bg-surface/50 border border-line/60 hover:bg-surface/80 hover:border-accent/30",
                    className
                )}
                {...props}
            >
                <div className="flex-1 min-w-0 flex items-center gap-3">
                    {Icon && (
                        <div className="flex-shrink-0">
                            <Icon className={cx("w-5 h-5", checked ? "text-accent" : "text-fg-muted")} />
                        </div>
                    )}
                    <div>
                        {label && <span className="text-sm font-medium text-fg block">{label}</span>}
                        {sublabel && <span className="text-xs text-fg-muted/70 mt-0.5 block">{sublabel}</span>}
                    </div>
                </div>
                <div className={cx(
                    "relative flex-shrink-0 w-12 h-6 rounded-full transition-all duration-fast ease-out",
                    checked ? "bg-accent" : "bg-line"
                )}>
                    <div className={cx(
                        "absolute top-1 w-4 h-4 bg-white dark:bg-dark-text rounded-full shadow-md transition-all duration-fast ease-out flex items-center justify-center",
                        checked ? "left-7" : "left-1"
                    )}>
                        {checked && (
                            <Check className="w-2.5 h-2.5 text-accent" strokeWidth={3} />
                        )}
                    </div>
                </div>
            </button>
        );
    }
);

Toggle.displayName = "Toggle";
