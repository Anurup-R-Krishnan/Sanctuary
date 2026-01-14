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
    WandSparkles,
    Eye,
    Accessibility,
    Bell,
    ChartLine,
    Droplets,
    Move,
    ChevronLeft,
    X,
} from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

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
        <div className="flex items-center justify-between p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-all">
            <span className="text-sm font-medium text-light-text dark:text-dark-text">{label}</span>
            <div className="flex items-center gap-2">
                {isEditing ? (
                    <div
                        className="px-3 py-1 text-xs bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent cursor-text min-w-[120px] text-center"
                        onKeyDown={handleKeyDown}
                        tabIndex={0}
                    >
                        {tempKeys.length === 0 ? "Press keys..." : tempKeys.join(" + ")}
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
                            onClick={startEditing}
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
    { id: "midnight", label: "Midnight", fg: "#c9d1d9", bg: "#0d1117", accent: "#79c0ff", icon: Moon },
];




interface SettingsViewProps {
    onBack?: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState<Tab>("colors");
    const settings = useSettings();
    const {
        readerForeground, setReaderForeground,
        readerBackground, setReaderBackground,
        readerAccent, setReaderAccent,
        keybinds, setKeybinds,
        dailyGoal, setDailyGoal,
        weeklyGoal, setWeeklyGoal,
        showStreakReminder, setShowStreakReminder,
        trackingEnabled, setTrackingEnabled,
        resetToDefaults,
        themeMode, setThemeMode,
        customThemes, addCustomTheme, removeCustomTheme,
        exportSettings, importSettings,
    } = settings;

    const tabs = [
        { id: "colors" as Tab, label: "Colors", icon: Palette, description: "Theme" },
        { id: "shortcuts" as Tab, label: "Shortcuts", icon: Zap, description: "Keybinds" },
        { id: "goals" as Tab, label: "Goals", icon: Target, description: "Tracking" },
    ];

    // Premium Toggle Component (Simplified)
    const Toggle = ({ checked, onChange, label, sublabel }: { checked: boolean; onChange: (v: boolean) => void; label: string; sublabel?: string }) => (
        <div className="group flex items-center justify-between p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors cursor-pointer border border-transparent hover:border-black/[0.05] dark:hover:border-white/[0.05]" onClick={() => onChange(!checked)}>
            <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-light-text dark:text-dark-text block">{label}</span>
                {sublabel && <span className="text-xs text-light-text-muted dark:text-dark-text-muted mt-0.5 block">{sublabel}</span>}
            </div>
            <div className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${checked
                ? "bg-light-accent dark:bg-dark-accent"
                : "bg-black/10 dark:bg-white/10"
                }`}>
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-200 ${checked ? "left-6" : "left-1"
                    }`} />
            </div>
        </div>
    );

    // Premium Slider Component (Simplified)
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
            <div className="group p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] transition-colors">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {Icon && (
                            <div className="p-2 rounded-xl bg-black/[0.05] dark:bg-white/[0.1]">
                                <Icon className="w-4 h-4 text-light-text dark:text-dark-text" strokeWidth={1.75} />
                            </div>
                        )}
                        <span className="text-sm font-medium text-light-text dark:text-dark-text">{label}</span>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-black/[0.05] dark:bg-white/[0.1]">
                        <span className="text-sm font-bold text-light-text dark:text-dark-text tabular-nums">
                            {displayValue || value}
                        </span>
                    </div>
                </div>
                <div className="relative h-6 flex items-center">
                    <div className="absolute inset-0 h-1.5 bg-black/[0.06] dark:bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                            className="h-full bg-light-accent dark:bg-dark-accent rounded-full"
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
                        className="absolute w-4 h-4 bg-white dark:bg-dark-surface rounded-full shadow border-2 border-light-accent dark:border-dark-accent pointer-events-none"
                        style={{ left: `calc(${percentage}% - 8px)` }}
                    />
                </div>
            </div>
        );
    };

    // Premium Section Component (Simplified)
    const Section = ({ title, icon: Icon, children }: { title: string; icon?: React.ElementType; children: React.ReactNode }) => (
        <div className="overflow-hidden rounded-3xl border border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-black/20">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-5">
                    {Icon && (
                        <div className="p-2 rounded-xl bg-black/[0.05] dark:bg-white/[0.1]">
                            <Icon className="w-5 h-5 text-light-text dark:text-dark-text" strokeWidth={1.75} />
                        </div>
                    )}
                    <h3 className="text-base font-semibold text-light-text dark:text-dark-text">{title}</h3>
                </div>
                <div className="space-y-3">{children}</div>
            </div>
        </div>
    );

    // Color Swatch (Simplified)
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
                className={`group flex flex-col items-center p-4 rounded-2xl border transition-all hover:bg-black/[0.02] dark:hover:bg-white/[0.02] ${isActive
                    ? "border-light-accent dark:border-dark-accent bg-light-accent/5 dark:bg-dark-accent/10"
                    : "border-black/[0.08] dark:border-white/[0.08]"
                    }`}
            >
                <div
                    className="w-12 h-12 rounded-xl mb-3 flex items-center justify-center border border-black/10 dark:border-white/10 shadow-sm"
                    style={{ backgroundColor: preset.bg }}
                >
                    <span className="text-xl font-serif font-bold" style={{ color: preset.fg }}>Aa</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-light-text dark:text-dark-text">{preset.label}</span>
                </div>
                {isActive && (
                    <div className="mt-2 w-1.5 h-1.5 rounded-full bg-light-accent dark:bg-dark-accent" />
                )}
            </button>
        );
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-16">
            {/* Simple Header */}
            <div className="flex items-center gap-4 py-4">
                <button
                    onClick={onBack}
                    className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-light-text dark:text-dark-text transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">Settings</h2>
                    <p className="text-light-text-muted dark:text-dark-text-muted text-sm">
                        Customize your reading preferences
                    </p>
                </div>
                <button
                    onClick={resetToDefaults}
                    className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-sm font-medium text-light-text dark:text-dark-text transition-colors"
                >
                    Reset Defaults
                </button>
            </div>


            {/* Tab Navigation */}
            <div className="flex gap-2 p-1 bg-black/[0.04] dark:bg-white/[0.04] rounded-xl overflow-x-auto">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-all text-sm font-medium whitespace-nowrap ${isActive
                                ? "bg-white dark:bg-black text-light-text dark:text-dark-text shadow-sm"
                                : "text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text"
                                }`}
                        >
                            <tab.icon className="w-4 h-4" strokeWidth={isActive ? 2 : 1.75} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="space-y-6 animate-fadeIn" key={activeTab}>
                {activeTab === "colors" && (
                    <>
                        <div className="space-y-6">
                            <Section title="Theme Mode" icon={Layout}>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { value: 'light', label: 'Light', icon: Sun },
                                        { value: 'dark', label: 'Dark', icon: Moon },
                                        { value: 'system', label: 'System', icon: Layout },
                                    ].map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => setThemeMode(option.value as any)}
                                            className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${themeMode === option.value
                                                ? "bg-black/[0.03] dark:bg-white/[0.1] border-black/20 dark:border-white/20 text-light-text dark:text-dark-text font-medium"
                                                : "bg-transparent border-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.03] text-light-text-muted dark:text-dark-text-muted"
                                                }`}
                                        >
                                            <option.icon className="w-5 h-5" />
                                            <span className="text-sm">{option.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </Section>

                            <Section title="Reader Colors" icon={Palette}>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

                                {/* Custom Themes List would go here - simplifying for brevity */}
                                {customThemes.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5">
                                        <p className="text-xs font-semibold uppercase text-light-text-muted dark:text-dark-text-muted mb-3">Custom</p>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {customThemes.map((theme) => (
                                                <button
                                                    key={theme.id}
                                                    onClick={() => {
                                                        setReaderForeground(theme.colors.fg);
                                                        setReaderBackground(theme.colors.bg);
                                                        setReaderAccent(theme.colors.accent);
                                                    }}
                                                    className="relative p-3 rounded-xl border border-black/10 dark:border-white/10 flex flex-col items-center gap-2"
                                                >
                                                    <div className="w-8 h-8 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: theme.colors.bg }} />
                                                    <span className="text-xs font-medium text-light-text dark:text-dark-text truncate max-w-full">{theme.name}</span>
                                                    <button onClick={(e) => { e.stopPropagation(); removeCustomTheme(theme.id) }} className="absolute top-1 right-1 p-1 text-light-text-muted hover:text-red-500">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </Section>

                            <Section title="Customizer" icon={Droplets}>
                                <div className="grid gap-4 sm:grid-cols-3">
                                    {[
                                        { label: "Text", value: readerForeground, onChange: setReaderForeground },
                                        { label: "Background", value: readerBackground, onChange: setReaderBackground },
                                        { label: "Accent", value: readerAccent, onChange: setReaderAccent },
                                    ].map(({ label, value, onChange }) => (
                                        <label key={label} className="flex items-center gap-3 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] cursor-pointer hover:bg-black/[0.04]">
                                            <input
                                                type="color"
                                                value={value}
                                                onChange={(e) => onChange(e.target.value)}
                                                className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                                            />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-light-text dark:text-dark-text">{label}</p>
                                                <p className="text-xs text-light-text-muted dark:text-dark-text-muted font-mono">{value}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <button
                                        onClick={() => {
                                            const name = prompt("Enter a name for this theme:");
                                            if (name) {
                                                addCustomTheme(name, { fg: readerForeground, bg: readerBackground, accent: readerAccent });
                                            }
                                        }}
                                        className="px-4 py-2 rounded-xl bg-light-text dark:bg-dark-text text-light-primary dark:text-dark-primary text-sm font-medium hover:opacity-90 transition-opacity"
                                    >
                                        Save Current as Preset
                                    </button>
                                </div>
                            </Section>
                        </div>
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
                            <Section title="Data & Backup" icon={Accessibility}>
                                <div className="space-y-4">
                                    <button
                                        onClick={exportSettings}
                                        className="w-full flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                    >
                                        <span className="text-sm font-medium text-light-text dark:text-dark-text">Export Settings</span>
                                        <span className="text-xs text-light-text-muted dark:text-dark-text-muted">JSON</span>
                                    </button>
                                    <label className="w-full flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer">
                                        <span className="text-sm font-medium text-light-text dark:text-dark-text">Import Settings</span>
                                        <input
                                            type="file"
                                            accept=".json"
                                            onChange={(e) => {
                                                if (e.target.files?.[0]) importSettings(e.target.files[0]);
                                            }}
                                            className="hidden"
                                        />
                                        <span className="text-xs text-light-text-muted dark:text-dark-text-muted">Select File</span>
                                    </label>
                                </div>
                            </Section>
                        </div>
                    </>
                )}
            </div>
        </div >
    );
};

export default SettingsView;
