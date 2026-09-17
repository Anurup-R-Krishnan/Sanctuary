/**
 * Markdown (MD) Document Parser for Sanctuary.
 * Converts Markdown documents into a structured, continuous BookDocument compatible with Foliate.
 * Built entirely on unified, remark, and rehype AST pipelines with zero regex hacks.
 */

import type { Element, ElementContent, Root, RootContent } from "hast";
import type { Root as MdastRoot } from "mdast";

import remarkObsidian from "@quartz-community/remark-obsidian";
import remarkCallout from "@r4ai/remark-callout";
import Slugger from "github-slugger";
import { toXast } from "hast-util-to-xast";
import katexStyles from "katex/dist/katex.min.css?raw";
import rehypeKatex from "rehype-katex";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { type Plugin, unified } from "unified";
import { visit } from "unist-util-visit";
import { VFile } from "vfile";
import { toXml } from "xast-util-to-xml";
import YAML from "yaml";

import type { RawFoliateBook, RawFoliateSection, RawFoliateTocItem } from "./TxtParser";

export interface MarkdownHeading {
  id: string;
  level: number;
  text: string;
}

export interface FrontmatterMetadata {
  author?: string;
  category?: string;
  date?: string;
  description?: string;
  tags?: string[];
  title?: string;
}

export const markdownSanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ...(defaultSchema.attributes?.a || []).filter(
        (attr) => !(Array.isArray(attr) && attr[0] === "className")
      ),
      "className",
      "href",
    ],
    "*": [
      ...(defaultSchema.attributes?.["*"] || []),
      "className",
      "dataLanguage",
      "data-language",
      "dataExecution_count",
      "data-execution_count",
      "dataCollapsed",
      "data-collapsed",
      "dataLineNumbers",
      "data-line-numbers",
      "dataFootnotes",
      "data-footnotes",
      "dataFootnoteRef",
      "data-footnote-ref",
      "dataFootnoteBackref",
      "data-footnote-backref",
      "dataCallout",
      "data-callout",
      "dataCalloutType",
      "data-callout-type",
      "dataCalloutTitle",
      "data-callout-title",
      "dataCalloutTitleInner",
      "data-callout-title-inner",
      "dataCalloutBody",
      "data-callout-body",
      "open",
      "style",
      "width",
      "height",
      "viewBox",
      "fill",
      "stroke",
      "strokeWidth",
      "stroke-width",
      "strokeLinecap",
      "stroke-linecap",
      "strokeLinejoin",
      "stroke-linejoin",
      "d",
      "points",
      "cx",
      "cy",
      "r",
      "rx",
      "ry",
      "x",
      "y",
      "x1",
      "y1",
      "x2",
      "y2",
      "title",
      "ariaLabel",
      "aria-label",
      "type",
    ],
    button: [
      "className",
      "type",
      "title",
      "ariaLabel",
      "aria-label",
      "disabled",
    ],
  },
  tagNames: [
    ...(defaultSchema.tagNames || []),
    "button",
    "aside",
    "details",
    "summary",
    "mark",
    "kbd",
    "figure",
    "figcaption",
    "svg",
    "path",
    "circle",
    "line",
    "polyline",
    "polygon",
    "rect",
    "g",
    // MathML elements
    "math",
    "mrow",
    "mi",
    "mo",
    "mn",
    "ms",
    "mspace",
    "mtext",
    "msup",
    "msub",
    "msubsup",
    "mfrac",
    "msqrt",
    "mroot",
    "mtable",
    "mtr",
    "mtd",
    "semantics",
    "annotation",
    "annotation-xml",
  ],
};

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

/**
 * Disables CommonMark 4-space indented code blocks so notebook cells,
 * nested divs, and indented headings are never accidentally swallowed into code blocks.
 */
const disableIndentedCode: Plugin = function () {
  const data = this.data() as Record<string, unknown>;
  const list = (data.micromarkExtensions || (data.micromarkExtensions = [])) as Array<Record<string, unknown>>;
  list.push({
    disable: {
      null: ["codeIndented"],
    },
  });
};

/** Vector SVG markup for Obsidian / GFM callout badges */
const CALLOUT_ICONS_SVG: Record<string, string> = {
  note: '<svg class="callout-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  tip: '<svg class="callout-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>',
  warning: '<svg class="callout-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  danger: '<svg class="callout-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  success: '<svg class="callout-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  question: '<svg class="callout-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  quote: '<svg class="callout-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/></svg>',
  example: '<svg class="callout-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  summary: '<svg class="callout-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
};

function getCalloutIconSvg(type: string): string {
  const normType =
    type === "info" || type === "todo" ? "note" :
    type === "hint" || type === "important" ? "tip" :
    type === "caution" || type === "attention" ? "warning" :
    type === "error" || type === "failure" || type === "fail" || type === "bug" ? "danger" :
    type === "check" || type === "done" ? "success" :
    type === "help" || type === "faq" ? "question" :
    type === "cite" ? "quote" :
    type === "abstract" || type === "tldr" ? "summary" :
    type in CALLOUT_ICONS_SVG ? type : "note";

  return CALLOUT_ICONS_SVG[normType] || CALLOUT_ICONS_SVG.note;
}

/**
 * Normalizes typographic attribute quotes inside raw HTML nodes,
 * leaving all book prose typography untouched.
 */
function normalizeHtmlQuotes() {
  return (tree: MdastRoot) => {
    visit(tree, "html", (node) => {
      node.value = node.value
        .replaceAll("“", '"')
        .replaceAll("”", '"')
        .replaceAll("‘", "'")
        .replaceAll("’", "'");
    });
  };
}

const subMarkdownProcessor = unified().use(remarkParse).use(remarkGfm).use(remarkObsidian).use(remarkRehype);

/**
 * Transforms raw text children of notebook markdown cell divs into structured markdown HAST nodes.
 */
function rehypeMarkdownCells() {
  return (tree: Root) => {
    visitElements(tree, (element) => {
      const classes = Array.isArray(element.properties?.className)
        ? element.properties.className
        : [element.properties?.className];
      if (
        element.tagName === "div" &&
        (classes.includes("markdown") || classes.includes("cell") || classes.includes("code"))
      ) {
        const textNodes = element.children.filter((c) => c.type === "text");
        if (textNodes.length > 0 && textNodes.length === element.children.length) {
          const rawText = textNodes.map((t) => (t as { value: string }).value).join("");
          if (rawText.trim()) {
            const subMdast = subMarkdownProcessor.parse(rawText.trim());
            const subHast = subMarkdownProcessor.runSync(subMdast);
            element.children = subHast.children as ElementContent[];
          }
        }
      }
    });
  };
}

/**
 * Slugify headings and record TOC list.
 */
function rehypeObsidianReader() {
  return (tree: Root, file: VFile) => {
    const headings: MarkdownHeading[] = [];
    const headingIds = new Set<string>();
    const slugger = new Slugger();

    visitElements(tree, (element) => {
      if (!["h1", "h2", "h3", "h4", "h5", "h6"].includes(element.tagName)) return;
      const text = textContent(element).trim() || "Untitled section";
      const slug = slugger.slug(text);
      const id = `heading-${slug}`;
      element.properties = element.properties || {};
      element.properties.id = id;
      headingIds.add(id);
      headings.push({
        id,
        level: Number(element.tagName[1]),
        text,
      });
    });

    visitElements(tree, (element) => {
      if (element.tagName !== "a") return;
      const href = element.properties.href;
      if (typeof href !== "string" || !href.startsWith("#heading-")) return;
      const targetId = href.slice(1);
      if (!headingIds.has(targetId)) {
        delete element.properties.href;
      }
    });

    file.data.headings = headings;
  };
}

/**
 * Creates the ChatGPT-style header with </> language indicator and clipboard Copy button.
 */
function createCodeHeaderElement(langDisplay: string, isMermaid: boolean): Element {
  const iconPolyline = isMermaid
    ? [
        { type: "element" as const, tagName: "polygon", properties: { points: "12 2 2 7 12 12 22 7 12 2" }, children: [] },
        { type: "element" as const, tagName: "polyline", properties: { points: "2 17 12 22 22 17" }, children: [] },
        { type: "element" as const, tagName: "polyline", properties: { points: "2 12 12 17 22 12" }, children: [] },
      ]
    : [
        { type: "element" as const, tagName: "polyline", properties: { points: "16 18 22 12 16 6" }, children: [] },
        { type: "element" as const, tagName: "polyline", properties: { points: "8 6 2 12 8 18" }, children: [] },
      ];

  return {
    type: "element",
    tagName: "div",
    properties: { className: ["code-header"] },
    children: [
      {
        type: "element",
        tagName: "div",
        properties: { className: ["code-lang"] },
        children: [
          {
            type: "element",
            tagName: "svg",
            properties: {
              xmlns: "http://www.w3.org/2000/svg",
              width: "13",
              height: "13",
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              strokeWidth: "2",
              strokeLinecap: "round",
              strokeLinejoin: "round",
              className: ["code-lang-icon"],
            },
            children: iconPolyline,
          },
          {
            type: "element",
            tagName: "span",
            properties: {},
            children: [{ type: "text", value: langDisplay }],
          },
        ],
      },
      {
        type: "element",
        tagName: "button",
        properties: {
          className: ["code-copy-btn"],
          type: "button",
          ariaLabel: isMermaid ? "Copy diagram code" : "Copy code",
          title: isMermaid ? "Copy diagram code" : "Copy code",
        },
        children: [
          {
            type: "element",
            tagName: "svg",
            properties: {
              xmlns: "http://www.w3.org/2000/svg",
              width: "13",
              height: "13",
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              strokeWidth: "2",
              strokeLinecap: "round",
              strokeLinejoin: "round",
              className: ["copy-icon"],
            },
            children: [
              {
                type: "element",
                tagName: "rect",
                properties: { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2" },
                children: [],
              },
              {
                type: "element",
                tagName: "path",
                properties: { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" },
                children: [],
              },
            ],
          },
          {
            type: "element",
            tagName: "svg",
            properties: {
              xmlns: "http://www.w3.org/2000/svg",
              width: "13",
              height: "13",
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              strokeWidth: "2",
              strokeLinecap: "round",
              strokeLinejoin: "round",
              className: ["check-icon"],
            },
            children: [
              {
                type: "element",
                tagName: "polyline",
                properties: { points: "20 6 9 17 4 12" },
                children: [],
              },
            ],
          },
          {
            type: "element",
            tagName: "span",
            properties: { className: ["copy-label"] },
            children: [{ type: "text", value: "Copy" }],
          },
        ],
      },
    ],
  };
}

/**
 * Decorates code blocks with ChatGPT-style luxury cards, header badges, and copy buttons.
 */
function rehypeCodeCardEnhancer() {
  return (tree: Root) => {
    visit(tree, "element", (element: Element, index, parent) => {
      if (element.tagName !== "pre") return;

      let lang = "";
      const langAttr = element.properties?.dataLanguage || element.properties?.["data-language"];
      if (typeof langAttr === "string" && langAttr.trim().length > 0) {
        lang = langAttr.trim();
      } else {
        const codeChild = element.children.find(
          (c): c is Element => c.type === "element" && c.tagName === "code"
        );
        if (codeChild) {
          const classes = Array.isArray(codeChild.properties?.className)
            ? codeChild.properties.className
            : [String(codeChild.properties?.className || "")];

          const langClass = classes.find(
            (cls): cls is string => typeof cls === "string" && cls.startsWith("language-")
          );
          if (langClass) {
            lang = langClass.slice("language-".length).trim();
          }
        }
      }

      const isMermaid = lang.toLowerCase() === "mermaid";
      const langDisplay = isMermaid ? "MERMAID" : (lang ? lang.toUpperCase() : "CODE");
      element.properties = element.properties || {};
      element.properties.dataLanguage = langDisplay;
      delete element.properties["data-language"];

      if (isMermaid) {
        const preClasses = Array.isArray(element.properties.className)
          ? element.properties.className
          : element.properties.className
            ? [String(element.properties.className)]
            : [];
        if (!preClasses.includes("mermaid")) {
          element.properties.className = [...preClasses, "mermaid"];
        }
      }

      const isParentCard =
        parent &&
        parent.type === "element" &&
        (Array.isArray(parent.properties?.className)
          ? parent.properties.className.includes("code-card")
          : String(parent.properties?.className || "").includes("code-card"));
      if (isParentCard) return;

      const headerNode = createCodeHeaderElement(langDisplay, isMermaid);

      if (
        parent &&
        parent.type === "element" &&
        (parent.properties?.dataRehypePrettyCodeFigure !== undefined ||
          parent.properties?.["data-rehype-pretty-code-figure"] !== undefined)
      ) {
        const existingClasses = Array.isArray(parent.properties.className)
          ? parent.properties.className
          : parent.properties.className
            ? [String(parent.properties.className)]
            : [];
        parent.properties.className = [
          ...existingClasses,
          "code-card",
          ...(isMermaid ? ["mermaid-card"] : []),
        ];
        parent.children.unshift(headerNode);
      } else if (parent && typeof index === "number" && Array.isArray(parent.children)) {
        const cardFigure: Element = {
          type: "element",
          tagName: "figure",
          properties: {
            className: ["code-card", ...(isMermaid ? ["mermaid-card"] : [])],
          },
          children: [headerNode, element],
        };
        parent.children[index] = cardFigure;
      }
    });
  };
}

export interface MarkdownProcessingResult {
  frontmatter: FrontmatterMetadata;
  hast: Root;
  headings: MarkdownHeading[];
}

/** Convert Markdown source into safe HAST tree with LaTeX math, Shiki highlighting, and Obsidian extensions. */
export async function processMarkdown(source: string): Promise<MarkdownProcessingResult> {
  const frontmatter: FrontmatterMetadata = {};
  const vfile = new VFile({ value: source });
  const slugger = new Slugger();

  const processor = unified()
    .use(remarkParse)
    .use(disableIndentedCode)
    .use(remarkFrontmatter, ["yaml"])
    .use(() => (tree: MdastRoot) => {
      for (const node of tree.children) {
        if (node.type === "yaml") {
          try {
            const parsed = YAML.parse(node.value);
            if (parsed && typeof parsed === "object") {
              if (parsed.title) frontmatter.title = String(parsed.title).trim();
              if (parsed.author || parsed.creator) {
                frontmatter.author = String(parsed.author || parsed.creator).trim();
              }
              if (parsed.date) frontmatter.date = String(parsed.date).trim();
              if (parsed.description) frontmatter.description = String(parsed.description).trim();
              if (Array.isArray(parsed.tags)) {
                frontmatter.tags = parsed.tags.map((t: unknown) => String(t).trim()).filter(Boolean);
              } else if (typeof parsed.tags === "string") {
                frontmatter.tags = parsed.tags.split(",").map((t: string) => t.trim()).filter(Boolean);
              }
            }
          } catch {
            // benign
          }
        }
      }
    })
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkObsidian)
    .use(remarkCallout, {
      root: (callout) => ({
        tagName: callout.isFoldable ? "details" : "aside",
        properties: {
          className: ["callout", `callout-${callout.type.toLowerCase()}`],
          ...(callout.isFoldable && (callout.defaultFolded === undefined ? true : !callout.defaultFolded)
            ? { open: true }
            : {}),
        },
      }),
      title: (callout) => ({
        tagName: callout.isFoldable ? "summary" : "div",
        properties: { className: ["callout-title"] },
      }),
      icon: (callout) => getCalloutIconSvg(callout.type.toLowerCase()),
    })
    .use(normalizeHtmlQuotes)
    .use(remarkRehype, {
      handlers: {
        wikilink(_state, rawNode) {
          const node = rawNode as unknown as {
            alias?: string;
            embedded?: boolean;
            heading?: string;
            path?: string;
          };
          if (node.embedded) {
            return {
              type: "element",
              tagName: "img",
              properties: {
                src: node.path,
                alt: node.path,
                ...(node.alias ? { width: node.alias } : {}),
              },
              children: [],
            };
          }
          const label = node.alias || node.heading || node.path || "Untitled Link";
          const target = (node.heading || node.path || "").trim();
          return {
            type: "element",
            tagName: "a",
            properties: {
              className: ["wiki-link"],
              href: `#heading-${slugger.slug(target)}`,
            },
            children: [{ type: "text", value: label }],
          };
        },
        highlight(state, rawNode) {
          return {
            type: "element",
            tagName: "mark",
            properties: { className: ["flexible-marker", "flexible-marker-default"] },
            children: state.all(rawNode as Parameters<typeof state.all>[0]),
          };
        },
      },
      allowDangerousHtml: true,
    })
    .use(rehypeRaw)
    .use(rehypeMarkdownCells)
    .use(rehypeSanitize, markdownSanitizeSchema)
    .use(rehypeKatex, { output: "htmlAndMathml", strict: false })
    .use(rehypePrettyCode, {
      theme: {
        dark: "one-dark-pro",
        light: "github-light",
      },
      keepBackground: true,
      defaultLang: "plaintext",
    })
    .use(rehypeCodeCardEnhancer)
    .use(rehypeObsidianReader);

  const mdast = processor.parse(vfile);
  const hast = await processor.run(mdast, vfile);

  const headings = (vfile.data?.headings as MarkdownHeading[]) ?? [];
  return { frontmatter, hast: hast as Root, headings };
}

/** Construct Obsidian Document Properties metadata banner element */
function createMetadataBannerElement(meta: FrontmatterMetadata): Element | null {
  const chips: Element[] = [];

  if (meta.author && meta.author !== "Unknown Author") {
    chips.push({
      type: "element",
      tagName: "span",
      properties: { className: ["metadata-chip"] },
      children: [
        {
          type: "element",
          tagName: "svg",
          properties: {
            xmlns: "http://www.w3.org/2000/svg",
            width: "14",
            height: "14",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            strokeLinejoin: "round",
          },
          children: [
            { type: "element", tagName: "path", properties: { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" }, children: [] },
            { type: "element", tagName: "circle", properties: { cx: "12", cy: "7", r: "4" }, children: [] },
          ],
        },
        { type: "text", value: ` ${meta.author}` },
      ],
    });
  }

  if (meta.date) {
    chips.push({
      type: "element",
      tagName: "span",
      properties: { className: ["metadata-chip"] },
      children: [
        {
          type: "element",
          tagName: "svg",
          properties: {
            xmlns: "http://www.w3.org/2000/svg",
            width: "14",
            height: "14",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            strokeLinejoin: "round",
          },
          children: [
            { type: "element", tagName: "rect", properties: { x: "3", y: "4", width: "18", height: "18", rx: "2", ry: "2" }, children: [] },
            { type: "element", tagName: "line", properties: { x1: "16", y1: "2", x2: "16", y2: "6" }, children: [] },
            { type: "element", tagName: "line", properties: { x1: "8", y1: "2", x2: "8", y2: "6" }, children: [] },
            { type: "element", tagName: "line", properties: { x1: "3", y1: "10", x2: "21", y2: "10" }, children: [] },
          ],
        },
        { type: "text", value: ` ${meta.date}` },
      ],
    });
  }

  const tagsContainer: Element | null =
    meta.tags && meta.tags.length > 0
      ? {
          type: "element",
          tagName: "div",
          properties: { className: ["metadata-tags"] },
          children: meta.tags.map((t) => ({
            type: "element",
            tagName: "span",
            properties: { className: ["tag-pill"] },
            children: [{ type: "text", value: `#${t}` }],
          })),
        }
      : null;

  if (chips.length === 0 && !tagsContainer) return null;

  const headerChildren: Element[] = [];
  if (chips.length > 0) {
    headerChildren.push({
      type: "element",
      tagName: "div",
      properties: { className: ["metadata-grid"] },
      children: chips,
    });
  }
  if (tagsContainer) {
    headerChildren.push(tagsContainer);
  }

  return {
    type: "element",
    tagName: "header",
    properties: { className: ["document-metadata"] },
    children: headerChildren,
  };
}

const DOCUMENT_STYLES = `
:root {
  color-scheme: light dark;
  --md-bg: inherit;
  --md-fg: currentColor;
  --md-muted: color-mix(in srgb, currentColor 60%, transparent);
  --md-border: color-mix(in srgb, currentColor 12%, transparent);
  --md-card-bg: color-mix(in srgb, currentColor 4%, transparent);
  --md-code-bg: color-mix(in srgb, currentColor 5%, transparent);
  --md-code-header-bg: color-mix(in srgb, currentColor 9%, transparent);
  --md-code-border: color-mix(in srgb, currentColor 14%, transparent);
  --md-accent: #58a6ff;
  --md-accent-glow: color-mix(in srgb, var(--md-accent) 15%, transparent);
  --md-highlight: color-mix(in srgb, #ffd700 24%, transparent);
}

html[data-theme="dark"] {
  --md-accent: #58a6ff;
  --md-highlight: rgba(255, 215, 0, 0.22);
}

html[data-theme="light"] {
  --md-accent: #0969da;
  --md-highlight: rgba(255, 235, 59, 0.4);
}

/* Modern Technical Typography */
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 1.65;
  color: var(--md-fg);
  background-color: transparent;
  margin: 0 auto;
  padding: 2.5rem 2rem 6rem;
  max-width: 54rem;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  word-wrap: break-word;
}

h1, h2, h3, h4, h5, h6 {
  color: var(--md-fg);
  font-weight: 600;
  line-height: 1.28;
  margin-top: 2rem;
  margin-bottom: 0.85rem;
  scroll-margin-top: 4.5rem;
}
h1 { font-size: 2.15rem; font-weight: 750; letter-spacing: -0.025em; border-bottom: 1px solid var(--md-border); padding-bottom: 0.4rem; margin-top: 1rem; }
h2 { font-size: 1.55rem; font-weight: 650; letter-spacing: -0.018em; border-bottom: 1px solid var(--md-border); padding-bottom: 0.3rem; }
h3 { font-size: 1.28rem; }
h4 { font-size: 1.08rem; }

p, ul, ol {
  margin-top: 0;
  margin-bottom: 1.15rem;
}

li + li {
  margin-top: 0.35rem;
}

/* Obsidian Document Properties Header */
.document-metadata {
  margin-bottom: 2.5rem;
  padding: 1.25rem 1.5rem;
  background: var(--md-card-bg);
  border: 1px solid var(--md-border);
  border-radius: 12px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.08);
}
.metadata-grid {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem 1.5rem;
}
.metadata-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: var(--md-muted);
  font-weight: 500;
}
.metadata-chip svg {
  opacity: 0.8;
}
.metadata-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.85rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--md-border);
}
.tag-pill {
  display: inline-block;
  padding: 0.15rem 0.6rem;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--md-accent);
  background: var(--md-accent-glow);
  border: 1px solid color-mix(in srgb, var(--md-accent) 25%, transparent);
  border-radius: 9999px;
  letter-spacing: 0.02em;
}

/* Pill Inline Code */
:not(pre) > code {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 0.86em;
  padding: 0.2em 0.42em;
  background-color: var(--md-code-bg);
  border: 1px solid var(--md-border);
  border-radius: 6px;
  color: color-mix(in srgb, currentColor 85%, #d73a49);
}

/* Obsidian Mark and Highlight */
mark, .flexible-marker {
  background: var(--md-highlight);
  color: inherit;
  padding: 0.15em 0.35em;
  border-radius: 4px;
  border-bottom: 2px solid #e3b341;
}

/* 3D Keycaps */
kbd {
  font-family: ui-monospace, monospace;
  font-size: 0.82em;
  padding: 0.2em 0.45em;
  background-color: var(--md-card-bg);
  border: 1px solid var(--md-border);
  border-radius: 5px;
  box-shadow: 0 2px 0 var(--md-border);
  display: inline-block;
  white-space: nowrap;
}

/* Dual Theme Shiki Variables with Theme Card Transparency */
.shiki,
.shiki span {
  background-color: transparent !important;
}
html[data-theme="dark"] .shiki,
html[data-theme="dark"] .shiki span {
  color: var(--shiki-dark) !important;
  font-style: var(--shiki-dark-font-style) !important;
  font-weight: var(--shiki-dark-font-weight) !important;
  text-decoration: var(--shiki-dark-text-decoration) !important;
}

@media (prefers-color-scheme: dark) {
  html:not([data-theme="light"]) .shiki,
  html:not([data-theme="light"]) .shiki span {
    color: var(--shiki-dark) !important;
    font-style: var(--shiki-dark-font-style) !important;
    font-weight: var(--shiki-dark-font-weight) !important;
    text-decoration: var(--shiki-dark-text-decoration) !important;
  }
}

html[data-theme="light"] .shiki,
html[data-theme="light"] .shiki span {
  color: var(--shiki-light) !important;
  font-style: var(--shiki-light-font-style) !important;
  font-weight: var(--shiki-light-font-weight) !important;
  text-decoration: var(--shiki-light-text-decoration) !important;
}

/* ChatGPT-Style Luxury Code Block Cards */
figure.code-card {
  position: relative;
  margin: 1.6rem 0;
  border: 1px solid var(--md-code-border);
  border-radius: 10px;
  background-color: var(--md-code-bg);
  box-shadow: 0 4px 18px -4px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.45rem 0.85rem;
  background-color: var(--md-code-header-bg);
  border-bottom: 1px solid var(--md-code-border);
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.74rem;
  letter-spacing: 0.04em;
  user-select: none;
}

.code-lang {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--md-muted);
  font-weight: 650;
  text-transform: uppercase;
}

.code-lang-icon {
  width: 13px;
  height: 13px;
  opacity: 0.75;
}

.code-copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: transparent;
  border: 1px solid var(--md-border);
  border-radius: 5px;
  color: var(--md-muted);
  cursor: pointer;
  padding: 0.2rem 0.55rem;
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 550;
  transition: all 0.15s ease;
  outline: none;
}

.code-copy-btn:hover {
  background-color: color-mix(in srgb, currentColor 8%, transparent);
  color: var(--md-fg);
  border-color: color-mix(in srgb, currentColor 25%, transparent);
}

.code-copy-btn:active {
  transform: scale(0.97);
}

.code-copy-btn.copied {
  color: #3fb950 !important;
  border-color: #3fb950 !important;
  background-color: rgba(63, 185, 80, 0.12) !important;
}

.code-copy-btn .check-icon {
  display: none;
}

.code-copy-btn.copied .check-icon {
  display: inline-block;
}

.code-copy-btn.copied .copy-icon {
  display: none;
}

figure.code-card pre {
  margin: 0 !important;
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding: 1.15rem 1.25rem;
  background-color: transparent !important;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 0.88em;
  line-height: 1.55;
  overflow-x: auto;
  white-space: pre !important;
  word-break: normal !important;
  overflow-wrap: normal !important;
}

figure.code-card pre > code {
  font-family: inherit;
  font-size: inherit;
  background: transparent !important;
  padding: 0 !important;
  border: 0 !important;
  display: block;
  min-width: 100%;
  white-space: pre !important;
  word-break: normal !important;
  overflow-wrap: normal !important;
}

/* Standalone pre blocks */
pre:not(figure.code-card pre) {
  position: relative;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 0.88em;
  line-height: 1.55;
  padding: 1.1rem 1.25rem;
  background-color: var(--md-code-bg) !important;
  border: 1px solid var(--md-code-border);
  border-radius: 10px;
  overflow-x: auto;
  margin: 1.5rem 0;
  box-shadow: 0 4px 16px -4px rgba(0, 0, 0, 0.08);
  white-space: pre !important;
  word-break: normal !important;
  overflow-wrap: normal !important;
}

/* Mermaid Diagram Cards */
figure.mermaid-card {
  text-align: center;
}
figure.mermaid-card pre.mermaid {
  text-align: left;
}
figure.mermaid-card .mermaid svg {
  max-width: 100% !important;
  height: auto !important;
}

/* Jupyter Notebook Cell and Terminal Architecture */
.cell {
  position: relative;
  margin: 1.75rem 0;
  border: 1px solid var(--md-border);
  border-radius: 10px;
  background: var(--md-card-bg);
  box-shadow: 0 4px 18px -4px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}
.cell.markdown {
  padding: 1.25rem 1.5rem;
  border-left: 4px solid var(--md-accent);
}
.cell.code {
  border-left: 4px solid #7ee787;
  padding: 0;
}
.cell.code > figure.code-card {
  margin: 0 !important;
  border: none !important;
  border-radius: 0 !important;
}
.cell.code > pre {
  margin: 0;
  border: none;
  border-radius: 0;
  background: transparent;
}
.cell[data-execution_count]::before {
  content: "In [" attr(data-execution_count) "]:";
  position: absolute;
  top: 0.4rem;
  left: 0.75rem;
  font-family: ui-monospace, monospace;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--md-muted);
  user-select: none;
  z-index: 2;
}

/* Responsive Data Tables */
table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin: 1.75rem 0;
  border: 1px solid var(--md-border);
  border-radius: 10px;
  overflow: hidden;
  font-size: 0.92rem;
}
th, td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--md-border);
}
th {
  background-color: var(--md-card-bg);
  font-weight: 650;
  color: var(--md-fg);
  border-bottom: 2px solid var(--md-border);
}
tr:last-child td {
  border-bottom: none;
}
tr:nth-child(even) td {
  background-color: color-mix(in srgb, currentColor 2.5%, transparent);
}

/* Deluxe Obsidian and GFM Callouts */
.callout {
  margin: 1.6rem 0;
  padding: 1rem 1.25rem;
  border-radius: 10px;
  border: 1px solid var(--md-border);
  border-left: 4px solid #58a6ff;
  background: color-mix(in srgb, #58a6ff 7%, transparent);
  font-size: 0.95rem;
  box-shadow: 0 4px 14px -3px rgba(0, 0, 0, 0.05);
}
.callout-note { border-left-color: #58a6ff; background: color-mix(in srgb, #58a6ff 7%, transparent); }
.callout-tip { border-left-color: #3fb950; background: color-mix(in srgb, #3fb950 7%, transparent); }
.callout-warning { border-left-color: #d29922; background: color-mix(in srgb, #d29922 7%, transparent); }
.callout-danger { border-left-color: #f85149; background: color-mix(in srgb, #f85149 7%, transparent); }
.callout-question { border-left-color: #a371f7; background: color-mix(in srgb, #a371f7 7%, transparent); }
.callout-quote { border-left-color: color-mix(in srgb, currentColor 40%, transparent); background: color-mix(in srgb, currentColor 5%, transparent); }

.callout-title {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-weight: 650;
  margin-bottom: 0.55rem;
  color: var(--md-fg);
}
summary.callout-title {
  cursor: pointer;
  user-select: none;
}
.callout > p:last-child,
.callout > div:last-child p:last-child {
  margin-bottom: 0;
}
.callout-icon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
}

/* Interactive Task Lists and Wiki Links */
.wiki-link {
  color: var(--md-accent);
  text-decoration: none;
  border-bottom: 1px solid color-mix(in srgb, var(--md-accent) 35%, transparent);
  font-weight: 500;
  transition: border-color 0.15s ease, color 0.15s ease;
}
.wiki-link:hover {
  border-bottom-color: var(--md-accent);
  text-decoration: none;
}
ul:has(input[type="checkbox"]) {
  list-style-type: none;
  padding-left: 0.25rem;
}
input[type="checkbox"] {
  accent-color: var(--md-accent);
  margin-right: 0.5rem;
  width: 0.95rem;
  height: 0.95rem;
  cursor: pointer;
  vertical-align: middle;
}

/* Embedded KaTeX LaTeX Math */
.katex-display {
  margin: 1.5em 0;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.5em 0;
}
` + katexStyles;

/**
 * Builds full XHTML document from HAST using xast-util-to-xml for 100% strict XML validity.
 */
function buildDocumentXhtml(
  bodyHast: Root,
  sectionTitle: string,
  meta: FrontmatterMetadata
): string {
  const metadataBanner = createMetadataBannerElement(meta);

  const documentHast: Root = {
    type: "root",
    children: [
      {
        type: "doctype",
      },
      {
        type: "element",
        tagName: "html",
        properties: { xmlns: "http://www.w3.org/1999/xhtml" },
        children: [
          {
            type: "element",
            tagName: "head",
            properties: {},
            children: [
              { type: "element", tagName: "meta", properties: { charset: "utf-8" }, children: [] },
              { type: "element", tagName: "title", properties: {}, children: [{ type: "text", value: sectionTitle }] },
              { type: "element", tagName: "style", properties: {}, children: [{ type: "text", value: DOCUMENT_STYLES }] },
            ],
          },
          {
            type: "element",
            tagName: "body",
            properties: {},
            children: [
              ...(metadataBanner ? [metadataBanner] : []),
              ...(bodyHast.children as ElementContent[]),
            ],
          },
        ],
      },
    ],
  };

  return `<?xml version="1.0" encoding="utf-8"?>\n` + toXml(toXast(documentHast));
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

  const { frontmatter, hast, headings } = await processMarkdown(md);

  const title = frontmatter.title || headings.find((h) => h.level === 1)?.text || fallbackTitle;
  const author = frontmatter.author || "Unknown Author";

  const objectUrls: string[] = [];
  const toc: RawFoliateTocItem[] = [];
  const idToSectionMap = new Map<string, number>();

  const sectionIndex = 0;
  const sectionTitle = headings.find((h) => h.level === 1)?.text || title || "Document";

  for (const h of headings) {
    idToSectionMap.set(h.id, sectionIndex);
  }

  // Build TOC hierarchy
  const sectionToc: RawFoliateTocItem = {
    id: `toc-${sectionIndex}`,
    href: sectionIndex.toString(),
    label: sectionTitle,
    subitems: headings
      .filter((h) => h.level > 1 && h.level <= 3)
      .map((h) => ({
        id: h.id,
        href: `${sectionIndex}#${h.id}`,
        label: h.text,
      })),
  };
  if (sectionToc.subitems && sectionToc.subitems.length > 0) {
    toc.push(sectionToc);
  } else {
    toc.push({
      id: `toc-${sectionIndex}`,
      href: sectionIndex.toString(),
      label: sectionTitle,
    });
  }

  const xhtml = buildDocumentXhtml(hast, sectionTitle, frontmatter);

  const blob = new Blob([xhtml], { type: "application/xhtml+xml" });
  const url = URL.createObjectURL(blob);
  objectUrls.push(url);

  const section: RawFoliateSection = {
    id: sectionIndex,
    href: `sec-${sectionIndex}.xhtml`,
    title: sectionTitle,
    load: () => url,
    createDocument: () => {
      const parser = new DOMParser();
      return parser.parseFromString(xhtml, "application/xhtml+xml");
    },
    size: blob.size,
    linear: "yes",
  };

  return {
    metadata: {
      title,
      author,
      creator: author,
      language: "en",
      direction: "ltr",
    },
    dir: "ltr",
    rendition: {
      layout: "scrolled",
    },
    sections: [section],
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
      for (const u of objectUrls) {
        URL.revokeObjectURL(u);
      }
    },
  };
}
