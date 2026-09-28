import crimson400 from "@fontsource/crimson-pro/files/crimson-pro-latin-400-normal.woff2?url";
import crimson700 from "@fontsource/crimson-pro/files/crimson-pro-latin-700-normal.woff2?url";
import inter400 from "@fontsource/inter/files/inter-latin-400-normal.woff2?url";
import inter700 from "@fontsource/inter/files/inter-latin-700-normal.woff2?url";
import mono400 from "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2?url";
import baskerville400 from "@fontsource/libre-baskerville/files/libre-baskerville-latin-400-normal.woff2?url";
import baskerville700 from "@fontsource/libre-baskerville/files/libre-baskerville-latin-700-normal.woff2?url";
import lora400 from "@fontsource/lora/files/lora-latin-400-normal.woff2?url";
import lora700 from "@fontsource/lora/files/lora-latin-700-normal.woff2?url";
import merriweather400 from "@fontsource/merriweather/files/merriweather-latin-400-normal.woff2?url";
import merriweather700 from "@fontsource/merriweather/files/merriweather-latin-700-normal.woff2?url";
import dyslexic400 from "@fontsource/opendyslexic/files/opendyslexic-latin-400-normal.woff2?url";
import dyslexic700 from "@fontsource/opendyslexic/files/opendyslexic-latin-700-normal.woff2?url";
import sourceSerif400 from "@fontsource/source-serif-4/files/source-serif-4-latin-400-normal.woff2?url";
import sourceSerif700 from "@fontsource/source-serif-4/files/source-serif-4-latin-700-normal.woff2?url";

export const READER_FONT_FILES: Array<{ family: string; url: string; weight: number }> = [
  { family: "Crimson Pro", url: crimson400, weight: 400 },
  { family: "Crimson Pro", url: crimson700, weight: 700 },
  { family: "Inter", url: inter400, weight: 400 },
  { family: "Inter", url: inter700, weight: 700 },
  { family: "JetBrains Mono", url: mono400, weight: 400 },
  { family: "Libre Baskerville", url: baskerville400, weight: 400 },
  { family: "Libre Baskerville", url: baskerville700, weight: 700 },
  { family: "Lora", url: lora400, weight: 400 },
  { family: "Lora", url: lora700, weight: 700 },
  { family: "Merriweather", url: merriweather400, weight: 400 },
  { family: "Merriweather", url: merriweather700, weight: 700 },
  { family: "OpenDyslexic", url: dyslexic400, weight: 400 },
  { family: "OpenDyslexic", url: dyslexic700, weight: 700 },
  { family: "Source Serif 4", url: sourceSerif400, weight: 400 },
  { family: "Source Serif 4", url: sourceSerif700, weight: 700 },
];

let cachedCss: string | null = null;

export function readerFontFaceCss(baseUrl = typeof window !== "undefined" ? window.location.href : "http://localhost/"): string {
  if (cachedCss !== null) return cachedCss;
  cachedCss = READER_FONT_FILES.map(({ family, url, weight }) => {
    const absolute = new URL(url, baseUrl).href;
    return `@font-face{font-family:"${family}";font-style:normal;font-weight:${weight};font-display:swap;src:url("${absolute}") format("woff2");}`;
  }).join("\n") + "\n";
  return cachedCss;
}
