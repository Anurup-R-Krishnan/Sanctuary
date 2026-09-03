
import { Settings, Sun, Moon, Type, AlignLeft, AlignJustify, BookOpen, Layers } from "lucide-react";
import React from "react";
import { useSettingsShallow } from "@/store/useSettingsStore";
import { cx } from "@/utils/cx";

export default function ReaderSettings() {
  const {
    fontSize, setFontSize,
    lineHeight, setLineHeight,
    pageMargin, setPageMargin,
    brightness, setBrightness,
    fontPairing, setFontPairing,
    textAlignment, setTextAlignment,
    continuous, setContinuous,
    spread, setSpread,
  } = useSettingsShallow((state) => ({
    fontSize: state.fontSize, setFontSize: state.setFontSize,
    lineHeight: state.lineHeight, setLineHeight: state.setLineHeight,
    pageMargin: state.pageMargin, setPageMargin: state.setPageMargin,
    brightness: state.brightness, setBrightness: state.setBrightness,
    fontPairing: state.fontPairing, setFontPairing: state.setFontPairing,
    textAlignment: state.textAlignment, setTextAlignment: state.setTextAlignment,
    continuous: state.continuous, setContinuous: state.setContinuous,
    spread: state.spread, setSpread: state.setSpread,
  }));

  const Slider = ({ label, value, min, max, step, onChange, format }: any) => (
    <div className="flex flex-wrap items-center gap-3">
      <span className="w-20 text-sm font-medium text-light-text-muted dark:text-dark-text-muted">{label}</span>
      <input 
        type="range" 
        min={min} max={max} step={step} 
        value={value} 
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-light-accent dark:accent-dark-accent h-1.5 bg-black/10 dark:bg-white/10 rounded-full appearance-none outline-none cursor-pointer" 
      />
      <span className="w-10 text-right text-xs font-mono text-light-text-muted dark:text-dark-text-muted">{format ? format(value) : value}</span>
    </div>
  );

  const ButtonGroup = ({ label, options, value, onChange }: any) => (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt: any) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cx(
              "flex-1 py-1.5 px-3 rounded-lg border text-sm transition-colors",
              value === opt.value
                ? "bg-light-accent/10 border-light-accent text-light-accent dark:bg-dark-accent/10 dark:border-dark-accent dark:text-dark-accent"
                : "border-black/10 dark:border-white/10 text-light-text dark:text-dark-text hover:bg-black/5 dark:hover:bg-white/5"
            )}
          >
            {opt.icon && <span className="inline-block mr-2 align-middle">{opt.icon}</span>}
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-y-auto overflow-x-hidden p-6 gap-8">
      <div>
        <h2 className="text-lg font-serif font-medium text-light-text dark:text-dark-text tracking-tight mb-6">Typography</h2>
        <div className="space-y-5">
          <Slider label="Size" value={fontSize} min={12} max={32} step={1} onChange={setFontSize} format={(v: number) => v + "px"} />
          <Slider label="Line Height" value={lineHeight} min={1.2} max={2.5} step={0.05} onChange={setLineHeight} format={(v: number) => v.toFixed(2)} />
          <Slider label="Margin" value={pageMargin} min={0} max={100} step={5} onChange={setPageMargin} format={(v: number) => v + "%"} />
          
          <ButtonGroup 
            label="Style" 
            value={fontPairing} 
            onChange={setFontPairing}
            options={[
              { value: "merriweather-georgia", label: "Serif" },
              { value: "inter-sf", label: "Sans" }
            ]} 
          />

          <ButtonGroup 
            label="Alignment" 
            value={textAlignment} 
            onChange={setTextAlignment}
            options={[
              { value: "left", label: "Left", icon: <AlignLeft className="w-4 h-4" /> },
              { value: "justify", label: "Justify", icon: <AlignJustify className="w-4 h-4" /> }
            ]} 
          />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-serif font-medium text-light-text dark:text-dark-text tracking-tight mb-6">Display</h2>
        <div className="space-y-5">
          <Slider label="Brightness" value={brightness} min={50} max={100} step={1} onChange={setBrightness} format={(v: number) => v + "%"} />
          
          <ButtonGroup 
            label="Layout" 
            value={continuous ? "flow" : "paginated"} 
            onChange={(v: any) => setContinuous(v === "flow")}
            options={[
              { value: "paginated", label: "Pages", icon: <BookOpen className="w-4 h-4" /> },
              { value: "flow", label: "Scroll", icon: <Layers className="w-4 h-4" /> }
            ]} 
          />
        </div>
      </div>
    </div>
  );
}
