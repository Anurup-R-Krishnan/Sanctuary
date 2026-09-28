# apps/web — React Web App & Desktop Shell

The main product: offline-first EPUB/book reader built with React 19 + Vite + Tailwind, plus the
Foliate reading engine. Wrapped by Tauri (`src-tauri/`) as the Linux desktop app. Deployed to
Cloudflare Pages (SPA + `functions/` backend).

See the root `CLAUDE.md` for monorepo conventions, build commands, and deployment. This guide
covers the web app's internal architecture only.

## Directory Map — `apps/web/src`

| Directory | Contents | Files |
|-----------|----------|-------|
| `api/` | SanctuaryApiClient hook (`useSanctuaryApi.ts`). | 1 |
| `auth/` | Auth flow (AuthProvider, AuthScreen), Sanctuary first-party auth client, session store. | 5 |
| `components/dev/` | Dev harness (FoliateTestHarness). | 1 |
| `components/library/` | Library grid, book card, metadata modal, catalog browser, batch actions, empty state. | 11 |
| `components/home/` | Landing-page parts (BookPageSpecimen, ContinueReadingCard). | 2 |
| `components/pages/` | Page shells (HomeView, LibraryGrid, ReaderView, SettingsView, StatsView). | 5 |
| `components/reader/` | Reader overlays, controls, panels, header/footer, session timer, readability modal, TTS/autoScroll UIs. | 31 |
| `components/settings/` | Settings form components (typography, theme, goal). | 2 |
| `components/stats/` | Stats charts, heatmap, streak, goals display. | 6 |
| `components/ui/` | Navigation, header, modals, buttons, cards, toast — all 17 shared UI primitives. | 17 |
| `components/vocabulary/` | Vocabulary list and word card UI. | 1 |
| `config/` | Constants (mime types, keyboard maps, feature flags). | 3 |
| `hooks/` | Reader lifecycle (useReaderEngine, useReaderSearch, useReaderAnnotations), auth (useSanctuaryAuth), theme, progress sync, reading session. | 16 |
| `platform/` | Runtime detection (`appRuntime`: platform, canUseNativeFilePicker, canUseNativeMenus, hasRemoteApi), native file dialog, native book event listeners. | 2 |
| `reader/engine/` | Core reader session (FoliateReaderSession, ReaderThemeController), spine-weight progress estimator, PBKDF2 password derivation. | 6 |
| `reader/formats/` | Multi-format parser registry (EPUB, FB2, MOBI, TXT, HTML, Markdown, PDF), format detector. | 8 |
| `reader/contracts/` | TypeScript interfaces: BookDocument, DocumentRendition, ReaderSession, ReaderEngine, Progress, Locator. | 5 |
| `reader/foliate/` | Foliate-js integration: FoliateDocumentAdapter (format → document), FoliateRendition (DOM adapter), TTS/Media Session/CSP, tests. | 14 |
| `reader/persistence/` | IndexedDB content storage (saveBookContent, verifyBookContent), annotation/reading-time repositories. | 3 |
| `services/` | LibraryService, BookService, SyncQueue, OPDS proxy, annotation/settings/stats sync, dictionary, search index, font loader. | 24 |
| `store/` | Zustand stores: books, reader progress, settings (typography/theme/goals), ambient sound, catalog, stats, session mode (guest/authenticated), UI view. | 10 |
| `types/` | Domain types: Book, Bookmark, LibraryItem, ReaderSettings, View enum. | 6 |
| `utils/` | Pure engines (auto-scroll, bionic reading, readability, focus sprint, RSVP, streak, reading activity, badge logic), helpers (epub metadata, footnotes, crypto, DOM), db wrapper. | 39 |

**Total:** 225 TypeScript/TSX files. **Tests:** 45 co-located `*.test.ts` files.

## Reader Architecture

### The Book-Opening Flow

1. **LibraryService** (`services/LibraryService.ts`) — entry point.
   - `loadBooks(api, isPersistent)` hydrates the Zustand book store from IndexedDB (guest) or API + IndexedDB merge (authenticated).
   - Each Book record holds metadata (title, author, progress) and a reference to its EPUB blob in IndexedDB.

2. **User clicks a book** → `LibraryGrid` calls `onSelectBook(book)` → `startSession(book)` in `useReadingSession` hook.
   - Sets `useReaderProgressStore.active = { bookId, cfi }` (remembered position or first chapter).
   - Transitions `useUIStore.view` to `View.READER`, causing React to mount `ReaderView`.

3. **ReaderView** mounts and calls `getBookContent(bookId)` → `LibraryService.getBookContent()`.
   - Retrieves the EPUB blob from IndexedDB (`getVerifiedBookContent`).
   - Passes the blob to `ReaderEngineHost` (the reader component).

4. **Format Detection & Adaptation** (`reader/formats/FormatDetector.ts`).
   - Analyzes magic bytes (ZIP for EPUB, `BOOKMOBI` for MOBI, `<fictionbook` for FB2, etc.).
   - Returns format hint (e.g., `"epub"`, `"pdf"`, `"txt"`).

5. **FoliateDocumentAdapter** (`reader/foliate/FoliateDocumentAdapter.ts`) — unifies all formats.
   - `FoliateDocumentAdapter.create(blob, formatHint)` dispatches to the right parser:
     - EPUB: uses foliate-js's `new Epub(blob)` under the hood.
     - FB2/MOBI/AZW: foliate-js has built-in parsers.
     - TXT/Markdown/HTML: custom parsers (`TxtParser`, `MarkdownParser`, `HtmlParser`).
     - PDF: `PdfParser` (placeholder, not yet integrated).
   - Returns a `BookDocument` (metadata, sections, TOC, metadata).
   - **CSP injection** (`contentSecurity.ts`): script-blocking Content-Security-Policy for iframes in foliate's DOM.

6. **FoliateReaderSession** (`reader/engine/FoliateReaderSession.ts`) — lifecycle manager.
   - Wraps the adapter and creates `FoliateRendition`.
   - Calls `setupShims()` to provide the legacy epub.js facade (below).
   - Calls `setupListeners()` to wire reader events (e.g., `onTocReady`, `onStatusChange`, `onRelocated`).
   - Calls `displayWithFallbacks(initialCfi)` to render the initial location.

7. **FoliateRendition** (`reader/foliate/FoliateRendition.ts`) — DOM renderer.
   - Mounts foliate-view (a web component) into the container.
   - Manages pagination/continuous scroll, theme application, TTS, search, annotations.
   - Emits `relocated` events (CFI, progress, chapter title) → fed to progress tracking.
   - Instantiates `SpineWeightProgressEstimator` for accurate page counts.

### Legacy epub.js Facade

**The layer:** `utils/epub.ts` (types) + `FoliateReaderSession.setupShims()` (implementation).

**Why it exists:** Early code expected epub.js APIs (`.rendition.display()`, `.annotations.highlight()`, `.spine.each()`). Rather than refactor everywhere, the FoliateReaderSession exposes `public rendition: any` and `public epubBook: any` with just enough shim methods to keep those hooks working.

**Consumers (load-bearing):**
- `useReaderEngine` — calls `rendition.display(target)` and listens to `book` events.
- `useReaderAnnotations` — calls `rendition.annotations.highlight/underline/remove()`.
- `useReaderSearch` — calls `spine.each(section => section.find(query))`.
- `ReaderEngineHost` — a small wrapper that initializes the session and passes the shims to the hooks.

**Gotcha:** Do not remove the shims or the epub.js types without refactoring all three hooks + ReaderEngineHost. It is a planned refactor, not a cleanup.

## State Management

### Zustand Stores (`store/`)

| Store | Purpose |
|-------|---------|
| `useBookStore` | Library: book list, loading state. Synced from API/IndexedDB. |
| `useReaderProgressStore` | Currently open book + CFI position. Persisted to localStorage. |
| `useSessionStore` | Auth session: mode ("guest" \| "authenticated"), userId. |
| `useUIStore` | View enum (HOME \| LIBRARY \| READER \| SETTINGS \| STATS; HOME is the default), catalog browser open state, search term, theme. |
| `useSettingsStore` | Reader preferences: typography (font size, line height, margins), theme (light/dark/sepia), TTS, goals, accessibility. ~40 optional fields. |
| `useStatsStore` | Cached stats: streak, heatmap, daily goals. |
| `useCatalogStore` | Catalog browser state (selected feed, books, pagination). |
| `useReaderProgressStore` | (separate key) Active book session; cleared on reader close. |

All stores use Zustand's simple `create()` pattern with atomic setters. `useSettingsStore` is the largest (~24 KB) due to rich reader preference schema.

### IndexedDB (`utils/db.ts`)

- Stores book blobs (EPUB/MOBI/FB2 bytes), covers, metadata.
- Functions: `getAllBooks()`, `putBook()`, `deleteBook()`, `deleteBookContent()`, `getBookContent()`.
- Each book record includes `epubBlob` (the file bytes) and `coverBlob` (optional cover art).
- Verified by hash on load (`getVerifiedBookContent`); missing/corrupted books marked `contentStatus: "invalid"`.

### Sync & API (`SyncQueue`)

**SyncQueue** (`services/SyncQueue.ts`):
- Coalesces local writes (e.g., progress updates, bookmarks, settings changes) before syncing to the API.
- Each write is queued with a timestamp; multiple writes to the same key are merged.
- Fires after `SCHEDULE_DEBOUNCE_MS` (500ms) or immediately if `SYNC_TIMING.FLUSH` is called.
- Implements exponential backoff on network error; persistent queue survives page reload.

**Guest mode:**
- SyncQueue is initialized but every flush is a no-op — changes only persist locally (IndexedDB + localStorage).
- `MigrationDialog` offers to upload the local library after sign-in.

**Authenticated mode:**
- SyncQueue actually calls `api.patchLibraryItem()`, `api.saveSession()`, etc.
- Conflicts are resolved last-write-wins (the server timestamp on next GET).

## Auth on the Client

### Flow

1. **App.tsx** checks `useSanctuaryAuth()` to detect sign-in state.
   - `isLoaded`, `isSignedIn`, `user` (id, email, imageUrl), `signIn()`, `signOut()`, `getToken()`.

2. **AuthScreen** (if not signed in and not guest mode):
   - Form for email + password → calls `authApi.signup()` or `authApi.login()`.
   - Backend returns `{ token, user }` → stored in secure storage (browser's secure context, not localStorage).
   - Token is read on every API call via `useSanctuaryApi()`.

3. **SanctuaryAuthProvider** (`auth/SanctuaryAuthProvider.tsx`):
   - Wraps the app; hydrates auth state from secure storage on mount.
   - Exposes `useSanctuaryAuth()` hook.

4. **useSanctuaryAuth** (`auth/useSanctuaryAuth.ts`):
   - Provides `signIn`, `signOut`, `getToken` helpers.
   - `getToken()` reads the stored Bearer token; called by `useSanctuaryApi` to inject `Authorization: Bearer` headers.

5. **MigrationDialog** (`components/ui/MigrationDialog.tsx`):
   - Appears after successful sign-in in a guest session.
   - Offers to upload all locally-stored books to the server.
   - Uses LibraryService to sync each book's metadata + blob.

6. **Guest Mode is the default** (`App.tsx`):
   - Every visit starts in the local guest library; an account is optional.
   - `AuthScreen` renders only after the header's Sign In (`isAuthScreenOpen`); "Not now" returns to the library. Signing out returns to guest mode, not the auth screen.
   - `VITE_DISABLE_AUTH=true` hides sign-in entirely. So does `appRuntime.hasRemoteApi === false` (desktop build without `VITE_API_BASE_URL`).
   - All reads/writes stay local. No token is needed.

## Desktop Hooks & Native Integration

### Runtime Detection (`platform/runtime.ts`)

- `appRuntime.platform === "desktop"` / `canUseNativeFilePicker` — true when running in Tauri (detected via `window.__TAURI_INTERNALS__`).
- `appRuntime.hasRemoteApi` — false on desktop builds without `VITE_API_BASE_URL`; hides sign-in and catalogs.

### File Dialog (`platform/nativeFiles.ts`)

- `openFileDialog()` — Tauri's file picker (open/save dialogs).
- Called by the "Add Book" button to pick local EPUB files.

### Book Events (`hooks/useNativeBookEvents.ts`)

- Mounted once in `App.tsx`.
- Listens to:
  1. **File ▸ Add Book menu** — triggered by user via Tauri menu.
  2. **Launch files** — books passed as arguments when the app starts.
  3. **Open-while-running** — files dropped on the window or opened from file manager (single-instance plugin).
- All files are passed to `handleAddBook()` (LibraryService) → stored in IndexedDB.

### File Permissions (`src-tauri/capabilities/default.json`)

- `fs` scope is **empty** by default (no blanket filesystem access).
- Only dialog-picked paths and launch-path files (via `allow_file` in `main.rs`) are readable.
- **Keep it that way** — never grant broad `fs:scope` to avoid security issues.

## Navigation

**No router library.** Navigation is a single Zustand enum: `useUIStore.view`.

```tsx
const { view, setView } = useUIStore();
// view === View.HOME | View.LIBRARY | View.READER | View.SETTINGS | View.STATS
setView(View.READER);  // switches the main content pane
```

- **ReaderView** (the book) is rendered conditionally when `view === View.READER && selectedBookId !== null`.
- Other pages (Library, Settings, Stats) are rendered in a shell with header + navigation tabs.
- The reader has no URL of its own — session is restored from localStorage after a page reload.

## Styling Rules

**See `DESIGN_TOKENS.md` for the complete system.** Summary:

- **Semantic tokens only:** `text-fg`, `bg-surface`, `border-line`, `text-accent`. Never write `light-*/dark-*` pairs.
- **Type scale:** `text-xs` to `text-4xl` (named). No `text-[11px]` arbitrary values.
- **Spacing:** `p-ds-1` through `p-ds-8` for spec-compliant design-system spacing (not Tailwind's default rem scale).
- **Fonts:** Instrument Sans (UI), Newsreader (display/headings), Crimson Pro (reader-content only), JetBrains Mono (code).
- **No italics anywhere:** `index.css` sets `font-style: normal !important` on every element and `FoliateRendition.injectStylesToDocument` does the same inside book frames. The Crimson Pro italic face is not loaded.
- **Color tokens:** Light/dark pairs are CSS custom properties (RGB channels) so opacity modifiers work: `bg-accent/50`.
- **Motion:** `duration-instant` (150ms) for micro-interactions, `duration-fast` (250ms) for overlays. No longer animations on interactive feedback.

## Testing

**Framework:** `bun:test` (Bun's native test runner).

**Pattern:** Tests are co-located as `*.test.ts` next to the module.

**Environment:** jsdom (`src/reader/foliate/testEnv.ts`).

**Test data:**
- `services/__fixtures__/` holds OPDS feed samples (gutenberg-*.xml).
- `mobydick.epub` in the repo root is used by reader tests.

**Commands:**
- `bun run test` (from repo root, runs `apps/web` suite only).
- `bun test apps/web/src/path/to/module.test.ts` (single file).
- `bun run check` — TypeScript strict check on `apps/web/tsconfig.json` only.
- `bun run lint` — ESLint across the repo.

**Coverage:** Reader engines are heavily tested; utilities are deliberately pure and tested. UI components have light testing (snapshot + interaction). Most logic lives in `utils/*Engine.ts` files.

## Imports

**Convention:** `@/` alias within the app (defined in `tsconfig.json`).

```tsx
// ✓ Right: use @ alias for same-app imports
import { LibraryService } from "@/services/LibraryService";

// ✓ Also OK: relative if crossing many levels
import { bookService } from "../../../services/bookService";

// ✗ Wrong: don't mix — pick one per file
import { X } from "@/folder/X";
import { Y } from "../sibling/Y";
```

Actual code is split:
- `reader/*` files use relative imports (internal DAG, low coupling).
- `services/*`, `store/*`, `hooks/*` use `@/` alias (central hubs).
- `components/*` mostly use `@/` (cleaner for deep nesting).

## Gotchas

1. **BookContent hash mismatch** — `getVerifiedBookContent` compares the stored blob's SHA-256 to the saved hash. If the hash was computed differently (rare), the book is marked invalid. Check `calculatedHash === storedHash` if you refactor the crypto layer.

2. **Cover blob leaks** — `libraryService` tracks cover ObjectURLs in a Map and revokes them when books are deleted. If you add a new cover-creation path, call `setTrackedCoverUrl(bookId, url)` to register it.

3. **SyncQueue timing** — The queue coalesces writes but respects `SYNC_TIMING` constants from `@sanctuary/core`. Changing those in one place requires updating both apps/web and apps/mobile.

4. **Foliate view not found** — If foliate-js doesn't import `view.js`, the `foliate-view` web component won't be registered and FoliateRendition will fail silently. Check the Vite config and the foliate-js import order in `FoliateRendition`.

5. **Reader shims are fragile** — The epub.js facade (`FoliateReaderSession.setupShims()`) creates minimal mock objects. If you call an undefined method on `rendition` or `epubBook`, it will throw. The shims document exactly which methods are supported.

6. **Desktop mode requires Tauri** — `appRuntime` checks for `window.__TAURI_INTERNALS__`. In a web-only build, this is false and native file features are no-ops.

7. **CSP blocks external scripts** — Book documents get a script-blocking CSP via foliate's iframe sandbox. If a book contains an external `<script src="...">`, it will be blocked. This is intentional (security).

8. **Guest mode persists locally only** — All writes go to IndexedDB/localStorage. The SyncQueue still exists but is a no-op. If you add a new store/cache, remember to check `isPersistent` before syncing.
