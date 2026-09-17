/**
 * WCAG 2.1 Relative Luminance & Contrast Utilities
 *
 * Implements W3C WCAG 2.1 relative luminance and contrast ratio algorithms
 * for accessible e-reading themes.
 */

export interface WcagRating {
  isAccessible: boolean;
  label: string;
  rating: 'AAA' | 'AA' | 'FAIL';
  ratio: number;
}

export interface RgbColor {
  b: number;
  g: number;
  r: number;
}

/**
 * Parses a hex color string into 8-bit RGB components.
 * Supports #RGB, #RRGGBB, and un-prefixed hex strings.
 */
export function hexToRgb(hex: string): null | RgbColor {
  if (!hex || typeof hex !== 'string') return null;

  let cleaned = hex.trim().replace(/^#/, '');

  if (cleaned.length === 3) {
    cleaned = cleaned
      .split('')
      .map((c) => c + c)
      .join('');
  }

  if (cleaned.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return null;
  }

  const num = parseInt(cleaned, 16);
  return {
    b: num & 255,
    g: (num >> 8) & 255,
    r: (num >> 16) & 255,
  };
}

/**
 * Converts 8-bit RGB components to a standardized 6-digit hex string (#rrggbb).
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
  const toHex = (val: number) => clamp(val).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Calculates the relative luminance of an sRGB color per W3C WCAG 2.1 specs.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
export function getRelativeLuminance(r: number, g: number, b: number): number {
  const transform = (channel: number) => {
    const s = channel / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  const rLinear = transform(r);
  const gLinear = transform(g);
  const bLinear = transform(b);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Computes the contrast ratio between foreground and background colors.
 * Returns a value between 1.0 (identical) and 21.0 (black on white).
 */
export function getContrastRatio(fgHex: string, bgHex: string): number {
  const fgRgb = hexToRgb(fgHex);
  const bgRgb = hexToRgb(bgHex);

  if (!fgRgb || !bgRgb) {
    return 1.0;
  }

  const l1 = getRelativeLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
  const l2 = getRelativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Math.round(ratio * 100) / 100;
}

/**
 * Evaluates WCAG 2.1 conformance for normal body text.
 * - AAA: ratio >= 7.0:1
 * - AA: ratio >= 4.5:1
 * - FAIL: ratio < 4.5:1
 */
export function getWcagRating(fgHex: string, bgHex: string): WcagRating {
  const ratio = getContrastRatio(fgHex, bgHex);

  if (ratio >= 7.0) {
    return {
      isAccessible: true,
      label: 'Enhanced (AAA)',
      rating: 'AAA',
      ratio,
    };
  }

  if (ratio >= 4.5) {
    return {
      isAccessible: true,
      label: 'Standard (AA)',
      rating: 'AA',
      ratio,
    };
  }

  return {
    isAccessible: false,
    label: 'Low Contrast (Fail)',
    rating: 'FAIL',
    ratio,
  };
}

/**
 * Checks if a background color is true OLED pitch black (#000000).
 */
export function isOledBlack(bgHex: string): boolean {
  const rgb = hexToRgb(bgHex);
  if (!rgb) return false;
  return rgb.r === 0 && rgb.g === 0 && rgb.b === 0;
}

/**
 * Selects an optimal contrasting text color (#1a1a1a or #e8e6e3) for a given background.
 */
export function getReadableTextColor(bgHex: string): string {
  const darkRatio = getContrastRatio('#1a1a1a', bgHex);
  const lightRatio = getContrastRatio('#e8e6e3', bgHex);
  return darkRatio >= lightRatio ? '#1a1a1a' : '#e8e6e3';
}
