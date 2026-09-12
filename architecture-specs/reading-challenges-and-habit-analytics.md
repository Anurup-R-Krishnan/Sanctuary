# Architecture Specification: Annual Reading Challenges & Habit Analytics

> **Executor instructions**: Execute this specification systematically. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this specification
> in `architecture-specs/README.md`.
>
> **Drift check (run first)**: `git diff --stat d7e5ea7..HEAD -- apps/web/src/components/pages/StatsView.tsx apps/web/src/store/useStatsStore.ts`

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Prerequisites**: Storage Dashboard & Offline Caching
- **Category**: Habit Formation / User Engagement
- **Documented at**: commit `d7e5ea7`, 2026-09-13
- **Status**: READY

## Why this matters

Consistent reading habits require sustained motivation and visual milestones. While Sanctuary currently tracks daily and weekly reading targets, readers lack long-term goal horizons such as yearly book challenges ("Read 25 Books in 2026") and reading pace calculations ("1 book ahead of schedule"). Providing annual challenge tracking, streak preservation, and projected completion dates for books currently in progress fosters reader retention and delight.

## Current state

The relevant files:
- `apps/web/src/store/useStatsStore.ts`: Computes session aggregates, streaks, and heatmap matrices.
- `apps/web/src/store/useSettingsStore.ts`: Holds `dailyGoal` and `weeklyGoal`.
- `apps/web/src/components/pages/StatsView.tsx`: Displays overview cards, charts, badges, and vocabulary review.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `bun run check`          | exit 0, no errors   |
| Tests     | `bun test`               | all pass            |
| Lint      | `bun run lint`           | exit 0              |
| Build     | `bun run build`          | exit 0, < 500 kB    |

## Scope

**In scope**:
- Add `annualBookGoal` and `annualGoalYear` to `useSettingsStore.ts`.
- Calculate books completed in current calendar year from `books` (where `progress === 1` or `completedAt` within year).
- Compute challenge pace (e.g. "+2 books ahead of schedule" or "On track").
- Add an Annual Challenge card to `StatsView.tsx` with circular completion progress and pace breakdown.
- Add unit tests verifying challenge math, year rollover, and leap year days calculation.

**Out of scope**:
- `apps/desktop/src-tauri/*`
- `apps/desktop/build-appimage.sh`
- `apps/mobile/*`
- Social leaderboards requiring public follower infrastructure.

## Execution Sequence

### Work Unit 1: Extend Goals Model and Analytics Calculations
- Update `useSettingsStore.ts` with `annualBookGoal: number` (default: 20) and `setAnnualBookGoal`.
- In `useStatsStore.ts` (or analytics helper), implement `calculateAnnualChallenge(books: Book[], goal: number, now?: Date)`:
  - Count books completed in target year.
  - Calculate target pace based on day of year fraction.
  - Determine difference: `aheadCount`, `behindCount`, or `onPace`.

### Work Unit 2: Annual Challenge Widget in `StatsView.tsx`
- In `StatsView.tsx` Overview tab:
  - Render an Annual Challenge Card with circular progress ring.
  - Display current completed count vs annual goal.
  - Display schedule pace badge (e.g., "2 books ahead of schedule").
  - Provide inline quick-edit for annual goal (12, 24, 52 books presets).

### Work Unit 3: Verification & Quality Assurance
- Add unit tests verifying pace calculations across edge cases (Jan 1, Dec 31, leap years).
- Run `bun run check && bun test && bun run lint && bun run build`.
- Confirm bundle size remains below 500 kB budget.

## STOP conditions

- If user settings schema migration breaks existing guest or authenticated sync state.
- If bundle size increases beyond 500 kB.
