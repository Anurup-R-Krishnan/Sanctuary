export interface RelocationPayload {
  cfi: string;
  href?: string;
  progress: number;
  chapterTitle: string;
  page: number;
  totalPages: number;
}

export interface ProgressSnapshot {
  page: number;
  totalPages: number;
  progressPercent: number;
}

export interface RelocationClockState {
  atMs: number;
  page: number;
  totalPages: number;
  href?: string;
}

export function normalizeHref(value?: string) {
  return (value || "").split("#")[0].replace(/^\/+/, "");
}

export function toProgressSnapshot(data: RelocationPayload): ProgressSnapshot {
  const page = Math.max(1, Math.round(data.page || 1));
  const totalPages = Math.max(page, Math.round(data.totalPages || page));
  const progressPercent = Math.max(0, Math.min(100, Math.round((page / totalPages) * 100)));
  return { page, totalPages, progressPercent };
}

export function updatePaceAndReadingTimeMinutes(
  previous: RelocationClockState,
  nowMs: number,
  page: number,
  totalPages: number,
  currentPacePagesPerMinute: number
) {
  let nextPace = currentPacePagesPerMinute;
  const deltaPages = Math.abs(page - previous.page);
  const deltaMinutes = Math.max(0.01, (nowMs - previous.atMs) / 60000);
  if (previous.atMs > 0 && deltaPages > 0) {
    const instantPace = Math.max(0.2, Math.min(6, deltaPages / deltaMinutes));
    nextPace = (currentPacePagesPerMinute * 0.6) + (instantPace * 0.4);
  }
  const pagesLeft = Math.max(0, totalPages - page);
  const readingTimeMinutes = Math.max(1, Math.ceil(pagesLeft / nextPace));
  return { nextPace, readingTimeMinutes };
}

export function findNextChapterLabel(
  tocItems: Array<{ href: string; label: string }>,
  currentHref?: string,
  chapterTitle?: string
): string | null {
  const normalizedCurrent = normalizeHref(currentHref);
  const index = tocItems.findIndex((item) => {
    const tocHref = normalizeHref(item.href);
    if (normalizedCurrent && tocHref) {
      return tocHref === normalizedCurrent || tocHref.includes(normalizedCurrent) || normalizedCurrent.includes(tocHref);
    }
    return item.label === chapterTitle;
  });
  if (index >= 0 && index < tocItems.length - 1) {
    return tocItems[index + 1].label;
  }
  return null;
}
