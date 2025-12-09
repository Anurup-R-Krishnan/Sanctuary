import React from "react";
import { useSettings } from "../context/SettingsContext";
import {
  Type, AlignLeft, AlignCenter, AlignJustify, Palette, Sparkles,
  RotateCcw, Eye, Pilcrow, Target, Accessibility, Keyboard, Zap
} from "lucide-react";

const SettingsView: React.FC = () => {
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
    dailyGoal, setDailyGoal,
    weeklyGoal, setWeeklyGoal,
    showStreakReminder, setShowStreakReminder,
    trackingEnabled, setTrackingEnabled,
    screenReaderMode, setScreenReaderMode,
    reduceMotion, setReduceMotion,
    resetToDefaults,
    applyPreset,
  } = useSettings();

  const fontPairingOptions = [
    { key: "merriweather-georgia", label: "Merriweather & Georgia", heading: "Merriweather, serif", body: "Georgia, serif" },
    { key: "playfair-open-sans", label: "Playfair & Open Sans", heading: "Playfair Display, serif", body: "Open Sans, sans-serif" },
    { key: "abril-lato", label: "Abril Fatface & Lato", heading: "Abril Fatface, serif", body: "Lato, sans-serif" },
    { key: "spectral-source-code", label: "Spectral & Source Code", heading: "Spectral, serif", body: "Source Code Pro, monospace" },
  ];

  const alignmentOptions = [
    { value: "left", label: "Left", icon: AlignLeft },
    { value: "justify", label: "Justify", icon: AlignJustify },
    { value: "center", label: "Center", icon: AlignCenter },
  ];

  const presets = [
    { id: "comfort", label: "Comfort", desc: "Warm, easy on eyes" },
    { id: "focus", label: "Focus", desc: "Clean, minimal" },
    { id: "night", label: "Night", desc: "Dark mode optimized" },
  ] as const;

  const activePairing = fontPairingOptions.find((o) => o.key === fontPairing) ?? fontPairingOptions[0];

  const Toggle = ({ enabled, onChange, label, description }: { enabled: boolean; onChange: () => void; label: string; description?: string }) => (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <span className="font-medium text-light-text dark:text-dark-text">{label}</span>
        {description && <p className="text-sm text-light-text-muted dark:text-dark-text-muted mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={onChange}
        className={`relative flex-shrink-0 inline-flex items-center h-6 w-11 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-light-accent/50 ${
          enabled ? "bg-gradient-to-r from-light-accent to-amber-500 dark:from-dark-accent dark:to-amber-400" : "bg-light-card dark:bg-dark-card"
        }`}
      >
        <span className={`inline-block w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${enabled ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );

  const Slider = ({ id, label, value, min, max, step, onChange, unit = "" }: { id: string; label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; unit?: string }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-light-text dark:text-dark-text">{label}</label>
        <span className="text-sm font-semibold text-light-accent dark:text-dark-accent tabular-nums">{typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}{unit}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-light-card dark:bg-dark-card rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-light-accent [&::-webkit-slider-thumb]:to-amber-500 dark:[&::-webkit-slider-thumb]:from-dark-accent dark:[&::-webkit-slider-thumb]:to-amber-400 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
      />
    </div>
  );

  const SectionCard = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
    <div className="card p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-light-accent/10 to-amber-500/10 dark:from-dark-accent/15 dark:to-amber-400/15">
          <Icon className="w-5 h-5 text-light-accent dark:text-dark-accent" />
        </div>
        <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">{title}</h3>
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeInUp pb-8">
      <div className="mb-8">
        <h2 className="text-3xl font-serif font-bold text-light-text dark:text-dark-text">Settings</h2>
        <p className="text-light-text-muted dark:text-dark-text-muted mt-1">Customize your reading experience</p>
      </div>

      {/* Quick Presets */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-5 h-5 text-light-accent dark:text-dark-accent" />
          <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">Quick Presets</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              className="p-3 rounded-xl text-left bg-light-card/50 dark:bg-dark-card/50 hover:bg-light-card dark:hover:bg-dark-card transition-all border-2 border-transparent hover:border-light-accent/20 dark:hover:border-dark-accent/20"
            >
              <span className="text-sm font-medium text-light-text dark:text-dark-text block">{p.label}</span>
              <span className="text-xs text-light-text-muted dark:text-dark-text-muted">{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Typography */}
      <SectionCard title="Typography" icon={Type}>
        <Slider id="fontSize" label="Font Size" value={fontSize} min={14} max={28} step={1} onChange={setFontSize} unit="px" />
        <Slider id="lineHeight" label="Line Height" value={lineHeight} min={1.2} max={2.2} step={0.1} onChange={setLineHeight} />
        <Slider id="maxTextWidth" label="Max Text Width" value={maxTextWidth} min={45} max={80} step={5} onChange={setMaxTextWidth} unit="ch" />
        
        <div className="space-y-3">
          <label className="text-sm font-medium text-light-text dark:text-dark-text">Font Pairing</label>
          <div className="grid grid-cols-2 gap-2">
            {fontPairingOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => setFontPairing(option.key)}
                className={`p-3 rounded-xl text-left transition-all duration-200 ${
                  fontPairing === option.key
                    ? "bg-gradient-to-br from-light-accent/10 to-amber-500/10 dark:from-dark-accent/15 dark:to-amber-400/15 border-2 border-light-accent/30 dark:border-dark-accent/30"
                    : "bg-light-card/50 dark:bg-dark-card/50 border-2 border-transparent hover:border-light-card dark:hover:border-dark-card"
                }`}
              >
                <span className="text-sm font-medium text-light-text dark:text-dark-text block truncate">{option.label}</span>
                <span className="text-xs text-light-text-muted dark:text-dark-text-muted">{option.body.split(',')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-light-text dark:text-dark-text">Text Alignment</label>
          <div className="flex gap-2">
            {alignmentOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setTextAlignment(option.value as "left" | "justify" | "center")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-200 ${
                  textAlignment === option.value
                    ? "bg-gradient-to-r from-light-accent to-amber-500 dark:from-dark-accent dark:to-amber-400 text-white shadow-md"
                    : "bg-light-card/50 dark:bg-dark-card/50 text-light-text-muted dark:text-dark-text-muted hover:bg-light-card dark:hover:bg-dark-card"
                }`}
              >
                <option.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        <Toggle enabled={hyphenation} onChange={() => setHyphenation(!hyphenation)} label="Hyphenation" description="Enable automatic word hyphenation for justified text" />
      </SectionCard>

      {/* Layout */}
      <SectionCard title="Layout" icon={Pilcrow}>
        <Slider id="pageMargin" label="Page Margin" value={pageMargin} min={8} max={80} step={4} onChange={setPageMargin} unit="px" />
        <Slider id="paragraphSpacing" label="Paragraph Spacing" value={paragraphSpacing} min={0} max={48} step={2} onChange={setParagraphSpacing} unit="px" />
        <Toggle enabled={dropCaps} onChange={() => setDropCaps(!dropCaps)} label="Drop Caps" description="Decorative first letters for chapter openings" />
      </SectionCard>

      {/* Reading Mode */}
      <SectionCard title="Reading Mode" icon={Eye}>
        <Toggle enabled={immersiveMode} onChange={() => setImmersiveMode(!immersiveMode)} label="Immersive Mode" description="Auto-hide controls while reading. Tap or hover to show." />
        <Toggle enabled={continuousMode} onChange={() => setContinuousMode(!continuousMode)} label="Continuous Scroll" description="Scroll vertically instead of paginated swipes" />
      </SectionCard>

      {/* Reader Colors */}
      <SectionCard title="Reader Colors" icon={Palette}>
        <div className="grid grid-cols-3 gap-4">
          <label className="space-y-2">
            <span className="text-sm font-medium text-light-text dark:text-dark-text">Text</span>
            <input type="color" value={readerForeground} onChange={(e) => setReaderForeground(e.target.value)} className="w-full h-12 rounded-xl cursor-pointer border-2 border-light-card dark:border-dark-card" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-light-text dark:text-dark-text">Background</span>
            <input type="color" value={readerBackground === "transparent" ? "#FBF8F3" : readerBackground} onChange={(e) => setReaderBackground(e.target.value)} className="w-full h-12 rounded-xl cursor-pointer border-2 border-light-card dark:border-dark-card" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-light-text dark:text-dark-text">Accent</span>
            <input type="color" value={readerAccent} onChange={(e) => setReaderAccent(e.target.value)} className="w-full h-12 rounded-xl cursor-pointer border-2 border-light-card dark:border-dark-card" />
          </label>
        </div>
        <button onClick={resetToDefaults} className="btn-ghost text-xs w-full justify-center">
          <RotateCcw className="w-3.5 h-3.5" />
          Reset to defaults
        </button>
      </SectionCard>

      {/* Goals & Tracking */}
      <SectionCard title="Goals & Tracking" icon={Target}>
        <Slider id="dailyGoal" label="Daily Reading Goal" value={dailyGoal} min={5} max={120} step={5} onChange={setDailyGoal} unit=" pages" />
        <Slider id="weeklyGoal" label="Weekly Reading Goal" value={weeklyGoal} min={30} max={500} step={10} onChange={setWeeklyGoal} unit=" min" />
        <Toggle enabled={trackingEnabled} onChange={() => setTrackingEnabled(!trackingEnabled)} label="Enable Tracking" description="Track reading sessions and progress" />
        <Toggle enabled={showStreakReminder} onChange={() => setShowStreakReminder(!showStreakReminder)} label="Streak Reminders" description="Get notified to maintain your reading streak" />
      </SectionCard>

      {/* Accessibility */}
      <SectionCard title="Accessibility" icon={Accessibility}>
        <Toggle enabled={screenReaderMode} onChange={() => setScreenReaderMode(!screenReaderMode)} label="Screen Reader Mode" description="Optimize for screen readers with enhanced ARIA labels" />
        <Toggle enabled={reduceMotion} onChange={() => setReduceMotion(!reduceMotion)} label="Reduce Motion" description="Minimize animations for accessibility" />
        
        <div className="p-4 rounded-xl bg-light-card/50 dark:bg-dark-card/50">
          <div className="flex items-center gap-2 mb-2">
            <Keyboard className="w-4 h-4 text-light-accent dark:text-dark-accent" />
            <span className="text-sm font-medium text-light-text dark:text-dark-text">Keyboard Shortcuts</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-light-text-muted dark:text-dark-text-muted">
            <div><kbd className="px-1.5 py-0.5 rounded bg-light-card dark:bg-dark-card">←/→</kbd> Navigate pages</div>
            <div><kbd className="px-1.5 py-0.5 rounded bg-light-card dark:bg-dark-card">Space</kbd> Next page</div>
            <div><kbd className="px-1.5 py-0.5 rounded bg-light-card dark:bg-dark-card">T</kbd> Table of contents</div>
            <div><kbd className="px-1.5 py-0.5 rounded bg-light-card dark:bg-dark-card">Esc</kbd> Show controls</div>
          </div>
        </div>
      </SectionCard>

      {/* Live Preview */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-light-card/50 dark:border-dark-card/50 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-light-accent dark:text-dark-accent" />
          <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">Live Preview</h3>
        </div>
        <div
          className="transition-all duration-500"
          style={{
            padding: `${pageMargin}px`,
            background: readerBackground === "transparent" ? "transparent" : readerBackground,
            color: readerForeground,
            maxWidth: `${maxTextWidth}ch`,
            margin: "0 auto",
          }}
        >
          <h4
            style={{
              fontFamily: activePairing.heading,
              fontSize: `${fontSize + 6}px`,
              marginBottom: `${paragraphSpacing}px`,
              textAlign: textAlignment,
              color: readerForeground,
            }}
            className="font-semibold"
          >
            A Quiet Afternoon
          </h4>
          <p
            className="clear-both"
            style={{
              fontFamily: activePairing.body,
              fontSize: `${fontSize}px`,
              lineHeight,
              marginBottom: `${paragraphSpacing}px`,
              textAlign: textAlignment,
              color: readerForeground,
              hyphens: hyphenation ? "auto" : "none",
            }}
          >
            {dropCaps && (
              <span
                className="float-left mr-2 font-bold"
                style={{ fontFamily: activePairing.heading, fontSize: `${fontSize * 2.5}px`, lineHeight: 0.8, color: readerAccent }}
              >
                T
              </span>
            )}
            his is a live preview of your reading settings. Adjust the controls above to see changes in real-time as you craft your perfect reading experience.
          </p>
          <span className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-semibold" style={{ color: readerAccent }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: readerAccent }} />
            Accent color
          </span>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
