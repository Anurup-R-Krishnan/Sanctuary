import { Check } from "lucide-react";

import { Toggle } from "@/components/ui/Toggle";
import { useSettingsShallow } from "@/store/useSettingsStore";
import { type AccessibilityToggleKey, COLOR_VISION_MODES, UI_TEXT_SCALES } from "@/utils/accessibility";
import { cx } from "@/utils/cx";

const PREVIEW_SWATCHES = [
  { color: "#D55E00", name: "Red" },
  { color: "#009E73", name: "Green" },
  { color: "#0072B2", name: "Blue" },
  { color: "#F0E442", name: "Yellow" },
  { color: "#CC79A7", name: "Pink" },
];

export function ColorVisionPicker() {
  const { colorVision, setColorVision } = useSettingsShallow((s) => ({ colorVision: s.colorVision, setColorVision: s.setColorVision }));
  return (
    <div className="space-y-3">
    <div aria-hidden="true" className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-subtle px-4 py-3">
      <span className="text-xs text-fg-muted">Current colours</span>
      {PREVIEW_SWATCHES.map((swatch) => (
        <span className="flex items-center gap-1.5 text-xs text-fg" key={swatch.name}>
          <span className="h-4 w-4 rounded-sm border border-black/10" style={{ backgroundColor: swatch.color }} />
          {swatch.name}
        </span>
      ))}
    </div>
    <div aria-label="Colour vision" className="grid gap-2" role="radiogroup">
      {COLOR_VISION_MODES.map((mode) => {
        const selected = colorVision === mode.id;
        return (
          <button
            aria-checked={selected}
            className={cx(
              "flex items-center gap-4 rounded-lg border px-4 py-3 text-left transition-colors",
              selected ? "border-accent bg-accent/10" : "border-line bg-surface-raised hover:border-accent/40"
            )}
            key={mode.id}
            onClick={() => setColorVision(mode.id)}
            role="radio"
            type="button"
          >
            <span
              aria-hidden="true"
              className={cx(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                selected ? "border-accent bg-accent text-accent-fg" : "border-line"
              )}
            >
              {selected && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-fg">{mode.label}</span>
              <span className="mt-0.5 block text-xs text-fg-muted">{mode.description}</span>
            </span>
          </button>
        );
      })}
    </div>
    </div>
  );
}

export function TextSizePicker() {
  const { setUiTextScale, uiTextScale } = useSettingsShallow((s) => ({ setUiTextScale: s.setUiTextScale, uiTextScale: s.uiTextScale }));
  return (
    <div aria-label="Interface text size" className="grid grid-cols-4 gap-2" role="radiogroup">
      {UI_TEXT_SCALES.map((scale) => {
        const selected = uiTextScale === scale;
        return (
          <button
            aria-checked={selected}
            className={cx(
              "flex flex-col items-center gap-1 rounded-lg border px-2 py-3 transition-colors",
              selected ? "border-accent bg-accent/10 text-accent" : "border-line bg-surface-raised text-fg hover:border-accent/40"
            )}
            key={scale}
            onClick={() => setUiTextScale(scale)}
            role="radio"
            type="button"
          >
            <span className="font-display leading-none" style={{ fontSize: `${(scale / 100) * 1.25}rem` }}>Aa</span>
            <span className="text-xs tabular-nums text-fg-muted">{scale}%</span>
          </button>
        );
      })}
    </div>
  );
}

const SETTER_BY_KEY = {
  announcePageChanges: "setAnnouncePageChanges",
  dyslexicUiFont: "setDyslexicUiFont",
  highContrast: "setHighContrast",
  largeTargets: "setLargeTargets",
  reduceMotion: "setReduceMotion",
  strongFocus: "setStrongFocus",
  underlineLinks: "setUnderlineLinks",
} as const;

export function AccessibilityToggleList({ options }: { options: Array<{ description: string; key: AccessibilityToggleKey; title: string }> }) {
  const state = useSettingsShallow((s) => ({
    announcePageChanges: s.announcePageChanges,
    dyslexicUiFont: s.dyslexicUiFont,
    highContrast: s.highContrast,
    largeTargets: s.largeTargets,
    reduceMotion: s.reduceMotion,
    setAnnouncePageChanges: s.setAnnouncePageChanges,
    setDyslexicUiFont: s.setDyslexicUiFont,
    setHighContrast: s.setHighContrast,
    setLargeTargets: s.setLargeTargets,
    setReduceMotion: s.setReduceMotion,
    setStrongFocus: s.setStrongFocus,
    setUnderlineLinks: s.setUnderlineLinks,
    strongFocus: s.strongFocus,
    underlineLinks: s.underlineLinks,
  }));
  return (
    <div className="divide-y divide-line/70">
      {options.map((option) => (
        <div className="flex items-center justify-between gap-6 py-4" key={option.key}>
          <div className="min-w-0">
            <p className="text-sm font-medium text-fg">{option.title}</p>
            <p className="mt-0.5 text-sm text-fg-muted">{option.description}</p>
          </div>
          <Toggle checked={state[option.key]} label={option.title} onChange={state[SETTER_BY_KEY[option.key]]} />
        </div>
      ))}
    </div>
  );
}
