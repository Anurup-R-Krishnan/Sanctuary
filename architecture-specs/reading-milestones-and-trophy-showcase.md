# Architecture Specification: Reading Milestones, Achievement Badges & Trophy Showcase Engine

> **Executor instructions**: Execute this specification systematically. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this specification
> in `architecture-specs/README.md`.
>
> **Drift check (run first)**: `git diff --stat ed78037..HEAD -- apps/web/src/utils/stats.ts apps/web/src/components/pages/StatsView.tsx`

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Prerequisites**: Reading Activity Calendar Heatmap & Velocity Analytics, Smart Reading Streaks & Habit Protection Engine
- **Category**: Habit Formation / Gamification & Motivation
- **Documented at**: commit `ed78037`, 2026-09-13
- **Status**: VERIFIED

## Why this matters

Gamified milestone tracking provides intrinsic motivation and reinforces positive reading habits:
1. **Dynamic Progress Resolution**: Sanctuary previously hardcoded static dummy badges where `unlocked: false` was permanently frozen. An achievement engine dynamically computes actual progress across completed books, reading hours, pages turned, streak records, time-of-day habits, and series completions.
2. **Multi-Tiered Progression**: Tiers ranging from immediate starter milestones ("First Steps", "Spark") to aspirational lifetime accomplishments ("Century Club", "Bibliophile", "Marathon Reader") provide continuous positive reinforcement.
3. **Category & Rarity Taxonomy**: Categorizing badges into Books, Streaks, Time, Pages, and Special Habits with rarity ratings (Common, Rare, Epic, Legendary) elevates the reading experience into a rewarding personal trophy showcase.
4. **Accessible Visual Presentation**: Replaces unrenderable emoji identifiers with semantic Lucide icon mappings and dynamic percentage progress bars.
5. **Zero-Overhead Code Splitting**: All showcase presentation logic resides inside the lazily-loaded Stats module, keeping the primary reader bundle strictly below the 500 kB ceiling.

## Work Units

- [ ] **Work Unit 1**: Reading Milestones & Achievement Evaluation Engine (`apps/web/src/utils/badgeEngine.ts` and test suite).
  - Define structured `AchievementBadge` interface with `category`, `rarity`, `target`, `progress`, and `unlocked` status.
  - Implement dynamic evaluation across books (completed count, series completions, genre diversity), reading sessions (total hours, pages read, night owl / early bird circadian tracking), and streak metrics.
  - Provide icon resolver mapping badge keys to Lucide vector icons.
- [ ] **Work Unit 2**: Integration into Stats Service & Computation Pipeline (`apps/web/src/utils/stats.ts`).
  - Replace static `DEFAULT_BADGES` reference in `calculateStats` with dynamic `evaluateBadges`.
  - Wire circadian flags (`nightOwlUnlocked`, `earlyBirdUnlocked`) and series completions into evaluation context.
- [ ] **Work Unit 3**: Trophy Showcase UI & Filtering in Stats View (`apps/web/src/components/stats/BadgeCard.tsx` and `apps/web/src/components/pages/StatsView.tsx`).
  - Enhance `BadgeCard` with rarity borders, clean vector icon rendering, and completion badges.
  - Add filter pills in `StatsView` Badges tab: All, Unlocked, In Progress, Locked, plus category tabs.
  - Showcase overall completion meter and unlocked percentage.
- [ ] **Work Unit 4**: Verification & Quality Gate.
  - Pass all unit tests (`bun test`).
  - Zero TypeScript errors (`bun run check`).
  - Zero ESLint warnings (`bun run lint`, `bunx eslint functions/`).
  - Maintain production web bundle strictly under 500 kB.

## Verification Gate

```bash
bun test apps/web/src/utils/badgeEngine.test.ts
bun test
bun run check
bun run lint
bunx eslint functions/
bun run build
```
