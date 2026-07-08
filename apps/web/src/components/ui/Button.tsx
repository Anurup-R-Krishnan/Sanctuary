import type { ButtonHTMLAttributes} from "react";

import { forwardRef } from "react";

import { type ButtonVariant, type ButtonSize, variantStyles } from "./buttonPrimitives";
import { LoadingSpinner } from "./LoadingSpinner";

export type { ButtonVariant, ButtonSize };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean;
    size?: ButtonSize;
    variant?: ButtonVariant;
}

const sizeStyles: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-4 py-2 text-sm rounded-xl",
    lg: "px-6 py-3 text-base rounded-2xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className = "",
            variant = "primary",
            size = "md",
            isLoading = false,
            disabled,
            children,
            type = "button",
            ...props
        },
        ref
    ) => {
        const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 border outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20 disabled:opacity-50 disabled:pointer-events-none";
        
        return (
            <button
                ref={ref}
                type={type}
                disabled={isLoading || disabled}
                className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
                {...props}
            >
                {isLoading && <LoadingSpinner className="-ml-1 mr-2 h-4 w-4" />}
                <span className={isLoading ? "opacity-0" : "opacity-100"}>{children}</span>
            </button>
        );
    }
);

Button.displayName = "Button";
