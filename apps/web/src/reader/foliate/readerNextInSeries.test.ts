import { describe, expect, it } from 'bun:test';

import type { Book } from '@/types';

import { findNextBookInSeries } from '@/utils/seriesEngine';

describe('Reader Next In Series Banner & Progression', () => {
  it('determines whether user has reached the end-of-book threshold', () => {
    const isAtEndOfBook = (progress: number, currentPage: number, totalLocations: number) =>
      progress >= 95 || (totalLocations > 1 && currentPage >= totalLocations);

    expect(isAtEndOfBook(94, 50, 100)).toBe(false);
    expect(isAtEndOfBook(95, 95, 100)).toBe(true);
    expect(isAtEndOfBook(98, 98, 100)).toBe(true);
    expect(isAtEndOfBook(20, 100, 100)).toBe(true);
    expect(isAtEndOfBook(0, 1, 1)).toBe(false);
  });

  it('formats series volume badges cleanly with non-zero indices', () => {
    const formatVolumeBadge = (seriesIndex: number) =>
      seriesIndex > 0 ? `Vol. #${seriesIndex}` : '';

    expect(formatVolumeBadge(1)).toBe('Vol. #1');
    expect(formatVolumeBadge(14)).toBe('Vol. #14');
    expect(formatVolumeBadge(0)).toBe('');
  });

  it('resolves next sequential book item for active reading series', () => {
    const mockBooks: Book[] = [
      {
        author: 'Frank Herbert',
        epubBlob: null,
        id: 'book-1',
        lastLocation: '',
        progress: 100,
        series: 'Dune Chronicles',
        seriesIndex: 1,
        title: 'Dune',
        totalPages: 412,
      },
      {
        author: 'Frank Herbert',
        coverUrl: 'https://example.com/dune-messiah.jpg',
        epubBlob: null,
        id: 'book-2',
        lastLocation: '',
        progress: 0,
        series: 'Dune Chronicles',
        seriesIndex: 2,
        title: 'Dune Messiah',
        totalPages: 256,
      },
    ];

    const nextBook = findNextBookInSeries('book-1', mockBooks);
    expect(nextBook).not.toBeNull();
    expect(nextBook?.title).toBe('Dune Messiah');
    expect(nextBook?.seriesIndex).toBe(2);
    expect(nextBook?.coverUrl).toBe('https://example.com/dune-messiah.jpg');
  });
});
