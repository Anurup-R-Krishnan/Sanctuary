export interface CoverPalette {
  cloth: string;
  foil: string;
  id: string;
  ink: string;
  label: string;
  shade: string;
}

export const COVER_PALETTES: CoverPalette[] = [
  { cloth: "#6B2C27", foil: "#D8BE86", id: "oxblood", ink: "#4A1E1A", label: "#F3E8D0", shade: "#4E1F1B" },
  { cloth: "#2F4A3B", foil: "#D3BF8C", id: "forest", ink: "#233A2D", label: "#F1E8D2", shade: "#213629" },
  { cloth: "#2C3A4F", foil: "#D6C28F", id: "ink", ink: "#1F2A3A", label: "#F2E9D4", shade: "#1F2A3A" },
  { cloth: "#8A5A24", foil: "#F0DDB0", id: "ochre", ink: "#5E3C16", label: "#F6ECD6", shade: "#6A4419" },
  { cloth: "#4D3347", foil: "#DCC393", id: "plum", ink: "#382434", label: "#F2E8D5", shade: "#382434" },
  { cloth: "#3F4648", foil: "#D9C79A", id: "slate", ink: "#2C3234", label: "#F1EADA", shade: "#2C3234" },
  { cloth: "#5E6B3A", foil: "#EADDB0", id: "olive", ink: "#3F4826", label: "#F4ECD6", shade: "#46502A" },
];

export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getCoverPalette(title: string, author = ""): CoverPalette {
  const seed = `${title.trim().toLowerCase()}::${author.trim().toLowerCase()}`;
  return COVER_PALETTES[hashString(seed) % COVER_PALETTES.length] ?? COVER_PALETTES[0]!;
}

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
  if (current) lines.push(current);

  if (lines.length > 4) {
    const kept = lines.slice(0, 4);
    kept[3] = `${kept[3]!.replace(/[\s,.;:]+$/, "")}…`;
    return kept;
  }
  return lines;
}

export function isUnknownAuthor(author: string | undefined): boolean {
  const value = (author ?? "").trim().toLowerCase();
  return value === "" || value === "unknown" || value === "unknown author";
}
