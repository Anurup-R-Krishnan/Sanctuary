import React from "react";

interface SliderProps {
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    step?: number;
    label: string;
    displayValue?: string;
    icon?: React.ElementType;
}

export const Slider = ({
    value,
    onChange,
    min,
    max,
    step = 1,
    label,
    displayValue,
    icon: Icon,
}: SliderProps) => {
    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <div className="group p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className="p-2 rounded-xl bg-light-accent/10 dark:bg-dark-accent/10">
                            <Icon className="w-4 h-4 text-light-accent dark:text-dark-accent" strokeWidth={1.75} />
                        </div>
                    )}
                    <span className="text-sm font-medium text-light-text dark:text-dark-text">{label}</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-light-accent/10 dark:bg-dark-accent/10">
                    <span className="text-sm font-bold text-light-accent dark:text-dark-accent tabular-nums">
                        {displayValue || value}
                    </span>
                </div>
            </div>
            <div className="relative">
                <div className="h-2 bg-black/[0.06] dark:bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                        className="h-full bg-light-accent dark:bg-dark-accent rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                />
                <div
                    className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white dark:bg-dark-surface rounded-full shadow-lg border-2 border-light-accent dark:border-dark-accent transition-all duration-300 pointer-events-none"
                    style={{ left: `calc(${percentage}% - 10px)` }}
                />
            </div>
        </div>
    );
};
