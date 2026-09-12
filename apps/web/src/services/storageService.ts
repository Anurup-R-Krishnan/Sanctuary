import { deleteBookContent, getAllBooks, getBookContent } from "@/utils/db";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface StorageBreakdown {
  /** Approximate bytes occupied by book binary blobs in book_contents store */
  bookBlobBytes: number;
  /** Approximate bytes occupied by cover art object URLs (in-memory estimate) */
  coverArtBytes: number;
  /** Total storage quota in bytes as reported by the browser */
  quotaBytes: number;
  /** Human-readable label for quota, e.g. "2.1 GB" */
  quotaLabel: string;
  /** Total storage usage in bytes as reported by the browser */
  usageBytes: number;
  /** Usage as a fraction 0–1, capped at 1 */
  usageFraction: number;
  /** Human-readable label for usage, e.g. "45 MB" */
  usageLabel: string;
}

export interface PruneResult {
  /** Total bytes freed (estimate) */
  freedBytes: number;
  /** Number of book blobs removed */
  removed: number;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ─── Core API ─────────────────────────────────────────────────────────────────

/**
 * Queries the browser's Storage API and estimates the IndexedDB breakdown.
 * Safe to call in any environment — falls back gracefully when the API is
 * unavailable (e.g. test environments, older browsers).
 */
export async function estimateStorageUsage(): Promise<StorageBreakdown> {
  let usageBytes = 0;
  let quotaBytes = 0;

  if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
    const estimate = await navigator.storage.estimate();
    usageBytes = estimate.usage ?? 0;
    quotaBytes = estimate.quota ?? 0;
  }

  // Approximate cover-art bytes: 50 KB average per book with a cover URL
  const books = await getAllBooks().catch(() => []);
  const booksWithCovers = books.filter((b) => b.coverUrl).length;
  const coverArtBytes = booksWithCovers * 50 * 1024;

  // Approximate book blob bytes from book_contents store
  let bookBlobBytes = 0;
  await Promise.all(
    books.map(async (book) => {
      const content = await getBookContent(book.id).catch(() => null);
      if (content?.blob) bookBlobBytes += content.blob.size;
    })
  );

  const usageFraction = quotaBytes > 0 ? Math.min(usageBytes / quotaBytes, 1) : 0;

  return {
    bookBlobBytes,
    coverArtBytes,
    quotaBytes,
    quotaLabel: formatBytes(quotaBytes),
    usageBytes,
    usageFraction,
    usageLabel: formatBytes(usageBytes),
  };
}

/**
 * Removes book binary blobs for the books that haven't been opened most
 * recently, keeping at most `maxKeepCount` book blobs.
 * Metadata, reading progress, highlights, and bookmarks are NEVER touched.
 */
export async function pruneUnopenedBookBlobs(maxKeepCount: number): Promise<PruneResult> {
  const books = await getAllBooks().catch(() => []);

  // Sort by most-recently opened; books never opened go last
  const sorted = [...books].sort(
    (a, b) =>
      new Date(b.lastOpenedAt ?? 0).getTime() - new Date(a.lastOpenedAt ?? 0).getTime()
  );

  // Determine candidates: everything beyond the keep window
  const candidates = sorted.slice(maxKeepCount);

  let removed = 0;
  let freedBytes = 0;

  await Promise.all(
    candidates.map(async (book) => {
      const content = await getBookContent(book.id).catch(() => null);
      if (!content) return;
      freedBytes += content.blob?.size ?? 0;
      await deleteBookContent(book.id).catch(() => {
        // Non-fatal: skip books that fail to delete
      });
      removed++;
    })
  );

  return { freedBytes, removed };
}
