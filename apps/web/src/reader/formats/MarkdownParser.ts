/**
 * Markdown (MD) Document Parser for Sanctuary.
 * Converts Markdown documents into a paginated, structured BookDocument compatible with Foliate.
 */

import type { RawFoliateBook, RawFoliateSection, RawFoliateTocItem } from "./TxtParser";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Lightweight, robust Markdown to HTML renderer without external dependencies.
 */
function markdownToHtml(md: string): { html: string; headings: { level: number; text: string; id: string }[] } {
  const headings: { level: number; text: string; id: string }[] = [];
  const lines = md.split(/\r?\n/);
  const output: string[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let inList = false;
  let inOrderedList = false;
  let inBlockquote = false;

  const closeList = () => {
    if (inList) {
      output.push("</ul>");
      inList = false;
    }
    if (inOrderedList) {
      output.push("</ol>");
      inOrderedList = false;
    }
  };

  const closeBlockquote = () => {
    if (inBlockquote) {
      output.push("</blockquote>");
      inBlockquote = false;
    }
  };

  const formatInline = (text: string): string => {
    return text
      // Images: ![alt](url)
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto;" />')
      // Links: [text](url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // Bold & Italic: ***text*** or ___text___
      .replace(/(\*\*\*|___)(.*?)\1/g, "<strong><em>$2</em></strong>")
      // Bold: **text** or __text__
      .replace(/(\*\*|__)(.*?)\1/g, "<strong>$2</strong>")
      // Italic: *text* or _text_
      .replace(/(\*|_)(.*?)\1/g, "<em>$2</em>")
      // Strikethrough: ~~text~~
      .replace(/~~(.*?)~~/g, "<del>$1</del>")
      // Inline Code: `code`
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced code blocks
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        output.push(`<pre><code>${codeBuffer.map(escapeHtml).join("\n")}</code></pre>`);
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        closeList();
        closeBlockquote();
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Blank line
    if (!line.trim()) {
      closeList();
      closeBlockquote();
      continue;
    }

    // Horizontal rule: --- or *** or ___
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(line.trim())) {
      closeList();
      closeBlockquote();
      output.push("<hr />");
      continue;
    }

    // Headings: #, ##, ###, ####, #####, ######
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      closeList();
      closeBlockquote();
      const level = headingMatch[1].length;
      const headingText = headingMatch[2].trim();
      const id = `heading-${headings.length}-${headingText.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
      headings.push({ level, text: headingText, id });
      output.push(`<h${level} id="${id}">${formatInline(escapeHtml(headingText))}</h${level}>`);
      continue;
    }

    // Blockquote: > text
    if (line.trim().startsWith(">")) {
      closeList();
      if (!inBlockquote) {
        output.push("<blockquote>");
        inBlockquote = true;
      }
      const quoteText = line.trim().replace(/^>\s*/, "");
      output.push(`<p>${formatInline(escapeHtml(quoteText))}</p>`);
      continue;
    }
    closeBlockquote();

    // Unordered list: - item or * item
    const ulMatch = line.match(/^\s*[-*+]\s+(.*)$/);
    if (ulMatch) {
      if (inOrderedList) closeList();
      if (!inList) {
        output.push("<ul>");
        inList = true;
      }
      output.push(`<li>${formatInline(escapeHtml(ulMatch[1]))}</li>`);
      continue;
    }

    // Ordered list: 1. item
    const olMatch = line.match(/^\s*(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (inList) closeList();
      if (!inOrderedList) {
        output.push("<ol>");
        inOrderedList = true;
      }
      output.push(`<li>${formatInline(escapeHtml(olMatch[2]))}</li>`);
      continue;
    }

    closeList();

    // Paragraph
    output.push(`<p>${formatInline(escapeHtml(line.trim()))}</p>`);
  }

  closeList();
  closeBlockquote();
  if (inCodeBlock) {
    output.push(`<pre><code>${codeBuffer.map(escapeHtml).join("\n")}</code></pre>`);
  }

  return { html: output.join("\n"), headings };
}

export async function parseMarkdownToBook(
  source: string | ArrayBuffer | Blob,
  fallbackTitle: string = "Untitled Document"
): Promise<RawFoliateBook> {
  let md = "";
  if (typeof source === "string") {
    md = source;
  } else if (source instanceof Blob) {
    md = await source.text();
  } else if (source instanceof ArrayBuffer) {
    md = new TextDecoder().decode(source);
  }

  if (md.charCodeAt(0) === 0xfeff) {
    md = md.slice(1);
  }

  let title = fallbackTitle;
  let author = "Unknown Author";

  // Parse Frontmatter if present
  if (md.startsWith("---")) {
    const endMatch = md.slice(3).indexOf("---");
    if (endMatch !== -1) {
      const frontmatter = md.slice(3, endMatch + 3);
      md = md.slice(endMatch + 6).trim();

      const titleMatch = frontmatter.match(/title:\s*["']?([^"'\n\r]+)["']?/i);
      if (titleMatch) title = titleMatch[1].trim();

      const authorMatch = frontmatter.match(/author:\s*["']?([^"'\n\r]+)["']?/i);
      if (authorMatch) author = authorMatch[1].trim();
    }
  }

  // Look for first # Heading for title if not set
  if (title === fallbackTitle) {
    const firstH1 = md.match(/^#\s+([^\n]+)/m);
    if (firstH1) {
      title = firstH1[1].trim();
    }
  }

  // Split into chapters by top-level `# ` headings if multiple exist
  const h1Splits = md.split(/(?=^#\s+)/m).filter((s) => s.trim().length > 0);

  const chunks = h1Splits.length > 1 ? h1Splits : [md];
  const objectUrls: string[] = [];
  const toc: RawFoliateTocItem[] = [];
  const idToSectionMap = new Map<string, number>();

  const sections: RawFoliateSection[] = chunks.map((chunk, idx) => {
    const { html, headings } = markdownToHtml(chunk);

    const sectionTitle = headings.find((h) => h.level === 1)?.text || `Section ${idx + 1}`;

    for (const h of headings) {
      idToSectionMap.set(h.id, idx);
    }

    // Add TOC hierarchy
    const sectionToc: RawFoliateTocItem = {
      id: `toc-${idx}`,
      label: sectionTitle,
      href: `${idx}`,
      subitems: headings
        .filter((h) => h.level > 1)
        .map((h) => ({
          id: h.id,
          label: h.text,
          href: `${idx}#${h.id}`,
        })),
    };
    toc.push(sectionToc);

    const xhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(sectionTitle)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 2em;
      line-height: 1.6;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      line-height: 1.25;
    }
    p {
      margin: 0 0 1em 0;
    }
    blockquote {
      margin: 1em 0;
      padding: 0 1em;
      color: #666;
      border-left: 0.25em solid #ddd;
    }
    pre {
      padding: 1em;
      overflow: auto;
      background-color: #f6f8fa;
      border-radius: 6px;
    }
    code {
      font-family: monospace;
      font-size: 0.9em;
      background-color: rgba(175, 184, 193, 0.2);
      padding: 0.2em 0.4em;
      border-radius: 4px;
    }
    pre code {
      background-color: transparent;
      padding: 0;
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;

    const blob = new Blob([xhtml], { type: "application/xhtml+xml" });
    const url = URL.createObjectURL(blob);
    objectUrls.push(url);

    return {
      id: idx,
      href: `sec-${idx}.xhtml`,
      title: sectionTitle,
      load: () => url,
      createDocument: () => {
        const parser = new DOMParser();
        return parser.parseFromString(xhtml, "application/xhtml+xml");
      },
      size: blob.size,
      linear: "yes",
    };
  });

  return {
    metadata: {
      title,
      author,
      creator: author,
      language: "en",
      direction: "ltr",
    },
    dir: "ltr",
    sections,
    toc,
    resolveHref: (href: string) => {
      const [secStr, anchorId] = href.split("#");
      const secIdx = Number(secStr);
      const targetIndex = !isNaN(secIdx)
        ? secIdx
        : anchorId && idToSectionMap.has(anchorId)
        ? idToSectionMap.get(anchorId)!
        : 0;

      return {
        index: targetIndex,
        anchor: (doc: Document) => (anchorId ? doc.getElementById(anchorId) : doc.body),
      };
    },
    splitTOCHref: (href: string) => {
      const [a] = href.split("#");
      return [Number(a) || 0];
    },
    getTOCFragment: (doc: Document, id: string) => doc.getElementById(id) || doc.body,
    getCover: async () => null,
    destroy: () => {
      for (const url of objectUrls) {
        URL.revokeObjectURL(url);
      }
    },
  };
}
