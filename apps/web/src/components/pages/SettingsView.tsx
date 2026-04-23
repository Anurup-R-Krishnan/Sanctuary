import React, { useState } from "react";
import {
    Palette,
    Target,
    RotateCcw,
    Moon,
    Sun,
    Zap,
    Coffee,
    WandSparkles,
    Bell,
    ChartLine,
    Droplets,
} from "lucide-react";
import { useSettingsShallow } from "@/store/useSettingsStore";

// Extracted Components
import { ShortcutItem } from "@/components/settings/ShortcutItem";
import { Toggle } from "@/components/settings/Toggle";
import { Slider } from "@/components/settings/Slider";
import { Section } from "@/components/settings/Section";
import { ColorSwatch } from "@/components/settings/ColorSwatch";

type Tab = "colors" | "shortcuts" | "goals";

const COLOR_PRESETS = [
    { id: "light", label: "Paper", fg: "#1a1a1a", bg: "#ffffff", accent: "#8B7355", icon: Sun },
    { id: "cream", label: "Ivory", fg: "#2B2B2B", bg: "#FBF8F3", accent: "#8B7355", icon: Coffee },
    { id: "sepia", label: "Sepia", fg: "#5C4B37", bg: "#F4ECD8", accent: "#8B7355", icon: Droplets },
    { id: "dark", label: "Ink", fg: "#e8e6e3", bg: "#1a1a1a", accent: "#d4b58b", icon: Moon },
    { id: "midnight", label: "Midnight", fg: "#c9d1d9", bg: "#0d1117", accent: "#79c0ff", icon: Moon },
] as const;

function SettingsView() {
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

    return (
        <div className="page-narrow page-stack">
            {/* Hero Header */}
            <div className="rounded-3xl p-8 border border-black/[0.05] dark:border-white/[0.06] bg-light-surface/70 dark:bg-dark-surface/70">
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 rounded-xl bg-light-accent dark:bg-dark-accent">
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
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default SettingsView;
