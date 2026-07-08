/**
 * Shared button variant/size type and style tokens for Button and IconButton.
 * Kept separate from JSX so fast-refresh and jscpd rules are both satisfied.
 */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "nav";
export type ButtonSize = "sm" | "md" | "lg";

export const variantStyles: Record<ButtonVariant, string> = {
    primary: "bg-light-text text-light-surface dark:bg-dark-text dark:text-dark-primary hover:bg-black/80 dark:hover:bg-white/80 border-transparent",
    secondary: "bg-light-secondary dark:bg-dark-secondary text-light-text dark:text-dark-text hover:bg-black/5 dark:hover:bg-white/5 border-black/[0.08] dark:border-white/[0.08]",
    ghost: "bg-transparent text-light-text dark:text-dark-text hover:bg-black/5 dark:hover:bg-white/5 border-transparent",
    destructive: "bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 border-transparent",
    nav: "bg-transparent border-transparent",
};
