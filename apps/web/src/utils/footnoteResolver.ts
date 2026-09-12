/**
 * In-reader Footnote & Endnote Resolution Engine.
 * Heuristically identifies footnote reference links, resolves target elements across
 * documents asynchronously, and cleans content for popover presentation without page jumps.
 */

import type { FoliateRawBook } from "../reader/foliate/FoliateDocumentAdapter";

export interface ResolvedFootnote {
  contentHtml: string;
  contentText: string;
  href: string;
  id: string;
  title: string;
}

const FOOTNOTE_ANCHOR_REGEX = /(?:fn|footnote|note|endnote|refe?|comment|annote)[-_0-9a-zA-Z]*/i;
const FOOTNOTE_SHORT_NUMERIC_REGEX = /^(?:\[?[0-9]{1,4}\]?|\*|†|‡|§|[a-z])$/i;

/**
 * Determines whether a clicked link represents a footnote/endnote reference.
 */
export function isFootnoteLink(element: HTMLElement | null, href: string): boolean {
  if (!href) return false;

  // Must contain an anchor fragment
  const hashIdx = href.indexOf("#");
  if (hashIdx === -1) return false;
  const fragment = href.slice(hashIdx + 1);
  if (!fragment) return false;

  // Avoid treating backlinks as forward footnote references
  if (/^back[-_]?link|^returnto/i.test(fragment)) {
    return false;
  }

  if (element) {
    const epubType = (element.getAttribute("epub:type") || "").toLowerCase();
    if (epubType.includes("noteref") || epubType.includes("footnote")) {
      return true;
    }

    const role = (element.getAttribute("role") || "").toLowerCase();
    if (role.includes("doc-noteref") || role.includes("doc-footnote")) {
      return true;
    }

    const className = (element.className || "").toLowerCase();
    if (
      className.includes("footnote-ref") ||
      className.includes("noteref") ||
      className.includes("fn-ref") ||
      className.includes("footnote")
    ) {
      return true;
    }

    // Inside <sup> tag with any hash link
    if (element.closest("sup") !== null || element.parentElement?.tagName === "SUP") {
      return true;
    }

    // Short numeric anchor text like "[1]" or "1" or "*" pointing to a fragment
    const text = (element.textContent || "").trim();
    if (FOOTNOTE_SHORT_NUMERIC_REGEX.test(text)) {
      return true;
    }
  }

  // Fragment string inspection
  return FOOTNOTE_ANCHOR_REGEX.test(fragment);
}

/**
 * Strips backlink icons, return anchors, and excessive wrapping from footnote DOM nodes.
 */
export function cleanFootnoteContent(element: Element): { contentHtml: string; contentText: string; title: string } {
  const clone = element.cloneNode(true) as HTMLElement;

  // Remove return backlinks (e.g. ↩, ↑, [back], epub:type="backlink")
  const backlinks = clone.querySelectorAll(
    'a[epub\\:type*="backlink"], a[role*="doc-backlink"], a.backlink, a.footnote-backref'
  );
  backlinks.forEach((b) => b.remove());

  // Also remove anchors whose visible text is a return symbol
  const remainingLinks = clone.querySelectorAll("a");
  remainingLinks.forEach((link) => {
    const txt = (link.textContent || "").trim();
    if (/^(?:↩|↑|↪|←|back|return|\[back\])$/i.test(txt)) {
      link.remove();
    }
  });

  // Determine title or note label
  let title = "Footnote";
  const labelEl = clone.querySelector(".footnote-label, .fn-label, dt, label");
  if (labelEl) {
    const labelTxt = (labelEl.textContent || "").trim();
    if (labelTxt) {
      title = labelTxt.replace(/[:.]$/, "");
    }
  } else {
    // If first text node starts with number/bracket, e.g. "1. " or "[1] "
    const firstText = (clone.textContent || "").trim();
    const match = firstText.match(/^(?:\[?(\d+|\*|†)\]?)[.:]?\s*/);
    if (match && match[1]) {
      title = `Note ${match[1]}`;
    }
  }

  const contentText = (clone.textContent || "").trim();
  const contentHtml = clone.innerHTML.trim();

  return {
    contentHtml: contentHtml || contentText,
    contentText,
    title,
  };
}

/**
 * Resolves a footnote target element within the current document or an external section.
 */
export async function resolveFootnote(
  rawBook: FoliateRawBook | null | undefined,
  currentDoc: Document | null,
  href: string
): Promise<ResolvedFootnote | null> {
  if (!href) return null;

  const hashIdx = href.indexOf("#");
  const targetId = hashIdx !== -1 ? href.slice(hashIdx + 1) : "";
  const targetPath = hashIdx !== -1 ? href.slice(0, hashIdx) : href;

  let targetEl: Element | null = null;

  // Check current document if targetPath is empty or matches current URL/document
  if (currentDoc && (!targetPath || currentDoc.location?.href?.endsWith(targetPath))) {
    if (targetId) {
      targetEl = findElementByIdOrName(currentDoc, targetId);
    }
  }

  // Cross-section resolution via Foliate rawBook
  if (!targetEl && rawBook && typeof rawBook.resolveHref === "function") {
    try {
      const resolved = rawBook.resolveHref(href);
      if (resolved && resolved.index >= 0) {
        const section = rawBook.sections?.[resolved.index];
        if (section) {
          const doc = (await section.createDocument?.()) ?? null;
          if (doc) {
            if (typeof resolved.anchor === "function") {
              const anchorResult = resolved.anchor(doc);
              if (anchorResult) {
                targetEl = anchorResult instanceof Range ? anchorResult.commonAncestorContainer as Element : anchorResult;
              }
            }
            if (!targetEl && targetId) {
              targetEl = findElementByIdOrName(doc, targetId);
            }
          }
        }
      }
    } catch {
      // Benign resolution error
    }
  }

  // Fallback: search across rawBook sections if not yet resolved
  if (!targetEl && rawBook?.sections && targetId) {
    for (const section of rawBook.sections) {
      if (targetPath && section.href && !section.href.endsWith(targetPath)) {
        continue;
      }
      try {
        const doc = (await section.createDocument?.()) ?? null;
        if (doc) {
          const el = findElementByIdOrName(doc, targetId);
          if (el) {
            targetEl = el;
            break;
          }
        }
      } catch {
        // Skip unparseable section
      }
    }
  }

  if (!targetEl) return null;

  const { contentHtml, contentText, title } = cleanFootnoteContent(targetEl);

  return {
    contentHtml,
    contentText,
    href,
    id: targetId || "footnote",
    title,
  };
}

function findElementByIdOrName(doc: Document, id: string): Element | null {
  if (!id) return null;
  const escaped = escapeSelector(id);
  return (
    doc.getElementById(id) ||
    doc.querySelector(`[id="${escaped}"]`) ||
    doc.querySelector(`[name="${escaped}"]`) ||
    null
  );
}

function escapeSelector(id: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(id);
  }
  return id.replace(/["\\]/g, "\\$&");
}
