/**
 * Utility functions for image lightbox zoom, pan, and download operations.
 */

/**
 * Calculate next zoom level when zooming in.
 * Increments by 0.25 and clamps to a maximum of 5x.
 */
export function calculateZoomIn(currentScale: number): number {
  return Math.min(5, Number((currentScale + 0.25).toFixed(2)));
}

/**
 * Calculate next zoom level when zooming out.
 * Decrements by 0.25 and clamps to a minimum of 0.5x.
 * Returns a tuple with the new scale and whether position should be reset.
 */
export function calculateZoomOut(currentScale: number): [newScale: number, resetPosition: boolean] {
  const next = Math.max(0.5, Number((currentScale - 0.25).toFixed(2)));
  const shouldReset = next <= 1;
  return [next, shouldReset];
}

/**
 * Sanitize a filename for safe download.
 * Removes invalid characters and converts to lowercase.
 */
export function sanitizeDownloadFilename(title: string | undefined | null, alt: string | undefined | null): string {
  const baseName = (title || alt || "book-image").replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
  return `${baseName}.png`;
}

/**
 * Check if an image is tiny (inline icon/decoration that should not open lightbox).
 * Returns true if image width is > 0 and <= 28px AND height is <= 28px.
 */
export function isTinyInlineImage(width: number, height: number): boolean {
  return width > 0 && width <= 28 && height <= 28;
}
