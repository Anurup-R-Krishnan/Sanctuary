# Architecture Specification: Cross-Book Library Full-Text Search Engine

> **Executor instructions**: Execute this specification systematically. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this specification
> in `architecture-specs/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0effadc..HEAD -- apps/web/src/reader/foliate/FoliateReaderSearch.ts apps/web/src/components/pages/LibraryGrid.tsx`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Prerequisites**: Collections, Custom Shelves & Batch Library Operations
- **Category**: Search & Discovery
- **Documented at**: commit `5128ed0`, 2026-09-13
- **Status**: VERIFIED

## Why this matters

Currently, Sanctuary provides in-book text searching (`FoliateReaderSearch`) within a single active book, and library search that only matches book titles, authors, collections, and tags. Power readers, researchers, and students frequently remember a memorable phrase, quote, or concept but do not recall which book in their collection contained it. A lightweight client-side full-text index across the user's entire library enables instantaneous discovery across hundreds of volumes.

## Current state

The relevant files:
- `apps/web/src/reader/foliate/FoliateReaderSearch.ts`: Performs chapter-by-chapter CFI text searching inside an active book.
- `apps/web/src/components/pages/LibraryGrid.tsx`: Filters displayed books by title, author, and metadata.
- `apps/web/src/utils/db.ts`: IndexedDB database with `book_contents` store.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `bun run check`          | exit 0, no errors   |
| Tests     | `bun test`               | all pass            |
| Lint      | `bun run lint`           | exit 0              |
| Build     | `bun run build`          | exit 0, < 500 kB    |

## Scope

**In scope**:
- `apps/web/src/services/librarySearchIndex.ts` (create): Client-side inverted index or token trie storing term offsets and book identifiers in IndexedDB.
- Background indexing queue: Indexes books incrementally during idle browser cycles (`requestIdleCallback`) without causing frame drops or main-thread lag.
- `apps/web/src/components/library/GlobalSearchModal.tsx` (create): Global search modal (triggered via `Cmd+K` / search shortcut) presenting matches grouped by book with highlight excerpts and 1-click navigation.
- `apps/web/src/services/librarySearchIndex.test.ts` (create): Unit test suite testing tokenization, stem matching, query ranking, and index removal on book deletion.

**Out of scope**:
- `apps/desktop/src-tauri/*`
- `apps/desktop/build-appimage.sh`
- `apps/mobile/*`
- Heavy third-party WASM search engines that exceed the 500 kB bundle budget.

## Steps

### Step 1: Implement `librarySearchIndex.ts`
- Tokenizer: Case folding, punctuation stripping, stop-word removal.
- Inverted index schema in IndexedDB: maps `term -> { bookId, sectionIndex, snippet }[]`.
- Incremental indexer processing book sections chunk-by-chunk.

### Step 2: Implement Background Indexing Worker / Queue
- When new books are imported or when the app is idle, dispatch section indexing in slices.
- Provide `removeBookFromSearchIndex(bookId: string)` on book deletion.

### Step 3: Implement `GlobalSearchModal.tsx`
- Keyboard shortcut `Cmd+K` / `Ctrl+K` opens search modal from any screen.
- Displays search results categorized by Book Title, Author, and Body Content Matches.
- Clicking a body text match navigates straight into `ReaderView` with target section CFI.

### Step 4: Verification & Tests
- Write unit tests in `librarySearchIndex.test.ts` verifying index generation, query ranking, and deletion cleanup.
- Verify `bun run check && bun test && bun run lint && bun run build`.
