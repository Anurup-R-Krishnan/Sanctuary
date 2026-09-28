import type { ReaderPosition, ReaderSelection } from "@/types/reader";
import type { TocItem } from "@/utils/epub";

import { recordReaderDiagnostic } from "@/services/readerDiagnostics";

import type { IReaderSession, ReaderEngineCallbacks, ReaderEngineOptions } from "../contracts/engine";
import type { ReaderFlowOptions } from "../contracts/rendition";
import type { TTSControllerState } from "../foliate/FoliateTTSController";

import { FoliateDocumentAdapter } from "../foliate/FoliateDocumentAdapter";
import { FoliateRendition } from "../foliate/FoliateRendition";

/**
 * What hooks and components may call on `session.rendition`. Every member must
 * forward to FoliateRendition — this was `any`, which hid that setStyles,
 * resize, setFlow, updateBackground, getCurrentDocument and getTTSController
 * were missing (reader themes, typography and TTS silently did nothing).
 */
export type SessionRendition = Pick<
  FoliateRendition,
  | "clearSearch"
  | "getContents"
  | "getCurrentDocument"
  | "getTTSController"
  | "resize"
  | "setFlow"
  | "setStyles"
  | "updateBackground"
> & {
  annotations: FoliateRendition["annotations"];
  destroy(): void;
  display(target?: string): Promise<boolean>;
  next(): Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off(event: string, cb: any): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, cb: any): void;
  prev(): Promise<void>;
  search: FoliateRendition["search"];
  themes: { default(styles: Record<string, Record<string, string>>, bionicReading?: boolean): void };
};

export type FoliateReaderSessionOptions = ReaderEngineOptions;
export type FoliateReaderSessionCallbacks = ReaderEngineCallbacks;

export class FoliateReaderSession implements IReaderSession {
  private aborted = false;
  private adapter: FoliateDocumentAdapter | null = null;
  private bookId: string;
  private callbacks: FoliateReaderSessionCallbacks;
  private container: HTMLDivElement;
  private flowOptions: ReaderFlowOptions;
  private readerBackground: string;
  private renditionInstance: FoliateRendition | null = null;

  public tocItems: TocItem[] = [];
  public totalLocations = 1;

  // Compatibility shims for useReaderEngine, useReaderAnnotations, and useReaderSearch
  public rendition: SessionRendition | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public epubBook: any = null;

  constructor(options: FoliateReaderSessionOptions, callbacks: FoliateReaderSessionCallbacks) {
    this.bookId = options.bookId;
    this.container = options.container;
    this.callbacks = callbacks;
    this.readerBackground = options.readerBackground ?? "#ffffff";
    this.flowOptions = {
      bionicReading: options.bionicReading,
      continuous: options.continuous,
      direction: options.direction,
      readerBackground: options.readerBackground,
      readingMode: options.readingMode,
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
      // IndexedDB stores a Blob without its original filename. Pass the saved
      // format so Markdown files without a leading heading/frontmatter still
      // open as Markdown instead of being downgraded to plain text.
      this.adapter = await FoliateDocumentAdapter.create(options.blob, options.formatHint);
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
    const inst = this.renditionInstance;
    if (!inst) return;
    this.rendition = {
      annotations: inst.annotations,
      clearSearch: () => inst.clearSearch(),
      destroy: () => this.destroy(),
      display: (target?: string) => this.display(target ?? ""),
      getContents: () => inst.getContents(),
      getCurrentDocument: () => inst.getCurrentDocument(),
      getTTSController: () => inst.getTTSController(),
      next: () => this.next(),
      off: (event, cb) => inst.off(event, cb),
      on: (event, cb) => inst.on(event, cb),
      prev: () => this.prev(),
      resize: (width?: number, height?: number) => inst.resize(width, height),
      search: (query: string) => inst.search(query),
      setFlow: (options: ReaderFlowOptions) => inst.setFlow(options),
      setStyles: (styles, bionicReading) => inst.setStyles(styles, bionicReading),
      themes: {
        default: (styles, bionicReading) => inst.setStyles(styles, bionicReading),
      },
      updateBackground: (color: string) => inst.updateBackground(color),
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

      const updatedPos: ReaderPosition = {
        ...pos,
        totalLocations: this.totalLocations,
      };

      this.callbacks.onPositionChange(updatedPos);
    });

    this.renditionInstance.on("selected", (sel: ReaderSelection | null) => {
      if (this.aborted) return;
      this.callbacks.onSelection(sel);
    });

    this.renditionInstance.on("footnote", (data) => {
      if (this.aborted) return;
      this.callbacks.onFootnote?.(data);
    });

    this.renditionInstance.on("image-click", (data) => {
      if (this.aborted) return;
      this.callbacks.onImageClick?.(data);
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

  public scrollBy(delta: number): number {
    if (this.aborted || !this.renditionInstance) return 0;
    return this.renditionInstance.scrollBy(delta);
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

  public async startTTS(fromCurrentLocation: boolean = true): Promise<void> {
    if (this.aborted || !this.renditionInstance) return;
    await this.renditionInstance.startTTS(fromCurrentLocation);
  }

  public pauseTTS(): void {
    if (this.aborted || !this.renditionInstance) return;
    this.renditionInstance.pauseTTS();
  }

  public resumeTTS(): void {
    if (this.aborted || !this.renditionInstance) return;
    this.renditionInstance.resumeTTS();
  }

  public stopTTS(): void {
    if (this.aborted || !this.renditionInstance) return;
    this.renditionInstance.stopTTS();
  }

  public nextTTS(): void {
    if (this.aborted || !this.renditionInstance) return;
    this.renditionInstance.nextTTS();
  }

  public prevTTS(): void {
    if (this.aborted || !this.renditionInstance) return;
    this.renditionInstance.prevTTS();
  }

  public setTTSRate(rate: number): void {
    if (this.aborted || !this.renditionInstance) return;
    this.renditionInstance.setTTSRate(rate);
  }

  public getTTSState(): TTSControllerState | null {
    if (this.aborted || !this.renditionInstance) return null;
    return this.renditionInstance.getTTSState();
  }


  public destroy(): void {
    this.aborted = true;
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
