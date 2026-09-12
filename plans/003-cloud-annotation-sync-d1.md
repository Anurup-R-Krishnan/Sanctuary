# Plan 003: Zero-Conflict Reading State & Cloudflare D1 Annotation Sync

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 553e7f6..HEAD -- functions/api/library.ts functions/utils/schemaBootstrap.ts functions/utils/schemaCache.ts apps/web/src/reader/persistence/annotationRepository.ts apps/web/src/services/SyncQueue.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: architecture
- **Planned at**: commit `553e7f6`, 2026-09-12

## Why this matters

Currently, reader annotations (highlights and notes) are strictly local to each device's IndexedDB (`apps/web/src/reader/persistence/annotationRepository.ts`). If a user reads on their laptop, adds detailed chapter notes, and then opens Sanctuary on their phone or desktop, all annotations are missing. Furthermore, reading progress sync in `functions/api/library.ts` uses an unconstrained last-write-wins SQL UPDATE: if an offline device reconnects with a stale reading position, it blindly overwrites the user's farther progress. Introducing a Cloudflare D1 `annotations` table with automated sync alongside monotonic progress resolution eliminates data loss and delivers real-time cross-device continuity.

## Current state

The relevant files:
- `functions/utils/schemaBootstrap.ts`: Bootstraps `user_settings`, `reading_sessions`, and `books` tables in D1. Has no `annotations` table.
- `functions/api/library.ts:206-210`: Executes blind `UPDATE books SET ${assignments} WHERE id = ? AND user_id = ?`.
- `apps/web/src/reader/persistence/annotationRepository.ts`: Only calls `putAnnotation` and `deleteAnnotation` in local IndexedDB. Zero cloud network calls.
- `apps/web/src/services/SyncQueue.ts`: Handles offline queues for `SAVE_SESSION`, `SAVE_SETTINGS`, `PATCH_LIBRARY`, `DELETE_LIBRARY`. Does not know about annotations.
- `packages/core/src/index.ts`: `SanctuaryApiClient` defines client API methods, needing `getAnnotations`, `saveAnnotation`, `deleteAnnotation`.

Repo conventions to follow:
- Cloudflare Pages Functions live in `functions/api/` and use Zod for payload validation, `requireUser(request, env)` for authentication, and `json()`/`errorJson()` for response formatting.
- D1 schema initialization uses idempotent `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ADD COLUMN` queries cached via `getSchemaReady(db)` (see `functions/utils/schemaBootstrap.ts`).
- Monotonic progress checks compare candidate progress against current database row before applying backwards regressions.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `bun run check`          | exit 0, no errors   |
| Tests     | `bun test`               | all pass            |
| Lint      | `bun run lint`           | exit 0              |
| Functions | `bunx eslint functions/` | exit 0              |
| Build     | `bun run build`          | exit 0, < 500 kB    |

## Scope

**In scope** (the only files you should modify or create):
- `functions/utils/schemaBootstrap.ts` (add `ensureAnnotationsSchema`)
- `functions/utils/schemaCache.ts` (include in bootstrap array)
- `functions/api/annotations.ts` (create GET, POST, DELETE handlers)
- `functions/api/library.ts` (monotonic progress check)
- `packages/core/src/index.ts` (add annotations methods to `SanctuaryApiClient`)
- `apps/web/src/reader/persistence/annotationRepository.ts` (wire cloud sync on mutate)
- `apps/web/src/services/SyncQueue.ts` (add annotation mutation types)
- `apps/web/src/services/annotationSync.test.ts` (create test suite)

**Out of scope** (do NOT touch):
- `apps/desktop/src-tauri/*`
- `apps/desktop/build-appimage.sh`
- `apps/mobile/*`
- `functions/api/content/*`

## Git workflow

- Branch: `advisor/003-cloud-annotation-sync-d1`
- Commit message style: Conventional Commits, e.g. `feat(sync): cloudflare d1 annotation sync and monotonic progress resolution`

## Steps

### Step 1: Add `annotations` table schema bootstrap in D1
In `functions/utils/schemaBootstrap.ts`:
1. Add `export async function ensureAnnotationsSchema(db: D1Database): Promise<void>`:
   ```sql
   CREATE TABLE IF NOT EXISTS annotations (
     id TEXT PRIMARY KEY,
     user_id TEXT NOT NULL,
     book_id TEXT NOT NULL,
     cfi TEXT NOT NULL,
     text TEXT NOT NULL,
     note TEXT,
     color TEXT NOT NULL DEFAULT '#facc15',
     type TEXT NOT NULL DEFAULT 'highlight',
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL,
     deleted INTEGER NOT NULL DEFAULT 0
   );
   CREATE INDEX IF NOT EXISTS idx_annotations_user_book ON annotations(user_id, book_id, updated_at DESC);
   ```
2. In `functions/utils/schemaCache.ts`, add `ensureAnnotationsSchema(db)` to `Promise.all` inside `getSchemaReady`.

**Verify**: `bun run check` && `bunx eslint functions/` → exit 0

### Step 2: Implement `functions/api/annotations.ts` endpoint
Create `functions/api/annotations.ts`:
1. `onRequestGet`:
   - Requires user authentication via `requireUser`.
   - Query param `bookId`: returns all non-deleted annotations for this book (`WHERE user_id = ? AND book_id = ? AND deleted = 0`).
2. `onRequestPost`:
   - Validates schema using Zod: `{ id, bookId, cfi, text, note?, color?, type?, createdAt?, updatedAt? }`.
   - Performs `INSERT INTO annotations (...) VALUES (...) ON CONFLICT(id) DO UPDATE SET text = excluded.text, note = excluded.note, color = excluded.color, updated_at = excluded.updated_at, deleted = 0`.
3. `onRequestDelete`:
   - Query param `id`: soft-deletes (`UPDATE annotations SET deleted = 1, updated_at = ? WHERE id = ? AND user_id = ?`) or hard-deletes.

**Verify**: `bunx eslint functions/` → exit 0

### Step 3: Implement Monotonic Progress Resolver in `functions/api/library.ts`
In `functions/api/library.ts`:
1. When patching `progress` and `lastLocation`:
   - Fetch the existing record `SELECT progress, updated_at FROM books WHERE id = ? AND user_id = ?`.
   - If candidate `progress < existing.progress` and `body.force !== true`, skip overwriting `progress` and `lastLocation` (or return 200 with `{ status: "stale_ignored", currentProgress: existing.progress }`).
   - This guarantees that an older offline reading session cannot regress a reader's forward progress across devices.

**Verify**: `bunx eslint functions/` → exit 0

### Step 4: Add Annotation RPC methods in `packages/core`
In `packages/core/src/index.ts`:
1. Extend `SanctuaryApiClient` with:
   - `getAnnotations(bookId: string): Promise<ReaderAnnotation[]>`
   - `saveAnnotation(annotation: ReaderAnnotation): Promise<void>`
   - `deleteAnnotation(id: string): Promise<void>`

**Verify**: `bun run check` → exit 0

### Step 5: Wire `SyncQueue.ts` and `annotationRepository.ts`
In `apps/web/src/services/SyncQueue.ts`:
- Support `SAVE_ANNOTATION` and `DELETE_ANNOTATION` mutations with retry and backoff.

In `apps/web/src/reader/persistence/annotationRepository.ts`:
- On `saveAnnotation(annotation)`: write to IndexedDB and enqueue to `syncQueue.enqueue("SAVE_ANNOTATION", annotation)`.
- On `removeAnnotation(id)`: delete from IndexedDB and enqueue to `syncQueue.enqueue("DELETE_ANNOTATION", { id })`.
- On `getAnnotations(bookId)`: read local IndexedDB; if empty or stale, merge remote annotations from `api.getAnnotations(bookId)`.

**Verify**: `bun run check` && `bun run lint` → exit 0

### Step 6: Add integration tests in `annotationSync.test.ts`
Create `apps/web/src/services/annotationSync.test.ts`:
1. Test monotonic progress check: rejects backward progress unless explicitly forced.
2. Test annotation merge algorithm: resolves conflict by latest `updatedAt`.
3. Test offline mutation queueing and replay.

**Verify**: `bun test apps/web/src/services/annotationSync.test.ts` → all pass

## Test plan

- Test saving a highlight and note locally in IndexedDB and confirming sync mutation enqueues.
- Test reading annotations for a book hydrates both local and remote records.
- Test backward progress update is ignored while forward progress is accepted.
- Test deletion marks annotation as deleted without corrupting other book annotations.

## Done criteria

- [ ] `bun run check` exits 0.
- [ ] `bun test` exits 0 with all sync tests passing.
- [ ] `bun run lint` exits 0.
- [ ] `bunx eslint functions/` exits 0.
- [ ] `bun run build` succeeds under 500 kB chunk threshold.
- [ ] Highlights and notes sync across devices via Cloudflare D1.
- [ ] `plans/README.md` status row updated to DONE.

## STOP conditions

- If D1 table schema migration causes SQLite lock conflicts or migration errors during Pages dev, stop and report.

## Maintenance notes

- Future versions can add conflict-free replicated data types (CRDTs) or vector clocks if multi-user shared annotations are introduced.
