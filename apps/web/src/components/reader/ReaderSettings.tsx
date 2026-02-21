import React from "react";
import { useSettings } from "@/context/SettingsContext";
import { Layout, Scroll, EyeOff, Speech, ZapOff, RotateCcw } from "lucide-react";

const ReaderSettings: React.FC = () => {
  const {
    fontSize,
    setFontSize,
    lineHeight,
    setLineHeight,
    fontPairing,
    setFontPairing,
    continuous,
    setContinuous,
    brightness,
    setBrightness,
    grayscale,
    setGrayscale,
    screenReaderMode,
    setScreenReaderMode,
    reduceMotion,
    setReduceMotion,
    readerAccent,
    resetToDefaults,
  } = useSettings();

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-light-text-muted dark:text-dark-text-muted">
      {children}
    </p>
  );

  const Slider = ({
    value,
    min,
    max,
    step = 1,
    onChange,
    label,
    formatValue = (v: number) => v,
  }: {
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (val: number) => void;
    label: string;
    formatValue?: (v: number) => string | number;
  }) => (
    <div className="flex items-center gap-3">
      <span className="w-16 text-sm text-light-text-muted dark:text-dark-text-muted">{label}</span>
      <div className="relative flex h-8 flex-1 items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
          <div
            className="h-full transition-all duration-150"
            style={{ width: `${((value - min) / (max - min)) * 100}%`, backgroundColor: readerAccent }}
          />
        </div>
      </div>
      <span className="w-12 text-right text-xs font-medium tabular-nums text-light-text dark:text-dark-text">
        {formatValue(value)}
      </span>
    </div>
  );

  const Toggle = ({
    checked,
    onChange,
    label,
    icon: Icon,
  }: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
    icon?: React.ElementType;
  }) => (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className={`flex w-full items-center justify-between rounded-xl border p-3 transition-all duration-200 ${
        checked
          ? "border-light-accent bg-light-accent/10 dark:border-dark-accent dark:bg-dark-accent/10"
          : "border-black/10 bg-transparent hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
      }`}
    >
      <div className="flex items-center gap-3">
        {Icon && <Icon className="h-4 w-4 text-light-text-muted dark:text-dark-text-muted" />}
        <span className="text-sm text-light-text dark:text-dark-text">{label}</span>
      </div>
      <div className={`relative h-5 w-10 rounded-full ${checked ? "bg-light-accent dark:bg-dark-accent" : "bg-black/20 dark:bg-white/20"}`}>
        <div className={`absolute top-1 h-3 w-3 rounded-full bg-white transition-transform duration-200 ${checked ? "left-6" : "left-1"}`} />
      </div>
    </button>
  );

  return (
    <div className="space-y-7 pb-6">
      <section>
        <SectionLabel>Reading Mode</SectionLabel>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-black/5 p-1 dark:bg-white/5">
          <button
            onClick={() => setContinuous(false)}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-all ${
              !continuous ? "bg-white font-medium shadow-sm dark:bg-white/10" : "opacity-70 hover:opacity-100"
            }`}
          >
            <Layout className="h-4 w-4" />
            Paged
          </button>
          <button
            onClick={() => setContinuous(true)}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-all ${
              continuous ? "bg-white font-medium shadow-sm dark:bg-white/10" : "opacity-70 hover:opacity-100"
            }`}
          >
            <Scroll className="h-4 w-4" />
            Flow
          </button>
        </div>
      </section>

      <section>
        <SectionLabel>Typography</SectionLabel>
        <div className="space-y-3">
          <select
            value={fontPairing}
            onChange={(e) => setFontPairing(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-black/5 p-2.5 text-sm text-light-text outline-none focus:ring-2 focus:ring-light-accent dark:border-white/10 dark:bg-white/5 dark:text-dark-text dark:focus:ring-dark-accent"
          >
            <option value="merriweather-georgia">Merriweather</option>
            <option value="crimson-pro">Crimson Pro</option>
            <option value="libre-baskerville">Libre Baskerville</option>
            <option value="lora">Lora</option>
            <option value="source-serif">Source Serif</option>
            <option value="inter">Inter (Sans)</option>
          </select>
          <Slider label="Size" value={fontSize} min={14} max={30} onChange={setFontSize} formatValue={(v) => `${v}px`} />
          <Slider label="Height" value={lineHeight} min={1.3} max={2.1} step={0.1} onChange={setLineHeight} formatValue={(v) => v.toFixed(1)} />
        </div>
      </section>

      <section>
        <SectionLabel>Appearance</SectionLabel>
        <div className="space-y-3">
          <Slider label="Light" value={brightness} min={40} max={130} onChange={setBrightness} formatValue={(v) => `${Math.round(v)}%`} />
          <Toggle label="Grayscale" checked={grayscale} onChange={setGrayscale} icon={EyeOff} />
        </div>
      </section>

      <section>
        <SectionLabel>Accessibility</SectionLabel>
        <div className="space-y-2">
          <Toggle label="Screen Reader Mode" checked={screenReaderMode} onChange={setScreenReaderMode} icon={Speech} />
          <Toggle label="Reduce Motion" checked={reduceMotion} onChange={setReduceMotion} icon={ZapOff} />
        </div>
      </section>

      <div className="border-t border-black/5 pt-4 dark:border-white/5">
        <button
          onClick={resetToDefaults}
          className="flex w-full items-center justify-center gap-2 rounded-xl p-3 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/10"
        >
          <RotateCcw className="h-4 w-4" />
          Reset Reader Defaults
        </button>
      </div>
    </div>
  );
};

export default ReaderSettings;

