/**
 * Rendition and rendering view contracts for paginated / scrolled presentation.
 */

import type { ReaderPosition } from "@/types/reader";

import type { DocumentLocator, DocumentSelection } from "./locator";

export interface ReaderFlowOptions {
  continuous: boolean;
  direction?: "auto" | "ltr" | "rtl";
  readerBackground?: string;
  spread: boolean;
  themeStyles: Record<string, Record<string, string>>;
}

export interface DocumentAnnotationOptions {
  className?: string;
  color?: string;
  data?: Record<string, unknown>;
  opacity?: number;
}

export interface DocumentAnnotationsApi {
  clear(): void;
  highlight(cfiRange: string, options?: DocumentAnnotationOptions): void;
  remove(cfiRange: string): void;
  underline(cfiRange: string, options?: DocumentAnnotationOptions): void;
}

export interface DocumentRendition {
  readonly annotations?: DocumentAnnotationsApi;

  /** Destroy view and clean up DOM nodes */
  destroy(): void;

  /** Display a specific location or section */
  display(target?: string | DocumentLocator): Promise<boolean>;

  /** Advance to next page / scroll downward */
  next(): Promise<void>;

  /** Unregister event listener */
  off(event: string, callback: (...args: unknown[]) => void): void;

  /** Register event listener */
  on(event: "relocated", callback: (location: ReaderPosition) => void): void;

  on(event: "selected", callback: (selection: DocumentSelection | null) => void): void;

  on(event: string, callback: (...args: unknown[]) => void): void;
  /** Go to previous page / scroll upward */
  prev(): Promise<void>;
  /** Resize layout columns upon container dimensions change */
  resize(width?: number, height?: number): void;

  /** Change layout flow without destroying parsed book model */
  setFlow(options: ReaderFlowOptions): Promise<void>;

  /** Update background immediately across container and document */
  updateBackground(color: string): void;
}
