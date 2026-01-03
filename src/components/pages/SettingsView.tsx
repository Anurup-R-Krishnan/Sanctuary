import React, { useState } from "react";
import {
    Type,
    Layout,
    BookOpen,
    Palette,
    Target,
    RotateCcw,
    AlignLeft,
    AlignCenter,
    AlignJustify,
    Moon,
    Sun,
    Zap,
    Coffee,
    Check,
    Sparkles,
    WandSparkles,
    Eye,
    Accessibility,
    Bell,
    ChartLine,
    Droplets,
    Move,
} from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

const ShortcutItem = ({ label, keys, onChange }: { label: string; keys: string[]; onChange: (keys: string[]) => void }) => {
    const [isEditing, setIsEditing] = useState(false);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        e.preventDefault();
        const key = e.key;
        if (key === "Escape") {
            setIsEditing(false);
        } else if (key === "Enter") {
            setIsEditing(false);
        } else if (key === "Backspace") {
            onChange([]);
            setIsEditing(false);
        } else if (!keys.includes(key)) {
            onChange([...keys, key]);
        }
    };

    const removeKey = (keyToRemove: string) => {
        onChange(keys.filter(k => k !== keyToRemove));
    };

    return (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-all">
            <span className="text-sm font-medium text-light-text dark:text-dark-text">{label}</span>
            <div className="flex items-center gap-2">
                {isEditing ? (
                    <div
                        className="px-3 py-1 text-xs bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent cursor-text min-w-[100px] text-center"
                        onKeyDown={handleKeyDown}
                        tabIndex={0}
                    >
                        Press keys... (Esc to cancel)
                    </div>
                ) : (
                    <div className="flex items-center gap-1">
                        {keys.map((key, index) => (
                            <span key={index} className="relative group">
                                <kbd className="px-2 py-1 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded font-mono">
                                    {key === " " ? "Space" : key}
                                </kbd>
                                <button
                                    onClick={() => removeKey(key)}
                                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-2 py-1 text-xs bg-light-accent dark:bg-dark-accent text-white rounded hover:opacity-80 transition-opacity"
                        >
                            +
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

type Tab = "typography" | "layout" | "reading" | "colors" | "shortcuts" | "goals";

const FONT_PAIRINGS = [
    { id: "merriweather-georgia", label: "Merriweather", family: "'Merriweather', Georgia, serif", style: "Classic Serif" },
    { id: "crimson-pro", label: "Crimson Pro", family: "'Crimson Pro', Georgia, serif", style: "Elegant" },
    { id: "libre-baskerville", label: "Libre Baskerville", family: "'Libre Baskerville', Georgia, serif", style: "Traditional" },
    { id: "lora", label: "Lora", family: "'Lora', Georgia, serif", style: "Contemporary" },
    { id: "source-serif", label: "Source Serif", family: "'Source Serif Pro', Georgia, serif", style: "Modern" },
    { id: "inter", label: "Inter", family: "'Inter', system-ui, sans-serif", style: "Sans-Serif" },
];

const COLOR_PRESETS = [
    { id: "light", label: "Paper", fg: "#1a1a1a", bg: "#ffffff", accent: "#8B7355", icon: Sun },
    { id: "cream", label: "Ivory", fg: "#2B2B2B", bg: "#FBF8F3", accent: "#8B7355", icon: Coffee },
    { id: "sepia", label: "Sepia", fg: "#5C4B37", bg: "#F4ECD8", accent: "#8B7355", icon: Droplets },
    { id: "dark", label: "Ink", fg: "#e8e6e3", bg: "#1a1a1a", accent: "#d4b58b", icon: Moon },
    { id: "midnight", label: "Midnight", fg: "#c9d1d9", bg: "#0d1117", accent: "#79c0ff", icon: Sparkles },
];

const SettingsView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>("typography");
    const settings = useSettings();
    const {
        fontSize, setFontSize,
        lineHeight, setLineHeight,
        textAlignment, setTextAlignment,
        fontPairing, setFontPairing,
        maxTextWidth, setMaxTextWidth,
        hyphenation, setHyphenation,
        pageMargin, setPageMargin,
        paragraphSpacing, setParagraphSpacing,
        dropCaps, setDropCaps,
        immersiveMode, setImmersiveMode,
        continuousMode, setContinuousMode,
        readerForeground, setReaderForeground,
        readerBackground, setReaderBackground,
        readerAccent, setReaderAccent,
        keybinds, setKeybinds,
        dailyGoal, setDailyGoal,
        weeklyGoal, setWeeklyGoal,
        showStreakReminder, setShowStreakReminder,
        trackingEnabled, setTrackingEnabled,
        screenReaderMode, setScreenReaderMode,
        reduceMotion, setReduceMotion,
        resetToDefaults,
        applyPreset,
    } = settings;

    const tabs = [
        { id: "typography" as Tab, label: "Typography", icon: Type, description: "Fonts & Text" },
        { id: "layout" as Tab, label: "Layout", icon: Layout, description: "Spacing" },
        { id: "reading" as Tab, label: "Reading", icon: BookOpen, description: "Experience" },
        { id: "colors" as Tab, label: "Colors", icon: Palette, description: "Theme" },
        { id: "shortcuts" as Tab, label: "Shortcuts", icon: Zap, description: "Keybinds" },
        { id: "goals" as Tab, label: "Goals", icon: Target, description: "Tracking" },
    ];

    // Premium Toggle Component
    const Toggle = ({ checked, onChange, label, sublabel }: { checked: boolean; onChange: (v: boolean) => void; label: string; sublabel?: string }) => (
        <div className="group flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-black/[0.02] to-transparent dark:from-white/[0.02] dark:to-transparent hover:from-black/[0.04] dark:hover:from-white/[0.04] transition-all duration-300 cursor-pointer" onClick={() => onChange(!checked)}>
            <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-light-text dark:text-dark-text block">{label}</span>
                {sublabel && <span className="text-xs text-light-text-muted/70 dark:text-dark-text-muted/70 mt-0.5 block">{sublabel}</span>}
            </div>
            <div className={`relative w-14 h-8 rounded-full transition-all duration-500 ease-out ${checked
                    ? "bg-gradient-to-r from-light-accent to-amber-500 dark:from-dark-accent dark:to-amber-400 shadow-lg shadow-light-accent/25 dark:shadow-dark-accent/20"
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
        </div>
    );

    // Premium Slider Component
    const Slider = ({
        value,
        onChange,
        min,
        max,
        step = 1,
        label,
        displayValue,
        icon: Icon,
    }: {
        value: number;
        onChange: (v: number) => void;
        min: number;
        max: number;
        step?: number;
        label: string;
        displayValue?: string;
        icon?: React.ElementType;
    }) => {
        const percentage = ((value - min) / (max - min)) * 100;

        return (
            <div className="group p-4 rounded-2xl bg-gradient-to-r from-black/[0.02] to-transparent dark:from-white/[0.02] dark:to-transparent hover:from-black/[0.04] dark:hover:from-white/[0.04] transition-all duration-300">
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
                            className="h-full bg-gradient-to-r from-light-accent to-amber-500 dark:from-dark-accent dark:to-amber-400 rounded-full transition-all duration-300"
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

    // Premium Section Component
    const Section = ({ title, icon: Icon, children, gradient }: { title: string; icon?: React.ElementType; children: React.ReactNode; gradient?: string }) => (
        <div className={`relative overflow-hidden rounded-3xl border border-black/[0.05] dark:border-white/[0.05] ${gradient || "bg-light-surface/50 dark:bg-dark-surface/50"}`}>
            {/* Decorative gradient */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-light-accent/5 to-transparent dark:from-dark-accent/8 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="relative p-6">
                <div className="flex items-center gap-3 mb-5">
                    {Icon && (
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-light-accent/15 to-amber-500/10 dark:from-dark-accent/20 dark:to-amber-400/10">
                            <Icon className="w-5 h-5 text-light-accent dark:text-dark-accent" strokeWidth={1.75} />
                        </div>
                    )}
                    <h3 className="text-base font-semibold text-light-text dark:text-dark-text">{title}</h3>
                </div>
                <div className="space-y-3">{children}</div>
            </div>
        </div>
    );

    // Premium Preset Card
    const PresetCard = ({
        icon: Icon,
        label,
        description,
        onClick,
        gradient,
    }: {
        icon: React.ElementType;
        label: string;
        description: string;
        onClick: () => void;
        gradient: string;
    }) => (
        <button
            onClick={onClick}
            className="group relative overflow-hidden w-full p-5 rounded-2xl border border-black/[0.05] dark:border-white/[0.05] bg-light-surface/80 dark:bg-dark-surface/80 text-left transition-all duration-500 hover:scale-[1.02] hover:shadow-xl hover:shadow-light-accent/10 dark:hover:shadow-dark-accent/10 hover:border-light-accent/20 dark:hover:border-dark-accent/20 active:scale-[0.98]"
        >
            {/* Animated gradient background */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${gradient}`} />

            {/* Sparkle effect on hover */}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:rotate-12">
                <Sparkles className="w-4 h-4 text-light-accent dark:text-dark-accent" strokeWidth={1.5} />
            </div>

            <div className="relative flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-light-accent/10 to-amber-500/5 dark:from-dark-accent/15 dark:to-amber-400/5 group-hover:from-light-accent/20 group-hover:to-amber-500/10 dark:group-hover:from-dark-accent/25 dark:group-hover:to-amber-400/10 transition-all duration-500">
                    <Icon className="w-6 h-6 text-light-accent dark:text-dark-accent transition-transform duration-500 group-hover:scale-110" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-light-text dark:text-dark-text group-hover:text-light-accent dark:group-hover:text-dark-accent transition-colors duration-300">{label}</p>
                    <p className="text-sm text-light-text-muted dark:text-dark-text-muted mt-1 leading-relaxed">{description}</p>
                </div>
            </div>
        </button>
    );

    // Color Swatch
    const ColorSwatch = ({
        preset,
        isActive,
        onClick,
    }: {
        preset: typeof COLOR_PRESETS[0];
        isActive: boolean;
        onClick: () => void;
    }) => {
        const Icon = preset.icon;
        return (
            <button
                onClick={onClick}
                className={`group relative flex flex-col items-center p-4 rounded-2xl border transition-all duration-500 hover:scale-105 ${isActive
                        ? "border-light-accent dark:border-dark-accent shadow-lg shadow-light-accent/15 dark:shadow-dark-accent/10 scale-105"
                        : "border-black/[0.06] dark:border-white/[0.06] hover:border-light-accent/30 dark:hover:border-dark-accent/30"
                    }`}
            >
                {/* Color preview */}
                <div
                    className="w-16 h-16 rounded-2xl mb-3 flex items-center justify-center border border-black/10 dark:border-white/10 shadow-inner transition-transform duration-500 group-hover:scale-110"
                    style={{ backgroundColor: preset.bg }}
                >
                    <span className="text-2xl font-serif font-bold" style={{ color: preset.fg }}>Aa</span>
                </div>

                {/* Label */}
                <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-light-text-muted dark:text-dark-text-muted" strokeWidth={1.5} />
                    <span className="text-sm font-medium text-light-text dark:text-dark-text">{preset.label}</span>
                </div>

                {/* Active indicator */}
                {isActive && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-light-accent to-amber-500 dark:from-dark-accent dark:to-amber-400 rounded-full flex items-center justify-center shadow-lg">
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                )}
            </button>
        );
    };

    const getActiveColorPreset = () => {
        return COLOR_PRESETS.find(p => p.bg === readerBackground) || null;
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-16">
            {/* Hero Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-light-accent/5 via-amber-500/3 to-transparent dark:from-dark-accent/8 dark:via-amber-400/4 p-8 border border-light-accent/10 dark:border-dark-accent/10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-light-accent/10 to-transparent dark:from-dark-accent/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-amber-500/8 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-light-accent to-amber-500 dark:from-dark-accent dark:to-amber-400 shadow-lg shadow-light-accent/20 dark:shadow-dark-accent/15">
                                <WandSparkles className="w-5 h-5 text-white" strokeWidth={1.75} />
                            </div>
                            <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">Settings</h2>
                        </div>
                        <p className="text-light-text-muted dark:text-dark-text-muted text-sm max-w-md">
                            Craft your perfect reading experience with personalized typography, colors, and layout preferences.
                        </p>
                    </div>

                    <button
                        onClick={resetToDefaults}
                        className="group flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08] text-light-text-muted dark:text-dark-text-muted hover:text-light-accent dark:hover:text-dark-accent hover:border-light-accent/30 dark:hover:border-dark-accent/30 transition-all duration-300 shadow-sm hover:shadow-md"
                    >
                        <RotateCcw className="w-4 h-4 transition-transform duration-500 group-hover:-rotate-180" strokeWidth={1.75} />
                        <span className="text-sm font-medium">Reset All</span>
                    </button>
                </div>
            </div>

            {/* Premium Tab Navigation */}
            <div className="relative p-1.5 bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl">
                <div className="flex gap-1">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all duration-300 ${isActive
                                        ? "text-light-accent dark:text-dark-accent"
                                        : "text-light-text-muted/60 dark:text-dark-text-muted/60 hover:text-light-text dark:hover:text-dark-text"
                                    }`}
                            >
                                {isActive && (
                                    <div className="absolute inset-0 bg-white dark:bg-dark-surface rounded-xl shadow-lg shadow-black/[0.05] dark:shadow-black/[0.2]" />
                                )}
                                <div className="relative flex items-center gap-2">
                                    <tab.icon className="w-4 h-4" strokeWidth={isActive ? 2 : 1.75} />
                                    <span className="text-sm font-medium hidden sm:inline">{tab.label}</span>
                                </div>
                                <span className="relative text-[10px] opacity-60 hidden lg:block">{tab.description}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="space-y-6 animate-fadeIn" key={activeTab}>
                {activeTab === "typography" && (
                    <>
                        {/* Live Preview */}
                        <div className="relative overflow-hidden rounded-3xl shadow-2xl shadow-black/[0.08] dark:shadow-black/[0.3]">
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/5 dark:to-black/20 pointer-events-none z-10" />
                            <div
                                className="p-8 sm:p-12 transition-all duration-500"
                                style={{
                                    fontFamily: FONT_PAIRINGS.find((f) => f.id === fontPairing)?.family || "Georgia, serif",
                                    fontSize: `${fontSize}px`,
                                    lineHeight: lineHeight,
                                    textAlign: textAlignment,
                                    color: readerForeground,
                                    backgroundColor: readerBackground,
                                }}
                            >
                                <p className="leading-relaxed max-w-2xl mx-auto">
                                    In a hole in the ground there lived a hobbit. Not a nasty, dirty, wet hole, filled with the ends of worms and an oozy smell, nor yet a dry, bare, sandy hole with nothing in it to sit down on or to eat: it was a hobbit-hole, and that means comfort.
                                </p>
                            </div>
                            <div className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/40 backdrop-blur-xl rounded-lg text-white/80 text-xs font-medium z-20">
                                Live Preview
                            </div>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-2">
                            <Section title="Text Size" icon={Type}>
                                <Slider
                                    label="Font Size"
                                    value={fontSize}
                                    onChange={setFontSize}
                                    min={14}
                                    max={28}
                                    displayValue={`${fontSize}px`}
                                />
                                <Slider
                                    label="Line Height"
                                    value={lineHeight}
                                    onChange={setLineHeight}
                                    min={1.4}
                                    max={2.2}
                                    step={0.05}
                                    displayValue={lineHeight.toFixed(2)}
                                />
                                <Slider
                                    label="Max Width"
                                    value={maxTextWidth}
                                    onChange={setMaxTextWidth}
                                    min={40}
                                    max={80}
                                    displayValue={`${maxTextWidth}ch`}
                                />
                            </Section>

                            <Section title="Font Family" icon={Type}>
                                <div className="grid grid-cols-2 gap-2">
                                    {FONT_PAIRINGS.map((font) => (
                                        <button
                                            key={font.id}
                                            onClick={() => setFontPairing(font.id)}
                                            className={`group relative p-4 rounded-xl border text-left transition-all duration-300 hover:scale-[1.02] ${fontPairing === font.id
                                                    ? "border-light-accent dark:border-dark-accent bg-light-accent/5 dark:bg-dark-accent/5 shadow-md"
                                                    : "border-black/[0.05] dark:border-white/[0.05] hover:border-light-accent/30 dark:hover:border-dark-accent/30"
                                                }`}
                                        >
                                            <span
                                                className="text-lg font-medium text-light-text dark:text-dark-text block mb-1"
                                                style={{ fontFamily: font.family }}
                                            >
                                                {font.label}
                                            </span>
                                            <span className="text-xs text-light-text-muted dark:text-dark-text-muted">{font.style}</span>
                                            {fontPairing === font.id && (
                                                <div className="absolute top-2 right-2 w-4 h-4 bg-light-accent dark:bg-dark-accent rounded-full flex items-center justify-center">
                                                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </Section>
                        </div>

                        <Section title="Text Alignment" icon={AlignJustify}>
                            <div className="flex gap-3">
                                {[
                                    { id: "left", icon: AlignLeft, label: "Left" },
                                    { id: "justify", icon: AlignJustify, label: "Justify" },
                                    { id: "center", icon: AlignCenter, label: "Center" },
                                ].map(({ id, icon: Icon, label }) => (
                                    <button
                                        key={id}
                                        onClick={() => setTextAlignment(id as "left" | "justify" | "center")}
                                        className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.02] ${textAlignment === id
                                                ? "border-light-accent dark:border-dark-accent bg-light-accent/5 dark:bg-dark-accent/5 shadow-lg"
                                                : "border-black/[0.05] dark:border-white/[0.05] hover:border-light-accent/30 dark:hover:border-dark-accent/30"
                                            }`}
                                    >
                                        <Icon className={`w-6 h-6 ${textAlignment === id ? "text-light-accent dark:text-dark-accent" : "text-light-text-muted dark:text-dark-text-muted"}`} strokeWidth={1.5} />
                                        <span className="text-xs font-medium text-light-text dark:text-dark-text">{label}</span>
                                    </button>
                                ))}
                            </div>
                        </Section>
                    </>
                )}

                {activeTab === "layout" && (
                    <div className="grid gap-6 lg:grid-cols-2">
                        <Section title="Spacing" icon={Move}>
                            <Slider
                                label="Page Margin"
                                value={pageMargin}
                                onChange={setPageMargin}
                                min={16}
                                max={64}
                                displayValue={`${pageMargin}px`}
                            />
                            <Slider
                                label="Paragraph Spacing"
                                value={paragraphSpacing}
                                onChange={setParagraphSpacing}
                                min={8}
                                max={32}
                                displayValue={`${paragraphSpacing}px`}
                            />
                        </Section>

                        <Section title="Typography Enhancement" icon={Type}>
                            <Toggle checked={dropCaps} onChange={setDropCaps} label="Drop Caps" sublabel="Enlarged first letter at chapter starts" />
                            <Toggle checked={hyphenation} onChange={setHyphenation} label="Hyphenation" sublabel="Automatic word breaking for justified text" />
                        </Section>
                    </div>
                )}

                {activeTab === "reading" && (
                    <>
                        <Section title="Reading Mode" icon={Eye}>
                            <Toggle checked={immersiveMode} onChange={setImmersiveMode} label="Immersive Mode" sublabel="Hide navigation for distraction-free reading" />
                            <Toggle checked={continuousMode} onChange={setContinuousMode} label="Continuous Scrolling" sublabel="Scroll instead of page-by-page navigation" />
                        </Section>

                        <div className="pt-2">
                            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-light-accent dark:text-dark-accent" strokeWidth={1.5} />
                                Quick Presets
                            </h3>
                            <div className="grid gap-4 sm:grid-cols-3">
                                <PresetCard
                                    icon={Coffee}
                                    label="Comfort"
                                    description="Warm, relaxed settings perfect for casual reading sessions"
                                    onClick={() => applyPreset("comfort")}
                                    gradient="bg-gradient-to-br from-amber-500/10 to-orange-500/5"
                                />
                                <PresetCard
                                    icon={Zap}
                                    label="Focus"
                                    description="Clean, spacious layout designed for deep concentration"
                                    onClick={() => applyPreset("focus")}
                                    gradient="bg-gradient-to-br from-blue-500/10 to-indigo-500/5"
                                />
                                <PresetCard
                                    icon={Moon}
                                    label="Night"
                                    description="Dark theme optimized for comfortable low-light reading"
                                    onClick={() => applyPreset("night")}
                                    gradient="bg-gradient-to-br from-violet-500/10 to-purple-500/5"
                                />
                            </div>
                        </div>
                    </>
                )}

                {activeTab === "colors" && (
                    <>
                        <div className="pt-2">
                            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4 flex items-center gap-2">
                                <Palette className="w-5 h-5 text-light-accent dark:text-dark-accent" strokeWidth={1.5} />
                                Color Themes
                            </h3>
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                                {COLOR_PRESETS.map((preset) => (
                                    <ColorSwatch
                                        key={preset.id}
                                        preset={preset}
                                        isActive={preset.bg === readerBackground}
                                        onClick={() => {
                                            setReaderForeground(preset.fg);
                                            setReaderBackground(preset.bg);
                                            setReaderAccent(preset.accent);
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        <Section title="Custom Colors" icon={Droplets}>
                            <div className="grid gap-4 sm:grid-cols-3">
                                {[
                                    { label: "Text", value: readerForeground, onChange: setReaderForeground },
                                    { label: "Background", value: readerBackground, onChange: setReaderBackground },
                                    { label: "Accent", value: readerAccent, onChange: setReaderAccent },
                                ].map(({ label, value, onChange }) => (
                                    <label key={label} className="group relative flex items-center gap-3 p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-all cursor-pointer">
                                        <input
                                            type="color"
                                            value={value}
                                            onChange={(e) => onChange(e.target.value)}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                        <div
                                            className="w-10 h-10 rounded-xl border-2 border-black/10 dark:border-white/10 shadow-inner transition-transform group-hover:scale-110"
                                            style={{ backgroundColor: value }}
                                        />
                                        <div>
                                            <p className="text-sm font-medium text-light-text dark:text-dark-text">{label}</p>
                                            <p className="text-xs text-light-text-muted dark:text-dark-text-muted font-mono uppercase">{value}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </Section>
                    </>
                )}

                {activeTab === "shortcuts" && (
                    <>
                        <Section title="Keyboard Shortcuts" icon={Zap}>
                            <div className="space-y-4">
                                <div className="text-sm text-light-text-muted dark:text-dark-text-muted mb-4">
                                    Customize keyboard shortcuts for reading navigation.
                                </div>
                                <div className="space-y-3">
                                    <ShortcutItem
                                        label="Next Page"
                                        keys={keybinds.nextPage}
                                        onChange={(keys) => setKeybinds({ ...keybinds, nextPage: keys })}
                                    />
                                    <ShortcutItem
                                        label="Previous Page"
                                        keys={keybinds.prevPage}
                                        onChange={(keys) => setKeybinds({ ...keybinds, prevPage: keys })}
                                    />
                                    <ShortcutItem
                                        label="Toggle Bookmark"
                                        keys={keybinds.toggleBookmark}
                                        onChange={(keys) => setKeybinds({ ...keybinds, toggleBookmark: keys })}
                                    />
                                    <ShortcutItem
                                        label="Toggle Fullscreen"
                                        keys={keybinds.toggleFullscreen}
                                        onChange={(keys) => setKeybinds({ ...keybinds, toggleFullscreen: keys })}
                                    />
                                    <ShortcutItem
                                        label="Toggle UI"
                                        keys={keybinds.toggleUI}
                                        onChange={(keys) => setKeybinds({ ...keybinds, toggleUI: keys })}
                                    />
                                    <ShortcutItem
                                        label="Close/Exit"
                                        keys={keybinds.close}
                                        onChange={(keys) => setKeybinds({ ...keybinds, close: keys })}
                                    />
                                </div>
                            </div>
                        </Section>
                    </>
                )}

                {activeTab === "goals" && (
                    <>
                        <Section title="Reading Goals" icon={ChartLine}>
                            <Slider
                                label="Daily Goal"
                                value={dailyGoal}
                                onChange={setDailyGoal}
                                min={5}
                                max={120}
                                step={5}
                                displayValue={`${dailyGoal} pages`}
                            />
                            <Slider
                                label="Weekly Goal"
                                value={weeklyGoal}
                                onChange={setWeeklyGoal}
                                min={20}
                                max={500}
                                step={10}
                                displayValue={`${weeklyGoal} pages`}
                            />
                        </Section>

                        <div className="grid gap-6 lg:grid-cols-2">
                            <Section title="Tracking" icon={Bell}>
                                <Toggle checked={trackingEnabled} onChange={setTrackingEnabled} label="Reading Analytics" sublabel="Track your reading time and progress" />
                                <Toggle checked={showStreakReminder} onChange={setShowStreakReminder} label="Streak Reminders" sublabel="Get notified to maintain your streak" />
                            </Section>

                            <Section title="Accessibility" icon={Accessibility}>
                                <Toggle checked={reduceMotion} onChange={setReduceMotion} label="Reduce Motion" sublabel="Minimize animations throughout the app" />
                                <Toggle checked={screenReaderMode} onChange={setScreenReaderMode} label="Screen Reader" sublabel="Optimize for assistive technologies" />
                            </Section>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default SettingsView;
