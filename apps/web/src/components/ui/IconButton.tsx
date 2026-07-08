import type { ButtonHTMLAttributes} from "react";

import { forwardRef } from "react";

import { type ButtonVariant, type ButtonSize, variantStyles } from "./buttonPrimitives";
import { LoadingSpinner } from "./LoadingSpinner";

export type { ButtonVariant, ButtonSize };

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
    icon: React.ReactNode;
    isLoading?: boolean;
    label: string; // Enforce accessible name
    size?: ButtonSize;
    variant?: ButtonVariant;
}

const sizeStyles: Record<ButtonSize, string> = {
    sm: "p-1.5 rounded-lg",
    md: "p-2 rounded-xl",
    lg: "p-3 rounded-2xl",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
    (
        {
            className = "",
            icon,
            label,
            variant = "ghost",
            size = "md",
            isLoading = false,
            disabled,
            type = "button",
            ...props
        },
        ref
    ) => {
        const baseStyles = "inline-flex items-center justify-center transition-all duration-200 border outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20 disabled:opacity-50 disabled:pointer-events-none";
        
        return (
            <button
                ref={ref}
                type={type}
                disabled={isLoading || disabled}
                aria-label={label}
                title={label} // Fallback tooltip natively
                className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
                {...props}
            >
                {isLoading ? <LoadingSpinner className="h-5 w-5" /> : icon}
            </button>
        );
    }
);

IconButton.displayName = "IconButton";
