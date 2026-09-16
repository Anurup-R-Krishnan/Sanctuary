/**
 * Markdown (MD) Document Parser for Sanctuary.
 * Converts Markdown documents into a paginated, structured BookDocument compatible with Foliate.
 */

import type { Element, Root, RootContent } from "hast";
import type { VFile } from "vfile";

import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

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

const markdownSanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] || []), "className"],
  },
};

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function textContent(node: Element | RootContent): string {
  if (node.type === "text") return node.value;
  if (node.type !== "element") return "";
  return node.children.map(textContent).join("");
}

function visitElements(node: Root | Element, visitor: (element: Element) => void): void {
  for (const child of node.children) {
    if (child.type !== "element") continue;
    visitor(child);
    visitElements(child, visitor);
  }
}

function calloutTitle(type: string, title: string): Element {
  return {
    type: "element",
    tagName: "div",
    properties: { className: ["callout-title"] },
    children: [{ type: "text", value: title || type }],
  };
}

/**
 * Apply reader-only enhancements after sanitization. Markdown HTML is not
 * parsed, so imported books cannot use this hook to inject executable markup.
 */
function rehypeObsidianReader() {
  return (tree: Root, file: VFile) => {
    const headings: MarkdownHeading[] = [];
    const headingIds = new Map<string, string>();
    const headingCounts = new Map<string, number>();

    visitElements(tree, (element) => {
      if (!/^h[1-6]$/.test(element.tagName)) return;
      const text = textContent(element).trim() || "Untitled section";
      const slug = slugifyHeading(text);
      const count = headingCounts.get(slug) ?? 0;
      headingCounts.set(slug, count + 1);
      const id = `heading-${slug || "section"}${count ? `-${count + 1}` : ""}`;
      element.properties.id = id;
      headingIds.set(slug, id);
      headings.push({
        id,
        level: Number(element.tagName.slice(1)),
        text,
      });
    });

    visitElements(tree, (element) => {
      if (element.tagName === "blockquote") {
        const firstParagraph = element.children.find(
          (child): child is Element => child.type === "element" && child.tagName === "p"
        );
        const marker = firstParagraph?.children[0];
        if (marker?.type === "text") {
          const match = marker.value.match(/^\[!([\w-]+)\][+-]?(?:\s+(.*))?\s*/);
          if (match) {
            const type = match[1].toLowerCase();
            const title = match[2]?.trim() || type;
            marker.value = marker.value.slice(match[0].length);
            element.tagName = "aside";
            element.properties = { className: ["callout", `callout-${type}`] };
            element.children.unshift(calloutTitle(type, title));
            if (firstParagraph.children.length === 1 && marker.value.length === 0) {
              element.children = element.children.filter((child) => child !== firstParagraph);
            }
          }
        }
      }

      if (element.tagName !== "a") return;
      const href = element.properties.href;
      if (typeof href !== "string" || !href.startsWith("#obsidian-heading-")) return;

      const target = href.slice("#obsidian-heading-".length);
      const id = headingIds.get(target);
      element.properties.className = ["wiki-link"];
      if (id) element.properties.href = `#${id}`;
      else delete element.properties.href;
    });

    file.data.headings = headings;
  };
}

function protectCodeBlocks(source: string, transform: (text: string) => string): string {
  const parts = source.split(/(```[\s\S]*?```|`[^`\n]+`)/g);
  return parts
    .map((part, i) => (i % 2 === 1 ? part : transform(part)))
    .join("");
}

function normalizeObsidianLinks(source: string): string {
  return protectCodeBlocks(source, (text) =>
    text.replace(/\[\[([^\]|#]+)?(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g, (_match, page, heading, alias) => {
      const label = String(alias || heading || page || "Untitled link").trim();
      if (heading) return `[${label}](#obsidian-heading-${slugifyHeading(String(heading))})`;
      // A standalone Markdown file has no vault resolver. Keep page links visible
      // as rich labels instead of exposing a broken file-system URL.
      return label;
    })
  );
}

function normalizeEmbeddedHtmlQuotes(source: string): string {
  return protectCodeBlocks(source, (text) =>
    // Notebook exports commonly use typographic quotes in otherwise valid HTML
    // attributes (`class=“cell markdown”`). Normalize only tag syntax, never the
    // document's prose.
    text.replace(/<[^>]*>/g, (tag) => tag.replace(/[“”]/g, '"').replace(/[‘’]/g, "'"))
  );
}

/** Convert GFM and Obsidian-style Markdown into safe XHTML for foliate-view. */
async function markdownToHtml(source: string): Promise<{ html: string; headings: MarkdownHeading[] }> {
  const normalizedSource = normalizeEmbeddedHtmlQuotes(normalizeObsidianLinks(source));
  const processed = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize, markdownSanitizeSchema)
    .use(rehypeObsidianReader)
    .use(rehypeStringify, { closeSelfClosing: true })
    .process(normalizedSource);

  // rehype serializes these GFM boolean/data attributes without a value. The
  // reader loads XHTML in an XML document, where every attribute needs one.
  const html = processed.value.toString().replace(
    /\s(checked|disabled|data-footnotes|data-footnote-ref)(?=(?:\s|\/?>))/g,
    ' $1="$1"'
  );

  const headings = (processed.data.headings as MarkdownHeading[]) ?? [];
  return { html, headings };
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

  const renderedChunks = await Promise.all(
    chunks.map(async (chunk, idx) => {
      const { html, headings } = await markdownToHtml(chunk);
      return { chunk, idx, html, headings };
    })
  );

  const sections: RawFoliateSection[] = renderedChunks.map(({ idx, html, headings }) => {
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
    aside.callout {
      --callout-color: #4f7cff;
      background: color-mix(in srgb, var(--callout-color) 11%, transparent);
      border: 1px solid color-mix(in srgb, var(--callout-color) 42%, transparent);
      border-left: 0.3em solid var(--callout-color);
      border-radius: 0.5em;
      margin: 1.25em 0;
      padding: 0.85em 1em;
    }
    .callout-title {
      color: var(--callout-color);
      font-size: 0.82em;
      font-weight: 700;
      letter-spacing: 0.06em;
      margin-bottom: 0.5em;
      text-transform: uppercase;
    }
    .callout-tip, .callout-success { --callout-color: #1f9d65; }
    .callout-warning, .callout-caution { --callout-color: #be7b00; }
    .callout-danger, .callout-error, .callout-failure { --callout-color: #c44040; }
    .callout-question, .callout-help { --callout-color: #7a5af8; }
    table {
      border-collapse: collapse;
      display: block;
      margin: 1.25em 0;
      max-width: 100%;
      overflow-x: auto;
    }
    th, td {
      border: 1px solid rgba(127, 127, 127, 0.35);
      padding: 0.5em 0.7em;
      text-align: left;
    }
    th { background: rgba(127, 127, 127, 0.13); }
    .contains-task-list { list-style: none; padding-left: 0.4em; }
    .task-list-item input { accent-color: currentColor; margin-right: 0.55em; }
    .wiki-link {
      color: inherit;
      font-weight: 600;
      text-decoration: underline;
      text-decoration-color: rgba(91, 110, 225, 0.65);
      text-underline-offset: 0.15em;
    }
    .footnotes {
      border-top: 1px solid rgba(127, 127, 127, 0.35);
      font-size: 0.9em;
      margin-top: 2.5em;
      padding-top: 1em;
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
      const hasSec = secStr.length > 0 && !isNaN(Number(secStr));
      const targetIndex = hasSec
        ? Number(secStr)
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
