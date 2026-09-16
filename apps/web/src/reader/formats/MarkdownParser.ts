/**
 * Markdown (MD) Document Parser for Sanctuary.
 * Converts Markdown documents into a paginated, structured BookDocument compatible with Foliate.
 */

import MarkdownIt from "markdown-it";

import type { RawFoliateBook, RawFoliateSection, RawFoliateTocItem } from "./TxtParser";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface MarkdownHeading {
  id: string;
  level: number;
  text: string;
}

const markdown = new MarkdownIt({
  // Books are imported from untrusted files. Keep embedded HTML as text rather
  // than allowing it to execute inside the reader iframe.
  html: false,
  linkify: true,
  typographer: true,
  xhtmlOut: true,
});

function slugifyHeading(text: string, index: number): string {
  const slug = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return `heading-${index}${slug ? `-${slug}` : ""}`;
}

function headingText(children: { content: string; type: string }[] | null): string {
  return children
    ?.filter((token) => ["text", "code_inline", "image"].includes(token.type))
    .map((token) => token.content)
    .join("")
    .trim() || "Untitled section";
}

/** Convert CommonMark/GFM-style Markdown into safe XHTML for foliate-view. */
function markdownToHtml(source: string): { html: string; headings: MarkdownHeading[] } {
  const tokens = markdown.parse(source, {});
  const headings: MarkdownHeading[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type !== "heading_open") continue;

    const text = headingText(tokens[index + 1]?.children ?? null);
    const id = slugifyHeading(text, headings.length);
    token.attrSet("id", id);
    headings.push({ id, level: Number(token.tag.slice(1)), text });
  }

  return { html: markdown.renderer.render(tokens, markdown.options, {}), headings };
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
