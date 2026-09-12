export interface BionicWordFixation {
  bold: string;
  rest: string;
}

/**
 * Computes optimal bold fixation length based on word length.
 */
export function getFixationCount(wordLength: number): number {
  if (wordLength <= 0) return 0;
  if (wordLength <= 3) return 1;
  if (wordLength <= 5) return 2;
  if (wordLength <= 7) return 3;
  return Math.ceil(wordLength * 0.45);
}

/**
 * Decomposes a word into its bold fixation prefix and trailing remainder,
 * preserving any leading or trailing punctuation.
 */
export function calculateFixation(rawWord: string): BionicWordFixation {
  if (!rawWord) return { bold: "", rest: "" };

  const match = rawWord.match(/^([^a-zA-Z0-9\u00C0-\u024F]*)([a-zA-Z0-9\u00C0-\u024F]+)([^a-zA-Z0-9\u00C0-\u024F]*)$/);
  if (!match) {
    // If not standard word characters, return as-is
    return { bold: "", rest: rawWord };
  }

  const [, leading = "", coreWord = "", trailing = ""] = match;
  const fixCount = getFixationCount(coreWord.length);

  const boldCore = coreWord.slice(0, fixCount);
  const restCore = coreWord.slice(fixCount);

  return {
    bold: `${leading}${boldCore}`,
    rest: `${restCore}${trailing}`,
  };
}

/**
 * Transforms plain text into HTML markup with Bionic Reading fixations.
 */
export function formatBionicHtml(text: string): string {
  if (!text) return "";

  // Split on whitespace while capturing whitespace tokens
  const tokens = text.split(/(\s+)/);

  return tokens
    .map((token) => {
      if (/^\s+$/.test(token)) return token;
      const { bold, rest } = calculateFixation(token);
      if (!bold) return escapeHtml(token);
      return `<b class="bionic-fixation">${escapeHtml(bold)}</b>${escapeHtml(rest)}`;
    })
    .join("");
}

/**
 * Applies Bionic Reading fixations non-destructively to text nodes in a DOM element or Document.
 * Returns a restoration callback to return DOM to original state.
 */
export function applyBionicReading(root: Document | HTMLElement): () => void {
  const isDocument = root.nodeType === 9;
  const container = isDocument ? (root as Document).body : (root as HTMLElement);
  if (!container) return () => {};

  // Store snapshots to restore cleanly
  const modifiedElements: Array<{ element: HTMLElement; originalHtml: string }> = [];

  const selector = "p, li, blockquote, h1, h2, h3, h4, h5, h6, dd, dt";
  const elements = container.querySelectorAll(selector);

  elements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.hasAttribute("data-bionic")) return;
    if (htmlEl.closest("pre, code, script, style, .sanctuary-overlayer, [data-no-bionic]")) return;

    // Save original innerHTML before transformation
    modifiedElements.push({
      element: htmlEl,
      originalHtml: htmlEl.innerHTML,
    });

    htmlEl.setAttribute("data-bionic", "true");
    transformChildTextNodes(htmlEl);
  });

  return () => {
    for (const { element, originalHtml } of modifiedElements) {
      element.innerHTML = originalHtml;
      element.removeAttribute("data-bionic");
    }
  };
}

function transformChildTextNodes(node: Node): void {
  const doc = node.ownerDocument || (typeof document !== "undefined" ? document : null);
  if (!doc) return;

  const children = Array.from(node.childNodes);

  for (const child of children) {
    if (child.nodeType === 3) { // Node.TEXT_NODE
      const text = child.textContent || "";
      if (!text.trim()) continue;

      const fragment = doc.createDocumentFragment();
      const tokens = text.split(/(\s+)/);

      for (const token of tokens) {
        if (!token) continue;
        if (/^\s+$/.test(token)) {
          fragment.appendChild(doc.createTextNode(token));
          continue;
        }

        const { bold, rest } = calculateFixation(token);
        if (bold) {
          const b = doc.createElement("b");
          b.className = "bionic-fixation";
          b.textContent = bold;
          fragment.appendChild(b);
        }
        if (rest) {
          fragment.appendChild(doc.createTextNode(rest));
        }
      }

      node.replaceChild(fragment, child);
    } else if (child.nodeType === 1) { // Node.ELEMENT_NODE
      const el = child as HTMLElement;
      if (!["SCRIPT", "STYLE", "PRE", "CODE"].includes(el.tagName)) {
        transformChildTextNodes(child);
      }
    }
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
