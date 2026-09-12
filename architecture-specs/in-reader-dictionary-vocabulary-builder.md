# Architecture Specification: In-Reader Dictionary & Vocabulary Learning System

> **Executor instructions**: Execute this specification systematically. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this specification
> in `architecture-specs/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0effadc..HEAD -- apps/web/src/utils/db.ts apps/web/src/components/pages/ReaderView.tsx`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Prerequisites**: Audio & Synchronized In-Book TTS
- **Category**: Educational / Reader Experience
- **Documented at**: commit `5128ed0`, 2026-09-13
- **Status**: READY

## Why this matters

Encountering unfamiliar words while reading is a natural part of expanding literary breadth. Rather than switching contexts to external search engines, readers benefit from an immediate, inline definition and pronunciation lookup. Sanctuary already established a dedicated `vocabulary` object store in IndexedDB during database version 7; connecting this store to an active lookup service and a spaced-repetition flashcard system provides a frictionless vocabulary building loop.

## Current state

The relevant files:
- `apps/web/src/utils/db.ts`: Declares `VOCAB_STORE = "vocabulary"` with `{ keyPath: "id" }`.
- `apps/web/src/components/pages/ReaderView.tsx`: Main reader interface handling text selection and annotation popups.
- `apps/web/src/components/pages/StatsView.tsx`: Reading metrics and achievements.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `bun run check`          | exit 0, no errors   |
| Tests     | `bun test`               | all pass            |
| Lint      | `bun run lint`           | exit 0              |
| Build     | `bun run build`          | exit 0, < 500 kB    |

## Scope

**In scope**:
- `apps/web/src/services/dictionaryService.ts` (create): Queries public definition API (e.g. Free Dictionary API / Wiktionary) with fallback offline caching in `VOCAB_STORE`.
- `apps/web/src/components/reader/WordDefinitionModal.tsx` (create): Inline definition popover showing phonetic pronunciation, part of speech, definition, and a "Save Word" button.
- `apps/web/src/components/vocabulary/VocabularyCard.tsx` (create): Flashcard component displaying saved words with definition reveals and Leitner SRS rating (Easy, Good, Hard).
- `apps/web/src/services/dictionaryService.test.ts` (create): Unit tests verifying API response parsing, fallback behavior, and SRS interval scheduling.

**Out of scope**:
- `apps/desktop/src-tauri/*`
- `apps/desktop/build-appimage.sh`
- `apps/mobile/*`
- Heavy multi-gigabyte offline dictionary database downloads.

## Steps

### Step 1: Implement `dictionaryService.ts`
- Implement `lookupWord(term: string): Promise<WordDefinition>`:
  - Check local `VOCAB_STORE` cache first.
  - If uncached, fetch from free dictionary API and cache definition.
  - Return phonetics, parts of speech, and concise definitions.
- Implement spaced-repetition review state: `intervalDays`, `nextReviewAt`, `repetitionLevel`.

### Step 2: Implement `WordDefinitionModal.tsx`
- Popover triggered when user selects "Define" from reader text selection.
- Shows word, audio pronunciation playback (via speech synthesis or audio URL), definition, and "Save to Vocabulary" action.

### Step 3: Vocabulary Review Queue
- In `StatsView.tsx` or as an accessible drawer, provide a "Vocabulary Builder" review widget with flashcards.
- Simple 3-tier Leitner box algorithm (1 day -> 3 days -> 7 days -> mastered).

### Step 4: Verification & Tests
- Write unit tests in `dictionaryService.test.ts` testing cache hits, parsing, and Leitner progression.
- Verify `bun run check && bun test && bun run lint && bun run build`.
