# apps/mobile — React Native / Expo App

Thin client built with Expo (React Native) for Android and web. Reuses `@sanctuary/core`'s API
contract and `@sanctuary/reader-webview`'s reader bridge, but has its own small Zustand store,
AsyncStorage cache, and sync queues. Does **not** share app state with the web app.

See the root `CLAUDE.md` for monorepo conventions and build commands.

## Structure — `apps/mobile/src`

| Directory | Contents | Files |
|-----------|----------|-------|
| `components/` | TopBar, ReaderPanel, StaleDataNotice. | 3 |
| `navigation/` | React Navigation bottom tabs (Library, Reader, Stats, Settings). | 1 |
| `reader/` | ReaderWebView bridge component. | 1 |
| `screens/` | Four tab screens: LibraryScreen, ReaderScreen, StatsScreen, SettingsScreen. | 8 |
| `services/` | API client, library sync, session sync, progress sync, goals fetch, cache layer. | 7 |
| `state/` | Single Zustand store (useAppStore). | 1 |
| `theme/` | Design tokens (re-export from `@sanctuary/ui`), shared styles. | 2 |

**Total:** 23 TypeScript/TSX files. **No tests** (CI does not cover mobile).

## Navigation

**React Navigation bottom tabs** (`navigation/RootNavigator.tsx`):

```tsx
<Tabs.Navigator screenOptions={{ headerShown: false }}>
  <Tabs.Screen name="Library" component={LibraryScreen} />
  <Tabs.Screen name="Reader" component={ReaderScreen} />
  <Tabs.Screen name="Stats" component={StatsScreen} />
  <Tabs.Screen name="Settings" component={SettingsScreen} />
</Tabs.Navigator>
```

Four equal-weight tabs at the bottom. No conditional header or top-level view switching like the web app.
React Navigation handles stack history and transitions automatically.

**Peer dependency note:** `react-native-screens` (v4.16.0) is **required** by React Navigation to function correctly on native platforms. Do not remove it, even if it looks unused.

## State & Cache

### Zustand Store (`state/useAppStore.ts`)

Single store with selectors for:
- `theme` ("light" | "dark") — ui theme.
- `library` — current book list (LibraryItem[]).
- `libraryStale`, `libraryCachedAt` — cache metadata.
- `selectedBookId` — currently open book.
- `goals` — ReadingGoals (target minutes, progress).
- `goalsStale`, `goalsCachedAt` — cache metadata.

Methods: `setTheme`, `setLibrary`, `setGoals`, `selectBook`, `updateBookProgress` (optimistic progress updates).

**Does not persist automatically** — AsyncStorage cache is managed by the services layer.

### AsyncStorage Cache (`services/cache.ts`)

Lightweight wrapper around `@react-native-async-storage/async-storage`:
- `LIBRARY_CACHE_KEY` — JSON-serialized LibraryItem array.
- `GOALS_CACHE_KEY` — JSON-serialized ReadingGoals.
- `SESSION_QUEUE_KEY` — pending session sync entries.
- `PROGRESS_QUEUE_KEY` — pending progress sync entries.

Hydrated on app launch; written after every API sync.

### Sync Queues

Two independent queues (modeled after web's SyncQueue):

**`progressSync.ts`:** Coalesces reading progress updates (book position, minutes read).
- Queued on `onRelocated` (reader emits new position).
- Flushed every ~500ms or immediately if the buffer exceeds a threshold.
- Calls `api.saveSession()` (backend updates reading_sessions table).

**`sessionSync.ts`:** Coalesces session opens/closes and bookmark changes.
- Queued when user opens/closes a book or toggles a bookmark.
- Flushed on the same schedule.
- Calls `api.saveSession()` / `api.saveAnnotation()`.

Both queues:
- Persist to AsyncStorage so they survive app restart.
- Use `SYNC_TIMING` constants from `@sanctuary/core` for retry/backoff.
- Call `setLibrary(..., { stale: true })` after a flush to mark data as needing refresh.

## How It Uses Shared Packages

### `@sanctuary/core` — API Contract

**SanctuaryApiClient** (`packages/core/src/index.ts`):
- Every method is a typed fetch wrapper: `getLibrary()`, `saveSession()`, `saveAnnotation()`, `getGoals()`, etc.
- Mobile instantiates it once in `services/api.ts` with a `getToken` callback for Bearer auth.
- All API calls inject `Authorization: Bearer <token>` (no cookies).
- Results are parsed by Zod schemas; errors throw `ApiError`.

**Shared types:**
- `LibraryItem`, `ReadingSession`, `ReadingGoals`, `CoreAnnotation`.
- `ReaderSettings` (reader preferences, ~40 optional fields).

Mobile reads these types but does not deep-merge with the web app — each app manages its own copy of the library in its own store.

### `@sanctuary/reader-webview` — Reader Bridge

**Protocol:** Discriminated-union messages between React Native (host) and the WebView (reader).

**Commands** (native → webview):
- `OPEN_BOOK` — load a book URL + CFI position.
- `NAV_NEXT`, `NAV_PREV`, `NAV_TO_CFI` — navigation.
- `SET_THEME`, `SET_TYPO` — apply reader settings.
- `ADD_BOOKMARK`, `TOGGLE_BOOKMARK`, `REMOVE_BOOKMARK` — bookmark ops.

**Events** (webview → native):
- `READY` — reader is initialized.
- `BOOK_OPENED` — book loaded, TOC ready.
- `RELOCATED` — user navigated, emit new CFI + progress.
- `ERROR` — reader failed (corrupt file, unsupported format).

**Implementation:** `ReaderWebView.tsx` (`src/reader/`) wraps `react-native-webview`, injects the reader bridge bootstrap code (`readerBridgeBootstrap` from `@sanctuary/reader-webview`), and forwards events to the screen.

**Bootstrap:** Plain ES5 JS (no dependencies, no async/await) injected into the WebView. It initializes `window.SanctuaryReaderBridge`, listens to host commands, and calls foliate-js or epub.js to render the book.

## API Client (`services/api.ts`)

Instantiates SanctuaryApiClient with environment config:
- `VITE_API_BASE_URL` (from web app .env) — defaults to the origin.
- `getToken()` callback — reads Bearer token from async storage or auth library.

Exported as a singleton: `export const apiClient = new SanctuaryApiClient(...)`.

All sync services (`progressSync`, `sessionSync`, `library`, `goals`) use this one client.

## Entry Point & App Shell

**`App.tsx`:** Standard Expo boilerplate.
- Wraps the RootNavigator with theme provider (expo-linear-gradient or similar).
- Hydrates the Zustand store and AsyncStorage cache on mount.
- Sets up global error boundaries if needed.

No AuthScreen or auth state machine — mobile assumes the user is already signed in (or uses the API's `DISABLE_AUTH=true` server-side for dev).

## Commands

Run from the repo root:

- `bun run mobile:dev` — start Expo in dev mode (picks platform interactively: Android, web, or iOS simulator).
- `bun run mobile:android` — build and deploy to Android device/emulator.
- `bun run mobile:web` — run Expo web (for debugging).

(Bare `expo start` also works if Expo CLI is installed globally.)

## CI & Testing

**Mobile is NOT covered by CI.** The quality gate (`deploy.yml`) only runs:
- `bun run check` (web app only).
- `bun run --cwd apps/web lint` (web app only).
- `bun run --cwd apps/web test` (web app only).

Changes to `apps/mobile` are deployed as-is. **Test mobile manually** before merging.

## Architecture Notes

1. **Single store, many services:** Unlike the web app's multi-store Zustand setup, mobile has one `useAppStore`. Library, goals, and progress are all properties of that store, updated by the services layer.

2. **No local EPUB storage:** Mobile does not cache book blobs locally (no IndexedDB equivalent). Every reader session streams the EPUB from R2 via `bookUrl` passed to the ReaderWebView.

3. **Optimistic updates:** `updateBookProgress` in useAppStore instantly updates the UI. The sync queue ensures the write eventually reaches the server.

4. **Reader is a WebView:** The actual reading engine (foliate-js or epub.js) runs in a React Native WebView, not in the RN JS thread. The bridge protocol keeps them loosely coupled.

5. **No design tokens, use packages/ui:** Mobile uses `tokens` from `@sanctuary/ui` (re-exported in `theme/tokens.ts`). These are shared with the web app but are much smaller (color, radius, space, type ramps only).

6. **AsyncStorage is async:** All cache operations are async (`await AsyncStorage.getItem(key)`). The sync queues and services handle this, but be aware if you add new cache-reading code.

## Gotchas

1. **WebView bridge bootstrap is not async/await:** The injected JS must run in plain ES5 (no transpilation in the WebView context). If you edit `readerBridgeBootstrap` in `packages/reader-webview`, use `var`, `function`, and callbacks, not `async/await`.

2. **Reader WebView reloads on app relaunch:** Unlike the web app, there is no session restoration across app restarts. The reader always starts fresh; the last-known CFI is re-sent via `OPEN_BOOK` but the webview is a new instance.

3. **No offline support (yet):** Mobile requires the API to be reachable. Sync queues retry on failure, but there is no full offline mode like the web app's guest mode.

4. **React Navigation stack:** Each screen can have its own stack if nested. Currently flat bottom-tab layout, but if you add deep navigation (e.g., book details → purchase flow), wrap a screen's component in `createNativeStackNavigator()`.

5. **Token type is hardcoded in stores:** `ReaderSettings.device` union includes `"mobile"` (in addition to `"web"` and `"desktop"`). This is used by stats aggregation to filter by device type. Do not remove it.

6. **No monorepo hoisting warning:** Mobile uses `@sanctuary/core`, `@sanctuary/ui`, and `@sanctuary/reader-webview` via the Bun workspaces symlink. Always install with `bun install` from the repo root (never npm).
