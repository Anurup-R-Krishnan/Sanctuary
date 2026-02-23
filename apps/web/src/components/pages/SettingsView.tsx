import React, { useState } from "react";
import {
    Palette,
    Target,
    RotateCcw,
    Moon,
    Sun,
    Zap,
    Coffee,
    Check,
    WandSparkles,
    Bell,
    ChartLine,
    Droplets,
} from "lucide-react";
import { useSettingsShallow } from "@/context/SettingsContext";

const ShortcutItem = ({ label, keys, onChange }: { label: string; keys: string[]; onChange: (keys: string[]) => void }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempKeys, setTempKeys] = useState<string[]>([]);

    const startEditing = () => {
        setTempKeys([...keys]);
        setIsEditing(true);
    };

    const cancelEditing = () => {
        setIsEditing(false);
        setTempKeys([]);
    };

    const saveEditing = () => {
        onChange(tempKeys);
        setIsEditing(false);
        setTempKeys([]);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        e.preventDefault();
        const key = e.key;
        if (key === "Escape") {
            cancelEditing();
        } else if (key === "Enter") {
            saveEditing();
        } else if (key === "Backspace") {
            if (tempKeys.length > 0) {
                setTempKeys(tempKeys.slice(0, -1));
            } else {
                onChange([]);
                cancelEditing();
            }
        } else if (!tempKeys.includes(key)) {
            setTempKeys([...tempKeys, key]);
        }
    };

    const removeKey = (keyToRemove: string) => {
        const newKeys = keys.filter(k => k !== keyToRemove);
        onChange(newKeys);
    };

    return (
        <div className="flex items-center justify-between p-4 bg-[#fdfaf5] border-2 border-[#2c1e16] shadow-[4px_4px_0px_rgba(44,30,22,1)] rotate-[0.5deg]">
            <span className="text-sm font-bold uppercase tracking-widest text-[#6a5a4e]">{label}</span>
            <div className="flex items-center gap-2">
                {isEditing ? (
                    <input
                        type="text"
                        readOnly
                        aria-label={`${label} shortcut editor`}
                        className="px-3 py-1 text-xs font-bold uppercase bg-white border-2 border-[#2c1e16] focus:outline-none focus:ring-2 focus:ring-[#b85e42] cursor-text min-w-[120px] text-center"
                        onKeyDown={handleKeyDown}
                        value={tempKeys.length === 0 ? "Press keys..." : tempKeys.join(" + ")}
                    />
                ) : (
                    <div className="flex items-center gap-1.5">
                        {keys.map((key, index) => (
                            <span key={index} className="relative group">
                                <kbd className="px-2 py-1 text-xs bg-[#e6d5b8] border-2 border-[#2c1e16] font-mono shadow-[2px_2px_0px_#2c1e16]">
                                    {key === " " ? "Space" : key}
                                </kbd>
                                <button
                                    onClick={() => removeKey(key)}
                                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 border border-[#2c1e16] text-[#faf6f0] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                        <button
                            onClick={startEditing}
                            className="px-2 py-1 text-xs bg-[#b85e42] border-2 border-[#2c1e16] shadow-[2px_2px_0px_#2c1e16] text-[#faf6f0] hover:-translate-y-px hover:shadow-[3px_3px_0px_#2c1e16] active:translate-y-[2px] active:shadow-none transition-all"
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

const COLOR_PRESETS = [
    { id: "light", label: "Paper", fg: "#1a1a1a", bg: "#ffffff", accent: "#8B7355", icon: Sun },
    { id: "cream", label: "Ivory", fg: "#2B2B2B", bg: "#FBF8F3", accent: "#8B7355", icon: Coffee },
    { id: "sepia", label: "Sepia", fg: "#5C4B37", bg: "#F4ECD8", accent: "#8B7355", icon: Droplets },
    { id: "dark", label: "Ink", fg: "#e8e6e3", bg: "#1a1a1a", accent: "#d4b58b", icon: Moon },
    { id: "midnight", label: "Midnight", fg: "#c9d1d9", bg: "#0d1117", accent: "#79c0ff", icon: Moon },
];

const SettingsView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>("colors");
    const {
        readerForeground, setReaderForeground,
        readerBackground, setReaderBackground,
        readerAccent, setReaderAccent,
        keybinds, setKeybinds,
        dailyGoal, setDailyGoal,
        weeklyGoal, setWeeklyGoal,
        showStreakReminder, setShowStreakReminder,
        trackingEnabled, setTrackingEnabled,
        showFloatingCapsule, setShowFloatingCapsule,
        resetToDefaults,
    } = useSettingsShallow((state) => ({
        readerForeground: state.readerForeground,
        setReaderForeground: state.setReaderForeground,
        readerBackground: state.readerBackground,
        setReaderBackground: state.setReaderBackground,
        readerAccent: state.readerAccent,
        setReaderAccent: state.setReaderAccent,
        keybinds: state.keybinds,
        setKeybinds: state.setKeybinds,
        dailyGoal: state.dailyGoal,
        setDailyGoal: state.setDailyGoal,
        weeklyGoal: state.weeklyGoal,
        setWeeklyGoal: state.setWeeklyGoal,
        showStreakReminder: state.showStreakReminder,
        setShowStreakReminder: state.setShowStreakReminder,
        trackingEnabled: state.trackingEnabled,
        setTrackingEnabled: state.setTrackingEnabled,
        showFloatingCapsule: state.showFloatingCapsule,
        setShowFloatingCapsule: state.setShowFloatingCapsule,
        resetToDefaults: state.resetToDefaults,
    }));

    const tabs = [
        { id: "colors" as Tab, label: "Colors", icon: Palette, description: "Theme" },
        { id: "shortcuts" as Tab, label: "Shortcuts", icon: Zap, description: "Keybinds" },
        { id: "goals" as Tab, label: "Goals", icon: Target, description: "Tracking" },
    ];

    // Premium Toggle Component
    const Toggle = ({ checked, onChange, label, sublabel }: { checked: boolean; onChange: (v: boolean) => void; label: string; sublabel?: string }) => (
        <button
            type="button"
            className="group w-full text-left flex items-center justify-between p-4 bg-[#fdfaf5] border-2 border-[#2c1e16] shadow-[4px_4px_0px_rgba(44,30,22,1)] hover:-translate-y-px hover:shadow-[5px_5px_0px_rgba(44,30,22,1)] transition-all duration-200 cursor-pointer rotate-[-0.5deg]"
            onClick={() => onChange(!checked)}
        >
            <div className="flex-1 min-w-0">
                <span className="text-sm font-bold uppercase tracking-widest text-[#2c1e16] block">{label}</span>
                {sublabel && <span className="text-[10px] text-[#6a5a4e]/70 mt-1 uppercase font-bold tracking-wider block">{sublabel}</span>}
            </div>
            <div className={`relative w-14 h-8 border-2 border-[#2c1e16] transition-all duration-300 ease-out ${checked
                ? "bg-[#6ad46a]"
                : "bg-[#e6d5b8]"
                }`}>
                <div className={`absolute top-0 w-7 h-7 bg-white border-r-2 border-[#2c1e16] transition-all duration-500 ease-out ${checked ? "left-6" : "left-0"
                    }`}>
                    {checked && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Check className="w-4 h-4 text-[#2c1e16]" strokeWidth={3} />
                        </div>
                    )}
                </div>
            </div>
        </button>
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
            <div className="group p-5 bg-[#fdfaf5] border-2 border-[#2c1e16] shadow-[4px_4px_0px_rgba(44,30,22,1)] rotate-1">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {Icon && (
                            <div className="p-2 border-2 border-[#2c1e16] bg-[#e6d5b8] shadow-[2px_2px_0px_rgba(44,30,22,1)] -rotate-3">
                                <Icon className="w-4 h-4 text-[#b85e42]" strokeWidth={2.5} />
                            </div>
                        )}
                        <span className="text-sm font-bold uppercase tracking-widest text-[#2c1e16]">{label}</span>
                    </div>
                    <div className="px-3 py-1 border-2 border-[#2c1e16] bg-[#6a5a4e]/10 shadow-[2px_2px_0px_rgba(44,30,22,1)] rotate-2">
                        <span className="text-xs font-black uppercase tracking-widest text-[#b85e42] tabular-nums">
                            {displayValue || value}
                        </span>
                    </div>
                </div>
                <div className="relative mt-2">
                    <div className="h-3 border-2 border-[#2c1e16] bg-white">
                        <div
                            className="h-full bg-[#b85e42] transition-all duration-300"
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
                        className="absolute top-1/2 -translate-y-1/2 w-6 h-6 border-[3px] border-[#2c1e16] bg-[#faf6f0] shadow-[2px_2px_0px_#2c1e16] pointer-events-none transition-all duration-200"
                        style={{ left: `calc(${percentage}% - 12px)` }}
                    />
                </div>
            </div>
        );
    };

    // Premium Section Component
    const Section = ({ title, icon: Icon, children }: { title: string; icon?: React.ElementType; children: React.ReactNode }) => (
        <div className="bg-[#faf6f0] border-[3px] border-[#2c1e16] shadow-[8px_8px_0px_rgba(44,30,22,1)] relative p-6 mt-8">
            <div className="absolute -top-3 -left-3 w-14 h-4 bg-[#e6d5b8] border border-[#2c1e16]/20 rotate-[-12deg] shadow-sm z-10 mix-blend-multiply" />
            <div className="flex items-center gap-4 mb-6 border-b-[3px] border-[#2c1e16] pb-4 border-dashed">
                {Icon && (
                    <div className="p-2 border-2 border-[#2c1e16] bg-[#e6d5b8] shadow-[2px_2px_0px_rgba(44,30,22,1)] -rotate-3">
                        <Icon className="w-5 h-5 text-[#b85e42]" strokeWidth={2.5} />
                    </div>
                )}
                <h3 className="text-xl font-black uppercase tracking-widest text-[#2c1e16]">{title}</h3>
            </div>
            <div className="space-y-4">{children}</div>
        </div>
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
                className={`group relative flex flex-col items-center p-3 bg-[#fdfaf5] border-[3px] border-[#2c1e16] shadow-[4px_4px_0px_rgba(44,30,22,1)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[6px_6px_0px_rgba(44,30,22,1)] ${isActive
                    ? "bg-[#e8bc9e]/40 border-[#b85e42] shadow-[4px_4px_0px_#2c1e16] scale-105"
                    : ""
                    }`}
            >
                {/* Color preview */}
                <div
                    className="w-full aspect-square mb-3 flex items-center justify-center border-2 border-[#2c1e16]"
                    style={{ backgroundColor: preset.bg }}
                >
                    <span className="text-3xl font-serif font-black" style={{ color: preset.fg }}>Aa</span>
                </div>

                {/* Label */}
                <div className="flex flex-col items-center gap-1 w-full border-t-2 border-[#2c1e16] border-dashed pt-2">
                    <Icon className="w-4 h-4 text-[#6a5a4e]" strokeWidth={2} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#2c1e16]">{preset.label}</span>
                </div>

                {/* Active indicator */}
                {isActive && (
                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-green-400 border-[3px] border-[#2c1e16] rounded-full flex items-center justify-center shadow-[2px_2px_0px_#2c1e16] rotate-[15deg]">
                        <Check className="w-4 h-4 text-[#2c1e16]" strokeWidth={4} />
                    </div>
                )}
            </button>
        );
    };

    return (
        <div className="page-narrow page-stack">
            {/* Hero Header */}
            <div className="mt-8 relative mb-8">
                <div className="absolute -left-4 -top-4 w-12 h-4 bg-[#e6d5b8] border border-[#2c1e16]/20 rotate-[-10deg] shadow-sm z-10 mix-blend-multiply" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-4xl font-black font-serif text-[#2c1e16] tracking-tight">Settings</h2>
                        <p className="text-[#6a5a4e] mt-1 text-sm font-bold uppercase tracking-widest max-w-sm">
                            Tailor your reading desk
                        </p>
                    </div>

                    <button
                        onClick={resetToDefaults}
                        className="group flex items-center gap-2.5 px-6 py-3 bg-[#e6d5b8] border-[3px] border-[#2c1e16] text-[#2c1e16] font-black uppercase tracking-widest text-xs transition-all duration-200 shadow-[4px_4px_0px_rgba(44,30,22,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_rgba(44,30,22,1)] active:translate-y-px active:shadow-[2px_2px_0px_rgba(44,30,22,1)] -rotate-1"
                    >
                        <RotateCcw className="w-4 h-4 transition-transform duration-500 group-hover:-rotate-180" strokeWidth={2.5} />
                        <span>Factory Reset</span>
                    </button>
                </div>
            </div>

            {/* Premium Tab Navigation */}
            <div className="relative flex flex-wrap gap-2 p-3 bg-[#e6d5b8]/30 border-2 border-[#2c1e16]/20 border-dashed mb-8">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative flex-1 sm:flex-none flex items-center justify-center gap-3 py-3 px-6 border-[3px] border-[#2c1e16] font-bold uppercase tracking-wider text-xs transition-all duration-200 ${isActive
                                    ? "bg-[#faf6f0] text-[#2c1e16] shadow-[4px_4px_0px_rgba(44,30,22,1)] -translate-y-1 rotate-1 scale-105"
                                    : "bg-[#e6d5b8] text-[#6a5a4e] shadow-none opacity-80 hover:bg-[#faf6f0] hover:opacity-100"
                                }`}
                        >
                            <tab.icon className="w-4 h-4" strokeWidth={isActive ? 2.5 : 2} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Global Interface Toggles */}
            <div className="mt-4">
                <Toggle
                    checked={showFloatingCapsule}
                    onChange={setShowFloatingCapsule}
                    label="Floating Capsule (bottom-right)"
                    sublabel="Show page/time capsule in reader"
                />
            </div>

            {/* Tab Content */}
            <div className="space-y-6 animate-fadeIn" key={activeTab}>
                {activeTab === "colors" && (
                    <div className="space-y-10">
                        <Section title="Theme Palette" icon={Palette}>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
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
                        </Section>

                        <Section title="Custom Variables" icon={Droplets}>
                            <div className="grid gap-6 sm:grid-cols-3">
                                {[
                                    { label: "Text Ink", value: readerForeground, onChange: setReaderForeground },
                                    { label: "Paper Color", value: readerBackground, onChange: setReaderBackground },
                                    { label: "Accent Tone", value: readerAccent, onChange: setReaderAccent },
                                ].map(({ label, value, onChange }) => (
                                    <label key={label} className="group relative flex flex-col gap-3 p-5 bg-[#faf6f0] border-[3px] border-[#2c1e16] shadow-[4px_4px_0px_#2c1e16] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#2c1e16] transition-all cursor-pointer">
                                        <input
                                            type="color"
                                            value={value}
                                            onChange={(e) => onChange(e.target.value)}
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                        />
                                        <div
                                            className="w-full h-16 border-2 border-[#2c1e16] shadow-[inset_2px_2px_0px_rgba(0,0,0,0.2)]"
                                            style={{ backgroundColor: value }}
                                        />
                                        <div className="flex justify-between items-end border-t-2 border-[#2c1e16] border-dashed pt-2">
                                            <p className="text-xs font-black uppercase tracking-widest text-[#2c1e16]">{label}</p>
                                            <p className="text-[10px] font-bold text-[#b85e42] font-mono uppercase">{value}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </Section>
                    </div>
                )}

                {activeTab === "shortcuts" && (
                    <div className="space-y-10">
                        <Section title="Keybinds Map" icon={Zap}>
                            <div className="space-y-4">
                                <div className="text-xs font-bold uppercase tracking-widest text-[#6a5a4e] mb-6 p-3 bg-[#e6d5b8]/30 border-l-4 border-[#b85e42]">
                                    Click + to edit shortcuts, backspace to remove.
                                </div>
                                <div className="space-y-4">
                                    <ShortcutItem
                                        label="Turn Page Forward"
                                        keys={keybinds.nextPage}
                                        onChange={(keys) => setKeybinds({ ...keybinds, nextPage: keys })}
                                    />
                                    <ShortcutItem
                                        label="Turn Page Backward"
                                        keys={keybinds.prevPage}
                                        onChange={(keys) => setKeybinds({ ...keybinds, prevPage: keys })}
                                    />
                                    <ShortcutItem
                                        label="Toggle Bookmark Tape"
                                        keys={keybinds.toggleBookmark}
                                        onChange={(keys) => setKeybinds({ ...keybinds, toggleBookmark: keys })}
                                    />
                                    <ShortcutItem
                                        label="Immersive Fullscreen"
                                        keys={keybinds.toggleFullscreen}
                                        onChange={(keys) => setKeybinds({ ...keybinds, toggleFullscreen: keys })}
                                    />
                                    <ShortcutItem
                                        label="Show/Hide Overlays"
                                        keys={keybinds.toggleUI}
                                        onChange={(keys) => setKeybinds({ ...keybinds, toggleUI: keys })}
                                    />
                                    <ShortcutItem
                                        label="Close Book"
                                        keys={keybinds.close}
                                        onChange={(keys) => setKeybinds({ ...keybinds, close: keys })}
                                    />
                                </div>
                            </div>
                        </Section>
                    </div>
                )}

                {activeTab === "goals" && (
                    <div className="space-y-10">
                        <Section title="Reading Milestones" icon={ChartLine}>
                            <Slider
                                label="Daily Target"
                                value={dailyGoal}
                                onChange={setDailyGoal}
                                min={5}
                                max={120}
                                step={5}
                                displayValue={`${dailyGoal} pg`}
                                icon={Coffee}
                            />
                            <Slider
                                label="Weekly Target"
                                value={weeklyGoal}
                                onChange={setWeeklyGoal}
                                min={20}
                                max={500}
                                step={10}
                                displayValue={`${weeklyGoal} pg`}
                                icon={Target}
                            />
                        </Section>

                        <div className="grid gap-8 lg:grid-cols-2">
                            <Section title="Tracking Preferences" icon={Bell}>
                                <Toggle checked={trackingEnabled} onChange={setTrackingEnabled} label="Enable Analytics" sublabel="Log reading speed and progress history" />
                                <Toggle checked={showStreakReminder} onChange={setShowStreakReminder} label="Streak Pushes" sublabel="Daily nudges to keep chain alive" />
                            </Section>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default SettingsView;
