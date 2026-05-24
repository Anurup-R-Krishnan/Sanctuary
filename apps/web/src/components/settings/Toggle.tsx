import { Check } from "lucide-react";
import React from "react";

interface ToggleProps {
    checked: boolean;
    label: string;
    onChange: (v: boolean) => void;
    sublabel?: string;
}

export const Toggle = ({ checked, onChange, label, sublabel }: ToggleProps) => (
    <button
        type="button"
        className="group w-full text-left flex items-center justify-between p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-all duration-200 cursor-pointer"
        onClick={() => onChange(!checked)}
    >
        <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-light-text dark:text-dark-text block">{label}</span>
            {sublabel && <span className="text-xs text-light-text-muted/70 dark:text-dark-text-muted/70 mt-0.5 block">{sublabel}</span>}
        </div>
        <div className={`relative w-14 h-8 rounded-full transition-all duration-300 ease-out ${checked
                ? "bg-light-accent dark:bg-dark-accent"
                : "bg-black/10 dark:bg-white/10"
            }`}>
            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-500 ease-out ${checked ? "left-7 scale-110" : "left-1"
                }`}>
                {checked && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Check className="w-3 h-3 text-light-accent dark:text-dark-accent" strokeWidth={3} />
                    </div>
                )}
            </div>
        </div>
    </button>
);
