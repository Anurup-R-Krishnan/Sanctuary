/**
 * Format-agnostic document model contracts for Sanctuary.
 * Decouples e-book parsing from rendering engines (foliate-js / epub.js).
 */

export type BookFormat =
  | "epub"
  | "fb2"
  | "mobi"
  | "azw"
  | "azw3"
  | "txt"
  | "html"
  | "xhtml"
  | "markdown"
  | "pdf";

export interface DocumentMetadata {
  author?: string;
  creator?: string | string[];
  description?: string;
  direction?: "ltr" | "rtl" | "auto";
  identifier?: string;
  language?: string;
  modified?: string;
  publisher?: string;
  rights?: string;
  title?: string;
}

export interface DocumentTocItem {
  href: string;
  id: string;
  label: string;
  subitems?: DocumentTocItem[];
}

export interface DocumentSection {
  href: string;
  id: string;
  index: number;
  linear: boolean;
  /** Load the section DOM or HTML content */
  load(): Promise<Document | Element | string>;
  /** Unload or release section memory */
  unload?(): void;
  /** Estimated size (bytes or character count) used for progress weighting */
  weight?: number;
}

export interface BookDocument {
  /** Destroy book resources and release memory */
  destroy(): void;
  readonly format: BookFormat;
  /** Extract cover image Blob from archive */
  getCoverBlob?(): Promise<Blob | null>;
  /** Find a section by its spine href (normalized) */
  getSectionByHref(href: string): DocumentSection | undefined;
  
  /** Find a section by its spine index */
  getSectionByIndex(index: number): DocumentSection | undefined;
  
  readonly metadata: DocumentMetadata;
  
  /** Resolve relative URL inside the book archive to a usable URI */
  resolveHref(href: string): string;
  
  readonly sections: DocumentSection[];
  
  readonly toc: DocumentTocItem[];
}
