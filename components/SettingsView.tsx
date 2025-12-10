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
    { id: "night", label: "Night", desc: "Dark mode optimized" },
  ] as const;

  const activePairing = fontPairingOptions.find((o) => o.key === fontPairing) ?? fontPairingOptions[0];

  const Toggle = ({ enabled, onChange, label, description }: { enabled: boolean; onChange: () => void; label: string; description?: string }) => (
    <div className="flex items-start justify-between gap-6 py-1">
      <div className="flex-1">
        <span className="font-medium text-light-text dark:text-dark-text">{label}</span>
        {description && <p className="text-sm text-light-text-muted dark:text-dark-text-muted mt-1">{description}</p>}
      </div>
      <button type="button" role="switch" aria-checked={enabled} onClick={onChange}
        className={`relative flex-shrink-0 inline-flex items-center h-7 w-12 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-light-accent/50 ${enabled ? "bg-gradient-to-r from-light-accent to-amber-500 dark:from-dark-accent dark:to-amber-400" : "bg-light-card dark:bg-dark-card"}`}>
        <span className={`inline-block w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${enabled ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );

  const Slider = ({ id, label, value, min, max, step, onChange, unit = "" }: { id: string; label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; unit?: string }) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-light-text dark:text-dark-text">{label}</label>
        <span className="text-sm font-semibold text-light-accent dark:text-dark-accent tabular-nums">{typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}{unit}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-light-card dark:bg-dark-card rounded-full appearance-none cursor-pointer" />
    </div>
  );

  const SectionCard = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
    <div className="card p-8 space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-light-accent/10 to-amber-500/10 dark:from-dark-accent/15 dark:to-amber-400/15">
          <Icon className="w-6 h-6 text-light-accent dark:text-dark-accent" />
        </div>
        <h3 className="text-xl font-semibold text-light-text dark:text-dark-text">{title}</h3>
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fadeInUp pb-12">
      <div className="mb-10">
        <h2 className="text-4xl font-serif font-bold text-light-text dark:text-dark-text">Settings</h2>
        <p className="text-light-text-muted dark:text-dark-text-muted mt-2 text-lg">Customize your reading experience</p>
      </div>

      {/* Quick Presets */}
      <div className="card p-8">
        <div className="flex items-center gap-4 mb-6">
          <Zap className="w-6 h-6 text-light-accent dark:text-dark-accent" />
          <h3 className="text-xl font-semibold text-light-text dark:text-dark-text">Quick Presets</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {presets.map((p) => (
            <button key={p.id} onClick={() => applyPreset(p.id)}
              className="p-5 rounded-xl text-left bg-light-card/50 dark:bg-dark-card/50 hover:bg-light-card dark:hover:bg-dark-card transition-all border-2 border-transparent hover:border-light-accent/20 dark:hover:border-dark-accent/20">
              <span className="text-sm font-medium text-light-text dark:text-dark-text block">{p.label}</span>
              <span className="text-xs text-light-text-muted dark:text-dark-text-muted mt-1">{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Typography */}
      <SectionCard title="Typography" icon={Type}>
        <Slider id="fontSize" label="Font Size" value={fontSize} min={14} max={28} step={1} onChange={setFontSize} unit="px" />
        <Slider id="lineHeight" label="Line Height" value={lineHeight} min={1.2} max={2.2} step={0.1} onChange={setLineHeight} />
        <Slider id="maxTextWidth" label="Max Text Width" value={maxTextWidth} min={45} max={80} step={5} onChange={setMaxTextWidth} unit="ch" />
        
        <div className="space-y-4">
          <label className="text-sm font-medium text-light-text dark:text-dark-text">Font Pairing</label>
          <div className="grid grid-cols-2 gap-3">
            {fontPairingOptions.map((option) => (
              <button key={option.key} onClick={() => setFontPairing(option.key)}
                className={`p-4 rounded-xl text-left transition-all duration-200 ${fontPairing === option.key ? "bg-gradient-to-br from-light-accent/10 to-amber-500/10 dark:from-dark-accent/15 dark:to-amber-400/15 border-2 border-light-accent/30 dark:border-dark-accent/30" : "bg-light-card/50 dark:bg-dark-card/50 border-2 border-transparent hover:border-light-card dark:hover:border-dark-card"}`}>
                <span className="text-sm font-medium text-light-text dark:text-dark-text block truncate">{option.label}</span>
                <span className="text-xs text-light-text-muted dark:text-dark-text-muted">{option.body.split(',')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-medium text-light-text dark:text-dark-text">Text Alignment</label>
          <div className="flex gap-3">
            {alignmentOptions.map((option) => (
              <button key={option.value} onClick={() => setTextAlignment(option.value as "left" | "justify" | "center")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-200 ${textAlignment === option.value ? "bg-gradient-to-r from-light-accent to-amber-500 dark:from-dark-accent dark:to-amber-400 text-white shadow-md" : "bg-light-card/50 dark:bg-dark-card/50 text-light-text-muted dark:text-dark-text-muted hover:bg-light-card dark:hover:bg-dark-card"}`}>
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
        <div className="grid grid-cols-3 gap-6">
          <label className="space-y-3">
            <span className="text-sm font-medium text-light-text dark:text-dark-text">Text</span>
            <input type="color" value={readerForeground} onChange={(e) => setReaderForeground(e.target.value)} className="w-full h-14 rounded-xl cursor-pointer border-2 border-light-card dark:border-dark-card" />
          </label>
          <label className="space-y-3">
            <span className="text-sm font-medium text-light-text dark:text-dark-text">Background</span>
            <input type="color" value={readerBackground === "transparent" ? "#FBF8F3" : readerBackground} onChange={(e) => setReaderBackground(e.target.value)} className="w-full h-14 rounded-xl cursor-pointer border-2 border-light-card dark:border-dark-card" />
          </label>
          <label className="space-y-3">
            <span className="text-sm font-medium text-light-text dark:text-dark-text">Accent</span>
            <input type="color" value={readerAccent} onChange={(e) => setReaderAccent(e.target.value)} className="w-full h-14 rounded-xl cursor-pointer border-2 border-light-card dark:border-dark-card" />
          </label>
        </div>
        <button onClick={resetToDefaults} className="btn-ghost text-sm w-full justify-center mt-4">
          <RotateCcw className="w-4 h-4" />Reset to defaults
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
        
        <div className="p-5 rounded-xl bg-light-card/50 dark:bg-dark-card/50">
          <div className="flex items-center gap-3 mb-4">
            <Keyboard className="w-5 h-5 text-light-accent dark:text-dark-accent" />
            <span className="text-sm font-medium text-light-text dark:text-dark-text">Keyboard Shortcuts</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm text-light-text-muted dark:text-dark-text-muted">
            <div><kbd className="px-2 py-1 rounded bg-light-card dark:bg-dark-card text-xs">←/→</kbd> Navigate pages</div>
            <div><kbd className="px-2 py-1 rounded bg-light-card dark:bg-dark-card text-xs">Space</kbd> Next page</div>
            <div><kbd className="px-2 py-1 rounded bg-light-card dark:bg-dark-card text-xs">T</kbd> Table of contents</div>
            <div><kbd className="px-2 py-1 rounded bg-light-card dark:bg-dark-card text-xs">B</kbd> Bookmarks</div>
            <div><kbd className="px-2 py-1 rounded bg-light-card dark:bg-dark-card text-xs">?</kbd> Show shortcuts</div>
            <div><kbd className="px-2 py-1 rounded bg-light-card dark:bg-dark-card text-xs">Esc</kbd> Show controls</div>
          </div>
        </div>
      </SectionCard>

      {/* Live Preview */}
      <div className="card overflow-hidden">
        <div className="px-8 py-5 border-b border-light-card/50 dark:border-dark-card/50 flex items-center gap-4">
          <Eye className="w-6 h-6 text-light-accent dark:text-dark-accent" />
          <h3 className="text-xl font-semibold text-light-text dark:text-dark-text">Live Preview</h3>
        </div>
        <div className="transition-all duration-500" style={{ padding: `${pageMargin}px`, background: readerBackground === "transparent" ? "transparent" : readerBackground, color: readerForeground, maxWidth: `${maxTextWidth}ch`, margin: "0 auto" }}>
          <h4 style={{ fontFamily: "Lora, serif", fontSize: `${fontSize + 6}px`, marginBottom: `${paragraphSpacing}px`, textAlign: textAlignment, color: readerForeground }} className="font-semibold">A Quiet Afternoon</h4>
          <p className="clear-both" style={{ fontFamily: activePairing.body, fontSize: `${fontSize}px`, lineHeight, marginBottom: `${paragraphSpacing}px`, textAlign: textAlignment, color: readerForeground, hyphens: hyphenation ? "auto" : "none" }}>
            {dropCaps && <span className="float-left mr-2 font-bold" style={{ fontFamily: "Lora, serif", fontSize: `${fontSize * 2.5}px`, lineHeight: 0.8, color: readerAccent }}>T</span>}
            his is a live preview of your reading settings. Adjust the controls above to see changes in real-time as you craft your perfect reading experience.
          </p>
          <span className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-semibold" style={{ color: readerAccent }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: readerAccent }} />Accent color
          </span>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
