import type { ReaderAnnotation } from "@/types/reader";

export function exportAnnotationsAsMarkdown(
  bookTitle: string,
  bookAuthor: string,
  annotations: ReaderAnnotation[]
): string {
  const dateStr = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const lines: string[] = [
    `# Highlights & Notes: ${bookTitle || "Untitled"}`,
    `*By ${bookAuthor || "Unknown Author"}*`,
    `*Exported from Sanctuary on ${dateStr}*`,
    "",
    "---",
    "",
  ];

  if (annotations.length === 0) {
    lines.push("*No highlights or notes recorded for this book.*");
    return lines.join("\n");
  }

  // Sort chronologically (oldest first for reading order)
  const sorted = [...annotations].sort((a, b) => a.createdAt - b.createdAt);

  let currentChapter = "";
  for (const item of sorted) {
    const chapter = item.chapterLabel || "General Highlights";
    if (chapter !== currentChapter) {
      currentChapter = chapter;
      lines.push(`## ${currentChapter}`, "");
    }

    const formattedDate = new Date(item.createdAt).toLocaleDateString();
    const typeLabel = item.type === "underline" ? "Underline" : "Highlight";

    // Quote the highlighted text
    const quoted = item.text
      .split("\n")
      .map((l) => `> ${l}`)
      .join("\n");

    lines.push(quoted, "");
    if (item.note?.trim()) {
      lines.push(`- **Note**: ${item.note.trim()}`);
    }
    lines.push(`*(${typeLabel} • ${formattedDate})*`, "");
  }

  return lines.join("\n");
}

export function exportAnnotationsAsJson(
  bookTitle: string,
  bookAuthor: string,
  annotations: ReaderAnnotation[]
): string {
  const data = {
    bookTitle: bookTitle || "Untitled",
    bookAuthor: bookAuthor || "Unknown Author",
    exportedAt: new Date().toISOString(),
    count: annotations.length,
    annotations: annotations.map((item) => ({
      id: item.id,
      text: item.text,
      note: item.note ?? null,
      color: item.color,
      type: item.type,
      chapterLabel: item.chapterLabel ?? null,
      cfiRange: item.cfiRange,
      createdAt: new Date(item.createdAt).toISOString(),
    })),
  };

  return JSON.stringify(data, null, 2);
}

export function triggerDownload(content: string, filename: string, mimeType: string): void {
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
