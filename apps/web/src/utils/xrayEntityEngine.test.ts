import { describe, expect, it } from 'bun:test';

import {
  buildXRayBookIndex,
  classifyEntity,
  extractContextualExcerpt,
  filterXRayEntities,
  getDeterministicEntityColor,
  indexChapterEntities,
  scanRawEntities,
  sortXRayEntities,
} from './xrayEntityEngine';

describe('xrayEntityEngine', () => {
  describe('getDeterministicEntityColor', () => {
    it('generates consistent color classes for the same entity name', () => {
      const color1 = getDeterministicEntityColor('Sherlock Holmes');
      const color2 = getDeterministicEntityColor('Sherlock Holmes');
      expect(color1).toBe(color2);
      expect(color1).toContain('bg-');
    });

    it('generates different or valid color classes across varied names', () => {
      const names = ['Elizabeth Bennet', 'Fitzwilliam Darcy', 'Baker Street', 'London'];
      for (const name of names) {
        const color = getDeterministicEntityColor(name);
        expect(typeof color).toBe('string');
        expect(color.length).toBeGreaterThan(0);
      }
    });
  });

  describe('extractContextualExcerpt', () => {
    it('extracts surrounding words cleanly with ellipsis', () => {
      const text =
        'The rain had ceased by afternoon. Sherlock Holmes sat in his armchair smoking his pipe, contemplating the mysterious telegram.';
      const matchOffset = text.indexOf('Sherlock Holmes');
      const excerpt = extractContextualExcerpt(text, matchOffset, 'Sherlock Holmes'.length);

      expect(excerpt).toContain('Sherlock Holmes');
      expect(excerpt.length).toBeGreaterThan(30);
    });

    it('handles matches at the very beginning and end of text', () => {
      const startText = 'Sherlock Holmes arrived early.';
      const startExcerpt = extractContextualExcerpt(startText, 0, 'Sherlock Holmes'.length);
      expect(startExcerpt.startsWith('Sherlock Holmes')).toBe(true);

      const endText = 'They finally met with Sherlock Holmes.';
      const endOffset = endText.indexOf('Sherlock Holmes');
      const endExcerpt = extractContextualExcerpt(endText, endOffset, 'Sherlock Holmes'.length);
      expect(endExcerpt.endsWith('Sherlock Holmes.')).toBe(true);
    });
  });

  describe('classifyEntity', () => {
    it('identifies character titles and honorifics', () => {
      expect(classifyEntity('Lord Henry')).toBe('character');
      expect(classifyEntity('Dr. Watson')).toBe('character');
      expect(classifyEntity('Count Dracula')).toBe('character');
      expect(classifyEntity('Lady Catherine')).toBe('character');
      expect(classifyEntity('Inspector Lestrade')).toBe('character');
    });

    it('identifies location names and suffixes', () => {
      expect(classifyEntity('Baker Street')).toBe('location');
      expect(classifyEntity('Pemberley Hall')).toBe('location');
      expect(classifyEntity('Thames River')).toBe('location');
      expect(classifyEntity('London')).toBe('location');
      expect(classifyEntity('Paris')).toBe('location');
    });

    it('identifies standard character multi-word names', () => {
      expect(classifyEntity('Elizabeth Bennet')).toBe('character');
      expect(classifyEntity('Fitzwilliam Darcy')).toBe('character');
    });
  });

  describe('scanRawEntities & sentence stopword filtering', () => {
    it('filters sentence-initial determiners and conjunctions', () => {
      const text =
        'However, Sherlock Holmes did not answer. Then Dr. Watson entered the room. Finally, they left for Baker Street.';
      const matches = scanRawEntities(text);

      const names = matches.map((m) => m.name);
      expect(names).toContain('Sherlock Holmes');
      expect(names).toContain('Dr. Watson');
      expect(names).toContain('Baker Street');
      expect(names).not.toContain('However');
      expect(names).not.toContain('Then');
      expect(names).not.toContain('Finally');
    });

    it('handles honorifics at sentence starts without stripping them', () => {
      const text = 'Lord Henry walked into the garden. Doctor Watson followed closely.';
      const matches = scanRawEntities(text);
      const names = matches.map((m) => m.name);

      expect(names).toContain('Lord Henry');
      expect(names).toContain('Doctor Watson');
    });

    it('returns empty array for empty or blank text', () => {
      expect(scanRawEntities('')).toEqual([]);
      expect(scanRawEntities('   \n  \t ')).toEqual([]);
    });
  });

  describe('indexChapterEntities & alias clustering', () => {
    it('clusters single-token surname aliases into the full character name', () => {
      const chapterText = `
        Sherlock Holmes was sitting in his chair at Baker Street.
        Holmes took out his magnifying glass.
        "My dear Watson," said Holmes, "the case is extraordinary."
        Dr. Watson listened attentively to Holmes.
      `;

      const entities = indexChapterEntities(chapterText, { chapterIndex: 1, chapterTitle: 'The Adventure' });
      const sherlock = entities.find((e) => e.name === 'Sherlock Holmes');

      expect(sherlock).toBeDefined();
      expect(sherlock!.aliases).toContain('Holmes');
      expect(sherlock!.mentionsCount).toBeGreaterThanOrEqual(4); // "Sherlock Holmes" (1) + "Holmes" (3)
      expect(sherlock!.occurrences.length).toBeGreaterThan(0);
      expect(sherlock!.firstChapterTitle).toBe('The Adventure');

      const watson = entities.find((e) => e.name === 'Dr. Watson');
      expect(watson).toBeDefined();
      expect(watson!.aliases).toContain('Watson');
    });

    it('filters case-insensitive structural terms like CHAPTER, Prologue, Epilogue', () => {
      const text = 'CHAPTER 1. The Loomings. Sherlock Holmes arrived in London.';
      const matches = scanRawEntities(text);
      const names = matches.map((m) => m.name);

      expect(names).not.toContain('CHAPTER');
      expect(names).not.toContain('Chapter');
      expect(names).toContain('Sherlock Holmes');
      expect(names).toContain('London');
    });

    it('deduplicates entities with equivalent normalized slugs in indexChapterEntities', () => {
      const text = 'Moby Dick was sighted in the distance. Later, Moby-Dick struck the ship.';
      const entities = indexChapterEntities(text);
      const ids = entities.map((e) => e.id);

      // Verify no duplicate IDs exist
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);

      const moby = entities.find((e) => e.id === 'moby-dick');
      expect(moby).toBeDefined();
      expect(moby!.mentionsCount).toBe(2);
    });
  });

  describe('buildXRayBookIndex', () => {
    it('compiles multi-chapter documents into comprehensive book index', () => {
      const chapters = [
        {
          index: 1,
          text: 'Elizabeth Bennet was reading in the library. Mr. Darcy observed her quietly from across the room.',
          title: 'Chapter 1',
        },
        {
          index: 2,
          text: 'The next morning, Elizabeth visited Netherfield. Mr. Darcy bowed politely. London was far away.',
          title: 'Chapter 2',
        },
        {
          index: 3,
          text: 'Elizabeth walked through the grounds. Darcy joined her in silent contemplation.',
          title: 'Chapter 3',
        },
      ];

      const index = buildXRayBookIndex(chapters, 1);

      expect(index.entities.length).toBeGreaterThan(0);
      expect(index.totalMentions).toBeGreaterThan(0);
      expect(index.charactersCount).toBeGreaterThan(0);

      const elizabeth = index.entities.find((e) => e.name.includes('Elizabeth'));
      expect(elizabeth).toBeDefined();
      expect(elizabeth!.firstChapterIndex).toBe(1);
      expect(elizabeth!.firstChapterTitle).toBe('Chapter 1');
      expect(elizabeth!.occurrences.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('filterXRayEntities & sortXRayEntities', () => {
    const mockEntities = [
      {
        aliases: ['Holmes'],
        category: 'character' as const,
        color: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
        firstChapterIndex: 1,
        id: 'sherlock-holmes',
        mentionsCount: 25,
        name: 'Sherlock Holmes',
        occurrences: [],
      },
      {
        aliases: [],
        category: 'location' as const,
        color: 'bg-sky-500/20 text-sky-600 border-sky-500/30',
        firstChapterIndex: 1,
        id: 'baker-street',
        mentionsCount: 8,
        name: 'Baker Street',
        occurrences: [],
      },
      {
        aliases: ['Watson'],
        category: 'character' as const,
        color: 'bg-violet-500/20 text-violet-600 border-violet-500/30',
        firstChapterIndex: 2,
        id: 'dr-watson',
        mentionsCount: 15,
        name: 'Dr. Watson',
        occurrences: [],
      },
    ];

    it('filters by search query matching name or alias', () => {
      const resultName = filterXRayEntities(mockEntities, 'Holmes');
      expect(resultName.length).toBe(1);
      expect(resultName[0].name).toBe('Sherlock Holmes');

      const resultAlias = filterXRayEntities(mockEntities, 'Watson');
      expect(resultAlias.length).toBe(1);
      expect(resultAlias[0].name).toBe('Dr. Watson');
    });

    it('filters by category tab', () => {
      const characters = filterXRayEntities(mockEntities, '', 'character');
      expect(characters.length).toBe(2);

      const locations = filterXRayEntities(mockEntities, '', 'location');
      expect(locations.length).toBe(1);
      expect(locations[0].name).toBe('Baker Street');
    });

    it('sorts by mentions, chronological, and alphabetical', () => {
      const byMentions = sortXRayEntities(mockEntities, 'mentions');
      expect(byMentions[0].name).toBe('Sherlock Holmes'); // 25
      expect(byMentions[1].name).toBe('Dr. Watson'); // 15
      expect(byMentions[2].name).toBe('Baker Street'); // 8

      const byChrono = sortXRayEntities(mockEntities, 'chronological');
      expect(byChrono[0].firstChapterIndex).toBe(1);
      expect(byChrono[byChrono.length - 1].name).toBe('Dr. Watson'); // chapter 2

      const byAlpha = sortXRayEntities(mockEntities, 'alphabetical');
      expect(byAlpha[0].name).toBe('Baker Street');
      expect(byAlpha[1].name).toBe('Dr. Watson');
      expect(byAlpha[2].name).toBe('Sherlock Holmes');
    });
  });

  describe('Edge cases and resilience', () => {
    it('handles Irish and French apostrophe names like O\'Connor or D\'Artagnan', () => {
      const text = "Inspector O'Connor arrived with Monsieur D'Artagnan.";
      const entities = scanRawEntities(text);
      const names = entities.map((e) => e.name);

      expect(names).toContain("Inspector O'Connor");
      expect(names).toContain("Monsieur D'Artagnan");
    });

    it('filters out low-frequency noise when minMentions threshold is raised', () => {
      const text = 'Holmes called Watson. Holmes examined the glass. Watson took notes.';
      const singleMentionIndex = indexChapterEntities(text, { minMentions: 2 });
      // Holmes (2 mentions) and Watson (2 mentions) pass, any 1-off noise discarded
      expect(singleMentionIndex.length).toBe(2);
      expect(singleMentionIndex.map((e) => e.name)).toEqual(['Holmes', 'Watson']);
    });

    it('falls back to default character classification or concept cleanly', () => {
      expect(classifyEntity('Random Name')).toBe('character');
      expect(classifyEntity('Baker Street')).toBe('location');
    });
  });
});
