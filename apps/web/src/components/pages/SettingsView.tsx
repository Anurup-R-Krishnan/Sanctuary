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
    Type,
    CircleDashed,
    HardDrive,
    Trash2,
    AlertTriangle
} from "lucide-react";
import React, { useState } from "react";

import { ColorSwatch } from "@/components/settings/ColorSwatch";
import { Section } from "@/components/settings/Section";
import { ShortcutItem } from "@/components/settings/ShortcutItem";
import { Slider } from "@/components/settings/Slider";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Toggle } from "@/components/ui/Toggle";
import { useSettingsShallow } from "@/store/useSettingsStore";
import { clearBooks } from "@/utils/db";

type Tab = "colors" | "typography" | "shortcuts" | "goals" | "data";
type ShortcutKey = "nextPage" | "prevPage" | "toggleBookmark" | "toggleFullscreen" | "toggleUI" | "close";

const COLOR_PRESETS = [
    { id: "light", label: "Paper", fg: "#1a1a1a", bg: "#ffffff", accent: "#8B7355", icon: Sun },
    { id: "cream", label: "Ivory", fg: "#2B2B2B", bg: "#FBF8F3", accent: "#8B7355", icon: Coffee },
    { id: "sepia", label: "Sepia", fg: "#5C4B37", bg: "#F4ECD8", accent: "#8B7355", icon: Droplets },
    { id: "dark", label: "Ink", fg: "#e8e6e3", bg: "#1a1a1a", accent: "#d4b58b", icon: Moon },
    { id: "midnight", label: "Midnight", fg: "#c9d1d9", bg: "#0d1117", accent: "#79c0ff", icon: Moon },
] as const;

const TABS = [
    { id: "colors" as Tab, label: "Colors", icon: Palette, description: "Theme" },
    { id: "typography" as Tab, label: "Type", icon: Type, description: "Layout" },
    { id: "shortcuts" as Tab, label: "Shortcuts", icon: Zap, description: "Keybinds" },
    { id: "goals" as Tab, label: "Goals", icon: Target, description: "Tracking" },
    { id: "data" as Tab, label: "Data", icon: HardDrive, description: "Storage" },
] as const;

const SHORTCUTS: Array<{ key: ShortcutKey; label: string }> = [
    { key: "nextPage", label: "Next Page" },
    { key: "prevPage", label: "Previous Page" },
    { key: "toggleBookmark", label: "Toggle Bookmark" },
    { key: "toggleFullscreen", label: "Toggle Fullscreen" },
    { key: "toggleUI", label: "Toggle UI" },
    { key: "close", label: "Close/Exit" },
];

const TYPOGRAPHY_SLIDERS = [
    { key: "fontSize", label: "Font Size", min: 12, max: 32, step: 1 },
    { key: "lineHeight", label: "Line Height", min: 1.1, max: 2.2, step: 0.05 },
    { key: "maxTextWidth", label: "Max Text Width", min: 40, max: 200, step: 5 },
] as const;

function SettingsView() {
    const [activeTab, setActiveTab] = useState<Tab>("colors");
    const [isResetting, setIsResetting] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const {
        readerForeground, setReaderForeground,
        readerBackground, setReaderBackground,
        readerAccent, setReaderAccent,
        fontSize, setFontSize,
        lineHeight, setLineHeight,
        maxTextWidth, setMaxTextWidth,
        reduceMotion, setReduceMotion,
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
        fontSize: state.fontSize,
        setFontSize: state.setFontSize,
        lineHeight: state.lineHeight,
        setLineHeight: state.setLineHeight,
        maxTextWidth: state.maxTextWidth,
        setMaxTextWidth: state.setMaxTextWidth,
        reduceMotion: state.reduceMotion,
        setReduceMotion: state.setReduceMotion,
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

    const typographyValues = {
        fontSize: { value: fontSize, onChange: setFontSize, displayValue: `${fontSize}px` },
        lineHeight: { value: lineHeight, onChange: setLineHeight, displayValue: lineHeight.toFixed(2) },
        maxTextWidth: { value: maxTextWidth, onChange: setMaxTextWidth, displayValue: `${maxTextWidth}ch` },
    };

    const handleFactoryResetClick = () => {
        setShowResetConfirm(true);
    };

    const executeFactoryReset = async () => {
        setShowResetConfirm(false);
        setIsResetting(true);
        try {
            localStorage.clear();
            sessionStorage.clear();
            await clearBooks();
            if (navigator.serviceWorker) {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (const r of regs) await r.unregister();
            }
            window.location.reload();
        } catch (e) {
            console.error(e);
            setIsResetting(false);
        }
    };

    return (
        <div className="page-narrow page-stack">
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

                    <Button
                        onClick={resetToDefaults}
                        variant="secondary"
                        className="gap-2.5 px-5 py-3 group shadow-sm hover:shadow-md"
                    >
                        <RotateCcw className="w-4 h-4 transition-transform duration-500 group-hover:-rotate-180" strokeWidth={1.75} />
                        <span className="text-sm font-medium">Reset All</span>
                    </Button>
                </div>
            </div>

            <div className="relative p-1.5 bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl">
                <div className="flex gap-1">
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <Button
                                key={tab.id}
                                variant="nav"
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative flex-1 flex flex-col items-center gap-1 py-3 px-2 !rounded-xl transition-all duration-300 ${isActive
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
                            </Button>
                        );
                    })}
                </div>
            </div>

            <div className="mt-4 grid sm:grid-cols-2 gap-4">
                <Toggle
                    checked={showFloatingCapsule}
                    onChange={setShowFloatingCapsule}
                    label="Floating Capsule"
                    sublabel="Show page/time capsule"
                />
                <Toggle
                    checked={reduceMotion}
                    onChange={setReduceMotion}
                    label="Reduce Motion"
                    sublabel="Simplify animations"
                />
            </div>

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

                {activeTab === "typography" && (
                    <>
                        <Section title="Typography" icon={Type}>
                            {TYPOGRAPHY_SLIDERS.map((slider) => {
                                const control = typographyValues[slider.key];
                                return (
                                    <Slider
                                        key={slider.key}
                                        label={slider.label}
                                        value={control.value}
                                        onChange={control.onChange}
                                        min={slider.min}
                                        max={slider.max}
                                        step={slider.step}
                                        displayValue={control.displayValue}
                                    />
                                );
                            })}
                        </Section>

                        <Section title="Interface" icon={CircleDashed}>
                             <p className="text-sm text-light-text-muted dark:text-dark-text-muted mb-4">
                                These settings affect the overall interface responsiveness and accessibility.
                            </p>
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
                                    {SHORTCUTS.map((shortcut) => (
                                        <ShortcutItem
                                            key={shortcut.key}
                                            label={shortcut.label}
                                            keys={keybinds[shortcut.key]}
                                            onChange={(keys) => setKeybinds({ ...keybinds, [shortcut.key]: keys })}
                                        />
                                    ))}
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

                {activeTab === "data" && (
                    <>
                        <Section title="Data & Storage" icon={HardDrive}>
                            <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20">
                                <div className="flex items-center gap-3 mb-3 text-red-600 dark:text-red-400">
                                    <AlertTriangle className="w-5 h-5" />
                                    <h4 className="font-semibold">Danger Zone</h4>
                                </div>
                                <p className="text-sm text-red-600/80 dark:text-red-400/80 mb-5">
                                    This will permanently delete all locally cached books, reading progress, and settings from this browser. If you are offline, unsynced progress will be lost.
                                </p>
                                <Button
                                    onClick={handleFactoryResetClick}
                                    isLoading={isResetting}
                                    variant="destructive"
                                    className="gap-2 px-5 shadow-sm"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Factory Reset Cache
                                </Button>
                            </div>
                        </Section>
                    </>
                )}
            </div>

            <ConfirmDialog
                isOpen={showResetConfirm}
                onClose={() => setShowResetConfirm(false)}
                onConfirm={executeFactoryReset}
                title="Wipe Local Data"
                description="Are you sure you want to completely wipe all local data? This will remove cached books and progress. This action cannot be undone."
                confirmLabel="Factory Reset"
                isDestructive
            />
        </div>
    );
};

export default SettingsView;
