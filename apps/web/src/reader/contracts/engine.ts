/**
 * Reader engine facade contracts matching existing ReaderSession signatures.
 * Guarantees zero signature breakage for useReaderEngine and ReaderView.
 */

import type { ReaderError, ReaderPosition, ReaderSelection, ReaderStatus } from "@/types/reader";
import type { TocItem } from "@/utils/epub";

import type { ResolvedFootnote } from "../../utils/footnoteResolver";
import type { TTSControllerState } from "../foliate/FoliateTTSController";
import type { ReaderFlowOptions } from "./rendition";

export interface ReaderEngineOptions {
  bionicReading?: boolean;
  blob: Blob;
  bookId: string;
  container: HTMLDivElement;
  continuous: boolean;
  direction?: "auto" | "ltr" | "rtl";
  /** Persisted source format, used when a Blob no longer has its filename. */
  formatHint?: string;
  initialCfi?: string;
  readerBackground?: string;
  spread: boolean;
  themeStyles: Record<string, Record<string, string>>;
  writingMode?: "horizontal-tb" | "vertical-rl";
}

export interface LightboxImageTarget {
  alt?: string;
  caption?: string;
  naturalHeight?: number;
  naturalWidth?: number;
  src: string;
  title?: string;
}

export interface ReaderEngineCallbacks {
  onError: (error: ReaderError | null) => void;
  onFootnote?: (data: {
    anchorRect: { bottom: number; height: number; left: number; right: number; top: number; width: number } | null;
    footnote: ResolvedFootnote;
  }) => void;
  onImageClick?: (data: LightboxImageTarget) => void;
  onPositionChange: (position: Partial<ReaderPosition>) => void;
  onSelection: (selection: ReaderSelection | null) => void;
  onStatusChange: (status: ReaderStatus) => void;
  onTocReady: (toc: TocItem[]) => void;
}

export interface IReaderSession {
  destroy(): void;
  display(target: string): Promise<boolean>;
  getTTSState?(): TTSControllerState | null;
  next(): Promise<void>;
  nextTTS?(): void;
  pauseTTS?(): void;
  prev(): Promise<void>;
  prevTTS?(): void;
  resumeTTS?(): void;
  scrollBy?(delta: number): number;
  setFlow(next: ReaderFlowOptions): Promise<void>;
  setTTSRate?(rate: number): void;
  startTTS?(fromCurrentLocation?: boolean): Promise<void>;
  stopTTS?(): void;
  readonly tocItems: TocItem[];
  readonly totalLocations: number;
  updateReaderBackground(bg: string): void;
}
