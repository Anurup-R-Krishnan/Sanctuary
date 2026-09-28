# packages/ — Shared Workspace Libraries

Three private, unpublished packages consumed by the apps. None of them are
built — each ships TypeScript source directly (`main`/`types` both point at
`src/index.ts`) and is consumed by bundler transpilation. There is no build
step to run.

All three are intentionally tiny. If a package needs a build pipeline or grows
a dependency tree, that is a signal the logic probably belongs in an app.

## `@sanctuary/core` — `packages/core`

The shared contract between clients and the `/api` backend.

- `ReaderSettings` — the full reader-preference interface (~40 optional fields:
  typography, layout, theme, TTS, goals, accessibility). Marked optional
  throughout so partial payloads are valid.
- `LibraryItem`, `ReadingSession`, `ReadingGoals`, `CoreAnnotation` — the
  persisted domain shapes returned by the API.
- `SanctuaryApiClient` — the typed fetch wrapper. Every method hits a
  `/api/*` route: `getSettings`/`saveSettings`, `getLibrary`/`patchLibraryItem`/
  `deleteLibraryItem`, `getSessions`/`saveSession`, `getAnnotations`/
  `saveAnnotation`/`deleteAnnotation`, `getGoals`, and `fetchOpdsProxy`.
  It injects `Authorization: Bearer` when `options.getToken` yields a token.
- `STORAGE_KEYS` — canonical localStorage cache keys (`sanctuary:library-cache`,
  `:goals-cache`, `:progress-queue`, `:sessions-queue`).
- `SYNC_TIMING` — shared retry/backoff constants for sync queues.

Two behaviours worth knowing before editing:

- `fetchRaw` deletes the `Content-Type` header when the body is `FormData`, so
  the browser can set the multipart boundary. Do not "fix" this.
- `fetchOpdsProxy(targetUrl, targetAuth, targetAccept)` deliberately keeps the
  *target* server's credentials in separate `X-Target-*` headers so they are
  never forwarded to Sanctuary's own bearer token path. Most OPDS servers send
  no CORS headers, so proxying through the backend is required.

`ReadingSession.device` is a union that includes the literal `"desktop"`. That
is a persisted value, not a reference to a Tauri shell — do not remove it, or
existing rows stop validating against `functions/api/sessions.ts`.

## `@sanctuary/ui` — `packages/ui`

A single `tokens` object plus its `Tokens` type: `color` (light and dark sets),
`radius`, `space`, and `type` ramps. This is the mobile app's design source of
truth — `apps/mobile/src/theme/tokens.ts` re-exports it mapped into
`theme.light` / `theme.dark`.

Note the web app does **not** use this package. Web has its own, larger token
system in `apps/web/index.css` + `tailwind.config.js`, documented in
`apps/web/DESIGN_TOKENS.md`. The two palettes are similar in spirit but are not
generated from each other; changing one will not change the other.

## `@sanctuary/reader-webview` — `packages/reader-webview`

The native WebView bridge used by `apps/mobile`.

- `ReaderBridgeCommand` / `ReaderBridgeEvent` — the discriminated-union message
  protocol. Commands flow native → webview (`OPEN_BOOK`, `NAV_NEXT`,
  `NAV_PREV`, `NAV_TO_CFI`, `NAV_TO_PERCENT`, `NAV_TO_HREF`, `SET_THEME`,
  `SET_TYPO`, `ADD_BOOKMARK`, `TOGGLE_BOOKMARK`, `REMOVE_BOOKMARK`); events flow
  back (`READY`, `RELOCATED`, `TOC_READY`, `BOOKMARKS_CHANGED`, `BOOK_OPENED`,
  `ERROR`).
- `readerBridgeBootstrap` — a **string** of plain ES5 JavaScript that gets
  injected into the WebView. It is intentionally dependency-free and
  pre-`async/await`-style (plain `var`, `function`) because it must run in the
  WebView's JS context, not the Metro bundle.

Transport is `window.ReactNativeWebView.postMessage(JSON.stringify(event))` in,
`window`/`document` `message` listeners out. The webview side must already have
`window.ePub` (epub.js or foliate-js) loaded — the bootstrap fails with an
`ERROR` event if it is absent.

`apps/mobile/src/reader/ReaderWebView.tsx` is the React Native half of this
pair; edit both sides together or the protocol will desync.
