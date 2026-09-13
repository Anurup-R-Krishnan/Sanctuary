/**
 * Book Series Organization, Reading Order & Auto-Next Progression Engine
 *
 * Provides heuristic extraction of series metadata from titles and tags,
 * sequential collation, missing volume detection, and auto-next book resolution.
 */

import type { Book } from '@/types';

export interface ExtractedSeriesInfo {
  cleanTitle: string;
  seriesIndex?: number;
  seriesTitle?: string;
}

export interface SeriesBookItem {
  author: string;
  coverUrl?: null | string;
  id: string;
  progress: number;
  seriesIndex: number;
  status: 'finished' | 'reading' | 'to-read';
  title: string;
  totalPages: number;
}

export interface SeriesGroup {
  author: string;
  books: SeriesBookItem[];
  completedCount: number;
  id: string;
  isComplete: boolean;
  missingIndices: number[];
  nextBookToRead: null | SeriesBookItem;
  percentComplete: number;
  seriesTitle: string;
  totalPages: number;
  totalPagesRemaining: number;
  totalVolumes: number;
}

/**
 * Common regex patterns to detect series names and volume numbers in book titles.
 * Examples:
 * - "The Fellowship of the Ring (The Lord of the Rings, #1)"
 * - "Dune (Dune Chronicles, Book 1)"
 * - "Foundation [Foundation Series Vol. 2]"
 * - "Berserk, Vol. 04"
 */
const SERIES_PATTERNS = [
  // "(Series Name, #1)" or "[Series Name, #1]" or "(Series Name #1)"
  /[([{\u3010]\s*([^()[\]{}]+?)\s*[,:]?\s*(?:#|no\.?|vol\.?|volume|book)\s*(\d+(?:\.\d+)?)\s*[)\]}\u3011]/i,
  // "Series Name - Vol. 1" or "Series Name, Book 2"
  /^(.+?)\s*[-–—]\s*(?:#|vol\.?|volume|book)\s*(\d+(?:\.\d+)?)/i,
  // "Title (Series Name)" where book index might be missing
  /[([{\u3010]\s*([^()[\]{}]+?)\s*(?:series|trilogy|saga|chronicles)\s*[)\]}\u3011]/i,
];

/**
 * Extracts series name and volume index from title or explicit metadata.
 */
export function extractSeriesInfo(
  title: string,
  explicitSeries?: string,
  explicitSeriesIndex?: number
): ExtractedSeriesInfo {
  // If explicitly provided via book metadata or ComicInfo.xml, prioritize it
  if (explicitSeries && explicitSeries.trim().length > 0) {
    return {
      cleanTitle: title.trim(),
      seriesIndex: typeof explicitSeriesIndex === 'number' && !Number.isNaN(explicitSeriesIndex) ? explicitSeriesIndex : 1,
      seriesTitle: explicitSeries.trim(),
    };
  }

  const normalizedTitle = title.trim();

  // Pattern 1: Title (Series, #N)
  const matchP1 = SERIES_PATTERNS[0]!.exec(normalizedTitle);
  if (matchP1 && matchP1[1] && matchP1[2]) {
    const seriesTitle = matchP1[1].trim();
    const indexNum = parseFloat(matchP1[2]);
    const clean = normalizedTitle.replace(matchP1[0], '').trim();
    return {
      cleanTitle: clean || normalizedTitle,
      seriesIndex: Number.isNaN(indexNum) ? 1 : indexNum,
      seriesTitle,
    };
  }

  // Pattern 2: Series - Vol. N
  const matchP2 = SERIES_PATTERNS[1]!.exec(normalizedTitle);
  if (matchP2 && matchP2[1] && matchP2[2]) {
    const seriesTitle = matchP2[1].trim();
    const indexNum = parseFloat(matchP2[2]);
    return {
      cleanTitle: normalizedTitle,
      seriesIndex: Number.isNaN(indexNum) ? 1 : indexNum,
      seriesTitle,
    };
  }

  // Pattern 3: Title (Series Name Saga)
  const matchP3 = SERIES_PATTERNS[2]!.exec(normalizedTitle);
  if (matchP3 && matchP3[1]) {
    const seriesTitle = `${matchP3[1].trim()}`;
    const clean = normalizedTitle.replace(matchP3[0], '').trim();
    return {
      cleanTitle: clean || normalizedTitle,
      seriesIndex: 1,
      seriesTitle,
    };
  }

  return {
    cleanTitle: normalizedTitle,
  };
}

/**
 * Normalizes a series title for case-insensitive grouping.
 */
function normalizeSeriesKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Groups an array of books into sequential series groups.
 */
export function groupBooksBySeries(
  books: Book[],
  options: { minVolumes?: number } = {}
): SeriesGroup[] {
  const minVolumes = options.minVolumes ?? 1;
  const seriesMap = new Map<string, { author: string; books: SeriesBookItem[]; seriesTitle: string }>();

  for (const book of books) {
    const extracted = extractSeriesInfo(book.title, book.series, book.seriesIndex);
    if (!extracted.seriesTitle) {
      continue;
    }

    const key = normalizeSeriesKey(extracted.seriesTitle);
    const existing = seriesMap.get(key);

    const bookStatus: 'finished' | 'reading' | 'to-read' =
      book.progress >= 95
        ? 'finished'
        : book.progress > 0
          ? 'reading'
          : 'to-read';

    const seriesItem: SeriesBookItem = {
      author: book.author || 'Unknown Author',
      coverUrl: book.coverUrl,
      id: book.id,
      progress: book.progress || 0,
      seriesIndex: extracted.seriesIndex ?? 1,
      status: bookStatus,
      title: extracted.cleanTitle || book.title,
      totalPages: book.totalPages || 300,
    };

    if (existing) {
      existing.books.push(seriesItem);
      // Retain the best-cased title
      if (extracted.seriesTitle.length > existing.seriesTitle.length) {
        existing.seriesTitle = extracted.seriesTitle;
      }
    } else {
      seriesMap.set(key, {
        author: book.author || 'Unknown Author',
        books: [seriesItem],
        seriesTitle: extracted.seriesTitle,
      });
    }
  }

  const result: SeriesGroup[] = [];

  for (const [key, group] of seriesMap.entries()) {
    if (group.books.length < minVolumes) {
      continue;
    }

    // Sort books by sequence index ascending
    group.books.sort((a, b) => a.seriesIndex - b.seriesIndex);

    // Identify missing volume sequence indices
    const presentIndices = new Set(group.books.map((b) => b.seriesIndex));
    const maxIndex = Math.max(...group.books.map((b) => b.seriesIndex));
    const minIndex = Math.min(...group.books.map((b) => b.seriesIndex));
    const missingIndices: number[] = [];

    for (let i = Math.max(1, Math.floor(minIndex)); i <= Math.floor(maxIndex); i++) {
      if (!presentIndices.has(i)) {
        missingIndices.push(i);
      }
    }

    // Compute progress & next book
    let completedCount = 0;
    let totalPages = 0;
    let totalPagesRemaining = 0;
    let nextBookToRead: null | SeriesBookItem = null;

    for (const item of group.books) {
      totalPages += item.totalPages;
      if (item.status === 'finished') {
        completedCount++;
      } else {
        const remainingFraction = Math.max(0, (100 - item.progress) / 100);
        totalPagesRemaining += Math.round(item.totalPages * remainingFraction);
        if (!nextBookToRead) {
          nextBookToRead = item;
        }
      }
    }

    const percentComplete = group.books.length > 0
      ? Math.round((completedCount / group.books.length) * 100)
      : 0;

    result.push({
      author: group.author,
      books: group.books,
      completedCount,
      id: `series-${key}`,
      isComplete: completedCount === group.books.length,
      missingIndices,
      nextBookToRead,
      percentComplete,
      seriesTitle: group.seriesTitle,
      totalPages,
      totalPagesRemaining,
      totalVolumes: group.books.length,
    });
  }

  // Sort series groups alphabetically by seriesTitle
  result.sort((a, b) => a.seriesTitle.localeCompare(b.seriesTitle));
  return result;
}

/**
 * Finds the immediate next sequential volume in the series for a given book.
 */
export function findNextBookInSeries(currentBookId: string, books: Book[]): null | SeriesBookItem {
  const currentBook = books.find((b) => b.id === currentBookId);
  if (!currentBook) {
    return null;
  }

  const extracted = extractSeriesInfo(currentBook.title, currentBook.series, currentBook.seriesIndex);
  if (!extracted.seriesTitle) {
    return null;
  }

  const seriesGroups = groupBooksBySeries(books, { minVolumes: 1 });
  const key = normalizeSeriesKey(extracted.seriesTitle);
  const matchedGroup = seriesGroups.find((g) => normalizeSeriesKey(g.seriesTitle) === key);

  if (!matchedGroup || matchedGroup.books.length <= 1) {
    return null;
  }

  const currentIndex = extracted.seriesIndex ?? 1;

  // Try exact next volume (currentIndex + 1)
  const exactNext = matchedGroup.books.find((b) => b.seriesIndex === currentIndex + 1);
  if (exactNext) {
    return exactNext;
  }

  // Otherwise, return first book with seriesIndex > currentIndex
  const subsequentBooks = matchedGroup.books.filter((b) => b.seriesIndex > currentIndex);
  return subsequentBooks.length > 0 ? subsequentBooks[0]! : null;
}
