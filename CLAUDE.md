# Sanctuary Book Reader — Root Guide

Offline-first, cross-platform EPUB/book reader monorepo. Primary product is the
web app (React + Vite + Cloudflare Pages), also shipped as a Linux desktop app
(Tauri wrapping the same web build). Cloudflare Pages serves both the SPA and
the API/D1/R2 backend.

**Bun only — never `npm` / `npx`** in scripts, configs, hooks, docs or commands
(`bun run`, `bun add`, `bunx`).

## Monorepo layout

| Path | What it is | Read next |
|---|---|---|
| `apps/web/` | The real product. React 19 + Vite + Tailwind SPA, plus the Foliate reading engine, Zustand stores, and all services. `apps/web/src-tauri/` is the desktop shell. | `apps/web/CLAUDE.md` |
| `apps/mobile/` | Expo/React Native shell (Android + web). Thin client over the shared API. | `apps/mobile/CLAUDE.md` |
| `packages/core/` | Shared types + `SanctuaryApiClient` (the API contract every client speaks). | `packages/CLAUDE.md` |
| `packages/ui/` | Design tokens shared by web and mobile. | `packages/CLAUDE.md` |
| `packages/reader-webview/` | Reader bridge protocol + injected JS bootstrap for the native WebView. | `packages/CLAUDE.md` |
| `functions/` | Cloudflare Pages Functions: the `/api/*` edge backend (D1 + R2 + first-party auth). | `functions/CLAUDE.md` |

Bun workspaces are `apps/*` and `packages/*`. `functions/` is **not** a
workspace — it is deployed by Wrangler directly and has its own `tsconfig.json`.

## Commands

Run from the repo root.

- `bun install` — install deps.
- `bun run dev` — guest-mode Vite (5173) + Wrangler Pages dev (8788) together.
- `bun run dev:strict` — same but with auth enforced (sign-up/login against local D1).
- `bun run desktop:dev` / `desktop:build` — Tauri desktop app (dev window on 5173 / AppImage). `apps/web/build-appimage.sh` packs and installs the AppImage.
- `bun run web:build` — production web build → `apps/web/dist`.
- `bun run check` — `tsc --noEmit` on `apps/web/tsconfig.json` only.
- `bun run lint` — ESLint across the whole repo.
- `bun run test` — the web app's test suite (the only suite that matters in CI).
- `bun test functions` — backend unit tests; `bunx tsc -p functions/tsconfig.json --noEmit` typechecks the backend.
- `bun run test:content` — the book-content repository test only.
- `bun run mobile:dev` / `mobile:android` / `mobile:web` — Expo entry points.
- `podman-compose up -d` — containerized web+backend (recommended for web dev).

Containerized dev is preferred over bare metal for the web app, because it
avoids host native-library mismatches. Bare metal is required for mobile.

## Architecture in one paragraph

`apps/web` is offline-first. Book files live in IndexedDB; the D1 database stores
only metadata (title, author, progress, bookmarks); R2 stores the actual EPUB
bytes and cover art. Every write goes to local storage first, then through a
coalescing `SyncQueue` to the edge. Auth is first-party: email + password on
D1 (PBKDF2), opaque session tokens sent as `Authorization: Bearer` (no cookies)
— see `functions/CLAUDE.md`. Guest mode is a first-class, fully offline path
("Continue as Guest"; the desktop app starts there). With `DISABLE_AUTH=true`
on a local host the backend maps every request to `"guest-user"`.
`MigrationDialog` offers to upload a guest's local books after they sign in. `apps/mobile` reuses `packages/core`'s API client but
has its own small Zustand store, AsyncStorage cache, and sync queues — it does
**not** share web app state.

## Conventions

- **TypeScript strict** everywhere. Do not introduce `any` to silence errors.
- **Props are declared alphabetically** — ESLint (`perfectionist`) enforces this.
  Keep new interfaces sorted or lint fails.
- **Imports** use the `@/*` alias within each app (see each `tsconfig.json`).
- **No router library on web.** Navigation is `useUIStore.view` (a `View` enum:
  `LIBRARY | READER | SETTINGS | STATS`). Mobile *does* use React Navigation.
- **Design tokens, not literals.** Web colours are semantic classes backed by
  CSS variables that swap under `.dark`: `bg-page`, `bg-surface`,
  `bg-surface-raised`, `bg-subtle`, `text-fg`, `text-fg-muted`, `border-line`,
  `border-line-subtle`, `text-accent`… Never write `light-*`/`dark:*-dark-*`
  pairs (legacy, being phased out). Type sizes use the named scale in
  `tailwind.config.js` — no `text-[13px]`. Fonts: Instrument Sans (UI),
  Newsreader (page headings, `font-display`), Crimson Pro (reader only).
  **No italics anywhere except book content in the reader.** Details:
  `apps/web/DESIGN_TOKENS.md`. Mobile uses `packages/ui`'s `tokens`.
- **Plain copy.** No marketing/inspirational text, no invented "insights" —
  UI text states facts derived from real data.
- **Tests are co-located** as `*.test.ts` next to the module and run under
  `bun test`. Most logic lives in `apps/web/src/utils/*Engine.ts` files that are
  deliberately pure and heavily tested.
- **Commit messages follow Conventional Commits** — commitlint runs in the
  `commit-msg` hook, so `feat(reader): ...` style is mandatory.

## Environment variables

Copy `.env.example` to `.env`. See that file for the full list. The two that
matter most:

- `VITE_DISABLE_AUTH` — client-side bypass of the auth screen (dev/containers).
- `DISABLE_AUTH` — server-side bypass (every request → `guest-user`). Only
  honoured for loopback/private-network hosts; keep `"false"` in `wrangler.toml`.
- `VITE_API_BASE_URL` — API origin for builds not served by Pages (desktop,
  mobile). Defaults to the page origin.

## Deployment

`.github/workflows/deploy.yml` runs a `quality-gate` job (`bun run check`,
`bun run --cwd apps/web lint`, `bun run --cwd apps/web test`) on every push and
PR, then deploys `apps/web/dist` to Cloudflare Pages on `main` via
`wrangler-action`. The production build sets `VITE_DISABLE_AUTH: "false"`
(sign-in available; guests still supported). `wrangler.toml` binds D1 (`SANCTUARY_DB`) and R2
(`SANCTUARY_BUCKET`) and sets the Pages output dir to `apps/web/dist`.

Note CI lints and tests only `apps/web` — changes to `apps/mobile` or
`functions/` are not covered by the quality gate.

## Desktop app (Tauri, `apps/web/src-tauri/`)

- Wraps the web build: `beforeDevCommand: bun run dev:guest` (5173),
  `beforeBuildCommand: bun run build`, `frontendDist: ../dist`.
- Starts in guest/offline mode (`appRuntime.isOfflineFirst` in `App.tsx`).
- Native file access: `platform/nativeFiles.ts` (dialog + fs plugins).
  `hooks/useNativeBookEvents.ts` is mounted once in `App.tsx` and handles the
  File ▸ Add Book menu, files passed on launch (pulled via the
  `take_launch_files` command — never pushed at startup, which races React),
  and files opened while running (single-instance plugin → `open-files` event).
- fs scope is empty in `capabilities/default.json`; only dialog-picked paths
  and launch paths (`allow_file` in `main.rs`) are readable. Keep it that way.
- Book documents get a script-blocking CSP (`reader/foliate/contentSecurity.ts`)
  because foliate's iframes are `allow-same-origin allow-scripts`.

Do **not** "clean up" the string `"desktop"` in `packages/core`'s
`ReadingSession.device` union or the zod enum in `functions/api/sessions.ts` —
those are persisted device-type values, and existing D1 rows depend on them.

## Roadmap status (updated 2026-09-28)

Done — tier A (owner priorities): Local pill removed · Clerk deleted, first-party
auth on D1 (security-reviewed, end-to-end tested with wrangler) · Daily Digest
removed · AI/marketing copy and "reading personality" removed · Catalogs fixed
(tested against live Gutenberg feeds; proxy SSRF/XSS hardened) · Insights made
honest, Vocabulary gets an All-words list with delete · daily goal is MINUTES
everywhere (field name `dailyGoal` kept to avoid a migration) · empty library
redesigned, one Add Book entry · new fonts + semantic token architecture, no
italics outside the reader.

Done — tier B: desktop moved into `apps/web/src-tauri`, `apps/desktop` deleted,
dev/build config fixed, native picker + file associations, PWA manifest fixed,
dead code removed (`FoliateEpubAdapter`, `utils/annotationExport`, ghost
lightbox test, `web:tauri`, `test:desktop` → `test:content`).

Open:
- [ ] Existing D1 rows keyed by old Clerk ids are orphaned (see
  `functions/CLAUDE.md` for the reassignment SQL). Decide before prod rollout.
- [ ] Catalogs require sign-in (the proxy needs a user); guests — including the
  desktop default — see "Sign in to browse online catalogs."
- [ ] ~217 `dark:` variants remain: mostly deliberate status hues
  (emerald/amber/red-400) plus a few asymmetric pairs; legacy `light.*`/`dark.*`
  Tailwind colours are still defined. Finish and delete the legacy palette.
- [ ] `index.tsx` still monkey-patches `HTMLIFrameElement.sandbox` (epub.js era).
  Harmless now that book content has a CSP, but remove once verified in the reader.
- [ ] epub.js facade (`utils/epub.ts`, `FoliateReaderSession.setupShims()`;
  consumers `useReaderSearch`, `useReaderAnnotations`, `ReaderEngineHost`) —
  load-bearing ghost layer; planned refactor, not a cleanup.
- [ ] CI covers only `apps/web` — add `bun test functions`,
  `bunx tsc -p functions/tsconfig.json --noEmit` and `cargo check` gates.
