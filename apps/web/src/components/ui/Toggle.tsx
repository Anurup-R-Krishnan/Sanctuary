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
                    "group w-full text-left flex items-center justify-between p-4 rounded-2xl transition-all duration-200 cursor-pointer",
                    checked
                        ? "bg-light-accent/10 dark:bg-dark-accent/10 border border-light-accent/20 dark:border-dark-accent/20"
                        : "bg-black/[0.02] dark:bg-white/[0.02] border border-transparent hover:bg-black/[0.04] dark:hover:bg-white/[0.04]",
                    className
                )}
                {...props}
            >
                <div className="flex-1 min-w-0 flex items-center gap-3">
                    {Icon && (
                        <div className="flex-shrink-0">
                            <Icon className={cx("w-5 h-5", checked ? "text-light-accent dark:text-dark-accent" : "text-light-text-muted dark:text-dark-text-muted")} />
                        </div>
                    )}
                    <div>
                        {label && <span className="text-sm font-medium text-light-text dark:text-dark-text block">{label}</span>}
                        {sublabel && <span className="text-xs text-light-text-muted/70 dark:text-dark-text-muted/70 mt-0.5 block">{sublabel}</span>}
                    </div>
                </div>
                <div className={cx(
                    "relative flex-shrink-0 w-12 h-6 rounded-full transition-all duration-300 ease-out",
                    checked ? "bg-light-accent dark:bg-dark-accent" : "bg-black/20 dark:bg-white/20"
                )}>
                    <div className={cx(
                        "absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 ease-out flex items-center justify-center",
                        checked ? "left-7" : "left-1"
                    )}>
                        {checked && (
                            <Check className="w-2.5 h-2.5 text-light-accent dark:text-dark-accent" strokeWidth={3} />
                        )}
                    </div>
                </div>
            </button>
        );
    }
);

Toggle.displayName = "Toggle";
