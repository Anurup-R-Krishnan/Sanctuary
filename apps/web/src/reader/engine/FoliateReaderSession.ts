import type { ReaderPosition, ReaderSelection } from "@/types/reader";
import type { TocItem } from "@/utils/epub";

import { recordReaderDiagnostic } from "@/services/readerDiagnostics";

import type { IReaderSession, ReaderEngineCallbacks, ReaderEngineOptions } from "../contracts/engine";
import type { ReaderFlowOptions } from "../contracts/rendition";

import { FoliateEpubAdapter } from "../foliate/FoliateEpubAdapter";
import { FoliateRendition } from "../foliate/FoliateRendition";

export type FoliateReaderSessionOptions = ReaderEngineOptions;
export type FoliateReaderSessionCallbacks = ReaderEngineCallbacks;

export class FoliateReaderSession implements IReaderSession {
  private aborted = false;
  private adapter: FoliateEpubAdapter | null = null;
  private bookId: string;
  private callbacks: FoliateReaderSessionCallbacks;
  private container: HTMLDivElement;
  private flowOptions: ReaderFlowOptions;
  private lastPositionUpdate = 0;
  private positionUpdateTimer: number | null = null;
  private readerBackground: string;
  private renditionInstance: FoliateRendition | null = null;

  public tocItems: TocItem[] = [];
  public totalLocations = 1;

  // Compatibility shims for useReaderEngine, useReaderAnnotations, and useReaderSearch
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public rendition: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public epubBook: any = null;

  constructor(options: FoliateReaderSessionOptions, callbacks: FoliateReaderSessionCallbacks) {
    this.bookId = options.bookId;
    this.container = options.container;
    this.callbacks = callbacks;
    this.readerBackground = options.readerBackground ?? "#ffffff";
    this.flowOptions = {
      continuous: options.continuous,
      direction: options.direction,
      readerBackground: options.readerBackground,
      spread: options.spread,
      themeStyles: options.themeStyles,
      writingMode: options.writingMode,
    };

    this.init(options);
  }

  private async init(options: FoliateReaderSessionOptions): Promise<void> {
    this.callbacks.onError(null);
    this.callbacks.onStatusChange("loading-book");

    if (this.container && this.readerBackground) {
      this.container.style.backgroundColor = this.readerBackground;
    }

    try {
      this.adapter = await FoliateEpubAdapter.create(options.blob);
      if (this.aborted) {
        this.adapter.destroy();
        return;
      }

      this.tocItems = this.adapter.toc.map((item) => ({
        href: item.href,
        id: item.id,
        label: item.label,
        subitems: item.subitems?.map((sub) => ({
          href: sub.href,
          id: sub.id,
          label: sub.label,
          subitems: sub.subitems,
        })),
      }));

      this.totalLocations = Math.max(1, this.adapter.sections.length);

      this.callbacks.onStatusChange("loading-navigation");
      this.callbacks.onTocReady(this.tocItems);

      this.callbacks.onStatusChange("restoring-location");

      this.renditionInstance = await FoliateRendition.create(
        this.container,
        this.adapter,
        this.flowOptions,
        this.readerBackground
      );

      if (this.aborted) {
        this.renditionInstance.destroy();
        return;
      }

      this.totalLocations = this.renditionInstance.progressEstimator.totalLocations;

      this.setupShims();
      this.setupListeners();

      const displayed = await this.displayWithFallbacks(options.initialCfi);
      if (!displayed || this.aborted) {
        throw new Error("RENDER_FAILED");
      }

      this.callbacks.onStatusChange("ready");
    } catch (cause) {
      if (this.aborted) return;
      recordReaderDiagnostic({
        bookId: this.bookId,
        error: cause instanceof Error ? cause.message : "Unknown reader error",
        stage: "reader-initialization",
      });

      this.callbacks.onError({
        cause,
        code: "INVALID_EPUB",
        message: `The reader failed to initialize. ${cause instanceof Error ? cause.message : ""}`,
        recoverable: true,
        title: "This EPUB could not be opened",
      });
      this.callbacks.onStatusChange("error");
      this.destroy();
    }
  }

  private setupShims(): void {
    // Provide a compatibility interface so existing hooks (useReaderEngine, useReaderAnnotations)
    // continue to function smoothly without throwing undefined errors.
    this.rendition = {
      annotations: this.renditionInstance?.annotations,
      clearSearch: () => this.renditionInstance?.clearSearch(),
      destroy: () => this.destroy(),
      display: (target?: string) => this.display(target ?? ""),
      getContents: () => this.renditionInstance?.getContents() ?? [],
      next: () => this.next(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      off: (event: string, cb: any) => this.renditionInstance?.off(event, cb),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      on: (event: string, cb: any) => this.renditionInstance?.on(event, cb),
      prev: () => this.prev(),
      search: (query: string) => this.renditionInstance?.search(query) ?? Promise.resolve([]),
      themes: {
        default: (styles: Record<string, Record<string, string>>) => {
          this.renditionInstance?.setStyles(styles);
        },
      },
    };

    this.epubBook = {
      clearSearch: () => this.renditionInstance?.clearSearch(),
      highlightSearchResult: (cfi: string | null) => this.renditionInstance?.highlightSearchResult(cfi),
      locations: {
        cfiFromPercentage: (percentage: number) => {
          if (!this.renditionInstance) return `fraction:${percentage}`;
          const { sectionIndex, fraction } = this.renditionInstance.progressEstimator.getSectionAndFraction(percentage);
          const section = this.adapter?.getSectionByIndex(sectionIndex);
          return section ? `${section.href}#fraction:${fraction}` : `fraction:${percentage}`;
        },
        generate: async () => {},
        length: () => this.totalLocations,
        percentageFromCfi: (cfi: string) => {
          if (cfi.startsWith("fraction:")) {
            return parseFloat(cfi.slice("fraction:".length)) || 0;
          }
          return 0;
        },
      },
      navigation: {
        get: (href: string) => {
          const item = this.adapter?.getSectionByHref(href);
          return item ? { label: item.id } : null;
        },
      },
      rawBook: this.adapter?.rawBook,
      search: (query: string) => this.renditionInstance?.search(query) ?? Promise.resolve([]),
    };
  }

  private setupListeners(): void {
    if (!this.renditionInstance) return;

    this.renditionInstance.on("relocated", (pos: ReaderPosition) => {
      if (this.aborted) return;

      const now = Date.now();
      const timeSince = now - this.lastPositionUpdate;
      const updatedPos: ReaderPosition = {
        ...pos,
        totalLocations: this.totalLocations,
      };

      if (timeSince > 250) {
        this.lastPositionUpdate = now;
        this.callbacks.onPositionChange(updatedPos);
      } else {
        if (this.positionUpdateTimer !== null) {
          window.clearTimeout(this.positionUpdateTimer);
        }
        this.positionUpdateTimer = window.setTimeout(() => {
          this.lastPositionUpdate = Date.now();
          this.callbacks.onPositionChange(updatedPos);
        }, 250);
      }
    });

    this.renditionInstance.on("selected", (sel: ReaderSelection | null) => {
      if (this.aborted) return;
      this.callbacks.onSelection(sel);
    });
  }

  private async displayWithFallbacks(startLocation?: string): Promise<boolean> {
    if (startLocation) {
      if (await this.display(startLocation)) return true;
      recordReaderDiagnostic({
        bookId: this.bookId,
        details: { stage: "restoring reading position" },
        error: "Saved reading position failed; opening chapter start.",
        stage: "reader-initialization",
      });
    }
    if (this.aborted) return false;
    return this.display("");
  }

  public async display(target: string): Promise<boolean> {
    if (this.aborted || !this.renditionInstance) return false;
    return this.renditionInstance.display(target);
  }

  public async next(): Promise<void> {
    if (this.aborted || !this.renditionInstance) return;
    await this.renditionInstance.next();
  }

  public async prev(): Promise<void> {
    if (this.aborted || !this.renditionInstance) return;
    await this.renditionInstance.prev();
  }

  public async goToPage(page: number): Promise<void> {
    if (this.aborted || !this.renditionInstance) return;
    await this.renditionInstance.goToLocation(page);
  }

  public async setFlow(next: ReaderFlowOptions): Promise<void> {
    if (this.aborted || !this.renditionInstance) return;
    this.flowOptions = next;
    if (next.readerBackground) {
      this.readerBackground = next.readerBackground;
      if (this.container) this.container.style.backgroundColor = next.readerBackground;
    }
    await this.renditionInstance.setFlow(next);
  }

  public updateReaderBackground(bg: string): void {
    this.readerBackground = bg;
    if (this.container) {
      this.container.style.backgroundColor = bg;
    }
    this.renditionInstance?.updateBackground(bg);
  }

  public destroy(): void {
    this.aborted = true;
    if (this.positionUpdateTimer !== null) {
      window.clearTimeout(this.positionUpdateTimer);
      this.positionUpdateTimer = null;
    }
    this.renditionInstance?.destroy();
    this.renditionInstance = null;
    this.adapter?.destroy();
    this.adapter = null;
    this.rendition = null;
    this.epubBook = null;
    if (this.container) {
      this.container.replaceChildren();
    }
  }
}
