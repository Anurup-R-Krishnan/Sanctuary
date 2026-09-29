import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Contrast,
  Palette,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { useRef } from "react";
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  COLOR_PRESETS,
  type ColorPreset,
  type CustomPalette,
} from '@/config/readerConfig';
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useSettingsShallow } from '@/store/useSettingsStore';
import {
  getContrastRatio,
  getReadableTextColor,
  getWcagRating,
  isOledBlack,
} from '@/utils/contrastEngine';

export interface ThemeStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ThemeStudioModal({ isOpen, onClose }: ThemeStudioModalProps) {
  const focusTrapRef = useRef<HTMLDivElement>(null);
  useFocusTrap(focusTrapRef, isOpen);
  const {
    customPalettes,
    addCustomPalette,
    deleteCustomPalette,
    readerBackground,
    readerForeground,
    readerAccent,
    setReaderBackground,
    setReaderForeground,
    setReaderAccent,
  } = useSettingsShallow((state) => ({
    addCustomPalette: state.addCustomPalette,
    customPalettes: state.customPalettes,
    deleteCustomPalette: state.deleteCustomPalette,
    readerAccent: state.readerAccent,
    readerBackground: state.readerBackground,
    readerForeground: state.readerForeground,
    setReaderAccent: state.setReaderAccent,
    setReaderBackground: state.setReaderBackground,
    setReaderForeground: state.setReaderForeground,
  }));

  // Local draft state for fine-tuning
  const [draftBg, setDraftBg] = useState(readerBackground);
  const [draftFg, setDraftFg] = useState(readerForeground);
  const [draftAccent, setDraftAccent] = useState(readerAccent);
  const [customName, setCustomName] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Live contrast calculation
  const wcag = useMemo(() => {
    return getWcagRating(draftFg, draftBg);
  }, [draftFg, draftBg]);

  const isOled = useMemo(() => {
    return isOledBlack(draftBg);
  }, [draftBg]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: ColorPreset) => {
    setDraftBg(preset.bg);
    setDraftFg(preset.fg);
    setDraftAccent(preset.accent);
    setReaderBackground(preset.bg);
    setReaderForeground(preset.fg);
    setReaderAccent(preset.accent);
  };

  const handleApplyCustom = (palette: CustomPalette) => {
    setDraftBg(palette.bg);
    setDraftFg(palette.fg);
    setDraftAccent(palette.accent);
    setReaderBackground(palette.bg);
    setReaderForeground(palette.fg);
    setReaderAccent(palette.accent);
  };

  const handleApplyDraft = () => {
    setReaderBackground(draftBg);
    setReaderForeground(draftFg);
    setReaderAccent(draftAccent);
    onClose();
  };

  const handleAutoAdjustFg = () => {
    const optimal = getReadableTextColor(draftBg);
    setDraftFg(optimal);
  };

  const handleSaveCustomPalette = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    addCustomPalette({
      accent: draftAccent,
      bg: draftBg,
      fg: draftFg,
      label: customName.trim(),
    });

    setCustomName('');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return createPortal(
    <div
      ref={focusTrapRef}
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-black/60 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
      role="dialog"
      tabIndex={-1}
      aria-modal="true"
      aria-label="Reader Theme & Contrast Studio"
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-page rounded-xl shadow-2xl border border-line flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-line">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-medium text-xl tracking-tight text-fg">
                Reader Theme & Contrast Studio
              </h2>
              <p className="text-xs text-fg-muted">
                Custom palettes, contrast verification, and reading themes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-full hover:bg-line/40 text-fg-muted hover:text-fg transition-colors"
            aria-label="Close theme studio"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Studio Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Live Preview Swatch */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-fg-muted">
                Live Typography & Contrast Preview
              </span>
              <div className="flex items-center gap-2">
                {isOled && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <Zap className="w-3 h-3" />
                    True Black (OLED)
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    wcag.rating === 'AAA'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : wcag.rating === 'AA'
                        ? 'bg-ink-500/10 text-ink-600 dark:text-ink-400 border-ink-500/20'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  }`}
                >
                  {wcag.isAccessible ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <AlertTriangle className="w-3 h-3" />
                  )}
                  {wcag.ratio}:1 · {wcag.label}
                </span>
              </div>
            </div>

            <div
              className="p-6 rounded-xl border border-line shadow-inner transition-colors duration-200"
              style={{ backgroundColor: draftBg }}
            >
              <h3
                className="font-display font-medium text-lg font-serif tracking-tight mb-2"
                style={{ color: draftAccent }}
              >
                The Art of Thoughtful Reading
              </h3>
              <p
                className="text-sm font-serif leading-relaxed"
                style={{ color: draftFg }}
              >
                It was the best of times, it was the worst of times. Adjust background color and text
                contrast to find a comfortable reading experience across daylight, warm lamp light, or
                dark environments.
              </p>
            </div>
          </div>

          {/* Preset Palettes */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-fg-muted mb-3">
              Theme Palettes
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {COLOR_PRESETS.map((preset) => {
                const isCurrent =
                  preset.bg.toLowerCase() === draftBg.toLowerCase() &&
                  preset.fg.toLowerCase() === draftFg.toLowerCase();
                const ratio = getContrastRatio(preset.fg, preset.bg);

                return (
                  <button
                    key={preset.id}
                    onClick={() => handleApplyPreset(preset)}
                    type="button"
                    className={`relative p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all ${
                      isCurrent
                        ? 'border-accent ring-2 ring-accent/20'
                        : 'border-line hover:border-accent/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 min-w-0">
                      <span className="text-xs font-bold text-fg flex items-center gap-1 min-w-0 truncate">
                        {preset.label}
                        {isCurrent && (
                          <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-accent text-white shrink-0">
                            <Check className="w-2.5 h-2.5" strokeWidth={3} />
                          </span>
                        )}
                      </span>
                      <span className="text-2xs font-mono text-fg-muted shrink-0">
                        {ratio}:1
                      </span>
                    </div>

                    <div
                      className="w-full h-8 rounded-xl flex items-center justify-center border border-line"
                      style={{ backgroundColor: preset.bg }}
                    >
                      <span
                        className="text-xs font-serif font-bold"
                        style={{ color: preset.fg }}
                      >
                        Aa
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Palette Fine-Tuning */}
          <div className="p-4 rounded-xl bg-surface/40 border border-line space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-fg-muted">
                Custom Color Adjuster
              </h4>
              <button
                onClick={handleAutoAdjustFg}
                type="button"
                className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
              >
                <Contrast className="w-3.5 h-3.5" />
                <span>Auto-Contrast Text</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Paper Background */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-fg-muted">
                  Paper (Background)
                </label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-xl border border-line shrink-0 relative cursor-pointer overflow-hidden"
                    style={{ backgroundColor: draftBg }}
                  >
                    <input
                      type="color"
                      value={draftBg}
                      onChange={(e) => setDraftBg(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                  <input
                    type="text"
                    value={draftBg}
                    onChange={(e) => setDraftBg(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl text-xs font-mono bg-page border border-line text-fg outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              {/* Ink Foreground */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-fg-muted">
                  Ink (Text)
                </label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-xl border border-line shrink-0 relative cursor-pointer overflow-hidden"
                    style={{ backgroundColor: draftFg }}
                  >
                    <input
                      type="color"
                      value={draftFg}
                      onChange={(e) => setDraftFg(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                  <input
                    type="text"
                    value={draftFg}
                    onChange={(e) => setDraftFg(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl text-xs font-mono bg-page border border-line text-fg outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              {/* Accent Color */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-fg-muted">
                  Accent
                </label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-xl border border-line shrink-0 relative cursor-pointer overflow-hidden"
                    style={{ backgroundColor: draftAccent }}
                  >
                    <input
                      type="color"
                      value={draftAccent}
                      onChange={(e) => setDraftAccent(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                  <input
                    type="text"
                    value={draftAccent}
                    onChange={(e) => setDraftAccent(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl text-xs font-mono bg-page border border-line text-fg outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>
            </div>

            {/* Save Custom Palette Form */}
            <form
              onSubmit={handleSaveCustomPalette}
              className="pt-2 border-t border-line/60 flex flex-col sm:flex-row items-center gap-2"
            >
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Name your recipe (e.g. Muted Espresso)..."
                className="w-full sm:flex-1 px-3 py-1.5 rounded-xl text-xs bg-page border border-line text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button
                type="submit"
                disabled={!customName.trim()}
                className="w-full sm:w-auto px-4 py-1.5 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {savedSuccess ? 'Saved!' : 'Save Palette'}
              </button>
            </form>
          </div>

          {/* User's Saved Palettes */}
          {customPalettes.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-fg-muted mb-3">
                Your Saved Palettes ({customPalettes.length})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {customPalettes.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-line flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-fg truncate">
                        {item.label}
                      </span>
                      <button
                        onClick={() => deleteCustomPalette(item.id)}
                        type="button"
                        className="p-1 rounded text-fg-muted hover:text-red-500 transition-colors"
                        aria-label={`Delete ${item.label} palette`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleApplyCustom(item)}
                      className="w-full h-8 rounded-xl flex items-center justify-center border border-line cursor-pointer transition-transform active:scale-[0.98]"
                      style={{ backgroundColor: item.bg }}
                    >
                      <span
                        className="text-xs font-serif font-bold"
                        style={{ color: item.fg }}
                      >
                        Aa
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-line bg-surface/40 flex items-center justify-between">
          <div className="text-xs text-fg-muted">
            Live preview matches in-reader Foliate canvas.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-fg-muted hover:text-fg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyDraft}
              type="button"
              className="px-5 py-2 rounded-xl bg-accent hover:bg-accent/90 text-white dark:text-black text-xs font-bold shadow-md transition-all"
            >
              Apply Theme
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
