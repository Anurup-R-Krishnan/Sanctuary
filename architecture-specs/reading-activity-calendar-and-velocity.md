# Architecture Specification: Reading Activity Calendar Heatmap & Velocity Analytics

> **Executor instructions**: Execute this specification systematically. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this specification
> in `architecture-specs/README.md`.
>
> **Drift check (run first)**: `git diff --stat a3dcc64..HEAD -- apps/web/src/components/pages/StatsView.tsx apps/web/src/utils/stats.ts`

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Prerequisites**: Annual Reading Challenges & Habit Analytics, Storage Dashboard & Offline Caching
- **Category**: Habit Formation / Activity Analytics & Visualization
- **Documented at**: commit `a3dcc64`, 2026-09-13
- **Status**: VERIFIED

## Why this matters

Visualizing reading consistency through rich temporal representations significantly strengthens daily reading habits. While Sanctuary provides basic summary metrics and an unlabelled 14-week block, readers lack:
1. **GitHub-Style Calendar Heatmap**:
   - Clear month headers and day-of-week indicators (Mon, Wed, Fri).
   - Interactive cell tooltips detailing date, reading duration, pages completed, and session count.
   - Dual-horizon views: recent 14 weeks (compact) and full 52 weeks (annual habit landscape).
2. **Time-of-Day Circadian Reading Distribution**:
   - Aggregating reading sessions across Morning (06:00–12:00), Afternoon (12:00–18:00), Evening (18:00–22:00), and Night (22:00–06:00).
   - Highlighting reader's personal peak reading hour.
3. **Reading Velocity & Cadence Analytics**:
   - Average session duration, longest single session, and most active reading day of the week.
   - Daily progress vs target distribution.
4. **Bundle Protection**:
   - Zero external charting/date libraries (no date-fns, no moment, no d3).
   - Code-split with `React.lazy()` to maintain the strict < 500 kB production web bundle budget.

## Work Units

- [x] **Work Unit 1**: Activity analytics engine (`apps/web/src/utils/readingActivityEngine.ts` and test suite).
  - 52-week and 14-week calendar grid generator with month boundaries and day labels.
  - Cell intensity calculator (0–4 scale calibrated against user daily goal).
  - Circadian time-of-day bucket aggregator (morning, afternoon, evening, night).
  - Velocity statistics calculator (avg session, longest session, best day of week, peak reading hour).
- [x] **Work Unit 2**: Interactive Heatmap & Velocity Component (`apps/web/src/components/stats/ReadingActivityHeatmap.tsx`).
  - Month labels, day-of-week labels, and smooth color ramps.
  - Interactive tooltip popover on hover/focus displaying exact date, minutes, and pages.
  - Time-of-day circadian distribution bar with percentage breakdown.
  - Velocity metrics summary cards.
- [x] **Work Unit 3**: `StatsView.tsx` integration.
  - Lazy-load `ReadingActivityHeatmap` in the Charts tab.
  - Connect with `useStatsStore` sessions and `useBookStore` data.
- [x] **Work Unit 4**: Verification & Quality Gate.
  - Pass all unit tests (`bun test` - 299 passed).
  - Zero TypeScript errors (`bun run check`).
  - Zero ESLint warnings (`bun run lint`, `bunx eslint functions/`).
  - Maintain production web bundle strictly under 500 kB (495.89 kB index bundle, 14.09 kB code-split heatmap chunk).

## Verification Gate

```bash
bun test apps/web/src/utils/readingActivityEngine.test.ts
bun test
bun run check
bun run lint
bunx eslint functions/
bun run build
```
