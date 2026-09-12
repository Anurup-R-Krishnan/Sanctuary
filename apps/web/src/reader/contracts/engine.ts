/**
 * Reader engine facade contracts matching existing ReaderSession signatures.
 * Guarantees zero signature breakage for useReaderEngine and ReaderView.
 */

import type { ReaderError, ReaderPosition, ReaderSelection, ReaderStatus } from "@/types/reader";
import type { TocItem } from "@/utils/epub";

import type { ReaderFlowOptions } from "./rendition";

export interface ReaderEngineOptions {
  blob: Blob;
  bookId: string;
  container: HTMLDivElement;
  continuous: boolean;
  direction?: "auto" | "ltr" | "rtl";
  initialCfi?: string;
  readerBackground?: string;
  spread: boolean;
  themeStyles: Record<string, Record<string, string>>;
}

export interface ReaderEngineCallbacks {
  onError: (error: ReaderError | null) => void;
  onPositionChange: (position: Partial<ReaderPosition>) => void;
  onSelection: (selection: ReaderSelection | null) => void;
  onStatusChange: (status: ReaderStatus) => void;
  onTocReady: (toc: TocItem[]) => void;
}

export interface IReaderSession {
  destroy(): void;
  display(target: string): Promise<boolean>;

  next(): Promise<void>;
  prev(): Promise<void>;
  setFlow(next: ReaderFlowOptions): Promise<void>;
  readonly tocItems: TocItem[];
  readonly totalLocations: number;
  updateReaderBackground(bg: string): void;
}
