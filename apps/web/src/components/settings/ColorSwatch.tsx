import { Check, type LucideIcon } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/Button";

interface ColorPreset {
    accent: string;
    bg: string;
    fg: string;
    icon: LucideIcon;
    id: string;
    label: string;
}

interface ColorSwatchProps {
    isActive: boolean;
    onClick: () => void;
    preset: ColorPreset;
}

export const ColorSwatch = ({
    preset,
    isActive,
    onClick,
}: ColorSwatchProps) => {
    const Icon = preset.icon;
    return (
        <Button
            onClick={onClick}
            variant="ghost"
            aria-pressed={isActive}
            aria-label={`Select ${preset.label} color theme`}
            className={`relative flex flex-col items-center !p-4 !rounded-2xl border transition-all duration-200 h-auto ${
                isActive
                    ? "border-light-accent dark:border-dark-accent bg-light-accent/5 dark:bg-dark-accent/10"
                    : "border-black/[0.06] dark:border-white/[0.06] hover:border-light-accent/30 dark:hover:border-dark-accent/30"
            }`}
        >
            <div
                className="w-16 h-16 rounded-2xl mb-3 flex items-center justify-center border border-black/10 dark:border-white/10 shadow-inner"
                style={{ backgroundColor: preset.bg }}
            >
                <span className="text-2xl font-serif font-bold" style={{ color: preset.fg }}>Aa</span>
            </div>

            <div className="flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-light-text-muted dark:text-dark-text-muted" strokeWidth={1.5} />
                <span className="text-sm font-medium text-light-text dark:text-dark-text">{preset.label}</span>
            </div>

            {isActive && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-light-accent dark:bg-dark-accent rounded-full flex items-center justify-center shadow-sm">
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
            )}
        </Button>
    );
};
