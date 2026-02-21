import React from "react";
import { useSettings } from "@/context/SettingsContext";
import {
    Type,
    AlignLeft,
    AlignJustify,
    AlignCenter,
    EyeOff,
    Layout,
    Columns,
    Scroll,
    MoveVertical,
    WrapText,
    Speech,
    ZapOff,
    RotateCcw,
} from "lucide-react";

const ReaderSettings: React.FC = () => {
    const {
        fontSize, setFontSize,
        lineHeight, setLineHeight,
        textAlignment, setTextAlignment,
        fontPairing, setFontPairing,
        maxTextWidth, setMaxTextWidth,
        pageMargin, setPageMargin,
        paragraphSpacing, setParagraphSpacing,
        hyphenation, setHyphenation,
        continuous, setContinuous,
        spread, setSpread,
        brightness, setBrightness,
        grayscale, setGrayscale,
        showScrollbar, setShowScrollbar,
        showPageCounter, setShowPageCounter,
        screenReaderMode, setScreenReaderMode,
        reduceMotion, setReduceMotion,
        readerAccent,
        resetToDefaults,
    } = useSettings();

    // Helper components
    const SectionLabel = ({ children }: { children: React.ReactNode }) => (
        <p className="text-xs font-semibold uppercase tracking-wider text-light-text-muted dark:text-dark-text-muted mb-3">
            {children}
        </p>
    );

    const Slider = ({
        value,
        min,
        max,
        step = 1,
        onChange,
        label,
        formatValue = (v) => v,
    }: {
        value: number;
        min: number;
        max: number;
        step?: number;
        onChange: (val: number) => void;
        label?: string;
        formatValue?: (v: number) => string | number;
    }) => (
        <div className="flex items-center gap-3">
            {label && <span className="text-sm w-16 text-light-text-muted dark:text-dark-text-muted" id={`slider-label-${label}`}>{label}</span>}
            <div className="relative flex-1 h-8 flex items-center group">
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    aria-label={label}
                    aria-valuemin={min}
                    aria-valuemax={max}
                    aria-valuenow={value}
                />
                <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full transition-all duration-150"
                        style={{ width: `${((value - min) / (max - min)) * 100}%`, backgroundColor: readerAccent }}
                    />
                </div>
                <div
                    className="absolute h-4 w-4 rounded-full bg-white shadow-md border border-black/10 pointer-events-none transition-all duration-150 group-hover:scale-110"
                    style={{ left: `calc(${((value - min) / (max - min)) * 100}% - 8px)` }}
                />
            </div>
            <span className="text-xs font-medium w-10 text-right tabular-nums text-light-text dark:text-dark-text">
                {formatValue(value)}
            </span>
        </div>
    );

    const Toggle = ({
        checked,
        onChange,
        label,
        icon: Icon,
    }: {
        checked: boolean;
        onChange: (v: boolean) => void;
        label: string;
        icon?: React.ElementType;
    }) => (
        <button
            onClick={() => onChange(!checked)}
            role="switch"
            aria-checked={checked}
            className={`flex items-center justify-between w-full p-3 rounded-xl border transition-all duration-200 ${checked
                    ? "bg-light-accent/10 dark:bg-dark-accent/10 border-light-accent dark:border-dark-accent"
                    : "bg-transparent border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                }`}
        >
            <div className="flex items-center gap-3">
                {Icon && <Icon className={`w-4 h-4 ${checked ? "text-light-accent dark:text-dark-accent" : "text-light-text-muted dark:text-dark-text-muted"}`} />}
                <span className={`text-sm ${checked ? "font-medium text-light-text dark:text-dark-text" : "text-light-text-muted dark:text-dark-text-muted"}`}>
                    {label}
                </span>
            </div>
            <div className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${checked ? "bg-light-accent dark:bg-dark-accent" : "bg-black/20 dark:bg-white/20"}`}>
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? "left-6" : "left-1"}`} />
            </div>
        </button>
    );

    const SegmentedControl = <T extends string | boolean>({
        options,
        value,
        onChange,
    }: {
        options: { value: T; label: string; icon?: React.ElementType }[];
        value: T;
        onChange: (val: T) => void;
    }) => (
        <div className="flex p-1 bg-black/5 dark:bg-white/5 rounded-xl" role="radiogroup">
            {options.map((opt) => (
                <button
                    key={String(opt.value)}
                    onClick={() => onChange(opt.value)}
                    role="radio"
                    aria-checked={value === opt.value}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm transition-all duration-200 ${value === opt.value
                            ? "bg-white dark:bg-white/10 shadow-sm text-light-text dark:text-dark-text font-medium"
                            : "text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text"
                        }`}
                >
                    {opt.icon && <opt.icon className="w-4 h-4" />}
                    <span>{opt.label}</span>
                </button>
            ))}
        </div>
    );

    return (
        <div className="space-y-8 pb-8">
            {/* Display Mode */}
            <section>
                <SectionLabel>Display Mode</SectionLabel>
                <div className="grid grid-cols-1 gap-3">
                    <SegmentedControl
                        value={continuous ? "scroll" : spread ? "spread" : "single"}
                        onChange={(v) => {
                            if (v === "scroll") {
                                setContinuous(true);
                                setSpread(false);
                            } else if (v === "spread") {
                                setContinuous(false);
                                setSpread(true);
                            } else {
                                setContinuous(false);
                                setSpread(false);
                            }
                        }}
                        options={[
                            { value: "single", label: "Single", icon: Layout },
                            { value: "spread", label: "Spread", icon: Columns },
                            { value: "scroll", label: "Flow", icon: Scroll },
                        ]}
                    />
                </div>
            </section>

            {/* Theme & Brightness */}
            <section>
                <SectionLabel>Theme & Appearance</SectionLabel>
                <div className="space-y-4">
                    <div className="space-y-3 pt-2">
                        <Slider
                            label="Bright"
                            value={brightness}
                            min={20}
                            max={150}
                            onChange={setBrightness}
                            formatValue={(v) => `${Math.round(v)}%`}
                        />
                        <Toggle
                            label="Grayscale Mode"
                            checked={grayscale}
                            onChange={setGrayscale}
                            icon={EyeOff}
                        />
                    </div>
                </div>
            </section>

            {/* Typography */}
            <section>
                <SectionLabel>Typography</SectionLabel>
                <div className="space-y-4">
                    {/* Font Family */}
                    <div className="grid grid-cols-2 gap-2">
                        <select
                            value={fontPairing}
                            onChange={(e) => setFontPairing(e.target.value)}
                            className="col-span-2 w-full p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
                        >
                            <option value="merriweather-georgia">Merriweather</option>
                            <option value="crimson-pro">Crimson Pro</option>
                            <option value="libre-baskerville">Libre Baskerville</option>
                            <option value="lora">Lora</option>
                            <option value="source-serif">Source Serif</option>
                            <option value="inter">Inter (Sans)</option>
                        </select>
                    </div>

                    {/* Size & Line Height */}
                    <div className="space-y-3">
                        <Slider
                            label="Size"
                            value={fontSize}
                            min={12}
                            max={32}
                            onChange={setFontSize}
                            formatValue={(v) => `${v}px`}
                        />
                        <Slider
                            label="Height"
                            value={lineHeight}
                            min={1.2}
                            max={2.4}
                            step={0.1}
                            onChange={setLineHeight}
                            formatValue={(v) => v.toFixed(1)}
                        />
                    </div>

                    {/* Alignment */}
                    <SegmentedControl
                        value={textAlignment}
                        onChange={setTextAlignment}
                        options={[
                            { value: "left", label: "Left", icon: AlignLeft },
                            { value: "justify", label: "Justify", icon: AlignJustify },
                            { value: "center", label: "Center", icon: AlignCenter },
                        ]}
                    />

                    <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/5">
                        <Toggle
                            label="Hyphenation"
                            checked={hyphenation}
                            onChange={setHyphenation}
                            icon={WrapText}
                        />
                        {/* Drop Caps removed */}
                    </div>
                </div>
            </section>

            {/* Reading Experience */}
            <section>
                <SectionLabel>Reading Experience</SectionLabel>
                <div className="space-y-2">
                    <Toggle
                        label="Screen Reader Mode"
                        checked={screenReaderMode}
                        onChange={setScreenReaderMode}
                        icon={Speech}
                    />
                    <Toggle
                        label="Reduce Motion"
                        checked={reduceMotion}
                        onChange={setReduceMotion}
                        icon={ZapOff}
                    />
                </div>
            </section>

            {/* Layout */}
            <section>
                <SectionLabel>Layout & Spacing</SectionLabel>
                <div className="space-y-3">
                    <Slider
                        label="Width"
                        value={maxTextWidth}
                        min={30}
                        max={150}
                        onChange={setMaxTextWidth}
                        formatValue={(v) => `${v}ch`}
                    />
                    <Slider
                        label="Margin"
                        value={pageMargin}
                        min={0}
                        max={100}
                        onChange={setPageMargin}
                        formatValue={(v) => `${v}px`}
                    />
                    <Slider
                        label="Spacing"
                        value={paragraphSpacing}
                        min={0}
                        max={50}
                        onChange={setParagraphSpacing}
                        formatValue={(v) => `${v}px`}
                    />
                </div>
            </section>

            {/* Interface */}
            <section>
                <SectionLabel>Interface</SectionLabel>
                <div className="space-y-2">
                    <Toggle
                        label="Show Scrollbar"
                        checked={showScrollbar}
                        onChange={setShowScrollbar}
                        icon={MoveVertical}
                    />
                    <Toggle
                        label="Page Counter"
                        checked={showPageCounter}
                        onChange={setShowPageCounter}
                        icon={Type}
                    />
                </div>
            </section>

            {/* Reset */}
            <div className="pt-4 border-t border-black/5 dark:border-white/5">
                <button
                    onClick={resetToDefaults}
                    className="flex items-center justify-center gap-2 w-full p-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                >
                    <RotateCcw className="w-4 h-4" />
                    Reset to Defaults
                </button>
            </div>
        </div>
    );
};

export default ReaderSettings;
