import type { CustomFontRecord } from "@/utils/db";

import {
  deleteCustomFont as dbDeleteCustomFont,
  getAllCustomFonts as dbGetAllCustomFonts,
  putCustomFont as dbPutCustomFont,
} from "@/utils/db";

let cachedFonts: CustomFontRecord[] = [];
const loadedFamilies = new Set<string>();

/**
 * Converts an ArrayBuffer to a base64 Data URL for embedding in @font-face CSS rules.
 */
export function arrayBufferToDataUrl(buffer: ArrayBuffer, mimeType: string): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Resolves CSS font format identifier and MIME type from filename or format.
 */
export function resolveFontFormat(filename: string): {
  format: "opentype" | "truetype" | "woff" | "woff2";
  mime: string;
} {
  const ext = filename.toLowerCase().split(".").pop() || "";
  if (ext === "woff2") return { format: "woff2", mime: "font/woff2" };
  if (ext === "woff") return { format: "woff", mime: "font/woff" };
  if (ext === "otf") return { format: "opentype", mime: "font/otf" };
  return { format: "truetype", mime: "font/ttf" };
}

/**
 * Cleans a font filename into a legible family name.
 */
export function cleanFontFamilyName(filename: string): string {
  const base = filename.replace(/\.[^/.]+$/, "");
  return base
    .replace(/[-_]+/g, " ")
    .trim()
    .slice(0, 32);
}

/**
 * Loads a CustomFontRecord into document.fonts if available.
 */
export async function registerFontFace(font: CustomFontRecord): Promise<void> {
  if (typeof window === "undefined" || typeof FontFace === "undefined" || !document.fonts) {
    return;
  }

  try {
    if (!loadedFamilies.has(font.family)) {
      const fontFace = new FontFace(font.family, font.data);
      await fontFace.load();
      document.fonts.add(fontFace);
      loadedFamilies.add(font.family);
    }
  } catch (err) {
    console.warn(`Failed to register FontFace for ${font.family}:`, err);
  }
}

/**
 * Generates @font-face CSS blocks for all active custom fonts, suitable for
 * injecting into reader iframes.
 */
export function generateCustomFontFaceCss(fonts: CustomFontRecord[]): string {
  if (fonts.length === 0) return "";

  return fonts
    .map((f) => {
      const mime =
        f.format === "woff2"
          ? "font/woff2"
          : f.format === "woff"
          ? "font/woff"
          : f.format === "opentype"
          ? "font/otf"
          : "font/ttf";
      const dataUrl = arrayBufferToDataUrl(f.data, mime);
      return `@font-face {\n  font-family: '${f.family}';\n  src: url('${dataUrl}') format('${f.format}');\n  font-weight: 100 900;\n  font-style: normal;\n  font-display: swap;\n}\n`;
    })
    .join("\n");
}

/**
 * Ingests and stores a custom font file (.woff2, .woff, .ttf, .otf).
 */
export async function installCustomFont(file: File): Promise<CustomFontRecord> {
  const { format } = resolveFontFormat(file.name);
  const family = cleanFontFamilyName(file.name);
  const data = await file.arrayBuffer();

  const record: CustomFontRecord = {
    createdAt: Date.now(),
    data,
    family,
    format,
    id: `custom_font_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  };

  await dbPutCustomFont(record);
  await registerFontFace(record);

  cachedFonts = [...cachedFonts, record];
  return record;
}

/**
 * Loads all saved custom fonts from IndexedDB and activates them.
 */
export async function loadSavedCustomFonts(): Promise<CustomFontRecord[]> {
  try {
    const fonts = await dbGetAllCustomFonts();
    cachedFonts = fonts;
    for (const font of fonts) {
      await registerFontFace(font);
    }
    return fonts;
  } catch (err) {
    console.warn("Failed to load saved custom fonts:", err);
    return [];
  }
}

/**
 * Gets currently loaded cached custom fonts.
 */
export function getLoadedCustomFonts(): CustomFontRecord[] {
  return cachedFonts;
}

/**
 * Deletes a custom font by ID from storage.
 */
export async function removeCustomFont(id: string): Promise<void> {
  await dbDeleteCustomFont(id);
  cachedFonts = cachedFonts.filter((f) => f.id !== id);
}
