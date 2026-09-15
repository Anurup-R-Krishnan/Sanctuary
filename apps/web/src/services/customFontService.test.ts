import { describe, expect, it } from "bun:test";

import { ReaderThemeController } from "@/reader/engine/ReaderThemeController";

import {
  arrayBufferToDataUrl,
  cleanFontFamilyName,
  generateCustomFontFaceCss,
  resolveFontFormat,
} from "./customFontService";

describe("Custom Font Service & Dynamic Typography Engine", () => {
  describe("Font Format & Name Resolvers", () => {
    it("resolves correct format and mime types for supported font extensions", () => {
      expect(resolveFontFormat("Atkinson-Hyperlegible.woff2")).toEqual({
        format: "woff2",
        mime: "font/woff2",
      });
      expect(resolveFontFormat("Lora-Variable.woff")).toEqual({
        format: "woff",
        mime: "font/woff",
      });
      expect(resolveFontFormat("CrimsonPro-Regular.otf")).toEqual({
        format: "opentype",
        mime: "font/otf",
      });
      expect(resolveFontFormat("FiraCode-Retina.ttf")).toEqual({
        format: "truetype",
        mime: "font/ttf",
      });
    });

    it("cleans and sanitizes font filenames into readable family names", () => {
      expect(cleanFontFamilyName("Atkinson_Hyperlegible-Bold.woff2")).toBe(
        "Atkinson Hyperlegible Bold"
      );
      expect(cleanFontFamilyName("MyCustomFont-Regular.otf")).toBe(
        "MyCustomFont Regular"
      );
    });

    it("converts raw ArrayBuffer to base64 Data URL accurately", () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const dataUrl = arrayBufferToDataUrl(bytes.buffer, "font/woff2");
      expect(dataUrl).toBe("data:font/woff2;base64,SGVsbG8=");
    });
  });

  describe("generateCustomFontFaceCss", () => {
    it("returns empty string when no custom fonts are registered", () => {
      expect(generateCustomFontFaceCss([])).toBe("");
    });

    it("generates comprehensive @font-face CSS blocks for active custom fonts", () => {
      const mockBytes = new Uint8Array([1, 2, 3, 4]);
      const css = generateCustomFontFaceCss([
        {
          createdAt: 1714557600000,
          data: mockBytes.buffer,
          family: "Atkinson Custom",
          format: "woff2",
          id: "font-1",
        },
      ]);

      expect(css).toContain("@font-face");
      expect(css).toContain("font-family: 'Atkinson Custom'");
      expect(css).toContain("format('woff2')");
      expect(css).toContain("font-weight: 100 900");
    });
  });

  describe("ReaderThemeController with Font Weight and Custom Font Families", () => {
    const controller = new ReaderThemeController();

    it("applies explicit font-weight to body element styles", () => {
      const styles = controller.buildStyles({
        continuous: false,
        fontPairing: "merriweather-georgia",
        fontSize: 18,
        fontWeight: 600,
        hyphenation: true,
        lineHeight: 1.6,
        maxTextWidth: 70,
        pageMargin: 30,
        paragraphSpacing: 16,
        readerBackground: "#ffffff",
        readerForeground: "#1a1a1a",
        textAlignment: "justify",
      });

      expect(styles.body["font-weight"]).toBe("600");
      expect(styles.body["font-family"]).toContain("'Merriweather'");
    });

    it("defaults to 400 font-weight when not specified", () => {
      const styles = controller.buildStyles({
        continuous: false,
        fontPairing: "lora",
        fontSize: 18,
        hyphenation: false,
        lineHeight: 1.5,
        maxTextWidth: 70,
        pageMargin: 25,
        paragraphSpacing: 14,
        readerBackground: "#000000",
        readerForeground: "#ffffff",
        textAlignment: "left",
      });

      expect(styles.body["font-weight"]).toBe("400");
    });

    it("resolves custom uploaded font family names gracefully", () => {
      const styles = controller.buildStyles({
        continuous: false,
        fontPairing: "Atkinson Custom",
        fontSize: 19,
        fontWeight: 500,
        hyphenation: true,
        lineHeight: 1.7,
        maxTextWidth: 80,
        pageMargin: 35,
        paragraphSpacing: 18,
        readerBackground: "#fdf6e3",
        readerForeground: "#586e75",
        textAlignment: "left",
      });

      expect(styles.body["font-family"]).toBe("'Atkinson Custom', Georgia, serif");
      expect(styles.body["font-weight"]).toBe("500");
    });
  });
});
