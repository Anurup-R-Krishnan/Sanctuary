/**
 * RSVP (Rapid Serial Visual Presentation) Token Engine
 *
 * Decomposes continuous reading text into sequential RSVP tokens, computes the
 * Optimal Recognition Point (ORP) fixation anchor to minimize ocular saccades,
 * and dynamically calculates punctuation micro-pauses for natural cadence.
 */

export interface RsvpToken {
  coreWord: string;
  durationMultiplier: number;
  index: number;
  isParagraphBreak?: boolean;
  left: string;
  orp: string;
  raw: string;
  right: string;
}

/**
 * Computes the 0-indexed Optimal Recognition Point (ORP) letter position
 * based on word character length.
 *
 * ORP anchors:
 * - 0 to 1 char: index 0
 * - 2 to 5 chars: index 1
 * - 6 to 9 chars: index 2
 * - 10 to 13 chars: index 3
 * - > 13 chars: index 4
 */
export function calculateOrpIndex(length: number): number {
  if (length <= 1) return 0;
  if (length <= 5) return 1;
  if (length <= 9) return 2;
  if (length <= 13) return 3;
  return 4;
}

/**
 * Computes the cadence multiplier factoring in sentence endings, clause commas,
 * long words, and paragraph endings.
 */
export function calculateDurationMultiplier(
  raw: string,
  coreWord: string,
  isParagraphBreak = false
): number {
  let multiplier = 1.0;

  // Sentence terminators: +100% pause
  if (/[.!?…]+["')\]}]*$/.test(raw)) {
    multiplier += 1.0;
  }
  // Clause and list separators: +50% pause
  else if (/[,;:—–]+["')\]}]*$/.test(raw)) {
    multiplier += 0.5;
  }

  // Long words (> 10 core characters): +25% cognitive processing pause
  if (coreWord.length > 10) {
    multiplier += 0.25;
  }

  // Paragraph boundary: additional pause
  if (isParagraphBreak) {
    multiplier += 0.5;
  }

  return multiplier;
}

/**
 * Splits a single raw word string into its { left, orp, right } RSVP presentation parts.
 * Guarantees left + orp + right === raw.
 */
export function splitRsvpToken(
  rawWord: string,
  index: number,
  isParagraphBreak = false
): RsvpToken {
  const trimmed = rawWord.trim();
  if (!trimmed) {
    return {
      coreWord: "",
      durationMultiplier: 1.0,
      index,
      isParagraphBreak,
      left: "",
      orp: "",
      raw: "",
      right: "",
    };
  }

  // Extract leading non-word chars, core word chars (including accented letters), and trailing non-word chars
  const match = trimmed.match(
    /^([^a-zA-Z0-9\u00C0-\u024F]*)([a-zA-Z0-9\u00C0-\u024F]+(?:[-'’][a-zA-Z0-9\u00C0-\u024F]+)*)(.*)$/u
  );

  let leading = "";
  let coreWord = "";
  let trailing = "";

  if (match) {
    leading = match[1] ?? "";
    coreWord = match[2] ?? "";
    trailing = match[3] ?? "";
  } else {
    // Non-standard token (e.g. standalone symbol, emoji, punctuation sequence)
    coreWord = trimmed;
  }

  let left = "";
  let orp = "";
  let right = "";

  if (coreWord.length > 0) {
    const orpOffset = calculateOrpIndex(coreWord.length);
    left = `${leading}${coreWord.slice(0, orpOffset)}`;
    orp = coreWord.charAt(orpOffset);
    right = `${coreWord.slice(orpOffset + 1)}${trailing}`;
  } else {
    const orpOffset = calculateOrpIndex(trimmed.length);
    left = trimmed.slice(0, orpOffset);
    orp = trimmed.charAt(orpOffset);
    right = trimmed.slice(orpOffset + 1);
  }

  const durationMultiplier = calculateDurationMultiplier(
    trimmed,
    coreWord,
    isParagraphBreak
  );

  return {
    coreWord,
    durationMultiplier,
    index,
    isParagraphBreak,
    left,
    orp,
    raw: trimmed,
    right,
  };
}

/**
 * Tokenizes plain text or markdown passages into a sequence of RSVP tokens.
 */
export function tokenizeRsvpText(text: string): RsvpToken[] {
  if (!text || typeof text !== "string") return [];

  const normalized = text.replace(/\r\n/g, "\n");
  const paragraphs = normalized.split(/\n\s*\n+/);
  const tokens: RsvpToken[] = [];
  let tokenIndex = 0;

  for (let p = 0; p < paragraphs.length; p++) {
    const pText = paragraphs[p].trim();
    if (!pText) continue;

    const words = pText.split(/\s+/).filter(Boolean);
    for (let w = 0; w < words.length; w++) {
      const isParagraphBreak =
        w === words.length - 1 && p < paragraphs.length - 1;
      tokens.push(splitRsvpToken(words[w], tokenIndex++, isParagraphBreak));
    }
  }

  return tokens;
}

/**
 * Calculates milliseconds display duration for an individual RSVP token at the target WPM.
 */
export function calculateTokenDuration(multiplier: number, wpm: number): number {
  const safeWpm = Math.max(60, Math.min(1500, wpm || 300));
  const baseMs = 60000 / safeWpm;
  return Math.round(baseMs * multiplier);
}

/**
 * Calculates estimated total playback time in milliseconds for an array of tokens at target WPM.
 */
export function estimateRsvpDurationMs(tokens: RsvpToken[], wpm: number): number {
  return tokens.reduce(
    (acc, t) => acc + calculateTokenDuration(t.durationMultiplier, wpm),
    0
  );
}

/**
 * Formats milliseconds duration into mm:ss or seconds label.
 */
export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

/**
 * Extracts visible readable text from a DOM Document for speed reading.
 */
export function extractTextFromDocument(doc: Document | null): string {
  if (!doc || !doc.body) return "";

  if (typeof doc.createTreeWalker === "function") {
    try {
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_SKIP;
          if (
            ["AUDIO", "NOSCRIPT", "SCRIPT", "STYLE", "SVG", "VIDEO"].includes(
              parent.tagName
            )
          ) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      });

      const parts: string[] = [];
      let curr = walker.nextNode();
      while (curr) {
        const text = curr.nodeValue?.trim();
        if (text) {
          parts.push(text);
        }
        curr = walker.nextNode();
      }
      if (parts.length > 0) return parts.join(" ");
    } catch {
      // Fallback
    }
  }

  return doc.body.textContent || "";
}
