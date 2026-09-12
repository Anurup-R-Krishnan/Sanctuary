# Plan 008: Storage Dashboard, LRU Eviction & Selective Offline Caching

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 54f0583..HEAD -- apps/web/src/components/pages/SettingsView.tsx apps/web/src/utils/db.ts`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `54f0583`, 2026-09-12

## Why this matters

As books with rich imagery, covers, and offline caches accumulate, users on storage-constrained devices (mobile browsers, tablets, low-storage Chromebooks) need visibility into how much local space Sanctuary occupies, the ability to selectively keep books offline, and clear stale caches without losing reading progress or annotations.

## Current state

The relevant files:
- `apps/web/src/components/pages/SettingsView.tsx`: Manages user settings, appearance, reading goals, and account info.
- `apps/web/src/utils/db.ts`: IndexedDB stores: `books`, `book_contents`, `sessions`, `annotations`, `mutations`.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `bun run check`          | exit 0, no errors   |
| Tests     | `bun test`               | all pass            |
| Lint      | `bun run lint`           | exit 0              |
| Build     | `bun run build`          | exit 0, < 500 kB    |

## Scope

**In scope**:
- `apps/web/src/services/storageService.ts` (create): Calls `navigator.storage.estimate()`, inspects IndexedDB store byte sizes, and provides selective cache pruning.
- `apps/web/src/components/settings/StorageManagerCard.tsx` (create): Clean storage meter UI displaying total usage vs quota, breakdown by books and cache, and a "Free Up Space" button.
- `apps/web/src/components/pages/SettingsView.tsx`: Embeds `StorageManagerCard`.
- `apps/web/src/services/storageService.test.ts` (create): Unit tests for storage calculations and cleanup safety.

**Out of scope**:
- `apps/desktop/src-tauri/*`
- `apps/desktop/build-appimage.sh`
- `apps/mobile/*`

## Steps

### Step 1: Implement `storageService.ts`
- Use `navigator.storage?.estimate()` to query total usage and quota.
- Calculate approximate byte breakdown across IndexedDB stores.
- Provide `pruneUnopenedBookBlobs(maxKeepCount: number)` to prune oldest unopened book contents while preserving all metadata and reading progress.

### Step 2: Implement `StorageManagerCard.tsx`
- Render storage capacity bar (e.g. `45 MB used of 2.1 GB`).
- Display breakdown badges: Books, Covers, Annotations.
- Add "Clean Stale Caches" action button with confirmation dialog.

### Step 3: Embed in `SettingsView.tsx` and Write Unit Tests
- Embed `StorageManagerCard` in `SettingsView.tsx`.
- Write unit tests in `storageService.test.ts`.

**Verify**: `bun run check && bun test && bun run lint && bun run build` → exit 0
