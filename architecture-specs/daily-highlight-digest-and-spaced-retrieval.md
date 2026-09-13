# Architecture Specification: Daily Highlight Digest & Spaced Retrieval Review Engine

> **Executor instructions**: Execute this specification systematically. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this specification
> in `architecture-specs/README.md`.
>
> **Drift check (run first)**: `git diff --stat fa5dd0f..HEAD -- apps/web/src/utils/db.ts apps/web/src/components/pages/LibraryView.tsx`

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Prerequisites**: In-Reader Dictionary & Vocabulary Builder (Leitner SRS), Quote Card Generator, Reading Milestones & Badges
- **Category**: Knowledge Management / Cognitive Retention
- **Documented at**: commit `fa5dd0f`, 2026-09-13
- **Status**: VERIFIED

## Why this matters

Reading without retrieval often results in the "highlight graveyard":
1. **Spaced Retrieval Practice**: Cognitive science demonstrates that active retrieval intervals dramatically improve long-term conceptual retention. Rather than letting highlights sit idle, daily resurfacing keeps foundational ideas fresh.
2. **Serendipitous Re-encounter**: Readers re-encounter reflections across disparate books read months or years apart, sparking cross-disciplinary associations and fresh insights.
3. **Actionable Knowledge**: Direct 1-tap bridge from daily digest card to high-DPI Quote Card synthesis, marginalia note editing, and instant navigation back into the source chapter.

## Architecture & Work Units

### Work Unit 1: Storage Layer & Annotation Harvesting
- Add `getAllAnnotations(): Promise<ReaderAnnotation[]>` to `apps/web/src/utils/db.ts` utilizing the existing `ANNOTATIONS_STORE` IndexedDB object store.

### Work Unit 2: Spaced Repetition Digest Engine
- Create `apps/web/src/utils/digestEngine.ts`:
  - `DigestReviewState`: `box`, `lastReviewedAt`, `nextReviewDate`, `reviewCount`, `rating`.
  - Deterministic pseudo-random seed generator (hash of `YYYY-MM-DD` string) so the same 5 quotes are presented throughout the calendar day until reviewed.
  - Due queue logic: Prioritize items whose `nextReviewDate <= today`, followed by unreviewed items deterministically sampled across unique books.
  - Review scoring:
    - `hard`: reset to Box 1 (next review +1 day).
    - `good`: advance Box + 1 (next review +3 to +7 days).
    - `easy`: advance Box + 2 (next review +7 to +21 days).
  - Persistence: Store review states in `localStorage` (`sanctuary_digest_reviews`).
- Create comprehensive unit test suite `apps/web/src/utils/digestEngine.test.ts`.

### Work Unit 3: Code-Split Daily Digest Review Deck Modal
- Create `apps/web/src/components/digest/DailyDigestModal.tsx`:
  - Card deck with flip animation (showing quote on front; notes, metadata, and spaced retrieval ratings on back).
  - Keyboard navigation: `Space` to flip, `ArrowRight`/`ArrowLeft` to navigate, `1`/`2`/`3` for ratings.
  - Action buttons: "Generate Quote Card" (launching `QuoteCardModal`), "Copy Quote", "Open Book".
  - Daily completion celebration banner once all 5 quotes have been reviewed today.

### Work Unit 4: Library View Integration
- Add an unobtrusive, beautiful "Daily Digest" pill banner in `LibraryView.tsx`:
  - Displays daily progress ("Daily Digest: 2/5 reviewed" or "Daily Digest: 5 quotes to reflect on today").
  - Dynamically code-split modal import with `React.lazy` and `Suspense` to preserve bundle headroom.

## Verification Checklist

1. `bun test apps/web/src/utils/digestEngine.test.ts` passes 100%.
2. `bun run check` produces 0 type errors.
3. `bun run lint` produces 0 ESLint warnings.
4. `bunx eslint functions/` produces 0 backend warnings.
5. `bun run build` verifies main bundle remains strictly < 500 kB.
