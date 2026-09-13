# Architecture Specification: Zen Focus Immersion & Timed Reading Sprints

> **Executor instructions**: Execute this specification systematically. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this specification
> in `architecture-specs/README.md`.
>
> **Drift check (run first)**: `git diff --stat 760109e..HEAD -- apps/web/src/components/pages/ReaderView.tsx apps/web/src/components/reader/ReaderHeader.tsx`

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Prerequisites**: Ambient Soundscapes & Focus Audio Synthesizer, Dynamic Chapter Reading Time & Speed Estimator
- **Category**: Reader Experience / Focus & Mindfulness
- **Documented at**: commit `760109e`, 2026-09-13
- **Status**: VERIFIED

## Why this matters

Deep literary reading demands sustained cognitive flow. In desktop and mobile browser environments, reading is frequently interrupted by OS chrome, floating browser bars, and involuntary multitasking impulses.

Zen Focus Immersion strips away every visual distraction, auto-hiding navigation chrome, bookmarks, header capsules, and the mouse cursor after inactivity. It frames the reading text within a gentle ambient perimeter vignette calibrated to the active reading background.

To help readers build disciplined daily reading habits, Zen Mode includes optional Timed Reading Sprints (15, 25, 45, or 60 minutes) inspired by the Pomodoro technique. Sprint progress is indicated by an ultra-thin hairline progress line at the top viewport edge. Upon sprint completion, a peaceful singing-bowl harmonic chime synthesizes locally via the Web Audio API with zero external asset bloat, followed by a celebratory focus summary.

## Current state

The relevant files:
- `apps/web/src/components/reader/ReaderHeader.tsx`: Reader navigation bar with action buttons.
- `apps/web/src/components/reader/ReaderOverlay.tsx`: Reader overlay coordinator.
- `apps/web/src/components/pages/ReaderView.tsx`: Main reader shell coordinating engine and UI modals.
- `apps/web/src/hooks/useReaderShortcuts.ts`: Keyboard event listener for reader actions.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `bun run check`          | exit 0, no errors   |
| Tests     | `bun test`               | all pass            |
| Lint      | `bun run lint`           | exit 0              |
| Build     | `bun run build`          | exit 0, < 500 kB    |

## Scope

**In scope**:
- Create `apps/web/src/utils/focusSprintEngine.ts`:
  - Pure Web Audio harmonic chime synthesizer (zero audio asset downloads; Tibetan singing bowl harmonics with exponential gain decay).
  - Sprint timer state management: duration presets (15m, 25m, 45m, 60m), elapsed time, remaining time, progress percentage (0-100%).
  - Focus sprint performance calculations: estimated words read during sprint based on reader WPM.
- Create `apps/web/src/components/reader/ReaderZenFocusOverlay.tsx`:
  - Full-viewport ambient edge vignette that enhances typographic contrast.
  - Hairline top edge progress indicator showing sprint time elapsed.
  - Floating auto-hiding Zen HUD with sprint timer, pause/resume, and exit button (`Esc` or `Z`).
  - Sprint completion celebration dialog with chime trigger and session statistics.
- Integrate into `ReaderHeader.tsx`, `ReaderOverlay.tsx`, and `ReaderView.tsx`:
  - Zen Mode launch button in `ReaderHeader.tsx` (Sparkles / Focus icon).
  - Keyboard shortcut `Z` to toggle Zen Focus Mode.
  - Code-split `ReaderZenFocusOverlay` with `React.lazy` to safeguard the < 500 kB bundle budget.
- Comprehensive unit tests in `apps/web/src/utils/focusSprintEngine.test.ts`.

**Out of scope**:
- `apps/desktop/src-tauri/*`
- `apps/desktop/build-appimage.sh`
- `apps/mobile/*`
- External MP3/WAV audio asset files.

## Execution Sequence

### Work Unit 1: Focus Sprint Engine & Web Audio Harmonic Chime
- Implement `apps/web/src/utils/focusSprintEngine.ts`.
- Implement unit tests in `apps/web/src/utils/focusSprintEngine.test.ts` verifying timer math, progress clamping, and sound synthesis fallback.

### Work Unit 2: Zen Focus Overlay & Ambient HUD Component
- Implement `apps/web/src/components/reader/ReaderZenFocusOverlay.tsx` with auto-hiding controls, hairline progress indicator, and completion dialog.

### Work Unit 3: Reader View, Shortcuts & Header Integration
- Add Zen toggle button to `ReaderHeader.tsx` and register `Z` shortcut.
- Connect Zen Focus overlay into `ReaderView.tsx` via lazy code-splitting.

### Work Unit 4: Quality & Bundle Budget Verification
- Run `bun run check && bun test && bun run lint && bunx eslint functions/ && bun run build`.
- Confirm production bundle size strictly remains < 500 kB.
