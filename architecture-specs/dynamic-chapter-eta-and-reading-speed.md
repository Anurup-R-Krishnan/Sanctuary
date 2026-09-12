# Architecture Specification: Dynamic Chapter Reading Time & Adaptive Speed Estimator

> **Executor instructions**: Execute this specification systematically. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this specification
> in `architecture-specs/README.md`.
>
> **Drift check (run first)**: `git diff --stat 1fbfb5e..HEAD -- apps/web/src/hooks/useReaderSessionStats.ts apps/web/src/reader/engine/SpineWeightProgressEstimator.ts`

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Prerequisites**: In-Book Speech Synthesis, Storage Dashboard & Offline Caching
- **Category**: Reader Experience / Navigation
- **Documented at**: commit `1fbfb5e`, 2026-09-13
- **Status**: VERIFIED

## Why this matters

Readers frequently need to know how much time is left in their current chapter to decide whether to finish a section before stopping, taking a break, or going to sleep. While Sanctuary currently estimates rough total book completion minutes, it lacks per-chapter completion time horizons, words-per-minute (WPM) calibration, and persistent reader velocity calculation. Providing dynamic chapter ETAs alongside total book ETAs within the reader footer and header capsule dramatically elevates reading comfort.

## Current state

The relevant files:
- `apps/web/src/reader/engine/SpineWeightProgressEstimator.ts`: Calculates character/location weights across spine sections.
- `apps/web/src/hooks/useReaderSessionStats.ts`: Accumulates reading time ticks and calculates locations-per-minute.
- `apps/web/src/types/reader.ts`: Declares `ReaderSessionStats` with `estimatedMinutesRemaining`.
- `apps/web/src/components/reader/ReaderFooter.tsx`: Renders bottom scrub bar and book-level minute estimates.
- `apps/web/src/components/reader/ReaderHeader.tsx`: Displays floating title capsule in top reader chrome.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `bun run check`          | exit 0, no errors   |
| Tests     | `bun test`               | all pass            |
| Lint      | `bun run lint`           | exit 0              |
| Build     | `bun run build`          | exit 0, < 500 kB    |

## Scope

**In scope**:
- Extend `SpineWeightProgressEstimator.ts` with remaining section character weight and ETA calculation utilities.
- Extend `useReaderSessionStats.ts` to compute both `chapterEstimatedMinutesRemaining` and `readingSpeedWpm` from reading session velocity.
- Update `ReaderSessionStats` type definition with sorted alphabetical properties.
- Update `ReaderFooter.tsx` and `ReaderHeader.tsx` to display chapter ETA and remaining book time.
- Add unit tests verifying chapter ETA calculation, rapid scrubbing edge cases, and zero-length sections.

**Out of scope**:
- `apps/desktop/src-tauri/*`
- `apps/desktop/build-appimage.sh`
- `apps/mobile/*`
- Heavy third-party natural language tokenizers.

## Execution Sequence

### Work Unit 1: Extend Spine Weight Estimator & Math Utilities
- Add `getRemainingSectionWeight(sectionIndex, fraction)` and `estimateReadingMinutes(charWeight, wpm)` to `SpineWeightProgressEstimator.ts`.
- Support configurable or calibrated reading speeds (default: 230 WPM, ~1380 characters/min).

### Work Unit 2: Chapter Velocity Measurement in `useReaderSessionStats`
- Accept `currentSectionIndex` and `currentChapterProgress` in `useReaderSessionStats.ts`.
- Calculate `chapterEstimatedMinutesRemaining` and `readingSpeedWpm`.
- Emit updated session stats to reader UI consumers.

### Work Unit 3: Reader Interface Chrome Integration
- In `ReaderFooter.tsx`, show chapter time remaining alongside book time remaining.
- In `ReaderHeader.tsx`, display chapter label and chapter ETA inside the floating capsule.
- Add unit tests for speed and chapter ETA estimation.
- Run complete quality gates: `bun run check && bun test && bun run lint && bun run build`.

## STOP conditions

- If estimation math causes frame drops or CPU spikes during continuous scroll.
- If production web bundle exceeds 500 kB.
