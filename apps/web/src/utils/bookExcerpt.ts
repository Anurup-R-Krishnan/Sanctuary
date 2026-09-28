export interface BookExcerpt {
  chapter: string | null;
  text: string;
}

const MIN_PARAGRAPH_LENGTH = 180;
const MAX_EXCERPT_LENGTH = 480;

const collapse = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim();

export function trimToSentence(text: string, maxLength = MAX_EXCERPT_LENGTH): string {
  if (text.length <= maxLength) return text;
  const slice = text.slice(0, maxLength);
  const lastStop = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("? "), slice.lastIndexOf("! "), slice.lastIndexOf(".” "));
  if (lastStop > maxLength * 0.5) return slice.slice(0, lastStop + 1).trim();
  const lastSpace = slice.lastIndexOf(" ");
  return `${slice.slice(0, lastSpace > 0 ? lastSpace : maxLength).trim()}…`;
}

export function extractExcerpt(doc: Document): BookExcerpt | null {
  const root = doc.body ?? doc.documentElement;
  if (!root) return null;
  let chapter: string | null = null;
  const walker = doc.createTreeWalker(root, 1);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node as Element;
    const tag = el.localName.toLowerCase();
    if (tag === "h1" || tag === "h2" || tag === "h3") {
      const heading = collapse(el.textContent);
      if (heading && heading.length <= 80) chapter = heading;
      continue;
    }
    if (tag !== "p") continue;
    const text = collapse(el.textContent);
    if (text.length >= MIN_PARAGRAPH_LENGTH && /[a-z]/i.test(text.charAt(0))) {
      return { chapter, text: trimToSentence(text) };
    }
  }
  return null;
}
