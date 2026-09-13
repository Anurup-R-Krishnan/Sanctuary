/**
 * Foliate-js Rendition Implementation.
 * Bridges foliate-view and paginator into Sanctuary's DocumentRendition interface.
 */

import type { ReaderPosition } from "@/types/reader";

import type { LightboxImageTarget } from "../contracts/engine";
import type { DocumentLocator, DocumentSelection } from "../contracts/locator";
import type {
  DocumentAnnotationOptions,
  DocumentAnnotationsApi,
  DocumentRendition,
  ReaderFlowOptions,
} from "../contracts/rendition";
import type { FoliateEpubAdapter } from "./FoliateEpubAdapter";

import { applyBionicReading } from "../../utils/bionicReading";
import { isFootnoteLink, resolveFootnote, type ResolvedFootnote } from "../../utils/footnoteResolver";
import { SpineWeightProgressEstimator } from "../engine/SpineWeightProgressEstimator";
import { FoliateTTSController, type TTSControllerState } from "./FoliateTTSController";

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
  private activeSearchCfi: string | null = null;
  private ttsController: FoliateTTSController | null = null;
  private bionicCleanups = new WeakMap<Document, () => void>();

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

    // Setup visual search marks hook
    this.setupSearchAnnotationHook();

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

      const chapterRemainingWeight = this.progressEstimator.getRemainingSectionWeight(index, fraction);
      const totalRemainingWeight = this.progressEstimator.getRemainingTotalWeight(index, fraction);

      const pos: ReaderPosition = {
        bookProgress: this.currentProgress,
        cfi: cfi || (section ? section.href : `sec-${index}`),
        chapterLabel,
        chapterProgress: Math.round(fraction * 100),
        chapterRemainingWeight,
        displayedPage: location,
        displayedPages: totalLocations,
        href: section?.href ?? "",
        location,
        sectionIndex: index,
        totalLocations,
        totalRemainingWeight,
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
        this.setupDocumentImageInteraction(doc);
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

    // Intercept link clicks to provide instant footnote previews without jarring jumps
    this.view.addEventListener("link", async (e: CustomEvent) => {
      const { a, href } = e.detail ?? {};
      if (!href || !a) return;

      if (isFootnoteLink(a, href)) {
        e.preventDefault();
        try {
          const doc = a.ownerDocument;
          const resolved = await resolveFootnote(this.documentAdapter.rawBook, doc, href);
          if (resolved) {
            let anchorRect: { bottom: number; height: number; left: number; right: number; top: number; width: number } | null = null;
            if (typeof a.getBoundingClientRect === "function") {
              const rect = a.getBoundingClientRect();
              const iframe = a.ownerDocument?.defaultView?.frameElement as HTMLElement | null;
              const iframeRect = iframe ? iframe.getBoundingClientRect() : { left: 0, top: 0 };
              anchorRect = {
                bottom: rect.bottom + iframeRect.top,
                height: rect.height,
                left: rect.left + iframeRect.left,
                right: rect.right + iframeRect.left,
                top: rect.top + iframeRect.top,
                width: rect.width,
              };
            }
            this.emit("footnote", {
              anchorRect,
              footnote: resolved,
            });
          } else {
            this.view.goTo(href);
          }
        } catch {
          this.view.goTo(href);
        }
      }
    });
  }

  private injectStylesToDocument(doc: Document): void {
    try {
      doc.documentElement.style.backgroundColor = this.background;
      if (doc.body) {
        doc.body.style.backgroundColor = this.background;
      }

      // Direction handling (auto | ltr | rtl)
      const docDirection = this.flowOptions.direction && this.flowOptions.direction !== "auto"
        ? this.flowOptions.direction
        : this.documentAdapter?.metadata?.direction || "ltr";

      doc.documentElement.setAttribute("dir", docDirection);
      if (doc.body) {
        doc.body.setAttribute("dir", docDirection);
      }

      // Writing mode handling (horizontal-tb | vertical-rl)
      const writingMode = this.flowOptions.writingMode || "horizontal-tb";
      doc.documentElement.style.writingMode = writingMode;
      if (doc.body) {
        doc.body.style.writingMode = writingMode;
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
      let cssText = `html, body { direction: ${docDirection} !important; writing-mode: ${writingMode} !important; }\nimg, svg image, picture img { cursor: zoom-in !important; max-width: 100%; }\n`;
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

      // Handle Bionic Reading
      if (this.flowOptions.bionicReading) {
        if (!this.bionicCleanups.has(doc)) {
          const cleanup = applyBionicReading(doc);
          this.bionicCleanups.set(doc, cleanup);
        }
      } else {
        const cleanup = this.bionicCleanups.get(doc);
        if (cleanup) {
          cleanup();
          this.bionicCleanups.delete(doc);
        }
      }
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

  private setupDocumentImageInteraction(doc: Document): void {
    try {
      doc.body?.addEventListener("click", (e: MouseEvent) => {
        const target = (e.target as Element)?.closest("img, image, picture");
        if (!target) return;

        let alt = "";
        let src = "";
        let title = "";

        if (target.tagName.toLowerCase() === "img") {
          const img = target as HTMLImageElement;
          src = img.currentSrc || img.src || img.getAttribute("src") || "";
          alt = img.alt || "";
          title = img.title || "";
        } else if (target.tagName.toLowerCase() === "image") {
          src =
            target.getAttribute("href") ||
            target.getAttribute("xlink:href") ||
            "";
          title = target.getAttribute("title") || "";
        } else if (target.tagName.toLowerCase() === "picture") {
          const img = target.querySelector("img");
          if (img) {
            src = img.currentSrc || img.src || img.getAttribute("src") || "";
            alt = img.alt || "";
            title = img.title || "";
          }
        }

        if (!src) return;

        // Skip tiny inline glyphs or icons (<= 28px)
        const htmlImg =
          target.tagName.toLowerCase() === "img"
            ? (target as HTMLImageElement)
            : target.querySelector("img");
        if (
          htmlImg &&
          htmlImg.clientWidth > 0 &&
          htmlImg.clientWidth <= 28 &&
          htmlImg.clientHeight <= 28
        ) {
          return;
        }

        // Extract caption if wrapped in <figure>
        const figure = target.closest("figure");
        const figcaption = figure?.querySelector("figcaption");
        const caption = figcaption?.textContent?.trim() || title || alt;

        e.preventDefault();
        e.stopPropagation();

        const payload: LightboxImageTarget = {
          alt,
          caption,
          naturalHeight: htmlImg?.naturalHeight || undefined,
          naturalWidth: htmlImg?.naturalWidth || undefined,
          src,
          title,
        };

        this.emit("image-click", payload);
      });
    } catch {
      // Benign: handle cross-origin or detached frames gracefully
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
      if (typeof target === "string" && target.trim()) {
        if (target.startsWith("fraction:")) {
          const fraction = parseFloat(target.slice("fraction:".length));
          if (Number.isFinite(fraction)) {
            await this.goToFraction(Math.max(0, Math.min(1, fraction)));
            return true;
          }
        }
        await this.view.goTo(target);
        if (target.includes("epubcfi(") || target.startsWith("epubcfi")) {
          this.highlightSearchResult(target);
        }
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

  public setStyles(styles: Record<string, Record<string, string>>, bionicReading?: boolean): void {
    this.flowOptions.themeStyles = styles;
    if (bionicReading !== undefined) {
      this.flowOptions.bionicReading = bionicReading;
    }
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
    this.activeSearchCfi = null;
    try {
      this.view?.clearSearch?.();
    } catch {
      // benign
    }
    const renderer = this.view?.renderer;
    if (renderer && typeof renderer.getContents === "function") {
      const contents = renderer.getContents();
      if (Array.isArray(contents)) {
        for (const c of contents) {
          if (c.overlayer?.element) {
            const matches = c.overlayer.element.querySelectorAll(".sanctuary-search-match");
            matches.forEach((node: Element) => node.remove());
          }
        }
      }
    }
  }

  public highlightSearchResult(cfi: string | null): void {
    this.activeSearchCfi = cfi;
    const renderer = this.view?.renderer;
    if (renderer && typeof renderer.getContents === "function") {
      const contents = renderer.getContents();
      if (Array.isArray(contents)) {
        for (const c of contents) {
          if (c.overlayer?.element) {
            const matches = c.overlayer.element.querySelectorAll(".sanctuary-search-match");
            matches.forEach((node: Element) => {
              const nodeCfi = node.getAttribute("data-cfi");
              const isMatchActive = Boolean(cfi && nodeCfi === cfi);
              if (isMatchActive) {
                node.classList.add("sanctuary-search-active");
                node.setAttribute("fill", "rgba(59, 130, 246, 0.45)");
                node.setAttribute("stroke", "#2563eb");
                node.setAttribute("stroke-width", "2.5");
                node.scrollIntoView?.({ behavior: "smooth", block: "center" });
              } else {
                node.classList.remove("sanctuary-search-active");
                node.setAttribute("fill", "rgba(245, 158, 11, 0.35)");
                node.setAttribute("stroke", "rgba(217, 119, 6, 0.7)");
                node.setAttribute("stroke-width", "1.5");
              }
            });
          }
        }
      }
    }
  }

  public getActiveSearchCfi(): string | null {
    return this.activeSearchCfi;
  }

  private setupSearchAnnotationHook(): void {
    if (!this.view) return;
    const originalAdd = typeof this.view.addAnnotation === "function"
      ? this.view.addAnnotation.bind(this.view)
      : null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.view.addAnnotation = async (annotation: any, remove?: boolean) => {
      if (!this.view) return;
      const value = annotation?.value;
      if (typeof value === "string" && value.startsWith("foliate-search:")) {
        const cfi = value.replace("foliate-search:", "");
        try {
          const resolved = await this.view?.resolveNavigation?.(cfi);
          if (resolved && this.view) {
            const { index, anchor } = resolved;
            const contents = this.view?.renderer?.getContents?.() || [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const obj = contents.find((x: any) => x.index === index && x.overlayer);
            if (obj) {
              const { overlayer, doc } = obj;
              if (remove) {
                overlayer.remove(value);
                return;
              }
              const range = doc ? anchor(doc) : anchor;
              const isActive = this.activeSearchCfi === cfi;
              overlayer.add(value, range, this.drawSearchMatch.bind(this), {
                cfi,
                isActive,
                value,
              });
              return;
            }
          }
        } catch {
          // benign: search marks for unrendered sections will attach when navigated
        }
      }
      if (originalAdd && this.view) {
        return originalAdd(annotation, remove);
      }
    };
  }

  private drawSearchMatch(
    rects: DOMRect[],
    options: { cfi?: string; isActive?: boolean; value?: string } = {}
  ): SVGGElement {
    const isActive = Boolean(options.isActive);
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute(
      "class",
      isActive
        ? "sanctuary-search-match sanctuary-search-active"
        : "sanctuary-search-match"
    );
    if (options.cfi) g.setAttribute("data-cfi", options.cfi);
    if (options.value) g.setAttribute("data-value", options.value);
    g.setAttribute("fill", isActive ? "rgba(59, 130, 246, 0.45)" : "rgba(245, 158, 11, 0.35)");
    g.setAttribute("stroke", isActive ? "#2563eb" : "rgba(217, 119, 6, 0.7)");
    g.setAttribute("stroke-width", isActive ? "2.5" : "1.5");

    for (const { left, top, height, width } of rects) {
      const el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      el.setAttribute("x", String(left - 2));
      el.setAttribute("y", String(top - 1));
      el.setAttribute("height", String(height + 2));
      el.setAttribute("width", String(width + 4));
      el.setAttribute("rx", "3");
      g.append(el);
    }
    return g;
  }

  public on(event: "relocated", callback: (location: ReaderPosition) => void): void;
  public on(event: "selected", callback: (selection: DocumentSelection | null) => void): void;
  public on(event: "footnote", callback: (data: { anchorRect: { bottom: number; height: number; left: number; right: number; top: number; width: number } | null; footnote: ResolvedFootnote }) => void): void;
  public on(event: "image-click", callback: (data: LightboxImageTarget) => void): void;
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

  public getCurrentDocument(): Document | null {
    const contents = this.view?.renderer?.getContents?.();
    if (Array.isArray(contents) && contents.length > 0) {
      return contents[0].doc || null;
    }
    return null;
  }

  public highlightTTSRange(range: Range): void {
    const renderer = this.view?.renderer;
    if (!renderer || typeof renderer.getContents !== "function") return;
    const contents = renderer.getContents();
    if (Array.isArray(contents)) {
      for (const c of contents) {
        if (c.overlayer) {
          c.overlayer.remove("sanctuary-tts-sentence");
          c.overlayer.add("sanctuary-tts-sentence", range, this.drawTtsHighlight.bind(this));
        }
      }
    }
  }

  public clearTTSHighlight(): void {
    const renderer = this.view?.renderer;
    if (!renderer || typeof renderer.getContents !== "function") return;
    const contents = renderer.getContents();
    if (Array.isArray(contents)) {
      for (const c of contents) {
        if (c.overlayer) {
          c.overlayer.remove("sanctuary-tts-sentence");
        }
      }
    }
  }

  private drawTtsHighlight(rects: DOMRect[]): SVGGElement {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "sanctuary-tts-active");
    g.setAttribute("fill", "rgba(245, 158, 11, 0.28)");
    g.setAttribute("stroke", "rgba(217, 119, 6, 0.7)");
    g.setAttribute("stroke-width", "1.5");
    for (const { left, top, height, width } of rects) {
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", String(left));
      rect.setAttribute("y", String(top));
      rect.setAttribute("height", String(height));
      rect.setAttribute("width", String(width));
      rect.setAttribute("rx", "2");
      g.appendChild(rect);
    }
    return g;
  }

  public getTTSController(): FoliateTTSController {
    if (!this.ttsController) {
      this.ttsController = new FoliateTTSController({
        getDoc: () => this.getCurrentDocument(),
        highlightRange: (r) => this.highlightTTSRange(r),
        clearHighlight: () => this.clearTTSHighlight(),
        onNextChapter: async () => {
          if (!this.view) return false;
          try {
            await this.next();
            return true;
          } catch {
            return false;
          }
        },
        onPrevChapter: async () => {
          if (!this.view) return false;
          try {
            await this.prev();
            return true;
          } catch {
            return false;
          }
        },
      });
    }
    return this.ttsController;
  }

  public async startTTS(fromCurrentLocation: boolean = true): Promise<void> {
    const controller = this.getTTSController();
    await controller.start(fromCurrentLocation);
  }

  public pauseTTS(): void {
    this.ttsController?.pause();
  }

  public resumeTTS(): void {
    this.ttsController?.resume();
  }

  public stopTTS(): void {
    this.ttsController?.stop();
  }

  public nextTTS(): void {
    this.ttsController?.next();
  }

  public prevTTS(): void {
    this.ttsController?.prev();
  }

  public setTTSRate(rate: number): void {
    this.ttsController?.setRate(rate);
  }

  public getTTSState(): TTSControllerState | null {
    return this.ttsController?.getState() || null;
  }

  public destroy(): void {
    this.listeners.clear();
    this.clearSearch();
    this.clearTTSHighlight();
    if (this.ttsController) {
      this.ttsController.destroy();
      this.ttsController = null;
    }
    try {
      this.view?.close();
      this.view?.remove();
    } catch {
      // benign
    }
    this.view = null;
  }
}
