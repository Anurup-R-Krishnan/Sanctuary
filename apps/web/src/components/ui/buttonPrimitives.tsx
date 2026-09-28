/**
 * Shared button variant/size type and style tokens for Button and IconButton.
 * Kept separate from JSX so fast-refresh and jscpd rules are both satisfied.
 */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "nav";
export type ButtonSize = "sm" | "md" | "lg";

export const variantStyles: Record<ButtonVariant, string> = {
    primary: "bg-accent text-accent-fg hover:brightness-[1.06] active:brightness-95 border-transparent shadow-sm",
    secondary: "bg-surface-raised text-fg hover:bg-subtle active:bg-line/40 border-line shadow-sm",
    ghost: "bg-transparent text-fg hover:bg-line/40 active:bg-line/60 border-transparent",
    destructive: "bg-danger/10 text-danger hover:bg-danger/15 active:bg-danger/20 border-transparent",
    nav: "bg-transparent border-transparent",
};
