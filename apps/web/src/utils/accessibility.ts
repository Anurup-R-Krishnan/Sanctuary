export type ColorVisionMode = "default" | "deutan" | "mono" | "protan" | "tritan";

export const COLOR_VISION_MODES: Array<{ description: string; id: ColorVisionMode; label: string }> = [
  { description: "Colours as designed.", id: "default", label: "Standard" },
  { description: "Red and green are hard to tell apart (deuteranopia).", id: "deutan", label: "Red-green, green-weak" },
  { description: "Red and green are hard to tell apart; reds look dark (protanopia).", id: "protan", label: "Red-green, red-weak" },
  { description: "Blue and yellow are hard to tell apart (tritanopia).", id: "tritan", label: "Blue-yellow" },
  { description: "No colour; shapes, labels and contrast only.", id: "mono", label: "Monochrome" },
];

export const UI_TEXT_SCALES = [100, 112, 125, 150];

export const COLOR_VISION_MATRICES: Record<Exclude<ColorVisionMode, "default" | "mono">, string> = {
  deutan: "1 0 0 0 0  0.1628 0.7250 0.1122 0 0  0.4547 -0.6454 1.1907 0 0  0 0 0 1 0",
  protan: "1 0 0 0 0  0.4789 0.4769 0.0442 0 0  0.5973 -0.6887 1.0914 0 0  0 0 0 1 0",
  tritan: "0.7412 -0.4072 0.6660 0 0  0.0751 0.5852 0.3397 0 0  0 0 1 0 0  0 0 0 1 0",
};

export function isColorVisionMode(value: unknown): value is ColorVisionMode {
  return typeof value === "string" && COLOR_VISION_MODES.some((mode) => mode.id === value);
}

export function colorVisionFilter(mode: ColorVisionMode): string {
  if (mode === "default") return "";
  if (mode === "mono") return "grayscale(1) contrast(1.08)";
  return `url(#sanctuary-cvd-${mode})`;
}

export const CVD_HIGHLIGHT_COLORS = [
  { color: "#E69F00", name: "Orange" },
  { color: "#56B4E9", name: "Sky blue" },
  { color: "#009E73", name: "Bluish green" },
  { color: "#F0E442", name: "Yellow" },
  { color: "#CC79A7", name: "Reddish purple" },
];

export type AccessibilityToggleKey =
  | "announcePageChanges"
  | "dyslexicUiFont"
  | "highContrast"
  | "largeTargets"
  | "reduceMotion"
  | "strongFocus"
  | "underlineLinks";

export const READING_SUPPORT_OPTIONS: Array<{ description: string; key: AccessibilityToggleKey; title: string }> = [
  { description: "Darker text and borders, pure black in dark mode.", key: "highContrast", title: "High contrast" },
  { description: "Use OpenDyslexic for menus and buttons. Book text has its own font setting in the reader.", key: "dyslexicUiFont", title: "Dyslexia-friendly interface font" },
  { description: "Turn off animations and transitions.", key: "reduceMotion", title: "Reduce motion" },
];

export const NAVIGATION_OPTIONS: Array<{ description: string; key: AccessibilityToggleKey; title: string }> = [
  { description: "Show a thick outline around whatever has keyboard focus.", key: "strongFocus", title: "Strong focus outline" },
  { description: "Make buttons and controls at least 44 pixels tall.", key: "largeTargets", title: "Larger controls" },
  { description: "Underline links so they do not rely on colour.", key: "underlineLinks", title: "Underline links" },
  { description: "Screen readers announce the chapter and page after each page turn.", key: "announcePageChanges", title: "Announce page changes" },
];
