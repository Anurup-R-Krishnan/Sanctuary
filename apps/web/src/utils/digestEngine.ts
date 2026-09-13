import type { Book } from "@/types";
import type { ReaderAnnotation } from "@/types/reader";

export type DigestRating = "easy" | "good" | "hard";

export interface DigestItem {
  annotation: ReaderAnnotation;
  bookAuthor: string;
  bookCover?: string;
  bookId: string;
  bookTitle: string;
  isReviewedToday: boolean;
  reviewRecord?: DigestReviewRecord;
}

export interface DigestReviewRecord {
  annotationId: string;
  box: number;
  lastReviewedAt: number;
  nextReviewDate: string;
  rating?: DigestRating;
  reviewCount: number;
}

export interface DigestSummary {
  completionPercentage: number;
  date: string;
  items: DigestItem[];
  reviewedCount: number;
  totalCount: number;
}

export const DIGEST_STORAGE_KEY = "sanctuary_digest_reviews";

export function formatDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  return formatDateKey(d);
}

export function createSeededRandom(seedStr: string): () => number {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = (Math.imul(31, h) + seedStr.charCodeAt(i)) | 0;
  }
  return function () {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function calculateNextReview(
  currentBox: number,
  rating: DigestRating,
  currentDateStr: string,
): { box: number; nextReviewDate: string } {
  let nextBox = currentBox;
  let intervalDays = 1;

  if (rating === "hard") {
    nextBox = 1;
    intervalDays = 1;
  } else if (rating === "good") {
    nextBox = Math.min(5, currentBox + 1);
    switch (nextBox) {
      case 2:
        intervalDays = 3;
        break;
      case 3:
        intervalDays = 7;
        break;
      case 4:
        intervalDays = 14;
        break;
      case 5:
        intervalDays = 30;
        break;
      default:
        intervalDays = 1;
    }
  } else if (rating === "easy") {
    nextBox = Math.min(5, currentBox + 2);
    switch (nextBox) {
      case 2:
        intervalDays = 5;
        break;
      case 3:
        intervalDays = 10;
        break;
      case 4:
        intervalDays = 21;
        break;
      case 5:
        intervalDays = 45;
        break;
      default:
        intervalDays = 3;
    }
  }

  return {
    box: nextBox,
    nextReviewDate: addDays(currentDateStr, intervalDays),
  };
}

export function loadDigestReviews(): Record<string, DigestReviewRecord> {
  if (typeof localStorage === "undefined") {
    return {};
  }
  try {
    const raw = localStorage.getItem(DIGEST_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, DigestReviewRecord>;
  } catch {
    return {};
  }
}

export function saveDigestReviews(reviews: Record<string, DigestReviewRecord>): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(DIGEST_STORAGE_KEY, JSON.stringify(reviews));
  } catch {
    // Ignore storage quota errors
  }
}

export function recordDigestReview(
  annotationId: string,
  rating: DigestRating,
  currentDate: Date = new Date(),
): DigestReviewRecord {
  const reviews = loadDigestReviews();
  const existing = reviews[annotationId];
  const currentBox = existing ? existing.box : 1;
  const todayStr = formatDateKey(currentDate);

  const { box, nextReviewDate } = calculateNextReview(currentBox, rating, todayStr);

  const updated: DigestReviewRecord = {
    annotationId,
    box,
    lastReviewedAt: currentDate.getTime(),
    nextReviewDate,
    rating,
    reviewCount: (existing?.reviewCount ?? 0) + 1,
  };

  reviews[annotationId] = updated;
  saveDigestReviews(reviews);
  return updated;
}

export function selectDailyDigestAnnotations(
  annotations: ReaderAnnotation[],
  reviews: Record<string, DigestReviewRecord>,
  todayStr: string,
  targetCount = 5,
): ReaderAnnotation[] {
  if (annotations.length === 0) {
    return [];
  }
  if (annotations.length <= targetCount) {
    return [...annotations];
  }

  const dueAnnotations: ReaderAnnotation[] = [];
  const candidateAnnotations: ReaderAnnotation[] = [];

  for (const ann of annotations) {
    const rev = reviews[ann.id];
    if (rev) {
      // Due if scheduled for today or earlier
      if (rev.nextReviewDate <= todayStr) {
        dueAnnotations.push(ann);
      } else {
        // Not due yet, but can be candidate if needed
        candidateAnnotations.push(ann);
      }
    } else {
      // Never reviewed, top candidate
      candidateAnnotations.push(ann);
    }
  }

  // Sort due annotations by overdue date (oldest nextReviewDate first)
  dueAnnotations.sort((a, b) => {
    const dateA = reviews[a.id]?.nextReviewDate ?? "";
    const dateB = reviews[b.id]?.nextReviewDate ?? "";
    return dateA.localeCompare(dateB);
  });

  const selected: ReaderAnnotation[] = [...dueAnnotations.slice(0, targetCount)];

  if (selected.length < targetCount && candidateAnnotations.length > 0) {
    const rng = createSeededRandom(todayStr);

    // Group candidates by bookId for source diversity
    const byBook = new Map<string, ReaderAnnotation[]>();
    for (const cand of candidateAnnotations) {
      const list = byBook.get(cand.bookId) || [];
      list.push(cand);
      byBook.set(cand.bookId, list);
    }

    // Deterministically shuffle lists per book
    for (const [, list] of byBook) {
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const temp = list[i];
        list[i] = list[j];
        list[j] = temp;
      }
    }

    // Round-robin selection across books
    const bookKeys = Array.from(byBook.keys());
    let bookIndex = 0;
    while (selected.length < targetCount && candidateAnnotations.length > 0) {
      let foundInRound = false;
      for (let i = 0; i < bookKeys.length && selected.length < targetCount; i++) {
        const currentKey = bookKeys[(bookIndex + i) % bookKeys.length];
        const list = byBook.get(currentKey);
        if (list && list.length > 0) {
          const item = list.shift()!;
          selected.push(item);
          foundInRound = true;
        }
      }
      bookIndex++;
      if (!foundInRound) {
        break;
      }
    }
  }

  return selected.slice(0, targetCount);
}

export function buildDailyDigestItems(
  annotations: ReaderAnnotation[],
  books: Book[],
  reviews: Record<string, DigestReviewRecord>,
  todayStr: string,
  targetCount = 5,
): DigestItem[] {
  const selectedAnnotations = selectDailyDigestAnnotations(annotations, reviews, todayStr, targetCount);
  const bookMap = new Map<string, Book>();
  for (const b of books) {
    bookMap.set(b.id, b);
  }

  return selectedAnnotations.map((ann) => {
    const book = bookMap.get(ann.bookId);
    const review = reviews[ann.id];
    let isReviewedToday = false;

    if (review?.lastReviewedAt) {
      const reviewDateStr = formatDateKey(new Date(review.lastReviewedAt));
      isReviewedToday = reviewDateStr === todayStr;
    }

    return {
      annotation: ann,
      bookAuthor: book?.author || "Unknown Author",
      bookCover: book?.coverUrl,
      bookId: ann.bookId,
      bookTitle: book?.title || "Untitled Document",
      isReviewedToday,
      reviewRecord: review,
    };
  });
}

export function getDigestSummary(items: DigestItem[], todayStr: string): DigestSummary {
  const totalCount = items.length;
  const reviewedCount = items.filter((item) => item.isReviewedToday).length;
  const completionPercentage = totalCount === 0 ? 0 : Math.round((reviewedCount / totalCount) * 100);

  return {
    completionPercentage,
    date: todayStr,
    items,
    reviewedCount,
    totalCount,
  };
}
