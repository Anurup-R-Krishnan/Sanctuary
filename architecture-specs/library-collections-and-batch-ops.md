# Architecture Specification: Collections, Custom Shelves & Batch Library Operations

> **Executor instructions**: Execute this specification systematically. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this specification
> in `architecture-specs/README.md`.
>
> **Drift check (run first)**: `git diff --stat 54f0583..HEAD -- apps/web/src/components/pages/LibraryGrid.tsx apps/web/src/store/useBookStore.ts`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Prerequisites**: Cloudflare D1 Reading State Sync
- **Category**: direction
- **Documented at**: commit `54f0583`, 2026-09-12
- **Status**: VERIFIED (commit `0698bc8`, 2026-09-13)

## Why this matters

As users import books from OPDS catalogs, local files, and multi-format archives, library sizes grow from dozens to hundreds of titles. Users need custom collections ("Work", "Fiction", "Research", "Currently Studying") to group books beyond simple favorites, and batch operations to organize, tag, export, or remove multiple books at once.

## Current state

The relevant files:
- `apps/web/src/types/index.ts`: Defines `Book` interface (`tags?: string[]`, `isFavorite?: boolean`).
- `apps/web/src/store/useBookStore.ts`: Manages library books, sorting, and filtering.
- `apps/web/src/components/pages/LibraryGrid.tsx`: Main library interface.
- `apps/web/src/services/LibraryService.ts`: Manages book updates and Cloudflare D1 synchronization.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `bun run check`          | exit 0, no errors   |
| Tests     | `bun test`               | all pass            |
| Lint      | `bun run lint`           | exit 0              |
| Build     | `bun run build`          | exit 0, < 500 kB    |

## Scope

**In scope**:
- `apps/web/src/types/index.ts`: Add `collections?: string[]` to `Book`.
- `apps/web/src/store/useBookStore.ts`: Add collection filtering and grouping.
- `apps/web/src/components/library/BatchActionBar.tsx` (create): Floating multi-select bar with batch actions.
- `apps/web/src/components/pages/LibraryGrid.tsx`: Multi-select toggle and checkbox selection.
- `apps/web/src/components/library/BookMetadataModal.tsx` (create): Modal to edit title, author, collection, and tags.

**Out of scope**:
- `apps/desktop/src-tauri/*`
- `apps/desktop/build-appimage.sh`
- `apps/mobile/*`

## Steps

### Step 1: Extend `Book` Model with `collections`
In `apps/web/src/types/index.ts`:
- Add `collections?: string[]` to `Book`.
- Add `collection` filter option in `FilterOption`.

### Step 2: Build `BatchActionBar.tsx`
Create floating bar that slides in when 1 or more books are selected:
- Actions: "Assign Collection", "Export Annotations", "Mark Finished", "Delete".
- Clear selection button.

### Step 3: Integrate Batch Selection in `LibraryGrid.tsx`
- Add multi-selection mode with select checkboxes on book cards.
- Wire actions to `libraryService` and `useBookStore`.

**Verify**: `bun run check && bun test && bun run lint && bun run build` → exit 0
