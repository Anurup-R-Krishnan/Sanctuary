# Architecture Specification: Annotation Knowledge Export & Markdown Sync

> **Executor instructions**: Execute this specification systematically. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this specification
> in `architecture-specs/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0effadc..HEAD -- apps/web/src/types/index.ts apps/web/src/components/library/BatchActionBar.tsx`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Prerequisites**: Collections, Custom Shelves & Batch Library Operations
- **Category**: Knowledge Management
- **Documented at**: commit `5128ed0`, 2026-09-13
- **Status**: READY

## Why this matters

Active readers, researchers, and students use highlights and margin notes to distill insights from literature. Locking these notes inside the browser's IndexedDB limits their utility. By providing a clean export engine targeting Obsidian-compatible Markdown (with YAML frontmatter, quote callouts, chapter markers, and color codes), CSV, and JSON, users can seamlessly synchronize their reading knowledge into Personal Knowledge Management (PKM) vaults, Notion, and Readwise.

## Current state

The relevant files:
- `apps/web/src/types/index.ts`: Defines `Highlight` (`cfi`, `color`, `text`, `note`, `createdAt`).
- `apps/web/src/components/library/BatchActionBar.tsx`: Floating dock for batch actions with selection.
- `apps/web/src/components/reader/AnnotationsDrawer.tsx`: In-reader drawer displaying highlights and bookmarks.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `bun run check`          | exit 0, no errors   |
| Tests     | `bun test`               | all pass            |
| Lint      | `bun run lint`           | exit 0              |
| Build     | `bun run build`          | exit 0, < 500 kB    |

## Scope

**In scope**:
- `apps/web/src/services/annotationExportService.ts` (create): Formats book annotations into Markdown with YAML frontmatter, CSV, or JSON, and triggers browser downloads.
- `apps/web/src/components/library/BatchActionBar.tsx`: Add "Export Annotations" button exporting all selected books' notes into a unified or archived bundle.
- `apps/web/src/components/reader/AnnotationsDrawer.tsx`: Add single-book "Export Notes" action with format selection.
- `apps/web/src/services/annotationExportService.test.ts` (create): Unit tests verifying Obsidian callout generation, frontmatter validity, and note formatting.

**Out of scope**:
- `apps/desktop/src-tauri/*`
- `apps/desktop/build-appimage.sh`
- `apps/mobile/*`
- Cloud-hosted third-party webhook integrations requiring server infrastructure.

## Steps

### Step 1: Implement `annotationExportService.ts`
- Implement `formatBookAnnotationsAsMarkdown(book: Book): string`:
  - YAML frontmatter: `title`, `author`, `exportDate`, `highlightsCount`.
  - Grouping by chapter / CFI sequence.
  - Blockquote styling matching Obsidian quote format (`> [!quote]` callouts with highlight colors).
- Implement `downloadTextFile(filename: string, content: string, mimeType: string): void`.

### Step 2: Integrate into `AnnotationsDrawer.tsx`
- Add an "Export Notes" menu button at the top of the Annotations drawer.
- Support instant Markdown download of all highlights and notes for the active book.

### Step 3: Integrate Batch Export in `BatchActionBar.tsx`
- Add an "Export" action in `BatchActionBar` when one or more books with annotations are selected.
- Bundle multiple books into individual `.md` files or a concatenated summary.

### Step 4: Verification & Tests
- Write unit tests in `annotationExportService.test.ts` checking markdown output against fixtures.
- Verify `bun run check && bun test && bun run lint && bun run build`.
