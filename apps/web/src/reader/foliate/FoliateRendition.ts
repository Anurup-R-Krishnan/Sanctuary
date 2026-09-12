/**
 * Foliate-js Rendition Implementation.
 * Bridges foliate-view and paginator into Sanctuary's DocumentRendition interface.
 */

import type { ReaderPosition } from "@/types/reader";

import type { DocumentLocator, DocumentSelection } from "../contracts/locator";
import type {
  DocumentAnnotationOptions,
  DocumentAnnotationsApi,
  DocumentRendition,
  ReaderFlowOptions,
} from "../contracts/rendition";
import type { FoliateEpubAdapter } from "./FoliateEpubAdapter";

import { SpineWeightProgressEstimator } from "../engine/SpineWeightProgressEstimator";

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

  public readonly progressEstimator: SpineWeightProgressEstimator;
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
    this.progressEstimator = new SpineWeightProgressEstimator(documentAdapter.sections);

    this.container.style.backgroundColor = background;

    // Create foliate-view custom element
    this.view = document.createElement("foliate-view");
    this.view.style.width = "100%";
    this.view.style.height = "100%";
    this.view.style.display = "block";
    this.view.style.backgroundColor = background;

    this.container.appendChild(this.view);

    this.annotations = {
      clear: () => {
        // Clear annotations
      },
      highlight: (cfiRange: string, options?: DocumentAnnotationOptions) => {
        try {
          this.view?.addAnnotation?.({
            color: options?.color,
            value: cfiRange,
          });
        } catch (err) {
          console.warn("Foliate highlight failed:", err);
        }
      },
      remove: (cfiRange: string) => {
        try {
          this.view?.deleteAnnotation?.({ value: cfiRange });
        } catch (err) {
          console.warn("Foliate remove annotation failed:", err);
        }
      },
      underline: (cfiRange: string, options?: DocumentAnnotationOptions) => {
        try {
          this.view?.addAnnotation?.({
            color: options?.color,
            underline: true,
            value: cfiRange,
          });
        } catch (err) {
          console.warn("Foliate underline failed:", err);
        }
      },
    };

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
      const overallFraction = this.progressEstimator.getProgress(index, fraction);
      this.currentProgress = Math.round(overallFraction * 100);

      const location = this.progressEstimator.getLocation(index, fraction);
      const totalLocations = this.progressEstimator.totalLocations;

      const section = this.documentAdapter.getSectionByIndex(index);
      const chapterLabel = detail.tocItem?.label?.trim() || this.findChapterLabel(section?.href ?? "");

      const pos: ReaderPosition = {
        bookProgress: this.currentProgress,
        cfi: cfi || (section ? section.href : `sec-${index}`),
        chapterLabel,
        chapterProgress: Math.round(fraction * 100),
        displayedPage: location,
        displayedPages: totalLocations,
        href: section?.href ?? "",
        location,
        totalLocations,
      };

      this.emit("relocated", pos);
    });

    // Content load hook to inject theme styles, forward keys, and wire selection
    this.view.addEventListener("load", (e: CustomEvent) => {
      const { doc, index = 0 } = e.detail ?? {};
      if (doc) {
        this.injectStylesToDocument(doc);
        this.setupDocumentKeyboardForwarding(doc);
        this.setupDocumentSelection(doc, index);
      }
    });

    // Draw annotation event from foliate-view
    this.view.addEventListener("draw-annotation", async (e: CustomEvent) => {
      const { annotation, draw } = e.detail ?? {};
      if (typeof draw !== "function") return;
      try {
        const { Overlayer } = await import("foliate-js/overlayer.js");
        const color = annotation?.color || "#facc15";
        if (annotation?.underline) {
          draw(Overlayer.underline, { color, width: 2 });
        } else {
          draw(Overlayer.highlight, { color });
        }
      } catch (err) {
        console.warn("Foliate draw-annotation failed:", err);
      }
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

  private setupDocumentKeyboardForwarding(doc: Document): void {
    try {
      const forwardKey = (e: KeyboardEvent) => {
        window.dispatchEvent(
          new KeyboardEvent(e.type, {
            altKey: e.altKey,
            bubbles: true,
            cancelable: true,
            code: e.code,
            ctrlKey: e.ctrlKey,
            key: e.key,
            metaKey: e.metaKey,
            shiftKey: e.shiftKey,
          })
        );
      };
      doc.addEventListener("keydown", forwardKey, { capture: true });
      doc.addEventListener("keyup", forwardKey, { capture: true });
    } catch {
      // ignore
    }
  }

  private setupDocumentSelection(doc: Document, index: number): void {
    const handleSelection = () => {
      try {
        const sel = doc.getSelection();
        const text = sel?.toString().trim();
        if (!text || !sel || sel.rangeCount === 0) {
          return;
        }
        const range = sel.getRangeAt(0);
        const cfi = this.view?.getCFI?.(index, range) || "";
        const section = this.documentAdapter.getSectionByIndex(index);
        const chapterLabel = this.findChapterLabel(section?.href ?? "");
        const selectionData: DocumentSelection = {
          cfiRange: cfi,
          chapterLabel,
          href: section?.href ?? "",
          text,
        };
        this.emit("selected", selectionData);
      } catch (err) {
        console.warn("Error capturing selection:", err);
      }
    };

    doc.addEventListener("pointerup", handleSelection);
    doc.addEventListener("keyup", handleSelection);
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
      if (typeof target === "string" && target.trim()) {
        if (target.startsWith("fraction:")) {
          const fraction = parseFloat(target.slice("fraction:".length));
          if (Number.isFinite(fraction)) {
            await this.goToFraction(Math.max(0, Math.min(1, fraction)));
            return true;
          }
        }
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
      try {
        await this.view.goTo(0);
        return true;
      } catch {
        return false;
      }
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

  public async goToFraction(frac: number): Promise<void> {
    if (this.view && typeof this.view.goToFraction === "function") {
      await this.view.goToFraction(Math.max(0, Math.min(1, frac)));
    }
  }

  public async goToProgress(progress: number): Promise<void> {
    if (!this.view) return;
    const clamped = Math.max(0, Math.min(1, progress));
    if (typeof this.view.goToFraction === "function") {
      try {
        await this.view.goToFraction(clamped);
        return;
      } catch {
        // fallback to section jump
      }
    }
    const { sectionIndex } = this.progressEstimator.getSectionAndFraction(clamped);
    await this.view.goTo(sectionIndex);
  }

  public async goToLocation(location: number): Promise<void> {
    const total = this.progressEstimator.totalLocations;
    const progress = (Math.max(1, Math.min(location, total)) - 1) / Math.max(1, total - 1);
    await this.goToProgress(progress);
  }

  public deselect(): void {
    if (this.view && typeof this.view.deselect === "function") {
      this.view.deselect();
    }
  }

  public getContents(): Array<{ doc: Document; window?: Window }> {
    const renderer = this.view?.renderer;
    if (renderer && typeof renderer.getContents === "function") {
      const contents = renderer.getContents();
      if (Array.isArray(contents)) {
        return contents
          .filter((c: { doc?: Document }) => Boolean(c.doc))
          .map((c: { doc: Document }) => ({
            doc: c.doc,
            window: c.doc.defaultView ?? undefined,
          }));
      }
    }
    return [];
  }

  public setStyles(styles: Record<string, Record<string, string>>): void {
    this.flowOptions.themeStyles = styles;
    const renderer = this.view?.renderer;
    if (renderer && typeof renderer.getContents === "function") {
      const contents = renderer.getContents();
      if (Array.isArray(contents)) {
        contents.forEach((c: { doc?: Document }) => {
          if (c.doc) this.injectStylesToDocument(c.doc);
        });
      }
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

  public async search(query: string): Promise<Array<{ cfi: string; chapterLabel: string; excerpt: string; href: string; id: string }>> {
    const results: Array<{ cfi: string; chapterLabel: string; excerpt: string; href: string; id: string }> = [];
    if (!this.view?.search) return results;
    try {
      for await (const res of this.view.search({ query })) {
        if (res && typeof res === "object" && Array.isArray(res.subitems)) {
          const chapterLabel = res.label || "Chapter";
          for (let i = 0; i < res.subitems.length; i++) {
            const item = res.subitems[i];
            const excerpt = typeof item.excerpt === "string"
              ? item.excerpt
              : item.excerpt ? `${item.excerpt.pre ?? ""}${item.excerpt.match ?? ""}${item.excerpt.post ?? ""}` : "";
            results.push({
              cfi: item.cfi,
              chapterLabel,
              excerpt,
              href: "",
              id: `${item.cfi || i}-${i}`,
            });
          }
        }
      }
    } catch (err) {
      console.warn("Foliate search failed:", err);
    }
    return results;
  }

  public clearSearch(): void {
    try {
      this.view?.clearSearch?.();
    } catch {
      // benign
    }
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
