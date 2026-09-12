import { beforeAll, describe, expect, it } from "bun:test";
import * as fs from "fs";
import { JSDOM } from "jsdom";

import { getReaderEngineType, ReaderSession } from "./ReaderSession";

beforeAll(() => {
  const dom = new JSDOM("<!DOCTYPE html><html><body><div id='reader'></div></body></html>", {
    url: "http://localhost?engine=foliate",
  });
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
});

describe("ReaderSession Facade", () => {
  it("determines active engine from URL or defaults", () => {
    expect(getReaderEngineType()).toBe("foliate");
  });

  it("instantiates Foliate engine and exposes format-agnostic session", async () => {
    const buffer = fs.readFileSync("mobydick.epub");
    const blob = new Blob([buffer], { type: "application/epub+zip" });
    const container = document.getElementById("reader") as HTMLDivElement;

    let sessionStatus = "";
    let tocLength = 0;

    const session = new ReaderSession(
      {
        blob,
        bookId: "test-book-id",
        container,
        continuous: false,
        spread: false,
        themeStyles: {},
      },
      {
        onError: () => {},
        onPositionChange: () => {},
        onSelection: () => {},
        onStatusChange: (status) => {
          sessionStatus = status;
        },
        onTocReady: (toc) => {
          tocLength = toc.length;
        },
      }
    );

    expect(session).toBeDefined();
    expect(session.display).toBeTypeOf("function");
    expect(session.next).toBeTypeOf("function");
    expect(session.prev).toBeTypeOf("function");
    expect(session.setFlow).toBeTypeOf("function");

    // Wait for init ticks
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(sessionStatus).not.toBe("error");
    expect(tocLength).toBeGreaterThan(0);
    expect(session.tocItems.length).toBeGreaterThan(0);
    expect(session.totalLocations).toBeGreaterThan(1);

    session.destroy();
  });
});
