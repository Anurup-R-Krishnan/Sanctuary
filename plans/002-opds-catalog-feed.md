# Plan 002: OPDS 1.2 & 2.0 Catalog Feed Support

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 553e7f6..HEAD -- apps/web/src/components/pages/LibraryGrid.tsx apps/web/src/components/library/LibraryToolbar.tsx apps/web/src/services/LibraryService.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `553e7f6`, 2026-09-12

## Why this matters

Currently, users must manually locate, download, and drag-and-drop ebook files into Sanctuary. OPDS (Open Publication Distribution System) is the universal open standard used by public digital libraries (Standard Ebooks, Project Gutenberg) and personal media servers (Calibre Content Server, Kavita, Komga). By adding native OPDS 1.2 (Atom XML) and OPDS 2.0 (JSON) feed ingestion, Sanctuary users can browse catalogs directly within the app, search public-domain libraries, read metadata and summaries, and download books with 1-click import directly into their Sanctuary library.

## Current state

The relevant files:
- `apps/web/src/components/pages/LibraryGrid.tsx`: Main library interface. Accepts `addBook: (file: File) => Promise<void>`.
- `apps/web/src/components/library/LibraryToolbar.tsx`: Contains view toggles, filter, and sort controls.
- `apps/web/src/services/LibraryService.ts`: Exports `libraryService.addBook(file: File, api: SanctuaryApiClient, isPersistent: boolean)` (lines 379–450).
- No OPDS parser, store, or catalog browsing UI exists in the repository today.

Repo conventions to follow:
- Service modules live in `apps/web/src/services/` and expose pure functions or singleton service objects.
- Store modules use Zustand with `useShallow` selectors (see `apps/web/src/store/useBookStore.ts`).
- Modals use the dialog pattern with accessible headings, backdrop dismissal, and keyboard escape support (see `apps/web/src/components/reader/ReaderNoteDialog.tsx`).
- XML parsing uses the browser's built-in `DOMParser`, avoiding heavyweight external XML dependencies to preserve the < 500 kB bundle budget.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `bun run check`          | exit 0, no errors   |
| Tests     | `bun test`               | all pass            |
| Lint      | `bun run lint`           | exit 0              |
| Build     | `bun run build`          | exit 0, < 500 kB    |

## Scope

**In scope** (the only files you should modify or create):
- `apps/web/src/types/opds.ts` (create)
- `apps/web/src/services/opdsService.ts` (create)
- `apps/web/src/services/opdsService.test.ts` (create)
- `apps/web/src/store/useCatalogStore.ts` (create)
- `apps/web/src/components/library/CatalogBrowser.tsx` (create)
- `apps/web/src/components/library/CatalogBookCard.tsx` (create)
- `apps/web/src/components/library/LibraryToolbar.tsx` (add "Catalogs" button)
- `apps/web/src/components/pages/LibraryGrid.tsx` (render `CatalogBrowser` modal/drawer)

**Out of scope** (do NOT touch):
- `apps/desktop/src-tauri/*`
- `apps/desktop/build-appimage.sh`
- `apps/mobile/*`
- `functions/*`

## Git workflow

- Branch: `advisor/002-opds-catalog-feed`
- Commit message style: Conventional Commits, e.g. `feat(library): opds 1.2/2.0 catalog browser and direct 1-click import`

## Steps

### Step 1: Define OPDS TypeScript interfaces
Create `apps/web/src/types/opds.ts`:
```typescript
export interface OpdsFeed {
  title: string;
  id?: string;
  icon?: string;
  updated?: string;
  entries: OpdsEntry[];
  navigationLinks: OpdsLink[];
  searchLink?: string;
}

export interface OpdsLink {
  rel: string;
  href: string;
  type?: string;
  title?: string;
}

export interface OpdsEntry {
  id: string;
  title: string;
  author?: string;
  summary?: string;
  published?: string;
  coverUrl?: string;
  thumbnailUrl?: string;
  acquisitionUrl?: string;
  format?: string;
}

export interface CatalogSource {
  id: string;
  name: string;
  url: string;
  isDefault?: boolean;
}
```

**Verify**: `bun run check` → exit 0

### Step 2: Implement `opdsService.ts` with XML & JSON parsers
Create `apps/web/src/services/opdsService.ts`:
1. `parseOpdsFeed(rawText: string, baseUrl: string): OpdsFeed`:
   - Detects JSON (OPDS 2.0) if string starts with `{`.
   - Parses XML (OPDS 1.2) using `new DOMParser().parseFromString(rawText, "application/xml")`.
   - Resolves relative URLs against `baseUrl`.
   - Extracts acquisition links matching `application/epub+zip` or standard ebook MIME types.
2. `fetchCatalogFeed(url: string): Promise<OpdsFeed>`:
   - Fetches feed with CORS headers; handles network errors gracefully with clear error messages.
3. `downloadCatalogBook(acquisitionUrl: string, fallbackTitle: string): Promise<File>`:
   - Fetches the EPUB blob from the acquisition URL.
   - Infers filename from `Content-Disposition` header or generates `${slugify(fallbackTitle)}.epub`.
   - Returns a valid `File` instance ready for `libraryService.addBook`.

**Verify**: `bun run check` → exit 0

### Step 3: Create `useCatalogStore.ts` with default public catalogs
Create `apps/web/src/store/useCatalogStore.ts`:
1. Stores list of `CatalogSource`:
   - Preconfigured defaults:
     - Standard Ebooks: `https://standardebooks.org/opds/all`
     - Project Gutenberg: `https://m.gutenberg.org/ebooks.opds/`
2. Persists custom user-added catalogs in `localStorage` under key `sanctuary_catalogs`.
3. Actions: `addCatalog(name, url)`, `removeCatalog(id)`, `setActiveCatalog(id)`.

**Verify**: `bun run check` → exit 0

### Step 4: Build `CatalogBrowser.tsx` and `CatalogBookCard.tsx`
Create `apps/web/src/components/library/CatalogBookCard.tsx`:
- Displays book cover (with fallback), title, author, and description/summary snippet.
- Action button: "Download & Import" with loading spinner and disabled state when in flight.

Create `apps/web/src/components/library/CatalogBrowser.tsx`:
- Full-screen or large responsive modal dialog.
- Top bar with catalog switcher dropdown, "Add Catalog" button, and search input (if catalog provides an OpenSearch link).
- Grid of `CatalogBookCard` items.
- Calls `addBook(file)` upon download completion, triggering a success toast notification and refreshing the library.

**Verify**: `bun run check` && `bun run lint` → exit 0

### Step 5: Wire "Catalogs" button into `LibraryToolbar.tsx` and `LibraryGrid.tsx`
In `LibraryToolbar.tsx`:
- Add a "Catalogs" button (with `Globe` or `BookOpen` icon) next to the existing action buttons.

In `LibraryGrid.tsx`:
- Wire state `isCatalogOpen` to render `<CatalogBrowser isOpen={isCatalogOpen} onClose={() => setIsCatalogOpen(false)} onImport={addBook} />`.

**Verify**: `bun run check` && `bun run lint` → exit 0

### Step 6: Write unit tests in `opdsService.test.ts`
Create `apps/web/src/services/opdsService.test.ts`:
1. Test OPDS 1.2 Atom XML parsing with sample XML fixture (title, author, acquisition links, image links).
2. Test OPDS 2.0 JSON parsing with sample JSON fixture.
3. Test relative URL resolution against catalog base URL.
4. Test download conversion to `File` object.

**Verify**: `bun test apps/web/src/services/opdsService.test.ts` → all pass

## Test plan

- Test Atom XML feed parsing with entries containing multiple link `rel` types.
- Test JSON OPDS 2.0 feed parsing.
- Test adding and persisting a new custom catalog URL in `useCatalogStore`.
- Test downloading an acquisition link and importing it via `addBook`.
- Verify error handling when a catalog URL is unreachable or returns invalid XML.

## Done criteria

- [ ] `bun run check` exits 0 with 0 errors.
- [ ] `bun test` exits 0; all OPDS tests pass.
- [ ] `bun run lint` exits 0.
- [ ] `bun run build` succeeds under 500 kB chunk threshold.
- [ ] Users can browse Standard Ebooks and Gutenberg feeds and 1-click import EPUBs.
- [ ] `plans/README.md` status row updated to DONE.

## STOP conditions

- If CORS blocks direct client-side fetching from major public OPDS feeds (e.g. Gutenberg), report immediately; a lightweight proxy function in `functions/api/opds-proxy.ts` may be scoped if required.

## Maintenance notes

- Future enhancements may add OPDS search template substitution (`template="{searchTerms}"`) for server-side catalog searching.
