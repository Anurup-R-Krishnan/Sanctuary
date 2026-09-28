/**
 * Book documents render in iframes that foliate-js creates with
 * `allow-same-origin allow-scripts`, so script inside a book would run with the
 * app's origin (localStorage session token, API access, Tauri IPC). The reader
 * never needs book scripts, so every markup document a book produces is
 * sanitized with a real DOM parser (not regexes), then given a CSP as a second
 * layer:
 *  - `<script>` (any namespace), `<iframe>/<frame>/<object>/<embed>` removed
 *  - every `on*` event-handler attribute removed
 *  - `javascript:` / `data:text/html` URLs in link-like attributes removed
 *    (after stripping the whitespace/control chars URL parsers ignore)
 *  - SVG animations targeting `on*`/`href`, foreign `http-equiv` metas,
 *    `<base>` and XSLT stylesheet processing instructions removed
 *  - (X)HTML documents get a `script-src 'none'` CSP `<meta>` as the first
 *    child of `<head>` (SVG documents ignore meta CSP, hence the stripping)
 *
 * Two entry points cover every format: `secureSections` wraps each section's
 * `load()` (EPUB, MOBI/AZW/AZW3, FB2, HTML, TXT, Markdown…), and
 * `installBookContentSecurity` hooks foliate's EPUB loader so nested documents
 * (e.g. an XHTML page embedding another) are sanitized too.
 */
const BOOK_CSP =
  "script-src 'none'; object-src 'none'; frame-src 'none'; child-src 'none'; base-uri 'none'; form-action 'none'";
const CSP_MARKER = "sanctuary-book-csp";
const XHTML_NS = "http://www.w3.org/1999/xhtml";

const DOM_PARSER_TYPES = new Set(["application/xhtml+xml", "text/html", "application/xml", "text/xml", "image/svg+xml"]);
const REMOVED_ELEMENTS = new Set(["script", "iframe", "frame", "frameset", "object", "embed", "applet", "portal", "base"]);
const ANIMATION_ELEMENTS = new Set(["set", "animate", "animatemotion", "animatetransform"]);
// Compared by local name, so namespaced forms (xlink:href, x:href) are caught.
const URL_ATTRIBUTES = new Set(["href", "src", "action", "formaction", "data", "srcdoc", "to", "from", "values", "by"]);
const DANGEROUS_URL = /^(javascript|vbscript|data:text\/html)/i;

const MIME_TOKEN = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/;

/**
 * The bare MIME type, or "" when it isn't a single valid type. Browsers act on
 * odd forms such as "text/plain,text/html" (Chrome renders it as HTML), so
 * anything malformed is treated as unknown and sniffed instead.
 */
function baseType(type: string | undefined): string {
  const t = (type ?? "").split(";")[0].trim().toLowerCase();
  return MIME_TOKEN.test(t) ? t : "";
}

/**
 * Anything a browser would render as a document: HTML, any XML type
 * (`…/xml`, `…+xml`), and untyped resources (browsers sniff those).
 */
export function isBookMarkupType(type: string | undefined): boolean {
  const t = baseType(type);
  return t === "" || t === "text/html" || /(^|[/+])xml$/.test(t);
}

async function startsLikeMarkup(blob: Blob): Promise<boolean> {
  const head = (await blob.slice(0, 512).text()).replace(/^\uFEFF/, "").trimStart();
  return head.startsWith("<");
}

/** Declared markup, or untyped/malformed-typed content that starts like a document. */
async function isMarkupBlob(blob: Blob, type: string): Promise<boolean> {
  if (!isBookMarkupType(type)) return false;
  return baseType(type) !== "" || startsLikeMarkup(blob);
}

/** URL parsers ignore ASCII whitespace/control characters anywhere in a URL. */
function isDangerousUrl(value: string): boolean {
  // eslint-disable-next-line no-control-regex
  return DANGEROUS_URL.test(value.replace(/[\u0000-\u0020\u007f]/g, ""));
}

function scrubElement(root: Element) {
  const all = [root, ...Array.from(root.getElementsByTagName("*"))];
  for (const el of all) {
    const name = el.localName.toLowerCase();
    if (REMOVED_ELEMENTS.has(name)) {
      el.remove();
      continue;
    }
    // SVG animations can set an event handler or a link target at runtime.
    if (ANIMATION_ELEMENTS.has(name)) {
      const target = (el.getAttribute("attributeName") ?? "").toLowerCase().split(":").pop() ?? "";
      if (target.startsWith("on") || target === "href") {
        el.remove();
        continue;
      }
    }
    // Only our own CSP meta may carry http-equiv (no refresh, no competing policy).
    if (name === "meta" && el.hasAttribute("http-equiv") && el.getAttribute("content") !== BOOK_CSP) {
      el.remove();
      continue;
    }
    for (const attr of Array.from(el.attributes)) {
      const local = attr.localName.toLowerCase();
      if (local.startsWith("on") || (URL_ATTRIBUTES.has(local) && isDangerousUrl(attr.value))) {
        el.removeAttributeNode(attr);
      }
    }
  }
}

/** XSLT can generate script, so only CSS stylesheet processing instructions survive. */
function removeXslProcessingInstructions(doc: Document) {
  for (const node of Array.from(doc.childNodes)) {
    if (node.nodeType !== 7) continue; // PROCESSING_INSTRUCTION_NODE
    const pi = node as ProcessingInstruction;
    if (pi.target.toLowerCase() === "xml-stylesheet" && !/type\s*=\s*["']text\/css["']/i.test(pi.data)) {
      pi.remove();
    }
  }
}

function addCspMeta(doc: Document) {
  const root = doc.documentElement;
  if (!root || root.localName.toLowerCase() !== "html") return;
  const ns = root.namespaceURI ?? XHTML_NS;
  let head = Array.from(root.children).find((el) => el.localName.toLowerCase() === "head");
  if (!head) {
    head = doc.createElementNS(ns, "head");
    root.insertBefore(head, root.firstChild);
  }
  if (head.querySelector(`meta[name="${CSP_MARKER}"]`)) return;
  const meta = doc.createElementNS(ns, "meta");
  meta.setAttribute("http-equiv", "Content-Security-Policy");
  meta.setAttribute("content", BOOK_CSP);
  const marker = doc.createElementNS(ns, "meta");
  marker.setAttribute("name", CSP_MARKER);
  head.insertBefore(marker, head.firstChild);
  head.insertBefore(meta, head.firstChild);
}

/**
 * Sanitizes one markup document. `type` is the MIME type it will be served
 * as; returns the markup and the type to serve it with (untyped documents are
 * served as HTML).
 */
export function sanitizeBookDocument(markup: string, type: string): { markup: string; type: string } {
  const mime = baseType(type);
  const parseAs = mime === "" ? "text/html" : DOM_PARSER_TYPES.has(mime) ? mime : "application/xml";
  const parser = new DOMParser();
  let doc = parser.parseFromString(markup, parseAs as DOMParserSupportedType);
  let isHtml = parseAs === "text/html";
  if (!isHtml && doc.getElementsByTagName("parsererror").length > 0) {
    // Malformed XML: fall back to the forgiving HTML parser rather than
    // passing the original (unsanitized) text through.
    doc = parser.parseFromString(markup, "text/html");
    isHtml = true;
  }
  if (!doc.documentElement) return { markup: "", type: "text/html" };

  removeXslProcessingInstructions(doc);
  scrubElement(doc.documentElement);
  addCspMeta(doc);

  return isHtml
    ? { markup: `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`, type: "text/html" }
    : { markup: new XMLSerializer().serializeToString(doc), type: mime };
}

export function sanitizeBookMarkup(markup: string, type: string): string {
  return sanitizeBookDocument(markup, type).markup;
}

interface LoaderDataDetail {
  data: unknown;
  type: unknown;
}

/** EPUB: sanitize every markup resource foliate's loader turns into a blob URL. */
export function installBookContentSecurity(rawBook: { transformTarget?: EventTarget }): void {
  rawBook.transformTarget?.addEventListener("data", (event) => {
    const detail = (event as CustomEvent<LoaderDataDetail>).detail;
    const resolved = Promise.all([detail.data, detail.type]).then(async ([data, rawType]) => {
      const type = typeof rawType === "string" ? rawType : "";
      if (!isBookMarkupType(type)) return { data, type };
      // Unknown XML types (and untyped items) reach us as Blobs rather than text.
      let text: string | null = null;
      if (typeof data === "string") text = data;
      else if (data instanceof Blob && (await isMarkupBlob(data, type))) text = await data.text();
      if (text === null) return { data, type };
      const clean = sanitizeBookDocument(text, type);
      return { data: clean.markup, type: clean.type || type };
    });
    detail.data = resolved.then((r) => r.data);
    detail.type = resolved.then((r) => r.type);
  });
}

interface LoadableSection {
  load(): Promise<string> | string;
  unload?(): void;
}

/**
 * All formats: wrap each section's `load()` so the URL foliate renders always
 * points at a sanitized copy of the section document.
 */
export function secureSections(sections: LoadableSection[] | undefined): void {
  for (const section of sections ?? []) {
    const load = section.load.bind(section);
    const unload = section.unload?.bind(section);
    let secured: Promise<string> | null = null;

    section.load = () => {
      secured ??= (async () => {
        const url = await load();
        if (typeof url !== "string" || !url.startsWith("blob:")) return url;
        const blob = await (await fetch(url)).blob();
        // A section is rendered as a document whatever its declared type, so
        // anything that starts like markup is sanitized.
        if (!(await isMarkupBlob(blob, blob.type)) && !(await startsLikeMarkup(blob))) return url;
        const clean = sanitizeBookDocument(await blob.text(), blob.type);
        return URL.createObjectURL(new Blob([clean.markup], { type: clean.type }));
      })();
      return secured;
    };

    section.unload = () => {
      const pending = secured;
      secured = null;
      void pending?.then((url) => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
      unload?.();
    };
  }
}
