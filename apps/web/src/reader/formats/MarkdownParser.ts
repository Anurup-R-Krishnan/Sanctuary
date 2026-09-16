/**
 * Markdown (MD) Document Parser for Sanctuary.
 * Converts Markdown documents into a paginated, structured BookDocument compatible with Foliate.
 */

import type { Element, Root, RootContent } from "hast";
import type { VFile } from "vfile";

import rehypeHighlight from "rehype-highlight";
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
    "*": [
      ...(defaultSchema.attributes?.["*"] || []),
      "className",
      "dataLanguage",
      "data-language",
      "dataExecution_count",
      "data-execution_count",
      "dataCollapsed",
      "data-collapsed",
    ],
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
 * Apply reader-only enhancements after sanitization and syntax highlighting.
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

/**
 * Decorates code blocks with a floating language badge attribute.
 */
function rehypeCodeCardEnhancer() {
  return (tree: Root) => {
    visitElements(tree, (element) => {
      if (element.tagName !== "pre") return;
      const codeChild = element.children.find(
        (c): c is Element => c.type === "element" && c.tagName === "code"
      );
      if (!codeChild) return;

      const classes = Array.isArray(codeChild.properties?.className)
        ? codeChild.properties.className
        : [String(codeChild.properties?.className || "")];

      const langClass = classes.find(
        (cls): cls is string => typeof cls === "string" && cls.startsWith("language-")
      );
      if (langClass) {
        const lang = langClass.replace("language-", "").trim();
        if (lang) {
          element.properties = element.properties || {};
          element.properties.dataLanguage = lang.toUpperCase();
        }
      }
    });
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
      return label;
    })
  );
}

function normalizeEmbeddedHtmlQuotes(source: string): string {
  return protectCodeBlocks(source, (text) =>
    text.replace(/<[^>]*>/g, (tag) => tag.replace(/[“”]/g, '"').replace(/[‘’]/g, "'"))
  );
}

function normalizeNotebookCells(source: string): string {
  return protectCodeBlocks(source, (text) =>
    text
      .replace(/(<div\b[^>]*>)(?!\n\n)/gi, "$1\n\n")
      .replace(/(?<!\n\n)(<\/div>)/gi, "\n\n$1")
  );
}

function splitMarkdownChapters(source: string): string[] {
  const matches = [...source.matchAll(/(?:^|\n)(?:<div\b[^>]*>\s*|)#[ \t]+[^\n]+/g)];
  if (matches.length <= 1) return [source];

  const splits: string[] = [];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const startIndex = match.index! + (match[0].startsWith("\n") ? 1 : 0);
    const endIndex = i + 1 < matches.length
      ? matches[i + 1].index! + (matches[i + 1][0].startsWith("\n") ? 1 : 0)
      : source.length;

    if (i === 0 && startIndex > 0) {
      const prologue = source.slice(0, startIndex).trim();
      if (prologue.length > 0) {
        splits.push(prologue);
      }
    }

    const chunk = source.slice(startIndex, endIndex).trim();
    if (chunk.length > 0) {
      splits.push(chunk);
    }
  }
  return splits.length > 0 ? splits : [source];
}

/** Convert GFM and Obsidian-style Markdown into safe XHTML for foliate-view. */
async function markdownToHtml(source: string): Promise<{ html: string; headings: MarkdownHeading[] }> {
  const normalizedSource = normalizeNotebookCells(
    normalizeEmbeddedHtmlQuotes(normalizeObsidianLinks(source))
  );

  const processed = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize, markdownSanitizeSchema)
    .use(rehypeHighlight)
    .use(rehypeCodeCardEnhancer)
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

  // Split into chapters by top-level `# ` headings (preserving surrounding cell wrappers)
  const chunks = splitMarkdownChapters(md);
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
  /* <![CDATA[ */
    :root {
      color-scheme: light dark;
      --code-font: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;
      --body-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    body {
      font-family: var(--body-font);
      margin: 0;
      padding: 2.5em max(2em, calc(50vw - 420px));
      line-height: 1.7;
      word-wrap: break-word;
    }

    /* Modern Technical Typography */
    h1, h2, h3, h4, h5, h6 {
      font-weight: 700;
      line-height: 1.3;
      margin-top: 1.8em;
      margin-bottom: 0.6em;
      letter-spacing: -0.015em;
    }
    h1 {
      font-size: 2em;
      border-bottom: 1px solid color-mix(in srgb, currentColor 14%, transparent);
      padding-bottom: 0.35em;
    }
    h2 {
      font-size: 1.45em;
      border-bottom: 1px solid color-mix(in srgb, currentColor 10%, transparent);
      padding-bottom: 0.3em;
    }
    h3 { font-size: 1.2em; }
    p { margin: 0 0 1.15em 0; }
    a {
      color: #3b82f6;
      text-decoration: none;
      text-underline-offset: 0.2em;
      transition: text-decoration 0.15s ease;
    }
    a:hover { text-decoration: underline; }

    /* Pill Inline Code */
    code:not(pre code) {
      font-family: var(--code-font);
      font-size: 0.88em;
      background: color-mix(in srgb, currentColor 8%, transparent);
      border: 1px solid color-mix(in srgb, currentColor 14%, transparent);
      border-radius: 5px;
      padding: 0.18em 0.45em;
      font-weight: 500;
    }

    /* 3D Keycaps */
    kbd {
      font-family: var(--code-font);
      font-size: 0.8em;
      background: color-mix(in srgb, currentColor 8%, transparent);
      border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
      border-bottom: 2.5px solid color-mix(in srgb, currentColor 35%, transparent);
      border-radius: 5px;
      padding: 0.15em 0.45em;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
    }

    /* Luxury Code Block Cards */
    pre {
      font-family: var(--code-font);
      font-size: 0.88em;
      line-height: 1.6;
      background: color-mix(in srgb, currentColor 5%, #16181d);
      border: 1px solid color-mix(in srgb, currentColor 14%, transparent);
      border-radius: 10px;
      padding: 1.35em 1.4em;
      margin: 1.4em 0;
      overflow-x: auto;
      tab-size: 4;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      position: relative;
    }
    pre code {
      background: transparent;
      padding: 0;
      font-size: inherit;
      color: inherit;
    }
    pre[data-language]::after {
      content: attr(data-language);
      position: absolute;
      top: 0.65em;
      right: 1.1em;
      font-family: var(--code-font);
      font-size: 0.68em;
      font-weight: 700;
      color: color-mix(in srgb, currentColor 40%, transparent);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      pointer-events: none;
    }

    /* Jupyter Notebook Cell and Terminal Architecture */
    .cell { margin: 1.5em 0; }
    .cell.code { position: relative; }
    .cell.code[data-execution_count]::before {
      content: "In [" attr(data-execution_count) "]:";
      display: block;
      font-family: var(--code-font);
      font-size: 0.75em;
      font-weight: 700;
      color: #3b82f6;
      letter-spacing: 0.04em;
      margin-bottom: 0.45em;
      opacity: 0.9;
    }
    .cell.output, .output_text, pre.output {
      background: color-mix(in srgb, currentColor 4%, #0f1013);
      border: 1px solid color-mix(in srgb, currentColor 10%, transparent);
      border-radius: 8px;
      padding: 0.9em 1.2em;
      font-family: var(--code-font);
      font-size: 0.84em;
      color: color-mix(in srgb, currentColor 80%, transparent);
      margin-top: 0.6em;
      margin-bottom: 1.4em;
      overflow-x: auto;
    }

    /* Multi-Language Syntax Highlighting (Rich Palette) */
    .hljs-keyword, .hljs-selector-tag, .hljs-subst { color: #f43f5e; font-weight: 600; }
    .hljs-title, .hljs-title.function_, .hljs-section { color: #10b981; font-weight: 600; }
    .hljs-title.class_, .hljs-type, .hljs-built_in { color: #f59e0b; font-weight: 500; }
    .hljs-string, .hljs-symbol, .hljs-bullet { color: #38bdf8; }
    .hljs-number, .hljs-literal { color: #a855f7; }
    .hljs-params, .hljs-variable, .hljs-template-variable { color: #e2e8f0; }
    .hljs-comment, .hljs-quote { color: #64748b; font-style: italic; }
    .hljs-meta, .hljs-attr { color: #06b6d4; }
    .hljs-emphasis { font-style: italic; }
    .hljs-strong { font-weight: bold; }
    .hljs-deletion { background: rgba(244, 63, 94, 0.2); color: #f43f5e; }
    .hljs-addition { background: rgba(16, 185, 129, 0.2); color: #10b981; }

    /* Tables and DataFrames */
    table {
      border-collapse: collapse;
      display: block;
      margin: 1.5em 0;
      max-width: 100%;
      overflow-x: auto;
      border-radius: 8px;
      border: 1px solid color-mix(in srgb, currentColor 14%, transparent);
    }
    th, td {
      border-bottom: 1px solid color-mix(in srgb, currentColor 10%, transparent);
      padding: 0.7em 1em;
      text-align: left;
    }
    th {
      background: color-mix(in srgb, currentColor 8%, transparent);
      font-weight: 600;
      font-size: 0.9em;
      letter-spacing: 0.02em;
    }
    tr:nth-child(even) td { background: color-mix(in srgb, currentColor 3%, transparent); }
    tr:hover td { background: color-mix(in srgb, currentColor 6%, transparent); }

    /* Deluxe Obsidian / GFM Callouts */
    aside.callout {
      --callout-color: #3b82f6;
      background: color-mix(in srgb, var(--callout-color) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--callout-color) 35%, transparent);
      border-left: 0.35em solid var(--callout-color);
      border-radius: 8px;
      margin: 1.4em 0;
      padding: 1em 1.25em;
    }
    .callout-title {
      color: var(--callout-color);
      font-size: 0.85em;
      font-weight: 700;
      letter-spacing: 0.06em;
      margin-bottom: 0.6em;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 0.5em;
    }
    .callout-tip, .callout-success { --callout-color: #10b981; }
    .callout-warning, .callout-caution { --callout-color: #f59e0b; }
    .callout-danger, .callout-error, .callout-failure { --callout-color: #ef4444; }
    .callout-question, .callout-help, .callout-faq { --callout-color: #8b5cf6; }
    .callout-note, .callout-info { --callout-color: #3b82f6; }
    .callout-quote, .callout-cite { --callout-color: #06b6d4; }
    .callout-example { --callout-color: #6366f1; }

    /* Task Lists and Wiki Links */
    .contains-task-list { list-style: none; padding-left: 0.4em; }
    .task-list-item input { accent-color: #3b82f6; margin-right: 0.55em; transform: scale(1.1); }
    .wiki-link {
      color: #3b82f6;
      font-weight: 600;
      text-decoration: underline;
      text-decoration-color: rgba(59, 130, 246, 0.45);
      text-underline-offset: 0.2em;
    }
    .wiki-link:hover { text-decoration-color: #3b82f6; }
    .footnotes {
      border-top: 1px solid color-mix(in srgb, currentColor 15%, transparent);
      font-size: 0.9em;
      margin-top: 2.5em;
      padding-top: 1em;
      opacity: 0.85;
    }
  /* ]]> */
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
