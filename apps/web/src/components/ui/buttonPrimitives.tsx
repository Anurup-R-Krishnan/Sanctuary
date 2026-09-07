/**
 * Shared button variant/size type and style tokens for Button and IconButton.
 * Kept separate from JSX so fast-refresh and jscpd rules are both satisfied.
 */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "nav";
export type ButtonSize = "sm" | "md" | "lg";

export const variantStyles: Record<ButtonVariant, string> = {
    primary: "bg-gold-500 text-white dark:bg-dark-accent dark:text-dark-primary hover:bg-gold-600 dark:hover:brightness-110 active:bg-gold-700 dark:active:brightness-95 active:scale-[0.98] border-transparent shadow-sm shadow-gold-900/15 dark:shadow-dark-accent/10",
    secondary: "bg-light-secondary dark:bg-dark-secondary text-light-text dark:text-dark-text hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 active:scale-[0.98] border-black/[0.08] dark:border-white/[0.08]",
    ghost: "bg-transparent text-light-text dark:text-dark-text hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 active:scale-[0.98] border-transparent",
    destructive: "bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 active:bg-red-500/30 active:scale-[0.98] border-transparent",
    nav: "bg-transparent border-transparent active:scale-[0.98]",
};
