import type { TocItem } from "@/utils/epub";

import type { IReaderSession, ReaderEngineCallbacks, ReaderEngineOptions } from "../contracts/engine";
import type { ReaderFlowOptions } from "../contracts/rendition";

import { EpubJsReaderSession } from "./EpubJsReaderSession";
import { FoliateReaderSession } from "./FoliateReaderSession";

export type ReaderSessionOptions = ReaderEngineOptions;
export type ReaderSessionCallbacks = ReaderEngineCallbacks;
export type { ReaderFlowOptions };

/**
 * Determine active reader engine.
 * Priority: URL query (?engine=foliate|epubjs) -> localStorage -> VITE_READER_ENGINE env -> default ("foliate").
 */
export const getReaderEngineType = (): "epubjs" | "foliate" => {
  if (typeof window !== "undefined") {
    try {
      const urlParam = new URLSearchParams(window.location.search).get("engine");
      if (urlParam === "foliate" || urlParam === "epubjs") return urlParam;
      const stored = localStorage.getItem("sanctuary_reader_engine");
      if (stored === "foliate" || stored === "epubjs") return stored;
    } catch {
      // ignore
    }
  }
  const envEngine = import.meta.env.VITE_READER_ENGINE;
  if (envEngine === "epubjs") return "epubjs";
  return "foliate";
};

export class ReaderSession implements IReaderSession {
  private session: IReaderSession;

  constructor(options: ReaderSessionOptions, callbacks: ReaderSessionCallbacks) {
    const engine = getReaderEngineType();
    if (engine === "epubjs") {
      this.session = new EpubJsReaderSession(options, callbacks);
    } else {
      this.session = new FoliateReaderSession(options, callbacks);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public get rendition(): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.session as any).rendition ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public get epubBook(): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.session as any).epubBook ?? null;
  }

  public get totalLocations(): number {
    return this.session.totalLocations;
  }

  public get tocItems(): TocItem[] {
    return this.session.tocItems;
  }

  public async display(target: string): Promise<boolean> {
    return this.session.display(target);
  }

  public async next(): Promise<void> {
    return this.session.next();
  }

  public async prev(): Promise<void> {
    return this.session.prev();
  }

  public async goToPage(page: number): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (this.session as any).goToPage === "function") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (this.session as any).goToPage(page);
    }
  }

  public async setFlow(next: ReaderFlowOptions): Promise<void> {
    return this.session.setFlow(next);
  }

  public updateReaderBackground(bg: string): void {
    this.session.updateReaderBackground(bg);
  }

  public destroy(): void {
    this.session.destroy();
  }
}
