export interface CoverPalette {
  accent: string;
  bgBottom: string;
  bgTop: string;
  foil: string;
  id: string;
  name: string;
  textColor: string;
}

export type CoverMotif = "arches" | "bookplate" | "celestial" | "diamond";

export interface GenerativeCoverStyle {
  motif: CoverMotif;
  palette: CoverPalette;
}

export const COVER_PALETTES: CoverPalette[] = [
  {
    accent: "#FCA5A5",
    bgBottom: "#450A0A",
    bgTop: "#7F1D1D",
    foil: "#FDE68A",
    id: "terracotta",
    name: "Terracotta Crimson",
    textColor: "#FFF1F2",
  },
  {
    accent: "#93C5FD",
    bgBottom: "#0F172A",
    bgTop: "#1E293B",
    foil: "#E2E8F0",
    id: "navy",
    name: "Midnight Navy",
    textColor: "#F8FAFC",
  },
  {
    accent: "#6EE7B7",
    bgBottom: "#022C22",
    bgTop: "#065F46",
    foil: "#FDE68A",
    id: "forest",
    name: "Forest Sage",
    textColor: "#ECFDF5",
  },
  {
    accent: "#C084FC",
    bgBottom: "#2E1065",
    bgTop: "#581C87",
    foil: "#F5D0FE",
    id: "amethyst",
    name: "Royal Amethyst",
    textColor: "#FAF5FF",
  },
  {
    accent: "#FCD34D",
    bgBottom: "#451A03",
    bgTop: "#92400E",
    foil: "#FEF3C7",
    id: "ochre",
    name: "Vintage Ochre",
    textColor: "#FFFBEB",
  },
  {
    accent: "#A1A1AA",
    bgBottom: "#18181B",
    bgTop: "#27272A",
    foil: "#E4E4E7",
    id: "obsidian",
    name: "Obsidian Carbon",
    textColor: "#FAFAFA",
  },
];

const COVER_MOTIFS: CoverMotif[] = ["arches", "bookplate", "celestial", "diamond"];

/**
 * Computes a deterministic integer hash from a string.
 */
export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Resolves deterministic theme palette and geometric motif from title and author.
 */
export function getGenerativeCoverStyle(title: string, author = ""): GenerativeCoverStyle {
  const seed = `${title.trim().toLowerCase()}::${author.trim().toLowerCase()}`;
  const hash = hashString(seed);

  const paletteIndex = hash % COVER_PALETTES.length;
  const motifIndex = Math.floor(hash / COVER_PALETTES.length) % COVER_MOTIFS.length;

  return {
    motif: COVER_MOTIFS[motifIndex] ?? "arches",
    palette: COVER_PALETTES[paletteIndex] ?? COVER_PALETTES[0],
  };
}

/**
 * Splits title text into multiple lines for SVG rendering.
 */
export function splitTitleForSvg(title: string, maxCharsPerLine = 16): string[] {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return ["Untitled"];

  const lines: string[] = [];
  let current = words[0] || "";

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    if ((current + " " + word).length <= maxCharsPerLine) {
      current += " " + word;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, 4);
}

/**
 * Generates procedural SVG markup string for a book cover.
 */
export function generateCoverSvgString(title: string, author?: string): string {
  const { motif, palette } = getGenerativeCoverStyle(title, author);
  const titleLines = splitTitleForSvg(title, 18);
  const safeAuthor = (author || "").trim().slice(0, 30);

  const titleFontSize = titleLines.length > 2 ? 24 : 28;
  const titleLineHeight = titleFontSize * 1.3;
  const titleBlockHeight = titleLines.length * titleLineHeight;
  const titleStartY = 330 - titleBlockHeight / 2;

  let motifSvg = "";
  if (motif === "arches") {
    motifSvg = `
      <path d="M 160 190 A 40 40 0 0 1 240 190 L 240 220 L 160 220 Z" fill="none" stroke="${palette.foil}" stroke-width="2" opacity="0.6"/>
      <path d="M 175 190 A 25 25 0 0 1 225 190 L 225 220 L 175 220 Z" fill="none" stroke="${palette.foil}" stroke-width="1.5" opacity="0.4"/>
      <circle cx="200" cy="180" r="4" fill="${palette.foil}" opacity="0.8"/>
    `;
  } else if (motif === "diamond") {
    motifSvg = `
      <polygon points="200,150 235,185 200,220 165,185" fill="none" stroke="${palette.foil}" stroke-width="2" opacity="0.6"/>
      <polygon points="200,162 223,185 200,208 177,185" fill="none" stroke="${palette.foil}" stroke-width="1.5" opacity="0.4"/>
      <circle cx="200" cy="185" r="3" fill="${palette.foil}" opacity="0.8"/>
    `;
  } else if (motif === "celestial") {
    motifSvg = `
      <circle cx="200" cy="185" r="35" fill="none" stroke="${palette.foil}" stroke-width="1.5" opacity="0.5"/>
      <circle cx="200" cy="185" r="22" fill="none" stroke="${palette.foil}" stroke-width="2" opacity="0.7"/>
      <circle cx="200" cy="185" r="8" fill="${palette.foil}" opacity="0.8"/>
      <circle cx="230" cy="165" r="3" fill="${palette.foil}" opacity="0.9"/>
    `;
  } else {
    // bookplate
    motifSvg = `
      <rect x="170" y="160" width="60" height="50" fill="none" stroke="${palette.foil}" stroke-width="1.5" opacity="0.6"/>
      <line x1="160" y1="185" x2="240" y2="185" stroke="${palette.foil}" stroke-width="1" opacity="0.4"/>
      <line x1="200" y1="150" x2="200" y2="220" stroke="${palette.foil}" stroke-width="1" opacity="0.4"/>
      <circle cx="200" cy="185" r="4" fill="${palette.foil}" opacity="0.8"/>
    `;
  }

  const titleTextElements = titleLines
    .map(
      (line, i) =>
        `<text x="200" y="${Math.round(titleStartY + i * titleLineHeight)}" text-anchor="middle" fill="${palette.textColor}" font-family="'Crimson Pro', Georgia, serif" font-size="${titleFontSize}" font-weight="600" letter-spacing="0.5">${escapeXml(line)}</text>`
    )
    .join("\n    ");

  const authorElement = safeAuthor
    ? `<text x="200" y="470" text-anchor="middle" fill="${palette.accent}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="500" letter-spacing="1.5">${escapeXml(safeAuthor.toUpperCase())}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="100%" height="100%">
  <defs>
    <linearGradient id="cover-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${palette.bgTop}"/>
      <stop offset="100%" stop-color="${palette.bgBottom}"/>
    </linearGradient>
    <linearGradient id="spine-fold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="rgba(0,0,0,0.4)"/>
      <stop offset="3%" stop-color="rgba(255,255,255,0.15)"/>
      <stop offset="8%" stop-color="rgba(0,0,0,0.2)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </linearGradient>
  </defs>

  <!-- Book Cloth Background -->
  <rect width="400" height="600" fill="url(#cover-bg)"/>

  <!-- Outer Foil Border -->
  <rect x="20" y="20" width="360" height="560" fill="none" stroke="${palette.foil}" stroke-width="1.5" opacity="0.35"/>
  <rect x="26" y="26" width="348" height="548" fill="none" stroke="${palette.foil}" stroke-width="0.75" opacity="0.2"/>

  <!-- Top Geometric Motif -->
  <g>${motifSvg}</g>

  <!-- Title Divider Rule -->
  <line x1="140" y1="260" x2="260" y2="260" stroke="${palette.foil}" stroke-width="1" opacity="0.5"/>

  <!-- Book Title Text -->
  <g>
    ${titleTextElements}
  </g>

  <!-- Author Attribution -->
  ${authorElement}

  <!-- Bottom Sanctuary Reader Insignia -->
  <text x="200" y="550" text-anchor="middle" fill="${palette.foil}" opacity="0.3" font-family="'Crimson Pro', Georgia, serif" font-size="10" letter-spacing="2">SANCTUARY</text>

  <!-- Spine 3D Crease -->
  <rect x="0" y="0" width="36" height="600" fill="url(#spine-fold)" pointer-events="none"/>
</svg>`;
}

/**
 * Encodes SVG string to Data URL.
 */
export function generateCoverDataUri(title: string, author?: string): string {
  const svg = generateCoverSvgString(title, author);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
