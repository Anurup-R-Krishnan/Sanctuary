import React from "react";
import { useSettingsShallow } from "@/context/SettingsContext";
import { Folder, Volume2, Moon, Sun, Type, Monitor, Sparkles, Brain, Save } from "lucide-react";
import { Theme } from "@/types";
import { useUIStore } from "@/store/useUIStore";
import { motion } from "framer-motion";

const SettingsView: React.FC = () => {
    const {
        theme,
        toggleTheme
    } = useUIStore();

    const {
        fontSize,
        lineHeight,
        fontFamily,
        textAlign,
        reduceMotion,
        setFontSize,
        setLineHeight,
        setFontFamily,
        setTextAlign,
        setReduceMotion,
    } = useSettingsShallow((state) => ({
        fontSize: state.fontSize,
        lineHeight: state.lineHeight,
        fontFamily: state.fontFamily,
        textAlign: state.textAlign,
        reduceMotion: state.reduceMotion,
        setFontSize: state.setFontSize,
        setLineHeight: state.setLineHeight,
        setFontFamily: state.setFontFamily,
        setTextAlign: state.setTextAlign,
        setReduceMotion: state.setReduceMotion,
    }));

    // Mock state for new "Organizer" features
    const [cozyMode, setCozyMode] = React.useState(true);
    const [aiAssistant, setAiAssistant] = React.useState(false); // Default off/hidden

    const tabs = [
        { id: "general", label: "General", icon: Folder },
        { id: "reading", label: "Reading", icon: Type },
        { id: "advanced", label: "Advanced", icon: Brain },
    ];
    const [activeTab, setActiveTab] = React.useState("general");

    const TabButton = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-t-xl border-t-2 border-x-2 transition-all relative -mb-[2px] z-10
            ${activeTab === id
                    ? "bg-[rgb(var(--paper-cream))] border-[rgb(var(--ink-navy))] text-[rgb(var(--ink-navy))] font-bold"
                    : "bg-[rgb(var(--aged-paper))] border-transparent text-[rgb(var(--sepia-brown))] hover:bg-black/5"
                }`}
        >
            <Icon className="w-4 h-4" />
            <span className="font-pixel text-xs uppercase tracking-wider">{label}</span>
        </button>
    );

    return (
        <div className="page-stack max-w-3xl mx-auto pb-20">
            <h1 className="text-4xl font-serif font-bold text-[rgb(var(--ink-navy))] mb-8 text-center">Settings Organizer</h1>

            {/* Folder Tabs */}
            <div className="flex gap-2 border-b-2 border-[rgb(var(--ink-navy))] px-4">
                {tabs.map(tab => <TabButton key={tab.id} {...tab} />)}
            </div>

            {/* Folder Content Area */}
            <div className="bg-[rgb(var(--paper-cream))] border-x-2 border-b-2 border-[rgb(var(--ink-navy))] rounded-b-xl shadow-pixel p-8 min-h-[400px]">

                {activeTab === "general" && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-8"
                    >
                        {/* Theme Section */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-serif font-bold text-[rgb(var(--ink-navy))] flex items-center gap-2">
                                <Sun className="w-5 h-5" /> Appearance
                            </h2>
                            <div className="flex items-center justify-between p-4 rounded-xl border border-[rgb(var(--aged-paper))] bg-white">
                                <div>
                                    <h3 className="font-bold text-[rgb(var(--ink-navy))]">Lighting</h3>
                                    <p className="text-sm text-[rgb(var(--sepia-brown))]">Adjust for day or night reading</p>
                                </div>
                                <button
                                    onClick={toggleTheme}
                                    className="btn-cozy gap-2 shadow-pixel-sm active:translate-y-0.5 active:shadow-none transition-all"
                                >
                                    {theme === Theme.DARK ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                                    <span>{theme === Theme.DARK ? "Night Mode" : "Day Mode"}</span>
                                </button>
                            </div>
                        </section>

                        {/* Cozy Mode */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-serif font-bold text-[rgb(var(--ink-navy))] flex items-center gap-2">
                                <Sparkles className="w-5 h-5" /> Atmosphere
                            </h2>
                            <div className="flex items-center justify-between p-4 rounded-xl border border-[rgb(var(--aged-paper))] bg-white">
                                <div>
                                    <h3 className="font-bold text-[rgb(var(--ink-navy))]">Cozy Mode</h3>
                                    <p className="text-sm text-[rgb(var(--sepia-brown))]">Enable page turn sounds and gentle animations</p>
                                </div>
                                <button
                                    onClick={() => setCozyMode(!cozyMode)}
                                    className={`w-12 h-6 rounded-full p-1 transition-colors border-2 border-[rgb(var(--ink-navy))] ${cozyMode ? "bg-[rgb(var(--sage-green))]" : "bg-[rgb(var(--aged-paper))]"}`}
                                >
                                    <div className={`w-3.5 h-3.5 rounded-full bg-[rgb(var(--ink-navy))] transition-transform ${cozyMode ? "translate-x-6" : "translate-x-0"}`} />
                                </button>
                            </div>

                             <div className="flex items-center justify-between p-4 rounded-xl border border-[rgb(var(--aged-paper))] bg-white">
                                <div>
                                    <h3 className="font-bold text-[rgb(var(--ink-navy))]">Reduce Motion</h3>
                                    <p className="text-sm text-[rgb(var(--sepia-brown))]">Minimize animations for accessibility</p>
                                </div>
                                <button
                                    onClick={() => setReduceMotion(!reduceMotion)}
                                    className={`w-12 h-6 rounded-full p-1 transition-colors border-2 border-[rgb(var(--ink-navy))] ${reduceMotion ? "bg-[rgb(var(--sage-green))]" : "bg-[rgb(var(--aged-paper))]"}`}
                                >
                                    <div className={`w-3.5 h-3.5 rounded-full bg-[rgb(var(--ink-navy))] transition-transform ${reduceMotion ? "translate-x-6" : "translate-x-0"}`} />
                                </button>
                            </div>
                        </section>
                    </motion.div>
                )}

                {activeTab === "reading" && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-8"
                    >
                        <section className="space-y-4">
                            <h2 className="text-xl font-serif font-bold text-[rgb(var(--ink-navy))] flex items-center gap-2">
                                <Type className="w-5 h-5" /> Typography
                            </h2>

                            {/* Font Family */}
                            <div className="grid grid-cols-2 gap-4">
                                {["Serif", "Sans", "Mono"].map((font) => (
                                    <button
                                        key={font}
                                        onClick={() => setFontFamily(font.toLowerCase() as any)}
                                        className={`p-4 rounded-xl border-2 transition-all ${fontFamily === font.toLowerCase()
                                                ? "border-[rgb(var(--ink-navy))] bg-[rgb(var(--woodstock-gold))]"
                                                : "border-[rgb(var(--aged-paper))] bg-white hover:border-[rgb(var(--ink-navy))]"
                                            }`}
                                    >
                                        <span className={`text-lg ${font === "Serif" ? "font-serif" : font === "Mono" ? "font-mono" : "font-sans"}`}>
                                            {font}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Font Size Slider */}
                            <div className="p-4 rounded-xl border border-[rgb(var(--aged-paper))] bg-white space-y-2">
                                <div className="flex justify-between">
                                    <span className="font-bold text-[rgb(var(--ink-navy))]">Font Size</span>
                                    <span className="font-mono text-sm">{fontSize}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="12"
                                    max="32"
                                    value={fontSize}
                                    onChange={(e) => setFontSize(Number(e.target.value))}
                                    className="w-full h-2 bg-[rgb(var(--aged-paper))] rounded-lg appearance-none cursor-pointer accent-[rgb(var(--ink-navy))]"
                                />
                            </div>
                        </section>
                    </motion.div>
                )}

                {activeTab === "advanced" && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-8"
                    >
                         <section className="space-y-4">
                            <h2 className="text-xl font-serif font-bold text-[rgb(var(--ink-navy))] flex items-center gap-2">
                                <Brain className="w-5 h-5" /> Intelligence
                            </h2>

                            <div className="bg-[rgb(var(--aged-paper))] p-4 rounded-xl border border-[rgb(var(--ink-navy))] flex gap-4">
                                <div className="shrink-0 p-2 bg-[rgb(var(--ink-navy))] rounded-lg">
                                    <Sparkles className="w-6 h-6 text-[rgb(var(--woodstock-gold))]" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-[rgb(var(--ink-navy))]">AI Assistant</h3>
                                    <p className="text-sm text-[rgb(var(--sepia-brown))] mb-3">
                                        The AI is currently hiding in the stacks. It helps with definitions and summaries when asked.
                                    </p>
                                    <button
                                        onClick={() => setAiAssistant(!aiAssistant)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors border-2 border-[rgb(var(--ink-navy))] ${
                                            aiAssistant
                                            ? "bg-[rgb(var(--sage-green))] text-white"
                                            : "bg-white text-[rgb(var(--ink-navy))]"
                                        }`}
                                    >
                                        {aiAssistant ? "Enabled (Passive)" : "Disabled (Hidden)"}
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl border-2 border-dashed border-[rgb(var(--ink-navy))] opacity-60">
                                <div className="flex items-center gap-2 mb-2">
                                    <Save className="w-4 h-4" />
                                    <h3 className="font-bold">Data Management</h3>
                                </div>
                                <p className="text-xs">Your library is stored locally on this device. Sync features coming soon.</p>
                            </div>
                        </section>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default SettingsView;
