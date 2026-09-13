# Architecture Specification: X-Ray Character & Entity Dossier Index

> **Executor instructions**: Execute this specification systematically. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this specification
> in `architecture-specs/README.md`.
>
> **Drift check (run first)**: `git diff --stat 9a74b77..HEAD -- apps/web/src/components/pages/ReaderView.tsx apps/web/src/components/reader/ReaderHeader.tsx`

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Prerequisites**: In-Reader Dictionary & Vocabulary Builder, Chapter Readability & Cognitive Complexity Metrics
- **Category**: Reader Experience / Character & Entity Exploration
- **Documented at**: commit `9a74b77`, 2026-09-13
- **Status**: VERIFIED

## Why this matters

In complex novels, multi-generational sagas, classical epics, historical non-fiction, and sci-fi/fantasy worldbuilding, readers often navigate dozens of characters, recurring locations, aliases, and titles. Forgetting a character who was introduced chapters earlier or needing quick context on a historical figure disrupts reading immersion.

X-Ray Character & Entity Dossier Index provides an instant, client-side reference engine:
1. **Heuristic Named Entity Recognition (NER)**:
   - High-precision extraction of personal names, honorific titles (e.g. Doctor, Count, Lady, Captain, Lord, Detective), and multi-word proper nouns.
   - Location and entity distinction based on contextual keywords (Street, Hall, River, City, Palace, Mountain).
   - Sentence-initial stopword filtering ensuring sentence starters like "Then", "After", "Before", "However" are not misclassified as entities.
2. **Entity Frequency & Chronological Timeline**:
   - Total mentions count with relative frequency ranking.
   - Chapter appearance distribution and first appearance location.
   - Canonical name aggregation (e.g. associating single surname references with full honorific/full names).
3. **Interactive Dossier Cards**:
   - Character avatar badge with deterministic hue.
   - Category filtering (All, Characters, Locations, Terms).
   - Contextual quote excerpts showing mentions within narrative context.
   - Instant search filtering by name or title.
4. **Code-Split Floating Drawer**:
   - Lazy-loaded via `React.lazy()` ensuring zero overhead on the strict < 500 kB production web bundle budget.
   - Accessible keyboard shortcut (`X` / `x`) and selection menu lookup.

## Work Units

- [x] **Work Unit 1**: Entity extraction and indexing engine (`apps/web/src/utils/xrayEntityEngine.ts` and test suite).
  - Stopword filtering and sentence boundary identification.
  - Honorific prefix detection (Mr, Mrs, Dr, Lord, Lady, Count, Sir, Captain, etc.).
  - Proper noun sequence collation and frequency counting.
  - Entity classification (character vs location vs term).
  - Alias clustering and contextual excerpt generation.
- [x] **Work Unit 2**: Code-split X-Ray Dossier drawer (`apps/web/src/components/reader/ReaderXRayDrawer.tsx`).
  - Search input, type filter tabs (All, Characters, Locations, Concepts).
  - Sort options (Frequency, Chronological / First Appearance, Alphabetical).
  - Entity dossier cards with mention count pills, chapter occurrences, and contextual excerpt accordions.
- [x] **Work Unit 3**: In-reader integration (`ReaderHeader.tsx`, `ReaderSelectionMenu.tsx`, `useReaderShortcuts.ts`, and `ReaderView.tsx`).
  - Header button with `Users` icon and tooltip ("X-Ray Dossier (X)").
  - Selection menu "X-Ray" action to inspect highlighted entity directly.
  - Reader view state handling with dynamic chapter/spine text indexing.
- [x] **Work Unit 4**: Quality verification gate & bundle budget check.
  - All unit tests passing (`bun test`).
  - Zero TypeScript errors (`bun run check`).
  - Zero ESLint warnings (`bun run lint`, `bunx eslint functions/`).
  - Production bundle strictly under 500 kB (`bun run build`).

## Verification Gate

```bash
bun test apps/web/src/utils/xrayEntityEngine.test.ts
bun test
bun run check
bun run lint
bunx eslint functions/
bun run build
```
