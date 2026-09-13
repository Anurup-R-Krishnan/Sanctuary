# Architecture Specification: Book Series Organization, Reading Order & Auto-Next Progression

> **Executor instructions**: Execute this specification systematically. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this specification
> in `architecture-specs/README.md`.
>
> **Drift check (run first)**: `git diff --stat d9cc8b8..HEAD -- apps/web/src/components/pages/LibraryGrid.tsx apps/web/src/store/useBookStore.ts`

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Prerequisites**: Collections & Batch Library Management, Native Comic & Manga Document Parser
- **Category**: Library Experience / Series & Sequential Reading
- **Documented at**: commit `d9cc8b8`, 2026-09-13
- **Status**: VERIFIED

## Why this matters

A substantial proportion of reading consists of multi-volume literary series: fantasy trilogies, sci-fi sagas, historical chronicles, multi-part non-fiction, and comic/manga story arcs. Currently, Sanctuary stores books as flat library items without awareness of series relationships:
1. **Disordered Bookshelves**: Readers have to manually search or sort to find the subsequent book in a trilogy or series.
2. **Missing Volume Gaps**: Readers cannot see whether they have all volumes of a series or if a volume is missing between Book 1 and Book 3.
3. **Friction in Series Continuity**: Upon completing a book (>95% progress or finished), readers are returned to the library without an immediate option to dive directly into the next volume.
4. **Series Completion Motivation**: Tracking progress across an entire saga (e.g., "7 of 14 volumes completed in The Wheel of Time, 4,200 pages remaining") provides powerful macro-reading satisfaction.
5. **Bundle Protection**: Pure client-side grouping and heuristic parsing with zero external libraries and code-split series views to preserve the strict < 500 kB production web bundle budget.

## Work Units

- [x] **Work Unit 1**: Series Collation & Heuristic Parsing Engine (`apps/web/src/utils/seriesEngine.ts` and test suite).
  - Heuristic series title and index extractor from book metadata and titles (e.g., "(The Expanse, Book 3)", "Vol. 2", "#1").
  - Series group aggregator with ascending volume sorting.
  - Missing volume gap detector (e.g., Books 1 and 3 present, Book 2 missing).
  - Next-in-series resolver (`findNextBookInSeries`).
  - Series completion analytics (read volumes, remaining pages, percentage).
- [x] **Work Unit 2**: Series Shelf & Progression UI (`apps/web/src/components/library/SeriesShelfModal.tsx` or Series Shelf view).
  - Code-split modal or shelf tab displaying series cards.
  - Volume sequence badges (#1, #2, #3) with reading progress bars.
  - Series completion ring/bar and remaining pages counter.
  - Missing volume callout indicators.
- [x] **Work Unit 3**: End-of-Book "Next in Series" Progression Banner.
  - Integrated in reader completion flow: prompt appears when reader reaches end of book or marks it finished.
  - Displays cover and title of the next volume with a 1-click "Start Next Volume" action.
- [x] **Work Unit 4**: Verification & Quality Gate.
  - Pass all unit tests (`bun test`).
  - Zero TypeScript errors (`bun run check`).
  - Zero ESLint warnings (`bun run lint`, `bunx eslint functions/`).
  - Maintain production web bundle strictly under 500 kB.

## Verification Gate

```bash
bun test apps/web/src/utils/seriesEngine.test.ts
bun test
bun run check
bun run lint
bunx eslint functions/
bun run build
```
