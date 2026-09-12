/**
 * Foliate-js Rendition Implementation.
 * Bridges foliate-view and paginator into Sanctuary's DocumentRendition interface.
 */

import type { ReaderPosition } from "@/types/reader";

import type { DocumentLocator, DocumentSelection } from "../contracts/locator";
import type {
  DocumentAnnotationsApi,
  DocumentRendition,
  ReaderFlowOptions,
} from "../contracts/rendition";
import type { FoliateEpubAdapter } from "./FoliateEpubAdapter";

// foliate-view is registered dynamically via foliate-js/view.js
type EventListenerCallback = (...args: unknown[]) => void;

export class FoliateRendition implements DocumentRendition {
  private container: HTMLDivElement;
  private documentAdapter: FoliateEpubAdapter;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private view: any;
  private listeners = new Map<string, Set<EventListenerCallback>>();
  private flowOptions: ReaderFlowOptions;
  private background: string;
  private currentProgress = 0;
  private currentSectionIndex = 0;
  private totalSections = 1;

  public annotations?: DocumentAnnotationsApi;

  constructor(
    container: HTMLDivElement,
    documentAdapter: FoliateEpubAdapter,
    flowOptions: ReaderFlowOptions,
    background: string = "#ffffff"
  ) {
    this.container = container;
    this.documentAdapter = documentAdapter;
    this.flowOptions = flowOptions;
    this.background = background;
    this.totalSections = Math.max(1, documentAdapter.sections.length);

    this.container.style.backgroundColor = background;

    // Create foliate-view custom element
    this.view = document.createElement("foliate-view");
    this.view.style.width = "100%";
    this.view.style.height = "100%";
    this.view.style.display = "block";
    this.view.style.backgroundColor = background;

    this.container.appendChild(this.view);

    this.setupViewEventListeners();
  }

  public static async create(
    container: HTMLDivElement,
    documentAdapter: FoliateEpubAdapter,
    flowOptions: ReaderFlowOptions,
    background: string = "#ffffff"
  ): Promise<FoliateRendition> {
    await import("foliate-js/view.js");
    const rendition = new FoliateRendition(container, documentAdapter, flowOptions, background);
    await rendition.init();
    return rendition;
  }

  private async init(): Promise<void> {
    // Open the book inside foliate-view
    await this.view.open(this.documentAdapter.rawBook);

    // Apply layout flow options
    await this.applyFlowToRenderer();
  }

  private setupViewEventListeners(): void {
    // Relocate event from foliate-view
    this.view.addEventListener("relocate", (e: CustomEvent) => {
      const detail = e.detail ?? {};
      const { fraction = 0, index = 0, cfi = "" } = detail;
      this.currentSectionIndex = index;

      // Section weight progress estimation
      const totalSecs = this.totalSections;
      const overallFraction = Math.max(0, Math.min(1, (index + fraction) / totalSecs));
      this.currentProgress = Math.round(overallFraction * 100);

      const section = this.documentAdapter.getSectionByIndex(index);
      const chapterLabel = this.findChapterLabel(section?.href ?? "");

      const pos: ReaderPosition = {
        bookProgress: this.currentProgress,
        cfi: cfi || (section ? section.href : `sec-${index}`),
        chapterLabel,
        chapterProgress: Math.round(fraction * 100),
        displayedPage: index + 1,
        displayedPages: totalSecs,
        href: section?.href ?? "",
        location: index + 1,
        totalLocations: totalSecs,
      };

      this.emit("relocated", pos);
    });

    // Content load hook to inject theme styles
    this.view.addEventListener("load", (e: CustomEvent) => {
      const { doc } = e.detail ?? {};
      if (doc) {
        this.injectStylesToDocument(doc);
      }
    });

    // Text selection event
    this.view.addEventListener("select", (e: CustomEvent) => {
      const detail = e.detail ?? {};
      const sel: DocumentSelection = {
        cfiRange: detail.cfi || "",
        chapterLabel: "",
        href: "",
        text: detail.text || "",
      };
      this.emit("selected", sel);
    });
  }

  private injectStylesToDocument(doc: Document): void {
    try {
      doc.documentElement.style.backgroundColor = this.background;
      if (doc.body) {
        doc.body.style.backgroundColor = this.background;
      }

      // Inject reader theme styles
      let styleEl = doc.getElementById("sanctuary-theme-override") as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = doc.createElement("style");
        styleEl.id = "sanctuary-theme-override";
        doc.head.appendChild(styleEl);
      }

      // Convert theme styles
      const styles = this.flowOptions.themeStyles;
      let cssText = "";
      if (styles) {
        for (const [selector, rules] of Object.entries(styles)) {
          cssText += `${selector} {`;
          for (const [prop, val] of Object.entries(rules)) {
            cssText += `${prop}: ${val} !important; `;
          }
          cssText += "} \n";
        }
      }
      styleEl.textContent = cssText;
    } catch {
      // Cross-origin or transient access error
    }
  }

  private async applyFlowToRenderer(): Promise<void> {
    const renderer = this.view.renderer;
    if (!renderer) return;

    const flow = this.flowOptions.continuous ? "scrolled" : "paginated";
    renderer.setAttribute("flow", flow);

    if (!this.flowOptions.continuous) {
      renderer.setAttribute("max-column-count", this.flowOptions.spread ? "2" : "1");
    }

    // Refresh styles on visible documents
    if (typeof renderer.getContents === "function") {
      const contents = renderer.getContents();
      if (Array.isArray(contents)) {
        contents.forEach((c: { doc?: Document }) => {
          if (c.doc) this.injectStylesToDocument(c.doc);
        });
      }
    }
  }

  private findChapterLabel(href: string): string {
    const clean = href.split("#")[0].replace(/^\.?\//, "");
    let match = "";
    const search = (items: typeof this.documentAdapter.toc) => {
      for (const item of items) {
        const itemClean = item.href.split("#")[0].replace(/^\.?\//, "");
        if (itemClean === clean) {
          match = item.label;
          return;
        }
        if (item.subitems) search(item.subitems);
      }
    };
    search(this.documentAdapter.toc);
    return match || "Chapter";
  }

  public async display(target?: string | DocumentLocator): Promise<boolean> {
    if (!this.view) return false;
    try {
      if (typeof target === "string") {
        if (!target.trim()) return false;
        await this.view.goTo(target);
        return true;
      }
      if (target && typeof target === "object") {
        const loc = target.cfi || target.href || target.sectionIndex;
        if (loc !== undefined) {
          await this.view.goTo(loc);
          return true;
        }
      }
      await this.view.goTo(0);
      return true;
    } catch (err) {
      console.warn("Foliate display target failed:", err);
      return false;
    }
  }

  public async next(): Promise<void> {
    if (this.view) {
      await this.view.next();
    }
  }

  public async prev(): Promise<void> {
    if (this.view) {
      await this.view.prev();
    }
  }

  public async setFlow(options: ReaderFlowOptions): Promise<void> {
    this.flowOptions = options;
    if (options.readerBackground) {
      this.updateBackground(options.readerBackground);
    }
    await this.applyFlowToRenderer();
  }

  public updateBackground(color: string): void {
    this.background = color;
    if (this.container) this.container.style.backgroundColor = color;
    if (this.view) this.view.style.backgroundColor = color;
    const renderer = this.view?.renderer;
    if (renderer && typeof renderer.getContents === "function") {
      const contents = renderer.getContents();
      if (Array.isArray(contents)) {
        contents.forEach((c: { doc?: Document }) => {
          if (c.doc) {
            c.doc.documentElement.style.backgroundColor = color;
            if (c.doc.body) c.doc.body.style.backgroundColor = color;
          }
        });
      }
    }
  }

  public resize(): void {
    // Foliate paginator has internal ResizeObservers; no manual resize needed.
  }

  public on(event: "relocated", callback: (location: ReaderPosition) => void): void;
  public on(event: "selected", callback: (selection: DocumentSelection | null) => void): void;
  public on(event: string, callback: (...args: unknown[]) => void): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public on(event: string, callback: (arg?: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  public off(event: string, callback: EventListenerCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, ...args: unknown[]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((fn) => fn(...args));
    }
  }

  public destroy(): void {
    this.listeners.clear();
    try {
      this.view?.close();
      this.view?.remove();
    } catch {
      // benign
    }
    this.view = null;
  }
}
