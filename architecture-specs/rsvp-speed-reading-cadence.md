# Architecture Specification: RSVP Speed Reading & Visual Cadence Acceleration

> **Executor instructions**: Execute this specification systematically. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this specification
> in `architecture-specs/README.md`.
>
> **Drift check (run first)**: `git diff --stat 74833ca..HEAD -- apps/web/src/reader/foliate/FoliateRendition.ts apps/web/src/components/pages/ReaderView.tsx`

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Prerequisites**: Dynamic Chapter Reading Time & Speed Estimator, High-Legibility Typography
- **Category**: Reader Experience / Focus & Accessibility
- **Documented at**: commit `74833ca`, 2026-09-13
- **Status**: VERIFIED

## Why this matters

Human reading speed in traditional layout is fundamentally constrained by ocular saccades — the microscopic, jerky physical movements the eye makes when jumping from word to word across lines. Over 80% of reading effort is consumed by optical realignment rather than cognitive comprehension.

Rapid Serial Visual Presentation (RSVP) eliminates ocular saccades by presenting individual words sequentially in a fixed, ergonomically stabilized focal window. By anchoring words at their Optimal Recognition Point (ORP) — the exact letter position where the brain recognizes word morphology with minimal cognitive load — readers can comfortably process text at 300 to 700+ words per minute with reduced visual fatigue.

Equipping Sanctuary with a native, zero-dependency RSVP engine allows readers to skim chapters, accelerate through assigned reading, or practice focus cadence directly inside their books.

## Current state

The relevant files:
- `apps/web/src/reader/foliate/FoliateRendition.ts`: Exposes `getCurrentDocument()` to access readable chapter text.
- `apps/web/src/components/reader/ReaderHeader.tsx`: Reader navigation bar with action buttons.
- `apps/web/src/components/reader/ReaderSelectionMenu.tsx`: Contextual action menu on text selection.
- `apps/web/src/components/pages/ReaderView.tsx`: Reader coordinator.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `bun run check`          | exit 0, no errors   |
| Tests     | `bun test`               | all pass            |
| Lint      | `bun run lint`           | exit 0              |
| Build     | `bun run build`          | exit 0, < 500 kB    |

## Scope

**In scope**:
- Create `apps/web/src/utils/rsvpTokenEngine.ts`:
  - Tokenize passages into words, whitespace, and paragraph transitions.
  - Calculate the Optimal Recognition Point (ORP) index for each token:
    - 0-1 chars: index 0
    - 2-5 chars: index 1
    - 6-9 chars: index 2
    - 10-13 chars: index 3
    - >13 chars: index 4
  - Split tokens into three visual segments: `{ left, orp, right }`.
  - Calculate dynamic word duration factoring in punctuation micro-pauses (sentence terminators: +100%, clause commas: +50%, long words: +25%).
- Create `apps/web/src/components/reader/ReaderSpeedReaderModal.tsx`:
  - Centered high-legibility typographic focal box with vertical alignment notches.
  - Accent-colored ORP letter fixation anchor.
  - Interactive playback controls: Play/Pause, Rewind 10 words, Forward 10 words.
  - Speed control presets (250, 350, 450, 600 WPM) and slider.
  - Word progress bar and chapter time remaining.
  - Keyboard listeners (`Space` to toggle, `ArrowLeft`/`ArrowRight` to step, `Escape` to close).
- Integrate with `ReaderHeader.tsx`, `ReaderSelectionMenu.tsx`, and `ReaderView.tsx`:
  - One-tap launch from selection (speed-read selected passage) or from header (speed-read current chapter).
  - Code-split `ReaderSpeedReaderModal` with `React.lazy` to keep the main bundle well under 500 kB.
- Comprehensive unit tests in `apps/web/src/utils/rsvpTokenEngine.test.ts`.

**Out of scope**:
- `apps/desktop/src-tauri/*`
- `apps/desktop/build-appimage.sh`
- `apps/mobile/*`
- Third-party speed reader npm libraries.

## Execution Sequence

### Work Unit 1: RSVP Tokenizer, ORP Calculation & Cadence Timing
- Implement `apps/web/src/utils/rsvpTokenEngine.ts`.
- Implement unit tests in `apps/web/src/utils/rsvpTokenEngine.test.ts` verifying ORP positions, token splitting, and punctuation cadence.

### Work Unit 2: Speed Reader Modal Component
- Implement `apps/web/src/components/reader/ReaderSpeedReaderModal.tsx` with focal display, timing loop, and scrubber controls.

### Work Unit 3: Reader View Integration & Triggers
- Add speed-read button to `ReaderHeader.tsx` and `ReaderSelectionMenu.tsx`.
- Connect trigger in `ReaderView.tsx` with lazy-loaded modal.

### Work Unit 4: Quality & Bundle Budget Verification
- Run `bun run check && bun test && bun run lint && bunx eslint functions/ && bun run build`.
- Confirm production bundle size strictly remains < 500 kB.
