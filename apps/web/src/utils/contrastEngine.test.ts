import { describe, expect, it } from 'bun:test';

import {
  getContrastRatio,
  getReadableTextColor,
  getRelativeLuminance,
  getWcagRating,
  hexToRgb,
  isOledBlack,
  rgbToHex,
} from './contrastEngine';

describe('contrastEngine', () => {
  describe('hexToRgb', () => {
    it('parses standard 6-digit hex colors with #', () => {
      expect(hexToRgb('#ffffff')).toEqual({ b: 255, g: 255, r: 255 });
      expect(hexToRgb('#000000')).toEqual({ b: 0, g: 0, r: 0 });
      expect(hexToRgb('#ff0000')).toEqual({ b: 0, g: 0, r: 255 });
    });

    it('parses 3-digit shorthand hex colors', () => {
      expect(hexToRgb('#fff')).toEqual({ b: 255, g: 255, r: 255 });
      expect(hexToRgb('#000')).toEqual({ b: 0, g: 0, r: 0 });
      expect(hexToRgb('f00')).toEqual({ b: 0, g: 0, r: 255 });
    });

    it('returns null for invalid hex strings', () => {
      expect(hexToRgb('invalid')).toBeNull();
      expect(hexToRgb('#12345')).toBeNull();
      expect(hexToRgb('')).toBeNull();
    });
  });

  describe('rgbToHex', () => {
    it('converts RGB components to lowercase hex string', () => {
      expect(rgbToHex(255, 255, 255)).toBe('#ffffff');
      expect(rgbToHex(0, 0, 0)).toBe('#000000');
      expect(rgbToHex(139, 115, 85)).toBe('#8b7355');
    });

    it('clamps values between 0 and 255', () => {
      expect(rgbToHex(-10, 300, 100)).toBe('#00ff64');
    });
  });

  describe('getRelativeLuminance', () => {
    it('computes 1.0 for pure white and 0.0 for pure black', () => {
      expect(getRelativeLuminance(255, 255, 255)).toBeCloseTo(1.0, 4);
      expect(getRelativeLuminance(0, 0, 0)).toBeCloseTo(0.0, 4);
    });

    it('correctly weighs green channel higher than blue and red per CIE standard', () => {
      const redLum = getRelativeLuminance(255, 0, 0);
      const greenLum = getRelativeLuminance(0, 255, 0);
      const blueLum = getRelativeLuminance(0, 0, 255);

      expect(greenLum).toBeGreaterThan(redLum);
      expect(redLum).toBeGreaterThan(blueLum);
    });
  });

  describe('getContrastRatio', () => {
    it('calculates 21.0:1 for pure black on pure white', () => {
      expect(getContrastRatio('#000000', '#ffffff')).toBe(21);
      expect(getContrastRatio('#ffffff', '#000000')).toBe(21);
    });

    it('calculates 1.0:1 for identical colors', () => {
      expect(getContrastRatio('#fbf8f3', '#fbf8f3')).toBe(1);
    });

    it('handles classic Sanctuary reading themes accurately', () => {
      // Paper (#1a1a1a on #ffffff)
      const paperRatio = getContrastRatio('#1a1a1a', '#ffffff');
      expect(paperRatio).toBeGreaterThan(16);

      // Sepia (#5c4b37 on #f4ecd8)
      const sepiaRatio = getContrastRatio('#5c4b37', '#f4ecd8');
      expect(sepiaRatio).toBeGreaterThan(7); // AAA

      // Low contrast failing scenario (light gray on white)
      const lowContrast = getContrastRatio('#cccccc', '#ffffff');
      expect(lowContrast).toBeLessThan(4.5);
    });
  });

  describe('getWcagRating', () => {
    it('rates >= 7.0 as AAA', () => {
      const result = getWcagRating('#1a1a1a', '#ffffff');
      expect(result.rating).toBe('AAA');
      expect(result.isAccessible).toBe(true);
    });

    it('rates >= 4.5 and < 7.0 as AA', () => {
      // Solarized Light base text (#586e75 on #fdf6e3)
      const result = getWcagRating('#586e75', '#fdf6e3');
      expect(result.rating).toBe('AA');
      expect(result.isAccessible).toBe(true);
    });

    it('rates < 4.5 as FAIL with warning label', () => {
      const result = getWcagRating('#999999', '#ffffff');
      expect(result.rating).toBe('FAIL');
      expect(result.isAccessible).toBe(false);
      expect(result.label).toContain('Low Contrast');
    });
  });

  describe('isOledBlack', () => {
    it('returns true for pure #000000 hex variants', () => {
      expect(isOledBlack('#000000')).toBe(true);
      expect(isOledBlack('#000')).toBe(true);
      expect(isOledBlack('000000')).toBe(true);
    });

    it('returns false for near-black or dark gray shades', () => {
      expect(isOledBlack('#0d1117')).toBe(false);
      expect(isOledBlack('#1a1a1a')).toBe(false);
    });
  });

  describe('getReadableTextColor', () => {
    it('returns dark text for light backgrounds', () => {
      expect(getReadableTextColor('#ffffff')).toBe('#1a1a1a');
      expect(getReadableTextColor('#f4ecd8')).toBe('#1a1a1a');
      expect(getReadableTextColor('#ebf1e8')).toBe('#1a1a1a');
    });

    it('returns light text for dark backgrounds', () => {
      expect(getReadableTextColor('#000000')).toBe('#e8e6e3');
      expect(getReadableTextColor('#1a1a1a')).toBe('#e8e6e3');
      expect(getReadableTextColor('#0d1117')).toBe('#e8e6e3');
    });
  });
});
