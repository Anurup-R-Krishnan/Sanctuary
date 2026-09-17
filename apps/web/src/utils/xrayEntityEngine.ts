/**
 * Character and entity extraction indexer for book X-Ray feature.
 */

export type EntityType = 'character' | 'concept' | 'location';

export interface EntityOccurrence {
  chapterIndex?: number;
  chapterTitle?: string;
  excerpt: string;
  offset: number;
}

export interface XRayEntity {
  aliases: string[];
  category: EntityType;
  color: string;
  description?: string;
  firstChapterIndex: number;
  firstChapterTitle?: string;
  id: string;
  mentionsCount: number;
  name: string;
  occurrences: EntityOccurrence[];
}

export interface XRayBookIndex {
  charactersCount: number;
  entities: XRayEntity[];
  locationsCount: number;
  termsCount: number;
  totalMentions: number;
}

export interface XRayExtractionOptions {
  chapterIndex?: number;
  chapterTitle?: string;
  minMentions?: number;
}

// Common English sentence-initial stopwords and determiners that should not be indexed as standalone entities
const SENTENCE_STOPWORDS = new Set([
  'A',
  'About',
  'After',
  'Again',
  'All',
  'Almost',
  'Already',
  'Also',
  'Although',
  'Always',
  'An',
  'And',
  'Another',
  'Any',
  'Are',
  'Around',
  'As',
  'At',
  'Away',
  'Back',
  'Be',
  'Because',
  'Been',
  'Before',
  'Being',
  'Between',
  'Both',
  'But',
  'By',
  'Can',
  'Cannot',
  'Chapter',
  'Come',
  'Contents',
  'Could',
  'Did',
  'Do',
  'Does',
  'During',
  'Each',
  'Early',
  'Either',
  'Epilogue',
  'Even',
  'Every',
  'Few',
  'Finally',
  'First',
  'For',
  'From',
  'Further',
  'Get',
  'Give',
  'Go',
  'Had',
  'Has',
  'Have',
  'Having',
  'He',
  'Her',
  'Here',
  'Hers',
  'Him',
  'His',
  'How',
  'However',
  'I',
  'If',
  'In',
  'Indeed',
  'Index',
  'Instead',
  'Into',
  'Introduction',
  'Is',
  'It',
  'Its',
  'Just',
  'Last',
  'Later',
  'Least',
  'Let',
  'Like',
  'Many',
  'May',
  'Maybe',
  'Me',
  'Meanwhile',
  'Might',
  'More',
  'Moreover',
  'Most',
  'Much',
  'Must',
  'My',
  'Near',
  'Never',
  'Next',
  'No',
  'None',
  'Nor',
  'Not',
  'Note',
  'Notes',
  'Now',
  'Of',
  'Off',
  'Often',
  'Oh',
  'On',
  'Once',
  'One',
  'Only',
  'Or',
  'Other',
  'Our',
  'Out',
  'Over',
  'Page',
  'Pages',
  'Part',
  'Perhaps',
  'Preface',
  'Prologue',
  'Quite',
  'Rather',
  'Really',
  'Said',
  'Same',
  'Say',
  'Section',
  'See',
  'Several',
  'She',
  'Should',
  'Since',
  'So',
  'Some',
  'Sometimes',
  'Soon',
  'Still',
  'Such',
  'Suddenly',
  'Tell',
  'Than',
  'That',
  'The',
  'Their',
  'Theirs',
  'Them',
  'Then',
  'There',
  'Therefore',
  'These',
  'They',
  'This',
  'Those',
  'Though',
  'Through',
  'Thus',
  'To',
  'Too',
  'Toward',
  'Two',
  'Under',
  'Until',
  'Up',
  'Upon',
  'Us',
  'Very',
  'Volume',
  'Was',
  'We',
  'Well',
  'Were',
  'What',
  'When',
  'Where',
  'Which',
  'While',
  'Who',
  'Whom',
  'Whose',
  'Why',
  'Will',
  'With',
  'Within',
  'Without',
  'Would',
  'Yes',
  'Yet',
  'You',
  'Your',
  'Yours',
]);

const SENTENCE_STOPWORDS_LOWER = new Set(
  Array.from(SENTENCE_STOPWORDS).map((s) => s.toLowerCase())
);

// Personal honorific titles that strongly identify a human character
const HONORIFIC_TITLES = new Set([
  'Baron',
  'Baroness',
  'Brother',
  'Captain',
  'Capt',
  'Colonel',
  'Col',
  'Count',
  'Countess',
  'Detective',
  'Doctor',
  'Dr',
  'Duchess',
  'Duke',
  'Father',
  'General',
  'Gen',
  'Governor',
  'Gov',
  'Inspector',
  'King',
  'Lady',
  'Lord',
  'Madam',
  'Madame',
  'Mademoiselle',
  'Major',
  'Master',
  'Miss',
  'Mister',
  'Monsieur',
  'Mr',
  'Mrs',
  'Ms',
  'Prince',
  'Princess',
  'Professor',
  'Prof',
  'Queen',
  'Reverend',
  'Rev',
  'Saint',
  'St',
  'Senator',
  'Sergeant',
  'Sgt',
  'Sir',
  'Sister',
]);

// Words that strongly identify a location or geographical landmark
const LOCATION_SUFFIXES = new Set([
  'Alley',
  'Archipelago',
  'Avenue',
  'Ave',
  'Bay',
  'Beach',
  'Blvd',
  'Boulevard',
  'Bridge',
  'Castle',
  'Cathedral',
  'Cemetery',
  'City',
  'Coast',
  'Continent',
  'Cottage',
  'Country',
  'County',
  'Creek',
  'District',
  'Estate',
  'Forest',
  'Garden',
  'Gardens',
  'Gate',
  'Gulf',
  'Hall',
  'Harbor',
  'Harbour',
  'Haven',
  'Highway',
  'Hill',
  'Hills',
  'Hospital',
  'Hotel',
  'House',
  'Inn',
  'Island',
  'Isle',
  'Kingdom',
  'Lake',
  'Lane',
  'Lodge',
  'Manor',
  'Market',
  'Mill',
  'Monastery',
  'Monument',
  'Mountain',
  'Mountains',
  'Museum',
  'Ocean',
  'Palace',
  'Park',
  'Pass',
  'Peak',
  'Peninsula',
  'Pier',
  'Place',
  'Plain',
  'Plaza',
  'Port',
  'Prison',
  'Province',
  'Pub',
  'Realm',
  'Ridge',
  'River',
  'Road',
  'Rd',
  'Sanctuary',
  'Sea',
  'Square',
  'Sq',
  'Station',
  'Strait',
  'Street',
  'St',
  'Temple',
  'Tower',
  'Town',
  'Trail',
  'Valley',
  'Village',
  'Woods',
]);

// Well-known world cities and nations
const PROMINENT_LOCATIONS = new Set([
  'Africa',
  'America',
  'Amsterdam',
  'Asia',
  'Athens',
  'Berlin',
  'Boston',
  'Britain',
  'Cairo',
  'Chicago',
  'China',
  'Dublin',
  'Egypt',
  'England',
  'Europe',
  'Florence',
  'France',
  'Germany',
  'Greece',
  'India',
  'Ireland',
  'Italy',
  'Japan',
  'London',
  'Madrid',
  'Moscow',
  'New York',
  'Oxford',
  'Paris',
  'Petersburg',
  'Rome',
  'Russia',
  'Scotland',
  'Spain',
  'Tokyo',
  'Venice',
  'Vienna',
  'Washington',
]);

const AVATAR_PALETTES = [
  'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  'bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/30',
  'bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-500/30',
  'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30',
  'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30',
  'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  'bg-teal-500/20 text-teal-600 dark:text-teal-400 border-teal-500/30',
  'bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/30',
  'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
];

/**
 * Deterministic color palette selector based on entity name hash.
 */
export function getDeterministicEntityColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

/**
 * Normalizes text to extract clean contextual snippet around an offset.
 */
export function extractContextualExcerpt(text: string, matchOffset: number, matchLength: number): string {
  const windowRadius = 60;
  const start = Math.max(0, matchOffset - windowRadius);
  const end = Math.min(text.length, matchOffset + matchLength + windowRadius);

  let snippet = text.slice(start, end).replace(/\s+/g, ' ');

  // Snap to word boundary on start if not at 0
  if (start > 0) {
    const firstSpace = snippet.indexOf(' ');
    if (firstSpace > 0 && firstSpace < 20) {
      snippet = '…' + snippet.slice(firstSpace + 1);
    } else {
      snippet = '…' + snippet;
    }
  }

  // Snap to word boundary on end if not at text length
  if (end < text.length) {
    const lastSpace = snippet.lastIndexOf(' ');
    if (lastSpace > snippet.length - 20 && lastSpace > 0) {
      snippet = snippet.slice(0, lastSpace) + '…';
    } else {
      snippet = snippet + '…';
    }
  }

  return snippet.trim();
}

/**
 * Classifies an entity based on keywords, prefixes, and suffixes.
 */
export function classifyEntity(name: string): EntityType {
  const parts = name.split(/\s+/);
  const cleanFirst = parts[0].replace(/\./g, '');
  const cleanLast = parts[parts.length - 1].replace(/[,.']/g, '');

  if (HONORIFIC_TITLES.has(cleanFirst)) {
    return 'character';
  }

  if (LOCATION_SUFFIXES.has(cleanLast) || PROMINENT_LOCATIONS.has(name)) {
    return 'location';
  }

  // If multi-word name looking like Firstname Lastname (e.g. "Elizabeth Bennet")
  if (parts.length >= 2 && parts.every((p) => /^[A-Z][a-z]+$/.test(p))) {
    return 'character';
  }

  return 'character';
}

interface RawEntityMatch {
  excerpt: string;
  name: string;
  offset: number;
}

/**
 * Core heuristic NER scanner that identifies proper names and entities.
 */
export function scanRawEntities(text: string): RawEntityMatch[] {
  if (!text || text.trim().length === 0) return [];

  const tokenRegex = /\S+/g;
  const matches: RawEntityMatch[] = [];
  let currentGroup: {
    clean: string;
    endsSentence: boolean;
    isHonorificWithDot: boolean;
    offset: number;
  }[] = [];
  let match: RegExpExecArray | null;

  const emitGroup = (group: typeof currentGroup) => {
    if (group.length === 0) return;

    let startIdx = 0;
    const firstClean = group[0].clean.replace(/\./g, '');
    if (SENTENCE_STOPWORDS_LOWER.has(firstClean.toLowerCase()) && !HONORIFIC_TITLES.has(firstClean)) {
      startIdx = 1;
    }

    const valid = group.slice(startIdx);
    if (valid.length === 0) return;

    if (valid.length === 1) {
      const singleClean = valid[0].clean.replace(/\./g, '');
      if (SENTENCE_STOPWORDS_LOWER.has(singleClean.toLowerCase()) || singleClean.length <= 1) {
        return;
      }
    }

    const name = valid.map((t) => t.clean).join(' ');
    const offset = valid[0].offset;
    const excerpt = extractContextualExcerpt(text, offset, name.length);

    matches.push({
      excerpt,
      name,
      offset,
    });
  };

  while ((match = tokenRegex.exec(text)) !== null) {
    const raw = match[0];
    const offset = match.index;
    const endsSentence = /[.!?]['"]?$/.test(raw);

    let clean = raw.replace(/^[\s"'“‘(\x5B{<]+/, '').replace(/[\s"'”’)\x5D,;:!?}>]+$/, '');
    let isHonorificWithDot = false;

    if (clean.endsWith('.')) {
      const withoutDot = clean.slice(0, -1);
      if (HONORIFIC_TITLES.has(withoutDot) || /^[A-Z]$/.test(withoutDot)) {
        isHonorificWithDot = true;
      } else {
        clean = withoutDot;
      }
    }

    const isCapitalized = /^[A-Z]/.test(clean);

    if (isCapitalized) {
      currentGroup.push({ clean, endsSentence, isHonorificWithDot, offset });
      if (endsSentence && !isHonorificWithDot) {
        emitGroup(currentGroup);
        currentGroup = [];
      }
    } else {
      if (currentGroup.length > 0) {
        emitGroup(currentGroup);
        currentGroup = [];
      }
    }
  }

  if (currentGroup.length > 0) {
    emitGroup(currentGroup);
  }

  return matches;
}

/**
 * Clusters entity names and aliases together.
 */
function clusterEntities(
  nameMap: Map<string, { excerpts: EntityOccurrence[]; mentions: number }>,
  chapterIndex: number = 0,
  chapterTitle?: string,
  minMentions: number = 1,
): XRayEntity[] {
  const sortedNames = Array.from(nameMap.keys()).sort((a, b) => b.length - a.length);
  const canonicalMap = new Map<string, XRayEntity>();
  const mergedNames = new Set<string>();

  for (const name of sortedNames) {
    if (mergedNames.has(name)) continue;

    const data = nameMap.get(name)!;
    const aliases: string[] = [];
    let totalMentions = data.mentions;
    const allOccurrences = [...data.excerpts];

    // Look for single-word aliases that represent this full name
    const tokens = name.split(/\s+/);
    if (tokens.length >= 2) {
      const surname = tokens[tokens.length - 1];
      const firstname = tokens[0].replace(/\./g, '');

      for (const otherName of sortedNames) {
        if (otherName !== name && !mergedNames.has(otherName)) {
          if (otherName === surname || (otherName === firstname && !HONORIFIC_TITLES.has(firstname))) {
            const otherData = nameMap.get(otherName)!;
            aliases.push(otherName);
            totalMentions += otherData.mentions;
            for (const occ of otherData.excerpts) {
              if (allOccurrences.length < 15) {
                allOccurrences.push(occ);
              }
            }
            mergedNames.add(otherName);
          }
        }
      }
    }

    if (totalMentions >= minMentions) {
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const existing = canonicalMap.get(id);
      if (existing) {
        existing.mentionsCount += totalMentions;
        if (!existing.aliases.includes(name) && existing.name !== name) {
          existing.aliases.push(name);
        }
        for (const a of aliases) {
          if (!existing.aliases.includes(a) && existing.name !== a) {
            existing.aliases.push(a);
          }
        }
        for (const occ of allOccurrences) {
          if (existing.occurrences.length < 15) {
            existing.occurrences.push(occ);
          }
        }
      } else {
        const category = classifyEntity(name);
        canonicalMap.set(id, {
          aliases,
          category,
          color: getDeterministicEntityColor(name),
          description: `Mentioned ${totalMentions} ${totalMentions === 1 ? 'time' : 'times'}`,
          firstChapterIndex: chapterIndex,
          firstChapterTitle: chapterTitle,
          id,
          mentionsCount: totalMentions,
          name,
          occurrences: allOccurrences,
        });
      }
    }
    mergedNames.add(name);
  }

  return Array.from(canonicalMap.values()).sort((a, b) => b.mentionsCount - a.mentionsCount);
}

/**
 * Aggregates raw matches, aliases, and occurrences into canonical XRayEntity models for a chapter.
 */
export function indexChapterEntities(
  text: string,
  options: XRayExtractionOptions = {},
): XRayEntity[] {
  const { chapterIndex = 0, chapterTitle, minMentions = 1 } = options;
  const rawMatches = scanRawEntities(text);

  const nameMap = new Map<string, { excerpts: EntityOccurrence[]; mentions: number }>();

  for (const m of rawMatches) {
    const existing = nameMap.get(m.name);
    const occurrence: EntityOccurrence = {
      chapterIndex,
      chapterTitle,
      excerpt: m.excerpt,
      offset: m.offset,
    };

    if (existing) {
      existing.mentions++;
      if (existing.excerpts.length < 10) {
        existing.excerpts.push(occurrence);
      }
    } else {
      nameMap.set(m.name, {
        excerpts: [occurrence],
        mentions: 1,
      });
    }
  }

  return clusterEntities(nameMap, chapterIndex, chapterTitle, minMentions);
}

/**
 * Builds a complete multi-chapter book index from an array of chapter text documents.
 */
export function buildXRayBookIndex(
  chapters: { index: number; text: string; title?: string }[],
  minMentions: number = 2,
): XRayBookIndex {
  const globalNameMap = new Map<string, {
    firstChapterIndex: number;
    firstChapterTitle?: string;
    occurrences: EntityOccurrence[];
    totalMentions: number;
  }>();

  for (const chapter of chapters) {
    const rawMatches = scanRawEntities(chapter.text);

    for (const m of rawMatches) {
      const occurrence: EntityOccurrence = {
        chapterIndex: chapter.index,
        chapterTitle: chapter.title,
        excerpt: m.excerpt,
        offset: m.offset,
      };

      const existing = globalNameMap.get(m.name);
      if (existing) {
        existing.totalMentions++;
        if (existing.occurrences.length < 15) {
          existing.occurrences.push(occurrence);
        }
      } else {
        globalNameMap.set(m.name, {
          firstChapterIndex: chapter.index,
          firstChapterTitle: chapter.title,
          occurrences: [occurrence],
          totalMentions: 1,
        });
      }
    }
  }

  // Multi-word alias clustering across the full book
  const sortedNames = Array.from(globalNameMap.keys()).sort((a, b) => b.length - a.length);
  const mergedNames = new Set<string>();
  const entityMap = new Map<string, XRayEntity>();

  for (const name of sortedNames) {
    if (mergedNames.has(name)) continue;

    const data = globalNameMap.get(name)!;
    const aliases: string[] = [];
    let totalMentions = data.totalMentions;
    const allOccurrences = [...data.occurrences];

    const tokens = name.split(/[ \t]+/);
    if (tokens.length >= 2) {
      const surname = tokens[tokens.length - 1];
      const firstname = tokens[0].replace(/\./g, '');

      for (const otherName of sortedNames) {
        if (otherName !== name && !mergedNames.has(otherName)) {
          if (otherName === surname || (otherName === firstname && !HONORIFIC_TITLES.has(firstname))) {
            const otherData = globalNameMap.get(otherName)!;
            aliases.push(otherName);
            totalMentions += otherData.totalMentions;
            for (const occ of otherData.occurrences) {
              if (allOccurrences.length < 15) {
                allOccurrences.push(occ);
              }
            }
            mergedNames.add(otherName);
          }
        }
      }
    }

    if (totalMentions >= minMentions) {
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const existing = entityMap.get(id);
      if (existing) {
        existing.mentionsCount += totalMentions;
        if (!existing.aliases.includes(name) && existing.name !== name) {
          existing.aliases.push(name);
        }
        for (const a of aliases) {
          if (!existing.aliases.includes(a) && existing.name !== a) {
            existing.aliases.push(a);
          }
        }
        for (const occ of allOccurrences) {
          if (existing.occurrences.length < 15) {
            existing.occurrences.push(occ);
          }
        }
      } else {
        const category = classifyEntity(name);
        entityMap.set(id, {
          aliases,
          category,
          color: getDeterministicEntityColor(name),
          description: `Mentioned ${totalMentions} ${totalMentions === 1 ? 'time' : 'times'} across book`,
          firstChapterIndex: data.firstChapterIndex,
          firstChapterTitle: data.firstChapterTitle,
          id,
          mentionsCount: totalMentions,
          name,
          occurrences: allOccurrences,
        });
      }
    }
    mergedNames.add(name);
  }

  const entities = Array.from(entityMap.values()).sort((a, b) => b.mentionsCount - a.mentionsCount);

  let charactersCount = 0;
  let locationsCount = 0;
  let termsCount = 0;
  let totalMentions = 0;

  for (const ent of entities) {
    totalMentions += ent.mentionsCount;
    if (ent.category === 'character') charactersCount++;
    else if (ent.category === 'location') locationsCount++;
    else termsCount++;
  }

  return {
    charactersCount,
    entities,
    locationsCount,
    termsCount,
    totalMentions,
  };
}

/**
 * Filters entities by search query and category tab.
 */
export function filterXRayEntities(
  entities: XRayEntity[],
  query: string,
  categoryFilter: EntityType | 'all' = 'all',
): XRayEntity[] {
  const normalizedQuery = query.trim().toLowerCase();

  return entities.filter((entity) => {
    if (categoryFilter !== 'all' && entity.category !== categoryFilter) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    if (entity.name.toLowerCase().includes(normalizedQuery)) {
      return true;
    }

    return entity.aliases.some((alias) => alias.toLowerCase().includes(normalizedQuery));
  });
}

/**
 * Sorts entities by frequency (mentions), first appearance (chronological), or alphabetical name.
 */
export function sortXRayEntities(
  entities: XRayEntity[],
  sortBy: 'alphabetical' | 'chronological' | 'mentions',
): XRayEntity[] {
  const copy = [...entities];

  switch (sortBy) {
    case 'mentions':
      return copy.sort((a, b) => b.mentionsCount - a.mentionsCount);
    case 'chronological':
      return copy.sort((a, b) => {
        if (a.firstChapterIndex !== b.firstChapterIndex) {
          return a.firstChapterIndex - b.firstChapterIndex;
        }
        return b.mentionsCount - a.mentionsCount;
      });
    case 'alphabetical':
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return copy;
  }
}
