import React, { useState, useEffect } from "react";
import { useSettings } from "../context/SettingsContext";

interface ReaderSettingsProps {
    onClose: () => void;
    isOpen: boolean;
}

const TYPEFACES = [
    { id: "charter", family: "Charter, 'Bitstream Charter', Georgia, serif", label: "Charter" },
    { id: "system", family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", label: "System" },
    { id: "palatino", family: "'Palatino Linotype', Palatino, 'Book Antiqua', serif", label: "Palatino" },
    { id: "bookerly", family: "Bookerly, 'Iowan Old Style', Georgia, serif", label: "Bookerly" },
    { id: "opendyslexic", family: "'OpenDyslexic', sans-serif", label: "Dyslexic" },
];

export const ReaderSettings: React.FC<ReaderSettingsProps> = ({ onClose, isOpen }) => {
    if (!isOpen) return null;

    const {
        // Colors
        readerBackground,
        setReaderBackground,
        readerForeground,
        setReaderForeground,
        readerAccent,

        // Layout
        fontSize,
        setFontSize,
        lineHeight,
        setLineHeight,
        fontPairing, // used as typeface id
        setFontPairing,
        maxTextWidth,
        setMaxTextWidth,
        paragraphSpacing,
        setParagraphSpacing,
        dropCaps,
        setDropCaps,
        hyphenation,
        setHyphenation,

        // Modes
        continuousMode, // scroll mode
        setContinuousMode,
        immersiveMode,
        setImmersiveMode,

    } = useSettings();

    // Local state for UI controls if needed, but mostly direct mapping
    const [activeTab, setActiveTab] = useState<"layout" | "style">("layout");

    // Simplified color themes (since atmosphere is removed, we provide basic themes)
    const THEMES = [
        { name: "Light", bg: "#ffffff", fg: "#1a1a1a", label: "Light" },
        { name: "Sepia", bg: "#f5f0e8", fg: "#3d3529", label: "Sepia" },
        { name: "Dark", bg: "#1a1b1e", fg: "#9a9590", label: "Dark" },
        { name: "Black", bg: "#000000", fg: "#aaaaaa", label: "Black" },
    ];

    // Dual page info is not in SettingsContext directly based on previous view, 
    // but ReaderView handled it locally or via context. 
    // Looking at SettingsContext again: immersiveMode, continuousMode ARE there.
    // Dual page might have been local to ReaderView or unused in context.
    // We will stick to what's in useSettings for now.

    const uiColor = readerForeground;
    const uiColorMuted = `${readerForeground}80`;
    const borderColor = `${readerForeground}20`;
    const surfaceBg = readerBackground;

    // Animation classes
    const animationClass = "transition-all duration-300 ease-spring";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div
                className={`w-96 max-w-[90vw] rounded-2xl shadow-2xl overflow-hidden ${animationClass} animate-scaleIn`}
                style={{ background: surfaceBg }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor }}>
                    <h2 className="text-lg font-semibold" style={{ color: uiColor }}>Settings</h2>
                    <button
                        onClick={onClose}
                        className={`w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5`}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={uiColorMuted} strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="max-h-[70vh] overflow-y-auto p-5 space-y-6">

                    {/* Theme */}
                    <section>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: uiColorMuted }}>
                            Theme
                        </p>
                        <div className="grid grid-cols-4 gap-3">
                            {THEMES.map(theme => (
                                <button
                                    key={theme.name}
                                    onClick={() => {
                                        setReaderBackground(theme.bg);
                                        setReaderForeground(theme.fg);
                                    }}
                                    className={`aspect-square rounded-xl border-2 flex items-center justify-center ${animationClass} ${readerBackground === theme.bg ? "ring-2 ring-offset-1" : ""}`}
                                    style={{
                                        background: theme.bg,
                                        borderColor: readerBackground === theme.bg ? readerAccent : `${theme.fg}15`,
                                        "--tw-ring-color": readerAccent
                                    } as React.CSSProperties}
                                    title={theme.label}
                                >
                                    <span
                                        className="text-xs font-bold"
                                        style={{ color: theme.fg }}
                                    >
                                        Aa
                                    </span>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Layout Mode */}
                    <section>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: uiColorMuted }}>
                            Layout
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setContinuousMode(false)}
                                className={`py-2.5 rounded-xl text-xs font-medium ${animationClass}`}
                                style={{
                                    background: !continuousMode ? `${readerAccent}15` : `${uiColor}05`,
                                    border: `1px solid ${!continuousMode ? readerAccent : borderColor}`,
                                    color: !continuousMode ? readerAccent : uiColorMuted,
                                }}
                            >
                                Paginated
                            </button>
                            <button
                                onClick={() => setContinuousMode(true)}
                                className={`py-2.5 rounded-xl text-xs font-medium ${animationClass}`}
                                style={{
                                    background: continuousMode ? `${readerAccent}15` : `${uiColor}05`,
                                    border: `1px solid ${continuousMode ? readerAccent : borderColor}`,
                                    color: continuousMode ? readerAccent : uiColorMuted,
                                }}
                            >
                                Scroll
                            </button>
                        </div>
                    </section>

                    {/* Typeface */}
                    <section>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: uiColorMuted }}>
                            Typeface
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {TYPEFACES.map((tf) => (
                                <button
                                    key={tf.id}
                                    onClick={() => setFontPairing(tf.id)}
                                    className={`px-3 py-2.5 rounded-lg whitespace-nowrap text-sm ${animationClass} text-left`}
                                    style={{
                                        fontFamily: tf.family,
                                        background: fontPairing === tf.id ? `${readerAccent}15` : `${uiColor}05`,
                                        border: `1px solid ${fontPairing === tf.id ? readerAccent : borderColor}`,
                                        color: fontPairing === tf.id ? readerAccent : uiColorMuted,
                                    }}
                                >
                                    {tf.label}
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Text Size */}
                    <section>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: uiColorMuted }}>
                                Text Size
                            </p>
                            <span className="text-xs tabular-nums" style={{ color: uiColor }}>
                                {fontSize}px
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setFontSize(Math.max(12, fontSize - 1))}
                                className={`w-10 h-10 rounded-lg flex items-center justify-center ${animationClass}`}
                                style={{ background: `${uiColor}08` }}
                            >
                                <span className="text-sm" style={{ color: uiColor }}>A</span>
                            </button>
                            <input
                                type="range"
                                min="12"
                                max="28"
                                value={fontSize}
                                onChange={(e) => setFontSize(Number(e.target.value))}
                                className="flex-1"
                                style={{ accentColor: readerAccent }}
                            />
                            <button
                                onClick={() => setFontSize(Math.min(28, fontSize + 1))}
                                className={`w-10 h-10 rounded-lg flex items-center justify-center ${animationClass}`}
                                style={{ background: `${uiColor}08` }}
                            >
                                <span className="text-lg" style={{ color: uiColor }}>A</span>
                            </button>
                        </div>
                    </section>

                    {/* Line Spacing */}
                    <section>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: uiColorMuted }}>
                                Line Spacing
                            </p>
                            <span className="text-xs tabular-nums" style={{ color: uiColor }}>
                                {lineHeight.toFixed(1)}
                            </span>
                        </div>
                        <input
                            type="range"
                            min="1.2"
                            max="2.4"
                            step="0.1"
                            value={lineHeight}
                            onChange={(e) => setLineHeight(Number(e.target.value))}
                            className="w-full"
                            style={{ accentColor: readerAccent }}
                        />
                    </section>

                    {/* Column Width */}
                    <section>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: uiColorMuted }}>
                                Max Width
                            </p>
                            <span className="text-xs tabular-nums" style={{ color: uiColor }}>
                                {maxTextWidth}ch
                            </span>
                        </div>
                        <input
                            type="range"
                            min="40"
                            max="100"
                            step="5"
                            value={maxTextWidth}
                            onChange={(e) => setMaxTextWidth(Number(e.target.value))}
                            className="w-full"
                            style={{ accentColor: readerAccent }}
                        />
                    </section>

                    {/* Toggles */}
                    <section className="space-y-2 pt-2">
                        {[
                            { label: "Drop Capitals", active: dropCaps, toggle: () => setDropCaps(!dropCaps) },
                            { label: "Hyphenation", active: hyphenation, toggle: () => setHyphenation(!hyphenation) },
                            { label: "Immersive Mode", active: immersiveMode, toggle: () => setImmersiveMode(!immersiveMode) },
                        ].map((item) => (
                            <button
                                key={item.label}
                                onClick={item.toggle}
                                className={`w-full flex items-center justify-between p-3 rounded-xl ${animationClass}`}
                                style={{ background: `${uiColor}05` }}
                            >
                                <span className="text-xs" style={{ color: uiColor }}>
                                    {item.label}
                                </span>
                                <div
                                    className={`w-10 h-5 rounded-full relative ${animationClass}`}
                                    style={{ background: item.active ? readerAccent : `${uiColor}20` }}
                                >
                                    <div
                                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow ${animationClass}`}
                                        style={{ left: item.active ? "calc(100% - 18px)" : "2px" }}
                                    />
                                </div>
                            </button>
                        ))}
                    </section>

                </div>
            </div>
        </div>
    );
}
