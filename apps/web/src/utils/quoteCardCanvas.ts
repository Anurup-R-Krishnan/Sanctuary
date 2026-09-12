export type QuoteCardRatio = "portrait" | "square" | "story";
export type QuoteCardTheme = "editorial" | "obsidian" | "parchment" | "swiss";

export interface QuoteCardDimensions {
  height: number;
  width: number;
}

export interface QuoteCardOptions {
  aspectRatio: QuoteCardRatio;
  bookAuthor?: string;
  bookTitle: string;
  chapterLabel?: string;
  quote: string;
  theme: QuoteCardTheme;
}

interface ThemeColors {
  accent: string;
  backgroundBottom: string;
  backgroundTop: string;
  border: string;
  fontFamily: string;
  subtext: string;
  text: string;
  watermark: string;
}

export const QUOTE_CARD_RATIOS: Record<QuoteCardRatio, QuoteCardDimensions> = {
  portrait: { height: 1500, width: 1200 },
  square: { height: 1200, width: 1200 },
  story: { height: 1920, width: 1080 },
};

export const THEME_CONFIGS: Record<QuoteCardTheme, ThemeColors> = {
  editorial: {
    accent: "#854D0E",
    backgroundBottom: "#F2ECE1",
    backgroundTop: "#FAF6EE",
    border: "rgba(133, 77, 14, 0.15)",
    fontFamily: "'Crimson Pro', Georgia, serif",
    subtext: "#78716C",
    text: "#1C1917",
    watermark: "rgba(133, 77, 14, 0.08)",
  },
  obsidian: {
    accent: "#818CF8",
    backgroundBottom: "#18181B",
    backgroundTop: "#09090B",
    border: "rgba(255, 255, 255, 0.1)",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    subtext: "#A1A1AA",
    text: "#F4F4F5",
    watermark: "rgba(255, 255, 255, 0.04)",
  },
  parchment: {
    accent: "#8C4320",
    backgroundBottom: "#E8DCCE",
    backgroundTop: "#F7F0E6",
    border: "rgba(140, 67, 32, 0.18)",
    fontFamily: "'Crimson Pro', Georgia, serif",
    subtext: "#7D6C5B",
    text: "#2D2319",
    watermark: "rgba(140, 67, 32, 0.07)",
  },
  swiss: {
    accent: "#DC2626",
    backgroundBottom: "#F4F4F5",
    backgroundTop: "#FFFFFF",
    border: "rgba(0, 0, 0, 0.12)",
    fontFamily: "'JetBrains Mono', monospace",
    subtext: "#52525B",
    text: "#09090B",
    watermark: "rgba(220, 38, 38, 0.06)",
  },
};

/**
 * Calculates optimal font size based on quote length and target width.
 */
export function calculateQuoteFontSize(quoteLength: number, cardWidth: number): number {
  const scale = cardWidth / 1200;
  if (quoteLength < 80) return Math.round(52 * scale);
  if (quoteLength < 160) return Math.round(44 * scale);
  if (quoteLength < 300) return Math.round(36 * scale);
  if (quoteLength < 500) return Math.round(30 * scale);
  return Math.max(18, Math.round(24 * scale));
}

/**
 * Splits text into wrapped lines fitted to the specified maxWidth using canvas measureText.
 */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let currentLine = words[0] || "";

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const candidate = `${currentLine} ${word}`;
    const metrics = ctx.measureText(candidate);

    if (metrics.width <= maxWidth) {
      currentLine = candidate;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Renders an art-directed typography quote card onto an HTML5 canvas.
 */
export function renderQuoteCardToCanvas(
  options: QuoteCardOptions,
  targetCanvas?: HTMLCanvasElement
): HTMLCanvasElement {
  const canvas = targetCanvas ?? document.createElement("canvas");
  const dimensions = QUOTE_CARD_RATIOS[options.aspectRatio] ?? QUOTE_CARD_RATIOS.square;
  const theme = THEME_CONFIGS[options.theme] ?? THEME_CONFIGS.editorial;

  canvas.width = dimensions.width;
  canvas.height = dimensions.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const { height, width } = dimensions;

  // 1. Render background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, theme.backgroundTop);
  bgGrad.addColorStop(1, theme.backgroundBottom);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Render decorative border
  const margin = Math.round(width * 0.05);
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = Math.max(1, Math.round(width * 0.002));
  ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);

  // 3. Render decorative background watermark quotation mark
  ctx.save();
  ctx.font = `bold ${Math.round(width * 0.35)}px 'Crimson Pro', Georgia, serif`;
  ctx.fillStyle = theme.watermark;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("“", margin + 20, margin - 30);
  ctx.restore();

  // 4. Calculate typography and quote lines
  const cleanQuote = options.quote.trim().replace(/^["“](.*)["”]$/, "$1");
  const maxTextWidth = width - margin * 4;
  const fontSize = calculateQuoteFontSize(cleanQuote.length, width);
  const lineHeight = Math.round(fontSize * 1.5);

  ctx.font = `italic 400 ${fontSize}px ${theme.fontFamily}`;
  const lines = wrapText(ctx, `“${cleanQuote}”`, maxTextWidth);

  // 5. Compute vertical positions
  const quoteBlockHeight = lines.length * lineHeight;
  const attributionHeight = Math.round(width * 0.12);
  const totalContentHeight = quoteBlockHeight + attributionHeight + 40;
  const startY = Math.max(margin * 2, Math.round((height - totalContentHeight) / 2));

  // 6. Draw quote text
  ctx.fillStyle = theme.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  const centerX = width / 2;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    ctx.fillText(line, centerX, startY + i * lineHeight);
  }

  // 7. Draw divider line
  const dividerY = startY + quoteBlockHeight + Math.round(width * 0.035);
  const dividerWidth = Math.round(width * 0.15);
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = Math.max(2, Math.round(width * 0.0025));
  ctx.beginPath();
  ctx.moveTo(centerX - dividerWidth / 2, dividerY);
  ctx.lineTo(centerX + dividerWidth / 2, dividerY);
  ctx.stroke();

  // 8. Draw book title, author, and chapter attribution
  const metaStartY = dividerY + Math.round(width * 0.03);
  const metaFontSize = Math.max(16, Math.round(width * 0.024));
  ctx.font = `600 ${metaFontSize}px ${theme.fontFamily}`;
  ctx.fillStyle = theme.text;
  ctx.fillText(options.bookTitle, centerX, metaStartY);

  let currentMetaY = metaStartY + Math.round(metaFontSize * 1.4);
  const subMetaFontSize = Math.max(14, Math.round(metaFontSize * 0.85));

  if (options.bookAuthor) {
    ctx.font = `400 ${subMetaFontSize}px ${theme.fontFamily}`;
    ctx.fillStyle = theme.subtext;
    ctx.fillText(options.bookAuthor, centerX, currentMetaY);
    currentMetaY += Math.round(subMetaFontSize * 1.35);
  }

  if (options.chapterLabel) {
    ctx.font = `400 ${Math.max(12, Math.round(subMetaFontSize * 0.9))}px ${theme.fontFamily}`;
    ctx.fillStyle = theme.subtext;
    ctx.fillText(options.chapterLabel, centerX, currentMetaY);
  }

  // 9. Watermark footer "Sanctuary Reader"
  ctx.font = `500 ${Math.max(12, Math.round(width * 0.016))}px ${theme.fontFamily}`;
  ctx.fillStyle = theme.subtext;
  ctx.fillText("Sanctuary Reader", centerX, height - margin - 15);

  return canvas;
}

/**
 * Converts quote card canvas to PNG Blob.
 */
export async function exportQuoteCardAsBlob(options: QuoteCardOptions): Promise<Blob> {
  const canvas = renderQuoteCardToCanvas(options);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas blob conversion failed"));
    }, "image/png");
  });
}

/**
 * Converts quote card canvas to Base64 data URL.
 */
export function exportQuoteCardAsDataUrl(options: QuoteCardOptions): string {
  const canvas = renderQuoteCardToCanvas(options);
  return canvas.toDataURL("image/png");
}

/**
 * Copies quote card PNG directly to clipboard.
 */
export async function copyQuoteCardToClipboard(options: QuoteCardOptions): Promise<boolean> {
  try {
    const blob = await exportQuoteCardAsBlob(options);
    if (!navigator?.clipboard?.write) {
      return false;
    }
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Shares quote card image using Web Share API or triggers browser download.
 */
export async function shareOrDownloadQuoteCard(
  options: QuoteCardOptions,
  fileName = "sanctuary-quote.png"
): Promise<"downloaded" | "shared"> {
  const blob = await exportQuoteCardAsBlob(options);
  const file = new File([blob], fileName, { type: "image/png" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        text: `"${options.quote}" — ${options.bookTitle}`,
        title: options.bookTitle,
      });
      return "shared";
    } catch (e: unknown) {
      if ((e as Error)?.name === "AbortError") {
        return "shared";
      }
    }
  }

  // Fallback to direct download
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return "downloaded";
}
