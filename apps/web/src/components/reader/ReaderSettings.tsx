import React from "react";
import { useSettingsShallow } from "@/context/SettingsContext";
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
  } = useSettingsShallow((state) => ({
    fontSize: state.fontSize,
    setFontSize: state.setFontSize,
    lineHeight: state.lineHeight,
    setLineHeight: state.setLineHeight,
    fontPairing: state.fontPairing,
    setFontPairing: state.setFontPairing,
    continuous: state.continuous,
    setContinuous: state.setContinuous,
    brightness: state.brightness,
    setBrightness: state.setBrightness,
    grayscale: state.grayscale,
    setGrayscale: state.setGrayscale,
    screenReaderMode: state.screenReaderMode,
    setScreenReaderMode: state.setScreenReaderMode,
    reduceMotion: state.reduceMotion,
    setReduceMotion: state.setReduceMotion,
    readerAccent: state.readerAccent,
    resetToDefaults: state.resetToDefaults,
  }));

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="mb-4">
      <p className="inline-block px-2 py-1 bg-[#e6d5b8] border-2 border-[#2c1e16] text-[10px] font-black uppercase tracking-widest text-[#2c1e16] shadow-[2px_2px_0px_#2c1e16] -rotate-1">
        {children}
      </p>
    </div>
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
    <div className="flex items-center gap-4 p-3 bg-[#fdfaf5] border-2 border-[#2c1e16] shadow-[4px_4px_0px_#2c1e16]">
      <span className="w-16 text-xs font-bold uppercase tracking-widest text-[#6a5a4e]">{label}</span>
      <div className="relative flex h-8 flex-1 items-center mt-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
        <div className="h-3 w-full overflow-hidden border-2 border-[#2c1e16] bg-white">
          <div
            className="h-full transition-all duration-300 bg-[#b85e42]"
            style={{ width: `${((value - min) / (max - min)) * 100}%` }}
          />
        </div>
      </div>
      <span className="w-12 text-right text-xs font-black tabular-nums text-[#b85e42]">
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
      className={`flex w-full items-center justify-between p-3 border-2 border-[#2c1e16] transition-all duration-200 shadow-[4px_4px_0px_rgba(44,30,22,1)] hover:-translate-y-px hover:shadow-[5px_5px_0px_rgba(44,30,22,1)] active:translate-y-px active:shadow-[2px_2px_0px_rgba(44,30,22,1)] ${checked
          ? "bg-[#faf6f0] border-[#b85e42]"
          : "bg-[#e6d5b8]/30"
        }`}
    >
      <div className="flex items-center gap-3">
        {Icon && <Icon className={`h-4 w-4 ${checked ? "text-[#b85e42]" : "text-[#6a5a4e]"}`} strokeWidth={2} />}
        <span className="text-xs font-bold uppercase tracking-widest text-[#2c1e16]">{label}</span>
      </div>
      <div className={`relative h-6 w-12 border-2 border-[#2c1e16] transition-colors duration-300 ${checked ? "bg-[#6ad46a]" : "bg-[#e6d5b8]"}`}>
        <div className={`absolute top-0 h-5 w-5 bg-white border-r-2 border-[#2c1e16] transition-transform duration-300 ${checked ? "translate-x-6" : "translate-x-0"}`} />
      </div>
    </button>
  );

  return (
    <div className="space-y-7 pb-6">
      <section>
        <SectionLabel>Reading Layout</SectionLabel>
        <div className="grid grid-cols-2 gap-2 p-2 bg-[#e6d5b8]/30 border-2 border-dashed border-[#2c1e16]/20">
          <button
            onClick={() => setContinuous(false)}
            className={`flex items-center justify-center gap-2 px-3 py-2 border-2 border-[#2c1e16] text-xs font-bold uppercase tracking-widest transition-all ${!continuous ? "bg-[#faf6f0] text-[#2c1e16] shadow-[2px_2px_0px_#2c1e16] -translate-y-0.5" : "bg-transparent text-[#6a5a4e] hover:bg-[#faf6f0]/50"
              }`}
          >
            <Layout className="h-4 w-4" strokeWidth={2} />
            Paged
          </button>
          <button
            onClick={() => setContinuous(true)}
            className={`flex items-center justify-center gap-2 px-3 py-2 border-2 border-[#2c1e16] text-xs font-bold uppercase tracking-widest transition-all ${continuous ? "bg-[#faf6f0] text-[#2c1e16] shadow-[2px_2px_0px_#2c1e16] -translate-y-0.5" : "bg-transparent text-[#6a5a4e] hover:bg-[#faf6f0]/50"
              }`}
          >
            <Scroll className="h-4 w-4" strokeWidth={2} />
            Scroll
          </button>
        </div>
      </section>

      <section className="bg-[#e6d5b8]/10 p-4 border-[3px] border-[#2c1e16] shadow-[6px_6px_0px_rgba(44,30,22,1)] relative mt-4">
        <div className="absolute -top-3 -right-3 w-6 h-6 border-2 border-[#2c1e16] bg-[#b85e42] shadow-[2px_2px_0px_rgba(44,30,22,1)] rotate-12" />
        <SectionLabel>Typography</SectionLabel>
        <div className="space-y-4">
          <select
            value={fontPairing}
            onChange={(e) => setFontPairing(e.target.value)}
            className="w-full border-2 border-[#2c1e16] bg-[#faf6f0] p-3 text-sm font-bold text-[#2c1e16] outline-none focus:ring-2 focus:ring-[#b85e42] shadow-[2px_2px_0px_#2c1e16]"
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

      <section className="mt-6">
        <SectionLabel>Appearance</SectionLabel>
        <div className="space-y-4">
          <Slider label="Light" value={brightness} min={40} max={130} onChange={setBrightness} formatValue={(v) => `${Math.round(v)}%`} />
          <Toggle label="Grayscale" checked={grayscale} onChange={setGrayscale} icon={EyeOff} />
        </div>
      </section>

      <section className="mt-6">
        <SectionLabel>Accessibility</SectionLabel>
        <div className="space-y-3">
          <Toggle label="Screen Reader" checked={screenReaderMode} onChange={setScreenReaderMode} icon={Speech} />
          <Toggle label="Reduce Motion" checked={reduceMotion} onChange={setReduceMotion} icon={ZapOff} />
        </div>
      </section>

      <div className="border-t-2 border-dashed border-[#2c1e16]/20 pt-6 mt-6">
        <button
          onClick={resetToDefaults}
          className="flex w-full items-center justify-center gap-2 p-3 bg-[#e6d5b8] border-[3px] border-[#2c1e16] text-xs font-black uppercase tracking-widest text-red-600 shadow-[4px_4px_0px_#2c1e16] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#2c1e16] active:translate-y-px active:shadow-[2px_2px_0px_#2c1e16] transition-all rotate-1"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={2.5} />
          Reset Defaults
        </button>
      </div>
    </div>
  );
};

export default ReaderSettings;
