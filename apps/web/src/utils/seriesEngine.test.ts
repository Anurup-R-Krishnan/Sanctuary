import { describe, expect, it } from 'bun:test';

import type { Book } from '@/types';

import {
  extractSeriesInfo,
  findNextBookInSeries,
  groupBooksBySeries,
} from '@/utils/seriesEngine';

function createMockBook(overrides: Partial<Book> = {}): Book {
  return {
    author: 'J.R.R. Tolkien',
    epubBlob: null,
    id: `book-${Math.random().toString(36).slice(2, 8)}`,
    lastLocation: '',
    progress: 0,
    title: 'The Hobbit',
    totalPages: 310,
    ...overrides,
  };
}

describe('seriesEngine', () => {
  describe('extractSeriesInfo', () => {
    it('prioritizes explicit series metadata from book fields', () => {
      const extracted = extractSeriesInfo(
        'The Fellowship of the Ring',
        'The Lord of the Rings',
        1
      );
      expect(extracted.seriesTitle).toBe('The Lord of the Rings');
      expect(extracted.seriesIndex).toBe(1);
      expect(extracted.cleanTitle).toBe('The Fellowship of the Ring');
    });

    it('heuristically extracts parenthesized series and volume index from title', () => {
      const extracted = extractSeriesInfo('The Fellowship of the Ring (The Lord of the Rings, #1)');
      expect(extracted.seriesTitle).toBe('The Lord of the Rings');
      expect(extracted.seriesIndex).toBe(1);
      expect(extracted.cleanTitle).toBe('The Fellowship of the Ring');
    });

    it('extracts series with hyphenated volume pattern', () => {
      const extracted = extractSeriesInfo('Berserk - Vol. 3');
      expect(extracted.seriesTitle).toBe('Berserk');
      expect(extracted.seriesIndex).toBe(3);
    });

    it('returns clean title without series when no series pattern matches', () => {
      const extracted = extractSeriesInfo('Pride and Prejudice');
      expect(extracted.seriesTitle).toBeUndefined();
      expect(extracted.seriesIndex).toBeUndefined();
      expect(extracted.cleanTitle).toBe('Pride and Prejudice');
    });
  });

  describe('groupBooksBySeries', () => {
    it('groups books into canonical series and sorts by volume index ascending', () => {
      const books: Book[] = [
        createMockBook({
          id: 'lotr-2',
          progress: 100,
          series: 'The Lord of the Rings',
          seriesIndex: 2,
          title: 'The Two Towers',
          totalPages: 350,
        }),
        createMockBook({
          id: 'lotr-1',
          progress: 100,
          series: 'The Lord of the Rings',
          seriesIndex: 1,
          title: 'The Fellowship of the Ring',
          totalPages: 400,
        }),
        createMockBook({
          id: 'lotr-3',
          progress: 40,
          series: 'The Lord of the Rings',
          seriesIndex: 3,
          title: 'The Return of the King',
          totalPages: 420,
        }),
      ];

      const groups = groupBooksBySeries(books);
      expect(groups.length).toBe(1);

      const lotr = groups[0]!;
      expect(lotr.seriesTitle).toBe('The Lord of the Rings');
      expect(lotr.totalVolumes).toBe(3);
      expect(lotr.books[0]!.id).toBe('lotr-1');
      expect(lotr.books[1]!.id).toBe('lotr-2');
      expect(lotr.books[2]!.id).toBe('lotr-3');
      expect(lotr.completedCount).toBe(2);
      expect(lotr.percentComplete).toBe(67);
      expect(lotr.nextBookToRead?.id).toBe('lotr-3');
      expect(lotr.missingIndices).toEqual([]);
    });

    it('identifies missing volume gaps correctly', () => {
      const books: Book[] = [
        createMockBook({
          id: 'dune-1',
          series: 'Dune Chronicles',
          seriesIndex: 1,
          title: 'Dune',
        }),
        createMockBook({
          id: 'dune-3',
          series: 'Dune Chronicles',
          seriesIndex: 3,
          title: 'Children of Dune',
        }),
      ];

      const groups = groupBooksBySeries(books);
      expect(groups.length).toBe(1);
      expect(groups[0]!.missingIndices).toEqual([2]);
    });

    it('filters out single-book groups when minVolumes is set to 2', () => {
      const books: Book[] = [
        createMockBook({
          id: 'standalone-series',
          series: 'Solo Adventure',
          seriesIndex: 1,
          title: 'Only Book',
        }),
      ];

      const all = groupBooksBySeries(books, { minVolumes: 1 });
      expect(all.length).toBe(1);

      const multiOnly = groupBooksBySeries(books, { minVolumes: 2 });
      expect(multiOnly.length).toBe(0);
    });
  });

  describe('findNextBookInSeries', () => {
    it('returns the next sequential volume in the series', () => {
      const books: Book[] = [
        createMockBook({
          id: 'b1',
          series: 'The Expanse',
          seriesIndex: 1,
          title: 'Leviathan Wakes',
        }),
        createMockBook({
          id: 'b2',
          series: 'The Expanse',
          seriesIndex: 2,
          title: 'Caliban’s War',
        }),
        createMockBook({
          id: 'b3',
          series: 'The Expanse',
          seriesIndex: 3,
          title: 'Abaddon’s Gate',
        }),
      ];

      const nextFromB1 = findNextBookInSeries('b1', books);
      expect(nextFromB1).not.toBeNull();
      expect(nextFromB1?.id).toBe('b2');
      expect(nextFromB1?.seriesIndex).toBe(2);

      const nextFromB2 = findNextBookInSeries('b2', books);
      expect(nextFromB2?.id).toBe('b3');

      const nextFromB3 = findNextBookInSeries('b3', books);
      expect(nextFromB3).toBeNull();
    });

    it('returns next available volume when intermediate volume is missing', () => {
      const books: Book[] = [
        createMockBook({
          id: 'vol-1',
          series: 'Space Opera',
          seriesIndex: 1,
          title: 'Book 1',
        }),
        createMockBook({
          id: 'vol-3',
          series: 'Space Opera',
          seriesIndex: 3,
          title: 'Book 3',
        }),
      ];

      const next = findNextBookInSeries('vol-1', books);
      expect(next?.id).toBe('vol-3');
    });

    it('returns null for books that are not part of a multi-volume series', () => {
      const books: Book[] = [
        createMockBook({
          id: 'standalone',
          title: 'Standalone Novel',
        }),
      ];

      expect(findNextBookInSeries('standalone', books)).toBeNull();
    });
  });
});
