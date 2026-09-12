/**
 * Annotation & Knowledge Export Service for Sanctuary.
 * Exports book highlights, notes, and bookmarks into Obsidian-compatible Markdown,
 * CSV, and structured JSON formats.
 */

import type { Book } from "@/types";

export interface ExportOptions {
  includeBookmarks?: boolean;
  includeCfi?: boolean;
  includeDate?: boolean;
  obsidianCallouts?: boolean;
}

const DEFAULT_OPTIONS: Required<ExportOptions> = {
  includeBookmarks: true,
  includeCfi: true,
  includeDate: true,
  obsidianCallouts: true,
};

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9_-]/gi, "_").toLowerCase().replace(/_+/g, "_").slice(0, 80);
}

function escapeCsvField(val: string | undefined | null): string {
  if (!val) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Formats a single book's annotations into Obsidian-compatible Markdown with YAML frontmatter.
 */
export function formatBookAnnotationsAsMarkdown(
  book: Book,
  options: ExportOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const highlights = book.highlights ?? [];
  const bookmarks = book.bookmarks ?? [];
  const exportDate = new Date().toISOString();

  const lines: string[] = [
    "---",
    `title: "${book.title.replace(/"/g, '\\"')}"`,
    `author: "${book.author.replace(/"/g, '\\"')}"`,
    `exportedAt: "${exportDate}"`,
    `totalHighlights: ${highlights.length}`,
    `totalBookmarks: ${bookmarks.length}`,
    "source: Sanctuary Book Reader",
    "---",
    "",
    `# ${book.title}`,
    `*By ${book.author}*`,
    "",
  ];

  if (highlights.length === 0 && bookmarks.length === 0) {
    lines.push("*No annotations or bookmarks found for this book.*");
    return lines.join("\n");
  }

  // Highlights Section
  if (highlights.length > 0) {
    lines.push("## Highlights & Notes", "");

    // Chronological sorting (oldest first)
    const sorted = [...highlights].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    for (const h of sorted) {
      const colorLabel = h.color ? h.color.charAt(0).toUpperCase() + h.color.slice(1) : "Highlight";
      const dateStr = opts.includeDate && h.createdAt ? new Date(h.createdAt).toLocaleDateString() : "";
      const metaParts = [colorLabel, dateStr].filter(Boolean);

      if (opts.obsidianCallouts) {
        lines.push(`> [!quote] ${metaParts.join(" • ")}`);
        for (const line of h.text.split("\n")) {
          lines.push(`> ${line}`);
        }
        if (h.note?.trim()) {
          lines.push(">");
          lines.push(`> **Note**: ${h.note.trim()}`);
        }
        if (opts.includeCfi && h.cfi) {
          lines.push(`> <!-- cfi: ${h.cfi} -->`);
        }
        lines.push("");
      } else {
        for (const line of h.text.split("\n")) {
          lines.push(`> ${line}`);
        }
        if (h.note?.trim()) {
          lines.push(`- **Note**: ${h.note.trim()}`);
        }
        lines.push(`*(${metaParts.join(" • ")})*`, "");
      }
    }
  }

  // Bookmarks Section
  if (opts.includeBookmarks && bookmarks.length > 0) {
    lines.push("## Bookmarks", "");
    for (const b of bookmarks) {
      const dateStr = opts.includeDate && b.createdAt ? ` (${new Date(b.createdAt).toLocaleDateString()})` : "";
      lines.push(`- **${b.title || "Bookmark"}**${dateStr}`);
      if (b.note?.trim()) {
        lines.push(`  - Note: ${b.note.trim()}`);
      }
      if (opts.includeCfi && b.cfi) {
        lines.push(`  - Location: \`${b.cfi}\``);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Formats multiple books into a consolidated executive Markdown research digest.
 */
export function formatBatchAnnotationsAsMarkdown(
  books: Book[],
  options: ExportOptions = {}
): string {
  const exportDate = new Date().toISOString();
  const totalHighlights = books.reduce((sum, b) => sum + (b.highlights?.length ?? 0), 0);
  const totalBookmarks = books.reduce((sum, b) => sum + (b.bookmarks?.length ?? 0), 0);

  const lines: string[] = [
    "---",
    `title: "Sanctuary Library Reading Notes"`,
    `exportedAt: "${exportDate}"`,
    `totalBooks: ${books.length}`,
    `totalHighlights: ${totalHighlights}`,
    `totalBookmarks: ${totalBookmarks}`,
    "---",
    "",
    "# Sanctuary Library Reading Notes",
    `*Exported on ${new Date().toLocaleDateString(undefined, { dateStyle: "long" })}*`,
    "",
    "## Table of Contents",
    "",
  ];

  for (const b of books) {
    const anchor = sanitizeFilename(b.title);
    const count = (b.highlights?.length ?? 0) + (b.bookmarks?.length ?? 0);
    lines.push(`- [${b.title}](#${anchor}) (${count} annotations)`);
  }
  lines.push("", "---", "");

  for (const b of books) {
    lines.push(formatBookAnnotationsAsMarkdown(b, options), "", "---", "");
  }

  return lines.join("\n");
}

/**
 * Exports book annotations to CSV table format.
 */
export function exportAnnotationsAsCsv(books: Book[]): string {
  const headers = [
    "Book Title",
    "Author",
    "Type",
    "Color",
    "Text / Excerpt",
    "Note",
    "Location (CFI)",
    "Created At",
  ];

  const rows: string[] = [headers.join(",")];

  for (const book of books) {
    const highlights = book.highlights ?? [];
    for (const h of highlights) {
      rows.push(
        [
          escapeCsvField(book.title),
          escapeCsvField(book.author),
          escapeCsvField("Highlight"),
          escapeCsvField(h.color),
          escapeCsvField(h.text),
          escapeCsvField(h.note),
          escapeCsvField(h.cfi),
          escapeCsvField(h.createdAt),
        ].join(",")
      );
    }

    const bookmarks = book.bookmarks ?? [];
    for (const b of bookmarks) {
      rows.push(
        [
          escapeCsvField(book.title),
          escapeCsvField(book.author),
          escapeCsvField("Bookmark"),
          escapeCsvField(""),
          escapeCsvField(b.title),
          escapeCsvField(b.note),
          escapeCsvField(b.cfi),
          escapeCsvField(b.createdAt),
        ].join(",")
      );
    }
  }

  return rows.join("\n");
}

/**
 * Triggers a browser file download with blob URL lifecycle management.
 */
export function triggerFileDownload(content: string, filename: string, mimeType: string): void {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.error("Failed to trigger file download:", err);
  }
}
