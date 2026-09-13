/**
 * Declarative configuration for reader UI options.
 * Central source of truth — import from here, not from individual view files.
 */

import { Coffee, Droplets, Flame, Leaf, Moon, Sparkles, Sun } from "lucide-react";

// ── Color Presets ─────────────────────────────────────────────────────────────

export interface ColorPreset {
  accent: string;
  bg: string;
  description?: string;
  fg: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  id: string;
  isDark?: boolean;
  label: string;
}

export interface CustomPalette {
  accent: string;
  bg: string;
  createdAt: number;
  fg: string;
  id: string;
  label: string;
}

export const COLOR_PRESETS: ColorPreset[] = [
  { accent: "#8B7355", bg: "#ffffff", description: "Crisp white paper with deep ink", fg: "#1a1a1a", icon: Sun, id: "light", isDark: false, label: "Paper" },
  { accent: "#8B7355", bg: "#FBF8F3", description: "Warm ivory hue for daytime reading", fg: "#2B2B2B", icon: Coffee, id: "cream", isDark: false, label: "Ivory" },
  { accent: "#8B7355", bg: "#F4ECD8", description: "Vintage warm paper tone", fg: "#5C4B37", icon: Droplets, id: "sepia", isDark: false, label: "Sepia" },
  { accent: "#4B7249", bg: "#EBF1E8", description: "Calming forest sage tint", fg: "#283827", icon: Leaf, id: "sage", isDark: false, label: "Sage" },
  { accent: "#268BD2", bg: "#FDF6E3", description: "Ethan Schoonover's light palette", fg: "#586E75", icon: Sun, id: "solarized-light", isDark: false, label: "Solarized" },
  { accent: "#d4b58b", bg: "#1a1a1a", description: "Charcoal dark mode with soft text", fg: "#e8e6e3", icon: Moon, id: "dark", isDark: true, label: "Ink" },
  { accent: "#2AA198", bg: "#002B36", description: "Low-strain cyan-amber dark palette", fg: "#93A1A1", icon: Moon, id: "solarized-dark", isDark: true, label: "Solar Dark" },
  { accent: "#88C0D0", bg: "#2E3440", description: "Arctic polar night palette", fg: "#ECEFF4", icon: Moon, id: "nord", isDark: true, label: "Nord" },
  { accent: "#D79921", bg: "#282828", description: "Retro groove warm ambient dark", fg: "#EBDBB2", icon: Flame, id: "gruvbox", isDark: true, label: "Gruvbox" },
  { accent: "#EBBCBA", bg: "#191724", description: "Muted pastel minimalist dark", fg: "#E0DEF4", icon: Sparkles, id: "rose-pine", isDark: true, label: "Rosé Pine" },
  { accent: "#79c0ff", bg: "#0d1117", description: "Deep navy night sky palette", fg: "#c9d1d9", icon: Moon, id: "midnight", isDark: true, label: "Midnight" },
  { accent: "#82AAFF", bg: "#000000", description: "True pitch black for 0W OLED pixels", fg: "#E2E2E2", icon: Moon, id: "oled", isDark: true, label: "OLED" },
];

// ── Font Pairings ─────────────────────────────────────────────────────────────

export interface FontPairing {
  id: string;
  label: string;
}

export const FONT_PAIRINGS: FontPairing[] = [
  { id: "merriweather-georgia", label: "Merriweather" },
  { id: "crimson-pro",          label: "Crimson Pro" },
  { id: "libre-baskerville",    label: "Libre Baskerville" },
  { id: "lora",                 label: "Lora" },
  { id: "source-serif",         label: "Source Serif" },
  { id: "inter",                label: "Inter (Sans)" },
  { id: "opendyslexic",         label: "OpenDyslexic" },
  { id: "jetbrains-mono",        label: "JetBrains Mono" },
];

// ── Genre palette ─────────────────────────────────────────────────────────────
// Derived from the app's sepia/earth-tone accent language — no raw hex in
// component code; extend this array as needed.

export const GENRE_PALETTE: string[] = [
  "#c7a77b",
  "#8b7355",
  "#d4b58b",
  "#a08060",
  "#e8d5b7",
  "#6b5344",
  "#b5956a",
  "#7a6248",
];
