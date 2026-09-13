# Architecture Specification: Interactive Reading Goals & Time-Budgeted Daily Session Timer

> **Executor instructions**: Execute this specification systematically. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this specification
> in `architecture-specs/README.md`.
>
> **Drift check (run first)**: `git diff --stat 49675e1..HEAD -- apps/web/src/components/reader/ReaderHeader.tsx apps/web/src/store/useSettingsStore.ts`

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Prerequisites**: Smart Reading Streaks & Habit Protection Engine, Reading Activity Calendar Heatmap
- **Category**: Habit Formation / Reader Ergonomics
- **Documented at**: commit `49675e1`, 2026-09-13
- **Status**: VERIFIED

## Why this matters

Cultivating a consistent reading habit relies on achievable, time-bounded daily targets rather than overwhelming page counts. Readers frequently sit down with a specific time budget in mind (e.g., "I want to read for 20 minutes before bed" or "a 30-minute morning session"):
1. **Intention-Driven Reading Sessions**: Allowing readers to select a session budget (15m, 20m, 30m, 45m, 60m) provides a clear mental contract and encourages focused, undistracted immersion.
2. **Subtle Ambient Awareness**: Instead of checking an external clock or phone (which introduces notification distractions), a discreet circular progress ring in the reader header reveals session progress at a glance without interrupting flow.
3. **Gentle Milestone Celebration**: Upon completing the chosen session budget or reaching the daily goal, a gentle harmonic Web Audio chime (528 Hz / 660 Hz solfeggio relaxation tone) provides satisfying psychological closure without jarring loud alerts.
4. **Ocular Idle Protection**: If the reader steps away or leaves the app open, reading time accumulation automatically pauses after an inactivity threshold (120s), ensuring statistics remain honest and accurate.
5. **Bundle Protection**: Pure SVG geometry and Web Audio oscillator synthesis with zero external dependencies to preserve Sanctuary's strict < 500 kB production web bundle ceiling.

## Work Units

- [x] **Work Unit 1**: Session Timer & Progress Mathematics Engine (`apps/web/src/utils/readingTimerEngine.ts` and test suite).
  - Session elapsed time, remaining time, and completion percentage calculation.
  - Cumulative daily goal progress combining completed sessions today with active in-reader time.
  - Idle protection pause logic (120-second inactivity threshold).
  - SVG circle dash-offset computation for progress rings.
  - Web Audio harmonic chime generator (dual gentle sine waves with soft exponential gain decay).
- [x] **Work Unit 2**: Settings Store Integration (`apps/web/src/store/useSettingsStore.ts`).
  - Add `sessionBudgetMinutes: number` (default 20 mins, 0 = untimed/open).
  - Add `sessionChimeEnabled: boolean` (default true).
  - Add setters: `setSessionBudgetMinutes`, `setSessionChimeEnabled`.
  - Persist to local storage and remote sync payload.
- [x] **Work Unit 3**: In-Reader Header Session Timer & Popover (`apps/web/src/components/reader/ReaderSessionTimer.tsx`).
  - Compact SVG circular progress indicator embedded in header capsule.
  - Quick popover with 1-click session target selector (15, 20, 30, 45, 60 min, Open).
  - Real-time daily progress bar showing total minutes read today vs daily goal.
  - Gentle completion banner when session target is achieved.
- [x] **Work Unit 4**: Verification & Quality Gate.
  - Pass all unit tests (`bun test`).
  - Zero TypeScript errors (`bun run check`).
  - Zero ESLint warnings (`bun run lint`, `bunx eslint functions/`).
  - Maintain production web bundle strictly under 500 kB.

## Verification Gate

```bash
bun test apps/web/src/utils/readingTimerEngine.test.ts
bun test
bun run check
bun run lint
bunx eslint functions/
bun run build
```
