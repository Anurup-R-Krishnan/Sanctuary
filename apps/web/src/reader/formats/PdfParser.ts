import type * as PdfJsModule from "pdfjs-dist";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

import type { RawFoliateBook, RawFoliateSection, RawFoliateTocItem } from "./TxtParser";

type PdfJs = typeof PdfJsModule;

export interface PdfPageColors {
  background: string;
  foreground: string;
}

interface OutlineNode {
  dest: string | unknown[] | null;
  items?: OutlineNode[];
  title: string;
}

interface LivePage {
  doc: Document;
  page: PDFPageProxy;
  scale: number;
}

const PAGE_HREF_PREFIX = "page-";
const COVER_WIDTH = 480;

let pdfjsPromise: Promise<PdfJs> | null = null;
let pageColors: PdfPageColors | null = null;
const livePages = new Set<LivePage>();

function loadPdfJs(): Promise<PdfJs> {
  pdfjsPromise ??= Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]).then(([lib, worker]) => {
    if (typeof worker.default === "string") lib.GlobalWorkerOptions.workerSrc = worker.default;
    return lib;
  });
  return pdfjsPromise;
}

export function pageHref(index: number): string {
  return `${PAGE_HREF_PREFIX}${index + 1}`;
}

export function pageIndexFromHref(href: string): number | null {
  const match = /^page-(\d+)$/.exec(href.split("#")[0] ?? "");
  if (!match) return null;
  const index = Number(match[1]) - 1;
  return Number.isInteger(index) && index >= 0 ? index : null;
}

export function setPdfPageColors(colors: PdfPageColors | null): void {
  const unchanged = colors?.background === pageColors?.background && colors?.foreground === pageColors?.foreground;
  pageColors = colors;
  if (unchanged) return;
  for (const live of livePages) void renderPage(live);
}

const PAGE_STYLE = `
html,body{margin:0;padding:0;overflow:hidden;background:transparent;--scale-round-x:1px;--scale-round-y:1px}
#page{position:relative}
#page canvas{display:block}
.textLayer{position:absolute;inset:0;overflow:clip;opacity:1;line-height:1;text-align:initial;transform-origin:0 0;z-index:0;
--min-font-size:1;--text-scale-factor:calc(var(--total-scale-factor) * var(--min-font-size));--min-font-size-inv:calc(1 / var(--min-font-size))}
.textLayer :is(span,br){color:transparent;position:absolute;white-space:pre;cursor:text;transform-origin:0% 0%}
.textLayer > :not(.markedContent),.textLayer .markedContent span:not(.markedContent){z-index:1;--font-height:0;font-size:calc(var(--text-scale-factor) * var(--font-height));--scale-x:1;--rotate:0deg;transform:rotate(var(--rotate)) scaleX(var(--scale-x)) scale(var(--min-font-size-inv))}
.textLayer .markedContent{display:contents}
.textLayer ::selection{background:rgba(142,104,62,.3);color:transparent}
.textLayer .endOfContent{display:block;position:absolute;inset:100% 0 0;z-index:0;cursor:default;user-select:none}
`;

function pageMarkup(width: number, height: number): string {
  return `<!DOCTYPE html><html data-sanctuary-pdf=""><head><meta charset="utf-8"><meta name="viewport" content="width=${Math.round(width)}, height=${Math.round(height)}"><style>${PAGE_STYLE}</style></head><body><div id="page"><div id="canvas"></div><div class="textLayer"></div></div></body></html>`;
}

async function renderPage(live: LivePage): Promise<void> {
  const pdfjs = await loadPdfJs();
  const { doc, page, scale } = live;
  const host = doc.getElementById("page");
  const canvasHost = doc.getElementById("canvas");
  const textHost = doc.querySelector<HTMLElement>(".textLayer");
  if (!host || !canvasHost || !textHost) return;

  const ratio = Math.min(globalThis.devicePixelRatio || 1, 3);
  const viewport = page.getViewport({ scale });
  const outputViewport = page.getViewport({ scale: scale * ratio });
  const canvas = doc.createElement("canvas");
  canvas.width = Math.floor(outputViewport.width);
  canvas.height = Math.floor(outputViewport.height);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;
  doc.documentElement.style.setProperty("--total-scale-factor", String(scale));
  host.style.width = `${Math.floor(viewport.width)}px`;
  host.style.height = `${Math.floor(viewport.height)}px`;

  await page.render({
    canvas,
    viewport: outputViewport,
    ...(pageColors ? { pageColors } : {}),
  }).promise;
  canvasHost.replaceChildren(canvas);

  textHost.replaceChildren();
  const textLayer = new pdfjs.TextLayer({ container: textHost, textContentSource: page.streamTextContent(), viewport });
  await textLayer.render();
  const end = doc.createElement("div");
  end.className = "endOfContent";
  textHost.append(end);
}

async function textDocument(page: PDFPageProxy, index: number): Promise<Document> {
  const content = await page.getTextContent();
  const lines: string[] = [];
  let current = "";
  for (const item of content.items) {
    if (!("str" in item)) continue;
    current += item.str;
    if (item.hasEOL) {
      lines.push(current);
      current = "";
    } else if (item.str && !item.str.endsWith(" ")) {
      current += " ";
    }
  }
  if (current.trim()) lines.push(current);
  const doc = document.implementation.createHTMLDocument(`Page ${index + 1}`);
  for (const line of lines) {
    const text = line.replace(/\s+/g, " ").trim();
    if (!text) continue;
    const paragraph = doc.createElement("p");
    paragraph.textContent = text;
    doc.body.append(paragraph);
  }
  return doc;
}

async function resolveDestIndex(pdf: PDFDocumentProxy, dest: OutlineNode["dest"]): Promise<number | null> {
  try {
    const explicit = typeof dest === "string" ? await pdf.getDestination(dest) : dest;
    const ref = explicit?.[0];
    if (ref === undefined || ref === null) return null;
    if (typeof ref === "number") return ref;
    return await pdf.getPageIndex(ref as Parameters<PDFDocumentProxy["getPageIndex"]>[0]);
  } catch {
    return null;
  }
}

async function buildToc(pdf: PDFDocumentProxy, nodes: OutlineNode[] | null | undefined): Promise<RawFoliateTocItem[]> {
  if (!nodes?.length) return [];
  const items = await Promise.all(nodes.map(async (node): Promise<RawFoliateTocItem | null> => {
    const index = await resolveDestIndex(pdf, node.dest);
    const subitems = await buildToc(pdf, node.items);
    if (index === null && subitems.length === 0) return null;
    return {
      href: pageHref(index ?? pageIndexFromHref(subitems[0]?.href ?? "") ?? 0),
      label: node.title?.trim() || "Untitled",
      ...(subitems.length > 0 ? { subitems } : {}),
    };
  }));
  return items.filter((item): item is RawFoliateTocItem => item !== null);
}

async function toBytes(source: Blob | File | ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  if (source instanceof Uint8Array) return source;
  if (source instanceof ArrayBuffer) return new Uint8Array(source);
  return new Uint8Array(await source.arrayBuffer());
}

export function isPdfBytes(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

function metadataText(info: unknown, key: string): string | undefined {
  if (!info || typeof info !== "object") return undefined;
  const value = (info as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function parsePdfToBook(
  source: Blob | File | ArrayBuffer | Uint8Array,
  fileName: string = "document.pdf"
): Promise<RawFoliateBook> {
  const bytes = await toBytes(source);
  if (!isPdfBytes(bytes)) throw new Error("Invalid PDF document: missing %PDF- header.");

  const pdfjs = await loadPdfJs();
  const assetBase = typeof window !== "undefined" ? new URL("/pdfjs/", window.location.href).href : undefined;
  const loadingTask = pdfjs.getDocument({
    data: bytes.slice(),
    ...(assetBase
      ? {
          cMapPacked: true,
          cMapUrl: `${assetBase}cmaps/`,
          standardFontDataUrl: `${assetBase}standard_fonts/`,
          wasmUrl: `${assetBase}wasm/`,
        }
      : {}),
  });
  const pdf = await loadingTask.promise;
  const [meta, outline] = await Promise.all([
    pdf.getMetadata().catch(() => null),
    pdf.getOutline().catch(() => null),
  ]);

  const fallbackTitle = fileName.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ").trim() || "Untitled document";
  const pages = new Map<number, Promise<PDFPageProxy>>();
  const getPage = (index: number) => {
    let pending = pages.get(index);
    if (!pending) {
      pending = pdf.getPage(index + 1);
      pages.set(index, pending);
    }
    return pending;
  };

  const sections: RawFoliateSection[] = Array.from({ length: pdf.numPages }, (_, index) => {
    const urls: string[] = [];
    const tracked = new Set<LivePage>();
    return {
      createDocument: async () => textDocument(await getPage(index), index),
      href: pageHref(index),
      id: index,
      load: async () => {
        const page = await getPage(index);
        const { height, width } = page.getViewport({ scale: 1 });
        const src = URL.createObjectURL(new Blob([pageMarkup(width, height)], { type: "text/html" }));
        urls.push(src);
        return {
          onZoom: ({ doc, scale }: { doc: Document; scale: number }) => {
            for (const live of tracked) {
              if (live.doc === doc || !live.doc.defaultView) {
                tracked.delete(live);
                livePages.delete(live);
              }
            }
            const live = { doc, page, scale };
            tracked.add(live);
            livePages.add(live);
            void renderPage(live);
          },
          src,
        };
      },
      size: 1500,
      title: `Page ${index + 1}`,
      unload: () => {
        for (const live of tracked) livePages.delete(live);
        tracked.clear();
        for (const url of urls.splice(0)) URL.revokeObjectURL(url);
      },
    };
  });

  return {
    destroy: () => {
      for (const section of sections) section.unload?.();
      void loadingTask.destroy();
    },
    getCover: async () => {
      try {
        const page = await getPage(0);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: COVER_WIDTH / base.width });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        await page.render({ canvas, viewport }).promise;
        return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
      } catch {
        return null;
      }
    },
    metadata: {
      author: metadataText(meta?.info, "Author") ?? "Unknown Author",
      creator: metadataText(meta?.info, "Creator"),
      title: metadataText(meta?.info, "Title") ?? fallbackTitle,
    },
    rendition: { layout: "pre-paginated", spread: "auto" },
    resolveHref: (href: string) => {
      const index = pageIndexFromHref(href);
      return index === null || index >= pdf.numPages ? null : { index };
    },
    sections,
    splitTOCHref: (href: string) => {
      const index = pageIndexFromHref(href);
      return index === null ? [] : [index];
    },
    toc: await buildToc(pdf, outline as OutlineNode[] | null),
  };
}
