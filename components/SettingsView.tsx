import React from "react";
import { useSettings } from "../context/SettingsContext";
import { Type, AlignLeft, AlignCenter, AlignJustify, Palette, RotateCcw, Eye, Pilcrow, Target, Accessibility, Keyboard, Zap } from "lucide-react";

const SettingsView: React.FC = () => {
  const {
    fontSize, setFontSize, lineHeight, setLineHeight, textAlignment, setTextAlignment,
    fontPairing, setFontPairing, maxTextWidth, setMaxTextWidth, hyphenation, setHyphenation,
    pageMargin, setPageMargin, paragraphSpacing, setParagraphSpacing, dropCaps, setDropCaps,
    immersiveMode, setImmersiveMode, continuousMode, setContinuousMode,
    readerForeground, setReaderForeground, readerBackground, setReaderBackground, readerAccent, setReaderAccent,
    dailyGoal, setDailyGoal, weeklyGoal, setWeeklyGoal, showStreakReminder, setShowStreakReminder, trackingEnabled, setTrackingEnabled,
    screenReaderMode, setScreenReaderMode, reduceMotion, setReduceMotion, resetToDefaults, applyPreset,
  } = useSettings();

  const fontPairingOptions = [
    { key: "merriweather-georgia", label: "Merriweather & Georgia", body: "Georgia, serif" },
    { key: "playfair-open-sans", label: "Playfair & Open Sans", body: "Open Sans, sans-serif" },
    { key: "abril-lato", label: "Abril Fatface & Lato", body: "Lato, sans-serif" },
    { key: "spectral-source-code", label: "Spectral & Source Code", body: "Source Code Pro, monospace" },
  ];

  const alignmentOptions = [
    { value: "left", label: "Left", icon: AlignLeft },
    { value: "justify", label: "Justify", icon: AlignJustify },
    { value: "center", label: "Center", icon: AlignCenter },
  ];

  const presets = [
    { id: "comfort", label: "Comfort", desc: "Warm, easy on eyes" },
    { id: "focus", label: "Focus", desc: "Clean, minimal" },
    { id: "night", label: "Night", desc: "Dark mode" },
  ] as const;

  const activePairing = fontPairingOptions.find((o) => o.key === fontPairing) ?? fontPairingOptions[0];

  const Toggle = ({ enabled, onChange, label, description }: { enabled: boolean; onChange: () => void; label: string; description?: string }) => (
    <div className="flex items-start justify-between gap-4 py-0.5">
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-light-text dark:text-dark-text">{label}</span>
        {description && <p className="text-[11px] text-light-text-muted dark:text-dark-text-muted mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={onChange}
        className={`toggle flex-shrink-0 ${enabled ? "active" : ""}`}
      >
        <span className="toggle-thumb" />
      </button>
    </div>
  );

  const Slider = ({ id, label, value, min, max, step, onChange, unit = "" }: { id: string; label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; unit?: string }) => (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-light-text dark:text-dark-text">{label}</label>
        <span className="text-sm font-medium text-light-accent dark:text-dark-accent tabular-nums">
          {typeof value === "number" && value % 1 !== 0 ? value.toFixed(1) : value}{unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );

  const Section = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
    <div className="p-5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04]">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-light-accent/10 dark:bg-dark-accent/10">
          <Icon className="w-4 h-4 text-light-accent dark:text-dark-accent" strokeWidth={1.75} />
        </div>
        <h3 className="text-base font-semibold text-light-text dark:text-dark-text">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-12">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">Settings</h2>
        <p className="text-light-text-muted dark:text-dark-text-muted mt-1 text-sm">Customize your experience</p>
      </div>

      <div className="p-5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04]">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-light-accent/10 dark:bg-dark-accent/10">
            <Zap className="w-4 h-4 text-light-accent dark:text-dark-accent" strokeWidth={1.75} />
          </div>
          <h3 className="text-base font-semibold text-light-text dark:text-dark-text">Quick Presets</h3>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              className="p-3 rounded-lg text-left bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] border border-transparent hover:border-light-accent/15 dark:hover:border-dark-accent/15 transition-all duration-150 group"
            >
              <span className="text-sm font-medium text-light-text dark:text-dark-text block group-hover:text-light-accent dark:group-hover:text-dark-accent transition-colors">{p.label}</span>
              <span className="text-[10px] text-light-text-muted dark:text-dark-text-muted">{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <Section title="Typography" icon={Type}>
        <Slider id="fontSize" label="Font Size" value={fontSize} min={14} max={28} step={1} onChange={setFontSize} unit="px" />
        <Slider id="lineHeight" label="Line Height" value={lineHeight} min={1.2} max={2.2} step={0.1} onChange={setLineHeight} />
        <Slider id="maxTextWidth" label="Text Width" value={maxTextWidth} min={45} max={80} step={5} onChange={setMaxTextWidth} unit="ch" />

        <div className="space-y-2.5">
          <label className="text-sm font-medium text-light-text dark:text-dark-text">Font</label>
          <div className="grid grid-cols-2 gap-1.5">
            {fontPairingOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => setFontPairing(option.key)}
                className={`p-2.5 rounded-lg text-left transition-all duration-150 ${
                  fontPairing === option.key
                    ? "bg-light-accent/8 dark:bg-dark-accent/8 border border-light-accent/20 dark:border-dark-accent/20"
                    : "bg-black/[0.02] dark:bg-white/[0.02] border border-transparent hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                }`}
              >
                <span className="text-sm font-medium text-light-text dark:text-dark-text block truncate">{option.label}</span>
                <span className="text-[10px] text-light-text-muted dark:text-dark-text-muted">{option.body.split(",")[0]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          <label className="text-sm font-medium text-light-text dark:text-dark-text">Alignment</label>
          <div className="flex gap-1.5">
            {alignmentOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setTextAlignment(option.value as "left" | "justify" | "center")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all duration-150 ${
                  textAlignment === option.value
                    ? "bg-gradient-to-r from-light-accent to-amber-500 dark:from-dark-accent dark:to-amber-400 text-white"
                    : "bg-black/[0.02] dark:bg-white/[0.02] text-light-text-muted dark:text-dark-text-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                }`}
              >
                <option.icon className="w-4 h-4" />
                <span className="text-xs font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        <Toggle enabled={hyphenation} onChange={() => setHyphenation(!hyphenation)} label="Hyphenation" description="Auto word hyphenation" />
      </Section>

      <Section title="Layout" icon={Pilcrow}>
        <Slider id="pageMargin" label="Margin" value={pageMargin} min={8} max={80} step={4} onChange={setPageMargin} unit="px" />
        <Slider id="paragraphSpacing" label="Paragraph Spacing" value={paragraphSpacing} min={0} max={48} step={2} onChange={setParagraphSpacing} unit="px" />
        <Toggle enabled={dropCaps} onChange={() => setDropCaps(!dropCaps)} label="Drop Caps" description="Decorative first letters" />
      </Section>

      <Section title="Reading Mode" icon={Eye}>
        <Toggle enabled={immersiveMode} onChange={() => setImmersiveMode(!immersiveMode)} label="Immersive Mode" description="Auto-hide controls" />
        <Toggle enabled={continuousMode} onChange={() => setContinuousMode(!continuousMode)} label="Continuous Scroll" description="Scroll instead of pages" />
      </Section>

      <Section title="Colors" icon={Palette}>
        <div className="grid grid-cols-3 gap-3">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-light-text dark:text-dark-text">Text</span>
            <input
              type="color"
              value={readerForeground}
              onChange={(e) => setReaderForeground(e.target.value)}
              className="w-full h-9 rounded-lg cursor-pointer border border-black/[0.06] dark:border-white/[0.06]"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-light-text dark:text-dark-text">Background</span>
            <input
              type="color"
              value={readerBackground === "transparent" ? "#FBF8F3" : readerBackground}
              onChange={(e) => setReaderBackground(e.target.value)}
              className="w-full h-9 rounded-lg cursor-pointer border border-black/[0.06] dark:border-white/[0.06]"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-light-text dark:text-dark-text">Accent</span>
            <input
              type="color"
              value={readerAccent}
              onChange={(e) => setReaderAccent(e.target.value)}
              className="w-full h-9 rounded-lg cursor-pointer border border-black/[0.06] dark:border-white/[0.06]"
            />
          </label>
        </div>
        <button
          onClick={resetToDefaults}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset defaults
        </button>
      </Section>

      <Section title="Goals" icon={Target}>
        <Slider id="dailyGoal" label="Daily Goal" value={dailyGoal} min={5} max={120} step={5} onChange={setDailyGoal} unit=" pages" />
        <Slider id="weeklyGoal" label="Weekly Goal" value={weeklyGoal} min={30} max={500} step={10} onChange={setWeeklyGoal} unit=" min" />
        <Toggle enabled={trackingEnabled} onChange={() => setTrackingEnabled(!trackingEnabled)} label="Tracking" description="Track reading sessions" />
        <Toggle enabled={showStreakReminder} onChange={() => setShowStreakReminder(!showStreakReminder)} label="Reminders" description="Streak notifications" />
      </Section>

      <Section title="Accessibility" icon={Accessibility}>
        <Toggle enabled={screenReaderMode} onChange={() => setScreenReaderMode(!screenReaderMode)} label="Screen Reader" description="Enhanced ARIA labels" />
        <Toggle enabled={reduceMotion} onChange={() => setReduceMotion(!reduceMotion)} label="Reduce Motion" description="Minimize animations" />

        <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-2 mb-2">
            <Keyboard className="w-3.5 h-3.5 text-light-accent dark:text-dark-accent" />
            <span className="text-xs font-medium text-light-text dark:text-dark-text">Shortcuts</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[10px] text-light-text-muted dark:text-dark-text-muted">
            <div className="flex items-center gap-1.5">
              <kbd className="px-1 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.04] font-mono">Arrow</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.04] font-mono">Space</kbd>
              <span>Next</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.04] font-mono">Esc</kbd>
              <span>Controls</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.04] font-mono">F</kbd>
              <span>Fullscreen</span>
            </div>
          </div>
        </div>
      </Section>

      <div className="rounded-xl overflow-hidden border border-black/[0.04] dark:border-white/[0.04]">
        <div className="px-5 py-3 border-b border-black/[0.04] dark:border-white/[0.04] bg-black/[0.02] dark:bg-white/[0.02] flex items-center gap-2">
          <Eye className="w-4 h-4 text-light-accent dark:text-dark-accent" strokeWidth={1.75} />
          <h3 className="text-sm font-semibold text-light-text dark:text-dark-text">Preview</h3>
        </div>
        <div
          className="transition-all duration-300"
          style={{
            padding: `${pageMargin}px`,
            background: readerBackground === "transparent" ? "transparent" : readerBackground,
            color: readerForeground,
            maxWidth: `${maxTextWidth}ch`,
            margin: "0 auto",
          }}
        >
          <h4
            style={{ fontFamily: "Crimson Pro, serif", fontSize: `${fontSize + 4}px`, marginBottom: `${paragraphSpacing}px`, textAlign: textAlignment, color: readerForeground }}
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
                style={{ fontFamily: "Crimson Pro, serif", fontSize: `${fontSize * 2.5}px`, lineHeight: 0.8, color: readerAccent }}
              >
                T
              </span>
            )}
            his is a live preview of your reading settings. Adjust the controls above to see changes in real-time.
          </p>
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold" style={{ color: readerAccent }}>
            <span className="h-1 w-1 rounded-full" style={{ background: readerAccent }} />
            Accent
          </span>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
