import { JSDOM } from "jsdom";

export function ensureTestDom(): void {
  if (globalThis.window && globalThis.document) {
    if (!document.getElementById("reader")) {
      const reader = document.createElement("div");
      reader.id = "reader";
      document.body.appendChild(reader);
    }
    if (!document.getElementById("reader-container")) {
      const readerContainer = document.createElement("div");
      readerContainer.id = "reader-container";
      document.body.appendChild(readerContainer);
    }
    return;
  }

  const dom = new JSDOM(
    "<!DOCTYPE html><html><body><div id='reader'></div><div id='reader-container'></div></body></html>",
    {
      url: "http://localhost?engine=foliate",
    }
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.window = dom.window as any;
  globalThis.document = dom.window.document;
  globalThis.DOMParser = dom.window.DOMParser;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.NodeFilter = dom.window.NodeFilter;
  globalThis.customElements = dom.window.customElements;
  globalThis.ProcessingInstruction = dom.window.ProcessingInstruction;
  globalThis.XMLSerializer = dom.window.XMLSerializer;
  globalThis.innerWidth = 1024;
  globalThis.innerHeight = 768;

  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;

  globalThis.matchMedia = ((query: string) => ({
    addEventListener: () => {},
    addListener: () => {},
    dispatchEvent: () => false,
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: () => {},
    removeListener: () => {},
  })) as unknown as typeof matchMedia;

  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0) as unknown as number;
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
}
