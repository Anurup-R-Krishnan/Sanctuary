import type { SelectHTMLAttributes} from "react";

import React, { forwardRef } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", error, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`w-full rounded-xl border p-2.5 text-sm outline-none transition-colors 
        ${
          error
            ? "border-red-500/50 bg-red-500/5 focus:border-red-500 focus:ring-1 focus:ring-red-500 dark:bg-red-500/10"
            : "border-black/10 bg-black/5 text-light-text focus:ring-2 focus:ring-light-accent dark:border-white/10 dark:bg-white/5 dark:text-dark-text dark:focus:ring-dark-accent"
        } 
        ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  }
);

Select.displayName = "Select";
