# Sanctuary V2 Mirror Map

This file maps each implemented frontend feature to its backend/API mirror.

## Reader Progress
- Frontend:
  - `apps/mobile/src/screens/ReaderScreen.tsx`
  - `apps/mobile/src/services/progressSync.ts`
- Backend:
  - `functions/api/v2/library.ts` (`PATCH /api/v2/library?id=...`)
  - `functions/utils/schemaBootstrap.ts` (`books` table)
- Contract:
  - `packages/core/src/index.ts` (`patchLibraryItem`)

## Reader Bookmarks
- Frontend:
  - `apps/mobile/src/reader/ReaderWebView.tsx`
  - `apps/mobile/src/screens/ReaderScreen.tsx`
  - `apps/mobile/src/services/progressSync.ts`
- Backend:
  - `functions/api/v2/library.ts` (`bookmarks_json` read/write)
  - `functions/utils/schemaBootstrap.ts` (`bookmarks_json` schema)
- Contract:
  - `packages/core/src/index.ts` (`LibraryItemV2.bookmarks`, `patchLibraryItem.bookmarks`)

## Reader Sessions
- Frontend:
  - `apps/mobile/src/screens/ReaderScreen.tsx` (session lifecycle)
  - `apps/mobile/src/services/sessionSync.ts` (durable queue)
- Backend:
  - `functions/api/v2/sessions.ts` (`GET/POST /api/v2/sessions`)
  - `functions/utils/schemaBootstrap.ts` (`reading_sessions` table)
- Contract:
  - `packages/core/src/index.ts` (`ReadingSessionV2`, `getSessions`, `saveSession`)

## Reader Goals + Stats
- Frontend:
  - `apps/mobile/src/screens/StatsScreen.tsx`
  - `apps/mobile/src/screens/ReaderScreen.tsx` (header goal badges)
  - `apps/mobile/src/services/goals.ts` (online/offline load)
- Backend:
  - `functions/api/v2/goals.ts` (`GET /api/v2/goals`)
  - `functions/api/v2/settings.ts` (`daily_goal`, `weekly_goal` persistence)
  - `functions/utils/schemaBootstrap.ts` (`user_settings` goals columns)
- Contract:
  - `packages/core/src/index.ts` (`ReadingGoalsV2`, `getGoals`, `ReaderSettingsV2.dailyGoal/weeklyGoal`)

## Reader Settings
- Frontend:
  - `apps/mobile/src/screens/SettingsScreen.tsx`
- Backend:
  - `functions/api/v2/settings.ts` (`GET/PUT /api/v2/settings`)
- Contract:
  - `packages/core/src/index.ts` (`ReaderSettingsV2`, `getSettings`, `saveSettings`)

## Offline-first Library + Reconciliation
- Frontend:
  - `apps/mobile/src/screens/LibraryScreen.tsx` (cached stale-state load)
  - `apps/mobile/src/services/cache.ts` (library/goals cache envelopes)
  - `apps/mobile/src/services/library.ts` (network + cache fallback)
  - `apps/mobile/src/screens/ReaderScreen.tsx` (queue flush + refresh on app active)
- Backend:
  - `functions/api/v2/library.ts` (`GET/PATCH /api/v2/library`)
  - `functions/api/v2/sessions.ts` (`GET/POST /api/v2/sessions`)
- Contract:
  - `packages/core/src/index.ts` (`getLibrary`, `patchLibraryItem`, `getSessions`, `saveSession`)

## Library Fetch
- Frontend:
  - `apps/mobile/src/screens/LibraryScreen.tsx`
- Backend:
  - `functions/api/v2/library.ts` (`GET /api/v2/library`)
- Contract:
  - `packages/core/src/index.ts` (`getLibrary`)

## Auth Mode / Identity
- Frontend:
  - `apps/mobile/src/services/api.ts`
  - `apps/web/src/hooks/useAuth.tsx`
- Backend:
  - `functions/api/v2/me.ts`
  - `functions/utils/auth.ts`

## Local-only (no backend mirror needed)
- Tap zones and swipe gestures in reader interaction.
- WebView bridge rendering internals.
