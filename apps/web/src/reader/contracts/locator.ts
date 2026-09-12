/**
 * Universal position locator contracts across all formats.
 * Compatible with EPUB CFIs and offset-based anchors.
 */

export interface DocumentLocator {
  /** DOM element ID or text anchor */
  anchor?: string;
  /** Global book fractional progress (0.0 - 1.0) */
  bookProgress?: number;
  /** Standard CFI string (for EPUB compatibility) or CFI-equivalent string */
  cfi?: string;
  /** Spine section href */
  href?: string;
  /** Spine section index */
  sectionIndex?: number;
  /** Fractional progress inside the current section (0.0 - 1.0) */
  sectionProgress?: number;
}

export interface DocumentRange {
  /** Standard CFI range representation */
  cfiRange: string;
  end?: DocumentLocator;
  start?: DocumentLocator;
}

export interface DocumentSelection {
  cfiRange: string;
  chapterLabel: string;
  href: string;
  text: string;
}
