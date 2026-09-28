interface SliderProps {
    displayValue?: string;
    label: string;
    max: number;
    min: number;
    onChange: (v: number) => void;
    step?: number;
    value: number;
}

export const Slider = ({ displayValue, label, max, min, onChange, step = 1, value }: SliderProps) => {
    const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

    return (
        <div>
            <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm font-medium text-fg">{label}</span>
                <span className="font-display text-lg font-medium tabular-nums text-fg">{displayValue ?? value}</span>
            </div>
            <div className="relative mt-3 h-5">
                <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-line" />
                <div className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-accent" style={{ width: `${percentage}%` }} />
                <div
                    className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-surface-raised shadow-paper"
                    style={{ left: `${percentage}%` }}
                />
                <input
                    aria-label={label}
                    aria-valuetext={displayValue}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    max={max}
                    min={min}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    step={step}
                    type="range"
                    value={value}
                />
            </div>
            <div className="mt-1.5 flex justify-between text-2xs tabular-nums text-fg-muted">
                <span>{min}</span>
                <span>{max}</span>
            </div>
        </div>
    );
};
