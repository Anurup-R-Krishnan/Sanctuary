# Sanctuary Code Fix Plan

Three categories of breakage exist in the monorepo: missing shared packages that prevent `bun install`, mobile app compilation errors, and root-level scripts hardcoded to a broken `npm` installation.

## Issue 1 — Missing `packages/` Workspace ✅ Done

The `packages/` directory (`@sanctuary/core`, `@sanctuary/ui`, `@sanctuary/reader-webview`) was deleted in commit `6584275` but `apps/mobile` still imports from all three. Without them, `bun install` fails with 404 errors for the private `@sanctuary/*` scopes.

### What was done

#### [NEW] [packages/core/](file:///c:/Users/arkendryst/Projects/Sanctuary/packages/core)
Restored from `origin/v2-redesign`, then updated:
- API endpoints changed from `/api/v2/*` → `/api/*` to match the current backend in `functions/api/`
- Added `readerSettingsDefaults` and `colors` constants (present in the last working `main` version at `5f4b28c` but absent on `v2-redesign`)
- Expanded `ReadingSessionV2.device` to accept `"ios" | "mobile" | string` alongside `"android" | "desktop" | "web"` (the backend accepts `z.enum(["web", "desktop", "mobile"])` and the mobile app sends `Platform.OS`)
- Added backward-compatible type aliases at the bottom so mobile code that imports `LibraryItem`, `ReadingGoals`, `ReadingSession`, `ReaderSettings` resolves correctly:
  ```typescript
  export type ReaderSettings = ReaderSettingsV2;
  export type LibraryItem = LibraryItemV2;
  export type ReadingSession = ReadingSessionV2;
  export type ReadingGoals = ReadingGoalsV2;
  ```

#### [NEW] [packages/reader-webview/](file:///c:/Users/arkendryst/Projects/Sanctuary/packages/reader-webview)
Restored verbatim from `origin/v2-redesign`. Contains `ReaderBridgeCommand` / `ReaderBridgeEvent` types and the `readerBridgeBootstrap` JavaScript string injected into the React Native WebView.

#### [NEW] [packages/ui/](file:///c:/Users/arkendryst/Projects/Sanctuary/packages/ui)
Restored verbatim from `origin/v2-redesign`. Exports shared design `tokens` (colors, radii, spacing, typography scales) consumed by `apps/mobile/src/theme/tokens.ts`.

---

## Issue 2 — Mobile App Compilation Errors ✅ Done

After restoring packages, `tsc --noEmit` on `apps/mobile` surfaced 6 errors from 4 files. All were bugs introduced in commit `6584275` when an automated tool renamed types and reshuffled imports without updating every consumer.

### What was done

#### [MODIFY] [sessionSync.ts](file:///c:/Users/arkendryst/Projects/Sanctuary/apps/mobile/src/services/sessionSync.ts)
- `ReaderStatusRows.tsx` imports `SessionSyncState` but the file only re-exported `SyncState`.
- Fix: `export type { SyncState as SessionSyncState }`.

#### [MODIFY] [ReaderScreen.tsx](file:///c:/Users/arkendryst/Projects/Sanctuary/apps/mobile/src/screens/ReaderScreen.tsx)
- Session payload used `duration` and `pagesRead` (web-app field names) instead of the `ReadingSessionV2` field names `durationSec` and `pagesAdvanced`.
- This was also a **runtime data loss bug** — the backend Zod schema expects `durationSec`/`pagesAdvanced`, so sessions posted from mobile were saved with zero duration and zero pages.
- Fix: renamed the two keys in the object literal.

#### [MODIFY] [SettingsScreen.tsx](file:///c:/Users/arkendryst/Projects/Sanctuary/apps/mobile/src/screens/SettingsScreen.tsx)
- Used `api.getSettings()` and `api.saveSettings()` without importing `api`.
- Fix: added `import { api } from "../services/api"`.

#### [MODIFY] [StatsScreen.tsx](file:///c:/Users/arkendryst/Projects/Sanctuary/apps/mobile/src/screens/StatsScreen.tsx)
- Called `loadGoalsWithFallback()` without importing it.
- Fix: added `import { loadGoalsWithFallback } from "../services/goals"`.

---

## Issue 3 — Broken Root Scripts (npm → bun) ✅ Done

> [!IMPORTANT]
> The system's `npm` installation is broken (`Cannot find module '@npmcli/config'`). Every root script that uses `npm --workspace` fails immediately. Since the project already uses `bun` (has `bun.lock`, `bun install` works), all workspace-delegating scripts should be migrated to `bun run --cwd`.

### Proposed Changes

#### [MODIFY] [package.json](file:///c:/Users/arkendryst/Projects/Sanctuary/package.json)

Replace all `npm --workspace @sanctuary/<name> run <script>` with `bun run --cwd <path> <script>`, and `npm run <script>` self-references with `bun run <script>`:

| Script | Current (broken) | Proposed |
|---|---|---|
| `build` | `npm run web:build` | `bun run web:build` |
| `web:build` | `npm --workspace @sanctuary/web run build` | `bun run --cwd apps/web build` |
| `web:dev` | `npm --workspace @sanctuary/web run dev` | `bun run --cwd apps/web dev` |
| `web:guest` | `npm --workspace @sanctuary/web run dev:guest` | `bun run --cwd apps/web dev:guest` |
| `web:preview` | `npm --workspace @sanctuary/web run preview` | `bun run --cwd apps/web preview` |
| `web:strict` | `npm --workspace @sanctuary/web run dev:strict` | `bun run --cwd apps/web dev:strict` |
| `desktop:build` | `npm --workspace @sanctuary/desktop run tauri:build` | `bun run --cwd apps/desktop tauri:build` |
| `desktop:dev` | `npm --workspace @sanctuary/desktop run tauri:dev` | `bun run --cwd apps/desktop tauri:dev` |
| `mobile:android` | `npm --workspace @sanctuary/mobile run android` | `bun run --cwd apps/mobile android` |
| `mobile:dev` | `npm --workspace @sanctuary/mobile run start` | `bun run --cwd apps/mobile start` |
| `mobile:web` | `npm --workspace @sanctuary/mobile run web` | `bun run --cwd apps/mobile web` |
| `preview` | `npm run web:preview` | `bun run web:preview` |
| `size` | `npm run build && size-limit` | `bun run build && size-limit` |

The `dev`, `dev:remote`, and `dev:strict` scripts use `bash -lc` with `npm run` — these were also updated to use `bun run`.

### What was done

All scripts in `package.json` were updated per the table above. The migration was verified by running `bun run build` which calls through `web:build` → `bun run --cwd apps/web build` and completes successfully.

---

## Known Concern — Type Divergence (Not Fixing Now)

> [!NOTE]
> The web app ([apps/web/src/types/index.ts](file:///c:/Users/arkendryst/Projects/Sanctuary/apps/web/src/types/index.ts)) defines its own `LibraryItem`, `ReadingSession`, `ReadingGoals`, and `ReaderSettings` types that are **not** imported from `@sanctuary/core`. The web types differ in several ways:
> - `ReadingSession` uses `duration`/`pagesRead` (not `durationSec`/`pagesAdvanced`) and adds `bookTitle`, `date`, `localStartHour`, `startTime`
> - `ReadingGoals` adds a `month` window and uses a different sub-interface shape
> - `LibraryItem` makes some fields optional that core marks required
>
> This divergence is not causing build failures today (the web app is self-contained), but it means the web and mobile apps disagree on data shapes. A future unification effort could consolidate both into `@sanctuary/core`.

---

## Verification Results ✅

All checks pass as of 2026-07-04:

| # | Check | Command | Result |
|---|-------|---------|--------|
| 1 | Dependencies install | `bun install` | ✅ 2153 installs across 2008 packages (no changes) |
| 2 | Mobile app compiles | `bun x tsc -p apps/mobile/tsconfig.json --noEmit` | ✅ No errors |
| 3 | Lint passes | `bun run lint` | ✅ No errors |
| 4 | Web app builds | `bun run --cwd apps/web build` | ✅ Built in ~5s (1934 modules) |
| 5 | Root build script | `bun run build` | ✅ Built in ~4s (delegates to `web:build`) |
