import React, { forwardRef } from "react";

import { cx } from "@/utils/cx";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, rightIcon, error, ...props }, ref) => {
    return (
      <div className="w-full relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none flex items-center justify-center">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={cx(
            "w-full h-11 rounded-xl border border-line",
            "bg-surface text-sm text-fg",
            "placeholder:text-fg-muted",
            "focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30",
            "transition-shadow duration-instant",
            icon ? "pl-10" : "pl-4",
            rightIcon ? "pr-10" : "pr-4",
            error && "border-red-500 focus:ring-red-500/30",
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
            {rightIcon}
          </div>
        )}
        {error && (
          <p className="mt-1.5 text-xs text-red-500 font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
