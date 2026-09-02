/**
 * Declarative configuration for reader UI options.
 * Central source of truth — import from here, not from individual view files.
 */

import { Sun, Moon, Coffee, Droplets } from "lucide-react";

// ── Color Presets ─────────────────────────────────────────────────────────────

export interface ColorPreset {
  accent: string;
  bg: string;
  fg: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  id: string;
  label: string;
}

export const COLOR_PRESETS: ColorPreset[] = [
  { accent: "#8B7355", bg: "#ffffff", fg: "#1a1a1a", icon: Sun, id: "light", label: "Paper" },
  { accent: "#8B7355", bg: "#FBF8F3", fg: "#2B2B2B", icon: Coffee, id: "cream", label: "Ivory" },
  { accent: "#8B7355", bg: "#F4ECD8", fg: "#5C4B37", icon: Droplets, id: "sepia", label: "Sepia" },
  { accent: "#d4b58b", bg: "#1a1a1a", fg: "#e8e6e3", icon: Moon, id: "dark", label: "Ink" },
  { accent: "#79c0ff", bg: "#0d1117", fg: "#c9d1d9", icon: Moon, id: "midnight", label: "Midnight" },
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
