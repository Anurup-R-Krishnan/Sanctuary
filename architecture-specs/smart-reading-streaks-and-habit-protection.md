# Architecture Specification: Smart Reading Streaks, Grace Shields & Habit Protection Engine

> **Executor instructions**: Execute this specification systematically. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this specification
> in `architecture-specs/README.md`.
>
> **Drift check (run first)**: `git diff --stat ab18b67..HEAD -- apps/web/src/utils/stats.ts apps/web/src/components/pages/StatsView.tsx`

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Prerequisites**: Annual Reading Challenges & Habit Analytics, Reading Activity Calendar Heatmap & Velocity Analytics
- **Category**: Habit Formation / Motivation & Retention
- **Documented at**: commit `ab18b67`, 2026-09-13
- **Status**: VERIFIED

## Why this matters

Reading streaks are among the most potent behavioral motivators for sustained daily reading. However, naive streak counters have critical cognitive and technical flaws:
1. **Morning Premature Reset**: Naive streak counters check whether the user has read *today*. If evaluated at 9:00 AM before the user opens their first book, their 40-day streak erroneously reads as 0, demotivating the reader.
2. **The "What-the-Hell" Effect**: When an unavoidable life event (illness, flight, emergency) causes a reader to miss a single day, losing a 60-day streak often leads to total habit abandonment.
3. **Lack of Grace & Recovery**: Readers need a forgiving mechanism:
   - **Grace Shields (Streak Freezes)**: Earned through consistency (1 shield awarded per 7 days of reading, stored up to a maximum of 2). If a day is missed, a shield is automatically consumed to bridge the gap and protect the streak.
   - **Streak Repair Challenge**: If a streak lapses without a shield within 48 hours, the reader is offered a 24-hour redemption challenge (reading double the daily target) to resurrect the lost streak.
4. **Milestone Celebrations**: Progressive Flame Tiers (Bronze Spark, Silver Blaze, Gold Inferno, Amethyst Phoenix, Diamond Eternal) provide clear intermediate milestones and visual progression.
5. **Bundle Protection**: Pure domain algorithms with zero external libraries and lazy-loaded components, strictly maintaining the < 500 kB bundle budget.

## Work Units

- [x] **Work Unit 1**: Smart Streak & Habit Protection Engine (`apps/web/src/utils/streakEngine.ts` and test suite).
  - Timezone-aware today/yesterday evaluation preventing morning reset.
  - Automatic grace shield earning (1 shield per 7 days, max capacity 2).
  - Seamless shield consumption when a single gap day is detected.
  - Flame tier progression tiers, badges, and progress-to-next calculations.
  - Streak repair challenge generator, deadline expiry, and restoration logic.
- [x] **Work Unit 2**: Interactive Streak & Shield Protection Card (`apps/web/src/components/stats/StreakProtectionCard.tsx`).
  - Flame badge with dynamic tier styling and animated glow.
  - Active status pill ("Read Today", "Pending Today", "Shielded", "Broken").
  - Grace shield reserve meter (`🛡️ 1 / 2 Ready`) and usage timeline history.
  - Milestone progression bar showing days remaining to next flame tier.
  - Interactive streak repair challenge banner with remaining time and target progress.
- [x] **Work Unit 3**: Store Persistence & Reader Integration.
  - Durable persistence in `localStorage` (`sanctuary_streak_protection_v1`).
  - Integration in `apps/web/src/components/pages/StatsView.tsx` Overview tab.
  - Mini streak flame badge in `apps/web/src/components/reader/ReaderHeader.tsx`.
- [x] **Work Unit 4**: Verification & Quality Gate.
  - Pass all unit tests (`bun test` - 314 passed).
  - Zero TypeScript errors (`bun run check`).
  - Zero ESLint warnings (`bun run lint`, `bunx eslint functions/`).
  - Maintain production web bundle strictly under 500 kB (485.76 kB main bundle, 11.01 kB code-split streak card).

## Verification Gate

```bash
bun test apps/web/src/utils/streakEngine.test.ts
bun test
bun run check
bun run lint
bunx eslint functions/
bun run build
```
