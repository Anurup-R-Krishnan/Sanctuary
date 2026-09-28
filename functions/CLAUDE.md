# functions/ — Cloudflare Pages API Backend

The edge backend, deployed as Cloudflare Pages Functions. File paths map
directly to routes: `functions/api/library.ts` → `/api/library`. Every handler
exports `onRequestGet` / `onRequestPost` / etc. (Cloudflare's Pages Functions
convention) — there is no router.

Runs on Workers with `nodejs_compat` (see `wrangler.toml`), strict TypeScript
(`tsconfig.json` targets ES2022 + `WebWorker` lib + `@cloudflare/workers-types`).
This directory is **not** in the Bun workspace and is **not** covered by the
root `bun run check` or the CI quality gate — type-check it separately if you
touch it.

## Bindings and env

`types.d.ts` declares the `Env` interface:

- `SANCTUARY_DB` — D1 database.
- `SANCTUARY_BUCKET` — R2 bucket (book files + covers).
- `DISABLE_AUTH` — when the string `"true"`, auth is bypassed and every
  request resolves to the single id `"guest-user"`. Only honoured for
  loopback/private-network hosts (see `utils/auth.ts`), so it is inert on a
  deployed hostname — but still keep it `"false"` in `wrangler.toml`.

## Routes

| File | Routes | Purpose |
|---|---|---|
| `api/_shared.ts` | — | Shared helpers (see below). Not a route. |
| `api/health.ts` | `GET /api/health` | Pings D1 (`SELECT 1`) and R2 (`head`); 200 only if both are OK, else 503. Used by the `compose.yaml` backend healthcheck. |
| `api/auth/signup.ts` | `POST /api/auth/signup` | JSON only. Email (trimmed, lowercased, ≤254) + password (10–200 chars). 5 signups / IP / hour. 409 if the email exists (enumeration is bounded by that limit). Returns `{ token, user }`. |
| `api/auth/login.ts` | `POST /api/auth/login` | JSON only. Limits: 30 requests / IP / 15 min; failed passwords only: 10 per email+IP / 15 min (cleared on success) and 200 per email / hour, the latter enforced only against IPs that have themselves failed on that email (so floods from elsewhere never lock the owner out). Unknown email and wrong password both return 401 "Invalid email or password" and cost the same PBKDF2 time. Returns `{ token, user }`. |
| `api/auth/logout.ts` | `POST /api/auth/logout` | Deletes the session row for the Bearer token. |
| `api/auth/me.ts` | `GET /api/auth/me` | Get current user. Returns `{id, email}` or 401 if not authenticated. |
| `api/library.ts` | `GET`/`POST`/`PATCH`/`DELETE` | Book metadata CRUD. `POST` ingests an uploaded file (validates magic bytes, writes to R2, inserts the D1 row). `PATCH` updates title/author/progress/favorite/bookmarks. All input validated with zod (`bookmarkSchema`, `metadataSchema`, `patchSchema`). |
| `api/content/[id].ts` | `GET`/`PUT` `/api/content/:id` | R2 object fetch/upload for a book's bytes, with `?asset=cover` to serve cover art. `GET` sets a filename extension derived from the stored content type; `PUT` replaces the content. |
| `api/sessions.ts` | `GET`/`POST`/`DELETE` | Reading-session log. `POST` validates with zod and defaults `device` to `"web"`. Powers the stats/streak/heatmap screens. |
| `api/annotations.ts` | `GET`/`POST`/`DELETE` | Highlights, underlines, and marginalia notes, keyed by `bookId` + `cfi`. `GET` filters by `?bookId=`. |
| `api/settings.ts` | `GET`/`PUT` | Reader preferences as a single row. `GET` returns a sparse object (nulls stripped) so the client can merge partials; `PUT` writes only the columns present in `SETTINGS_COLUMNS`. Has a catch-all `onRequest` for unsupported verbs. |
| `api/goals.ts` | `GET` | Aggregates sessions into day/week/month goal windows, each with `targetMinutes`, `totalMinutes`, and `progressPercent`. |
| `api/opds-proxy.ts` | `GET /api/opds-proxy?url=` | CORS-bypass proxy for OPDS feeds and book downloads. **No account needed** (catalogs work for guests); limited to 600 requests / IP / hour via `auth_attempts`. Redirects followed by hand with every hop re-checked by `isBlockedHost` (loopback, private, CGNAT, IPv6 ULA/link-local, NAT64); `X-Target-Authorization` dropped on origin change; content-type allowlist; streamed 150 MB cap; `CSP: sandbox` on responses. |

## utils/

- `auth.ts` — `getUserId(request, env)`. Returns `"guest-user"` when
  `DISABLE_AUTH === "true"` **and** the request host is loopback/private-network (`isAuthDisabled`), so a mis-set production var cannot open the API. Otherwise it reads `Authorization: Bearer <token>`, hashes it, and looks up a non-expired `auth_sessions` row. Auth is header-only — there is no session cookie — so cross-site requests carry no credentials and no CSRF check is needed. Do not add a cookie without adding CSRF protection and revisiting the proxy/cover XSS hardening.
- `password.ts` — WebCrypto PBKDF2-SHA256 via `deriveBits`, **100000 iterations (the Workers maximum — higher counts throw)**, 16-byte salt, 32-byte key, format `pbkdf2$<iterations>$<salt>$<hash>` (base64url). Iterations are read from the stored hash and capped on verify. Constant-time compare. Session tokens: 32 random bytes; only the SHA-256 hash is stored; 30-day expiry.
- `authFlow.ts` — zod schemas, `isRateLimited` (one atomic upsert on `auth_attempts`, window resets after it elapses), `createSession` (also purges expired sessions / stale attempt rows), `readJson` (rejects non-`application/json`, blocking form-based login CSRF).
- `dbSchema.ts` — D1 introspection: `hasColumn`, `listColumns`, `getTableInfo`.
  The schema is bootstrapped imperatively at runtime, so these are used to make
  migrations idempotent.
- `schemaBootstrap.ts` — `ensureUsersSchema` / `ensureAuthSessionsSchema` / `ensureAuthAttemptsSchema` / `ensureSettingsSchema` / `ensureSessionsSchema` /
  `ensureAnnotationsSchema` / `ensureBooksSchema`. Each inspects existing columns
  and adds only what is missing (`rebuildBooksTableCanonical` handles the books
  table rebuild). This is why there are no `.sql` migration files.
- `schemaCache.ts` — `getSchemaReady(db)` memoizes the bootstrap per D1
  binding so the checks run once, not on every request.

## Database schema

Auth-related tables (added with first-party auth):
- `users` — `id TEXT PRIMARY KEY`, `email TEXT NOT NULL UNIQUE COLLATE NOCASE`, `password_hash TEXT NOT NULL`, `created_at INTEGER NOT NULL`.
- `auth_sessions` — `id TEXT PRIMARY KEY`, `user_id TEXT NOT NULL`, `token_hash TEXT NOT NULL UNIQUE`, `created_at INTEGER NOT NULL`, `expires_at INTEGER NOT NULL`. Index on `user_id` for fast session lookups.
- `auth_attempts` — `key TEXT PRIMARY KEY`, `count INTEGER NOT NULL`, `window_start INTEGER NOT NULL`. Rate-limiting state per IP and email.


## `api/_shared.ts` conventions

Every route funnels through this module, so read it before adding a handler.

- Response helpers: `json`, `errorJson`, `handleOptions`, plus
  `requireUser` (bootstraps the schema first — the session lookup needs the auth tables — then returns a userId **or** a 401 `Response` — check which you
  got before using it as a string).
- `CORS_HEADERS` and `SECURITY_HEADERS` (`nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy`) are merged into `BASE_HEADERS` and applied automatically by
  `json`. If you construct a `Response` by hand you must add them yourself.
- `BookRow` is the raw D1 shape (snake_case columns); `toLibraryItem` converts it
  to the camelCase `LibraryItem` the client expects, deriving `status` from
  `progress` (`0` → `to-read`, `100` → `finished`, else `reading`).
- R2 keys are always `users/<userId>/books/<bookId>/content.epub` via
  `contentKey`, and `.../cover` via `coverKey`. Both components are
  `encodeURIComponent`'d.
- File sniffing lives here: `isValidEpub` (ZIP magic `PK\x03\x04`) and the broader
  `isValidBookFile`, which also accepts MOBI/AZW (`BOOKMOBI` at byte 60), FB2
  (`<fictionbook`), HTML, and by extension `.txt/.md/.mobi/.azw3/.fb2/.html`.
  `resolveBookContentType` maps a file to a MIME type, defaulting to
  `application/epub+zip`. `MAX_EPUB_BYTES` is 150 MB.
- `withEdgeCache(request, key, fetcher)` / `purgeEdgeCache` wrap the edge Cache
  API and stamp `X-Cache-Status: HIT|MISS`. Use these for read-heavy routes;
  remember to purge on write.
- Normalizers for untrusted input: `parseJsonObject`, `normalizeBookmarks`,
  `clampProgress`, `normalizeTotalPages`, `optionalText`, `requiredText`.
