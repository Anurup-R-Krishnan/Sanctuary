import { describe, expect, it } from "bun:test";

import { READER_FONT_FILES, readerFontFaceCss } from "./readerFonts";

describe("readerFontFaceCss", () => {
  it("declares every reader font with an absolute URL so book frames can load it", () => {
    const css = readerFontFaceCss("https://sanctuary.example/reader/");
    for (const family of ["Merriweather", "Lora", "Libre Baskerville", "Source Serif 4", "Inter", "OpenDyslexic", "Crimson Pro"]) {
      expect(css).toContain(`font-family:"${family}"`);
    }
    expect(css.match(/@font-face/g)?.length).toBe(READER_FONT_FILES.length);
    expect(css).not.toMatch(/url\("(?!https?:|file:)/);
    expect(css.match(/font-style:normal/g)?.length).toBe(READER_FONT_FILES.length);
  });
});
