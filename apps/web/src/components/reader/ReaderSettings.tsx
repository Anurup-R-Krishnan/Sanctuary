import { Check, AlignLeft, AlignJustify, AlignCenter, BookOpen, Layers, Columns2, X, Plus } from "lucide-react";
import React, { useState } from "react";

import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { COLOR_PRESETS, FONT_PAIRINGS } from "@/config/readerConfig";
import { useReaderSpeech } from "@/hooks/useReaderSpeech";
import { useSettingsShallow } from "@/store/useSettingsStore";
import { cx } from "@/utils/cx";

// ── Small local primitives (kept lightweight for the slide-in panel) ─────────

const Slider = ({ label, value, min, max, step, onChange, format }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; format?: (v: number) => string;
}) => (
  <div className="flex flex-wrap items-center gap-3">
    <span className="w-24 shrink-0 text-sm font-medium text-light-text-muted dark:text-dark-text-muted">{label}</span>
    <input
      type="range"
      min={min} max={max} step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="flex-1 accent-light-accent dark:accent-dark-accent h-1.5 bg-black/10 dark:bg-white/10 rounded-full appearance-none outline-none cursor-pointer"
    />
    <span className="w-12 text-right text-xs font-mono text-light-text-muted dark:text-dark-text-muted">{format ? format(value) : value}</span>
  </div>
);

const ButtonGroup = ({ label, options, value, onChange }: {
  label: string; options: { value: string; label: string; icon?: React.ReactNode }[];
  value: string; onChange: (v: string) => void;
}) => (
  <div className="flex flex-col gap-2">
    <span className="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">{label}</span>
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cx(
            "flex-1 py-1.5 px-3 rounded-lg border text-sm transition-all duration-instant active:scale-[0.98]",
            value === opt.value
              ? "bg-light-accent/10 border-light-accent text-light-accent dark:bg-dark-accent/10 dark:border-dark-accent dark:text-dark-accent"
              : "border-black/10 dark:border-white/10 text-light-text dark:text-dark-text hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10"
          )}
        >
          {opt.icon && <span className="inline-block mr-2 align-middle">{opt.icon}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);

const MiniToggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={cx(
      "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all duration-instant",
      checked
        ? "bg-light-accent/10 dark:bg-dark-accent/10 text-light-text dark:text-dark-text"
        : "bg-black/[0.02] dark:bg-white/[0.02] text-light-text-muted dark:text-dark-text-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
    )}
  >
    <span className="font-medium">{label}</span>
    <div className={cx("relative w-9 h-5 rounded-full transition-colors", checked ? "bg-light-accent dark:bg-dark-accent" : "bg-black/20 dark:bg-white/20")}>
      <div className={cx("absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all", checked ? "left-4" : "left-0.5")} />
    </div>
  </button>
);

const ShortcutRow = ({ label, keys, onChange }: { label: string; keys: string[]; onChange: (keys: string[]) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempKeys, setTempKeys] = useState<string[]>([]);

  const startEditing = () => { setTempKeys([...keys]); setIsEditing(true); };
  const cancelEditing = () => { setIsEditing(false); setTempKeys([]); };
  const saveEditing = () => { onChange(tempKeys); setIsEditing(false); setTempKeys([]); };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();
    const key = e.key;
    if (key === "Escape") cancelEditing();
    else if (key === "Enter") saveEditing();
    else if (key === "Backspace") {
      if (tempKeys.length > 0) setTempKeys(tempKeys.slice(0, -1));
      else { onChange([]); cancelEditing(); }
    } else if (!tempKeys.includes(key)) setTempKeys([...tempKeys, key]);
  };

  const removeKey = (keyToRemove: string) => onChange(keys.filter(k => k !== keyToRemove));

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-light-text dark:text-dark-text">{label}</span>
      <div className="flex items-center gap-2">
        {isEditing ? (
          <input
            type="text" readOnly autoFocus
            aria-label={`${label} shortcut editor`}
            className="px-2 py-1 text-xs bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent cursor-text min-w-[100px] text-center"
            onKeyDown={handleKeyDown}
            onBlur={cancelEditing}
            value={tempKeys.length === 0 ? "Press keys…" : tempKeys.join(" + ")}
            onChange={() => {}}
          />
        ) : (
          <div className="flex items-center gap-1">
            {keys.map((key, i) => (
              <span key={i} className="relative group">
                <kbd className="px-1.5 py-0.5 text-[11px] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded font-mono">
                  {key === " " ? "Space" : key}
                </kbd>
                <IconButton
                  onClick={() => removeKey(key)}
                  label={`Remove ${key} key binding`}
                  icon={<X className="w-2.5 h-2.5" />}
                  variant="ghost" size="sm"
                  className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 !p-0 bg-red-500 text-white !rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </span>
            ))}
            <Button
              onClick={startEditing}
              variant="ghost" size="sm"
              aria-label={`Add key binding for ${label}`}
              className="!px-1.5 !py-0.5 !rounded-lg bg-light-accent/10 dark:bg-dark-accent/10 text-light-accent dark:text-dark-accent hover:bg-light-accent/20 dark:hover:bg-dark-accent/20"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

type ShortcutKey = "nextPage" | "prevPage" | "toggleBookmark" | "toggleFullscreen" | "toggleUI" | "close";
const SHORTCUTS: Array<{ key: ShortcutKey; label: string }> = [
  { key: "nextPage", label: "Next Page" },
  { key: "prevPage", label: "Previous Page" },
  { key: "toggleBookmark", label: "Toggle Bookmark" },
  { key: "toggleFullscreen", label: "Toggle Fullscreen" },
  { key: "toggleUI", label: "Toggle UI" },
  { key: "close", label: "Close/Exit" },
];

export default function ReaderSettings() {
  const state = useSettingsShallow((s) => s);
  const { voices } = useReaderSpeech();

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-black/5 dark:border-white/5">
        <h2 className="font-semibold text-light-text dark:text-dark-text">Reader Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-8">

        {/* Colors */}
        <div>
          <h3 className="text-base font-semibold text-light-text dark:text-dark-text tracking-tight mb-4">Theme</h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {COLOR_PRESETS.map((preset) => {
              const isActive = preset.bg === state.readerBackground;
              return (
                <button
                  key={preset.id}
                  onClick={() => { state.setReaderForeground(preset.fg); state.setReaderBackground(preset.bg); state.setReaderAccent(preset.accent); }}
                  className={cx(
                    "relative flex flex-col items-center p-3 rounded-xl border transition-all duration-instant",
                    isActive ? "border-light-accent dark:border-dark-accent" : "border-black/10 dark:border-white/10 hover:border-light-accent/40 dark:hover:border-dark-accent/40"
                  )}
                >
                  <div className="w-10 h-10 rounded-lg mb-2 flex items-center justify-center border border-black/10 dark:border-white/10" style={{ backgroundColor: preset.bg }}>
                    <span className="text-sm font-serif font-bold" style={{ color: preset.fg }}>Aa</span>
                  </div>
                  <span className="text-xs font-medium text-light-text dark:text-dark-text">{preset.label}</span>
                  {isActive && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-light-accent dark:bg-dark-accent rounded-full flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-black/10 dark:border-white/10 cursor-pointer">
              <input type="color" value={state.readerForeground} onChange={(e) => state.setReaderForeground(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
              <div className="w-6 h-6 rounded-md border border-black/10 dark:border-white/10" style={{ backgroundColor: state.readerForeground }} />
              <span className="text-[11px] font-medium text-light-text dark:text-dark-text">Text</span>
            </label>
            <label className="relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-black/10 dark:border-white/10 cursor-pointer">
              <input type="color" value={state.readerBackground} onChange={(e) => state.setReaderBackground(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
              <div className="w-6 h-6 rounded-md border border-black/10 dark:border-white/10" style={{ backgroundColor: state.readerBackground }} />
              <span className="text-[11px] font-medium text-light-text dark:text-dark-text">Background</span>
            </label>
            <label className="relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-black/10 dark:border-white/10 cursor-pointer">
              <input type="color" value={state.readerAccent} onChange={(e) => state.setReaderAccent(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
              <div className="w-6 h-6 rounded-md border border-black/10 dark:border-white/10" style={{ backgroundColor: state.readerAccent }} />
              <span className="text-[11px] font-medium text-light-text dark:text-dark-text">Accent</span>
            </label>
          </div>
        </div>

        {/* Typography */}
        <div>
          <h3 className="text-base font-semibold text-light-text dark:text-dark-text tracking-tight mb-4">Typography</h3>
          <div className="space-y-4">
            <Slider label="Size" value={state.fontSize} min={12} max={32} step={1} onChange={state.setFontSize} format={(v) => v + "px"} />
            <Slider label="Line Height" value={state.lineHeight} min={1.1} max={2.5} step={0.05} onChange={state.setLineHeight} format={(v) => v.toFixed(2)} />
            <Slider label="Paragraph Gap" value={state.paragraphSpacing} min={0} max={40} step={2} onChange={state.setParagraphSpacing} format={(v) => v + "px"} />
            <Slider label="Margin" value={state.pageMargin} min={0} max={100} step={5} onChange={state.setPageMargin} format={(v) => v + "px"} />

            <ButtonGroup
              label="Font"
              value={state.fontPairing}
              onChange={state.setFontPairing}
              options={FONT_PAIRINGS.map(f => ({ value: f.id, label: f.label }))}
            />

            <ButtonGroup
              label="Alignment"
              value={state.textAlignment}
              onChange={state.setTextAlignment}
              options={[
                { value: "left", label: "Left", icon: <AlignLeft className="w-4 h-4" /> },
                { value: "justify", label: "Justify", icon: <AlignJustify className="w-4 h-4" /> },
                { value: "center", label: "Center", icon: <AlignCenter className="w-4 h-4" /> },
              ]}
            />

            <MiniToggle checked={state.hyphenation} onChange={state.setHyphenation} label="Hyphenation" />
          </div>
        </div>

        {/* Layout */}
        <div>
          <h3 className="text-base font-semibold text-light-text dark:text-dark-text tracking-tight mb-4">Layout</h3>
          <div className="space-y-4">
            <ButtonGroup
              label="Reading Mode"
              value={state.continuous ? "flow" : "paginated"}
              onChange={(v) => state.setContinuous(v === "flow")}
              options={[
                { value: "paginated", label: "Pages", icon: <BookOpen className="w-4 h-4" /> },
                { value: "flow", label: "Scroll", icon: <Layers className="w-4 h-4" /> },
              ]}
            />
            {state.continuous && (
              <Slider label="Max Width" value={state.maxTextWidth} min={40} max={120} step={5} onChange={state.setMaxTextWidth} format={(v) => v + "ch"} />
            )}
            {!state.continuous && (
              <MiniToggle checked={state.spread} onChange={state.setSpread} label="Two-Page Spread" />
            )}
            <ButtonGroup
              label="Text Direction"
              value={state.direction}
              onChange={(v) => state.setDirection(v as "auto" | "ltr" | "rtl")}
              options={[
                { value: "auto", label: "Auto" },
                { value: "ltr", label: "LTR" },
                { value: "rtl", label: "RTL" },
              ]}
            />
          </div>
        </div>

        {/* Display */}
        <div>
          <h3 className="text-base font-semibold text-light-text dark:text-dark-text tracking-tight mb-4">Display</h3>
          <div className="space-y-4">
            <Slider label="Brightness" value={state.brightness} min={50} max={100} step={1} onChange={state.setBrightness} format={(v) => v + "%"} />
            <MiniToggle checked={state.grayscale} onChange={state.setGrayscale} label="Grayscale" />
            <MiniToggle checked={state.showScrollbar} onChange={state.setShowScrollbar} label="Show Scrollbar" />
            <MiniToggle checked={state.showPageCounter} onChange={state.setShowPageCounter} label="Page Counter" />
            <MiniToggle checked={state.showFloatingCapsule} onChange={state.setShowFloatingCapsule} label="Title Capsule" />
            <ButtonGroup
              label="Progress Bar"
              value={state.progressBarType}
              onChange={(v) => state.setProgressBarType(v as "bar" | "none")}
              options={[
                { value: "bar", label: "Show" },
                { value: "none", label: "Hide" },
              ]}
            />
            {state.progressBarType !== "none" && (
              <ButtonGroup
                label="Bar Position"
                value={state.barPosition}
                onChange={(v) => state.setBarPosition(v as "top" | "bottom")}
                options={[
                  { value: "top", label: "Top", icon: <Columns2 className="w-4 h-4 rotate-90" /> },
                  { value: "bottom", label: "Bottom", icon: <Columns2 className="w-4 h-4 -rotate-90" /> },
                ]}
              />
            )}
          </div>
        </div>

        {/* Text-to-Speech */}
        <div>
          <h3 className="text-base font-semibold text-light-text dark:text-dark-text tracking-tight mb-4">Read Aloud</h3>
          <div className="space-y-4">
            {voices.length > 0 ? (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">Voice</span>
                <select
                  value={state.ttsVoiceURI ?? ""}
                  onChange={(e) => state.setTtsVoiceURI(e.target.value || null)}
                  className="w-full h-10 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text text-sm px-3 outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
                >
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-xs text-light-text-muted dark:text-dark-text-muted">No voices available on this device.</p>
            )}
            <Slider label="Rate" value={state.ttsRate} min={0.5} max={2} step={0.1} onChange={state.setTtsRate} format={(v) => v.toFixed(1) + "x"} />
            <Slider label="Pitch" value={state.ttsPitch} min={0.5} max={2} step={0.1} onChange={state.setTtsPitch} format={(v) => v.toFixed(1)} />
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div>
          <h3 className="text-base font-semibold text-light-text dark:text-dark-text tracking-tight mb-4">Keyboard Shortcuts</h3>
          <div className="space-y-1 p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] divide-y divide-black/5 dark:divide-white/5">
            {SHORTCUTS.map((s) => (
              <ShortcutRow
                key={s.key}
                label={s.label}
                keys={state.keybinds[s.key]}
                onChange={(keys) => state.setKeybinds({ ...state.keybinds, [s.key]: keys })}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
