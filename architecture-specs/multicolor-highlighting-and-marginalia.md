# Architecture Specification: Multi-Color Highlighting & Sticky Marginalia Notes

> **Executor instructions**: Execute this specification systematically. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this specification
> in `architecture-specs/README.md`.
>
> **Drift check (run first)**: `git diff --stat dbc7cfa..HEAD -- apps/web/src/components/reader/ReaderSelectionMenu.tsx apps/web/src/components/reader/ReaderAnnotationsPanel.tsx`

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Prerequisites**: Annotation Knowledge Export & Markdown Sync, Quality Gate & Format Resilience
- **Category**: Reader Experience / Navigation & Annotations
- **Documented at**: commit `dbc7cfa`, 2026-09-13
- **Status**: VERIFIED

## Why this matters

Reading actively requires categorizing text by semantic intent. Students, researchers, writers, and deep readers do not use a single highlight color: they distinguish core theses from supporting evidence, critical rebuttals, open research questions, and evocative prose. 

Furthermore, attaching notes (marginalia) to highlights is often hidden away in separate drawers. A modern reading interface offers instant multi-color selection, in-reader marginalia previews, color filtering, and instant color recategorization without breaking the reader's immersion.

## Current state

The relevant files:
- `apps/web/src/types/reader.ts`: ReaderAnnotation model with `color`, `type`, `note`, `cfiRange`.
- `apps/web/src/components/reader/ReaderSelectionMenu.tsx`: Fixed bottom action menu for selected text.
- `apps/web/src/components/reader/ReaderNoteDialog.tsx`: Dialog for attaching notes to selections.
- `apps/web/src/components/reader/ReaderAnnotationsPanel.tsx`: Sidebar listing highlights and notes with export.
- `apps/web/src/hooks/useReaderAnnotations.ts`: Annotation state management and persistence.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `bun run check`          | exit 0, no errors   |
| Tests     | `bun test`               | all pass            |
| Lint      | `bun run lint`           | exit 0              |
| Build     | `bun run build`          | exit 0, < 500 kB    |

## Scope

**In scope**:
- Create `apps/web/src/config/annotationConfig.ts`:
  - 5 semantic colors: Amber (`#f59e0b`), Emerald (`#10b981`), Indigo (`#6366f1`), Rose (`#f43f5e`), Purple (`#a855f7`).
  - Metadata: id, label, category name, hex value, badge styling.
  - Helper functions for color resolution and category naming.
- Upgrade `apps/web/src/components/reader/ReaderSelectionMenu.tsx`:
  - Interactive multi-color highlight picker swatch bar.
  - One-tap highlight with selected or default color.
  - Color picker toggle and swatch indicators.
- Upgrade `apps/web/src/components/reader/ReaderNoteDialog.tsx`:
  - Color swatch selector to pick the highlight color when attaching a note.
  - Live color-tinted excerpt preview.
- Upgrade `apps/web/src/components/reader/ReaderAnnotationsPanel.tsx`:
  - Category / color filter pills (`All`, `Amber`, `Emerald`, `Indigo`, `Rose`, `Purple`, `With Notes`).
  - In-place color switching swatch dropdown for existing annotations.
  - Semantic category badge indicator on cards.
- Add unit tests in `apps/web/src/config/annotationConfig.test.ts`.

**Out of scope**:
- `apps/desktop/src-tauri/*`
- `apps/desktop/build-appimage.sh`
- `apps/mobile/*`
- Modifying underlying EPUB files on disk.

## Execution Sequence

### Work Unit 1: Semantic Annotation Palette & Helper Utilities
- Create `apps/web/src/config/annotationConfig.ts` with color definitions, category labels, and lookup helpers.
- Implement `apps/web/src/config/annotationConfig.test.ts` verifying color resolutions and palette mappings.

### Work Unit 2: Multi-Color Selection Menu & Note Dialog
- Enhance `ReaderSelectionMenu.tsx` with color swatch trigger and multi-color palette bar.
- Enhance `ReaderNoteDialog.tsx` with color selector.

### Work Unit 3: Annotation Panel Color Filtering & In-Place Color Switching
- Add color filter bar and category badges to `ReaderAnnotationsPanel.tsx`.
- Enable in-place color switching with `onUpdateAnnotation(id, note, newColor)`.

### Work Unit 4: Quality & Bundle Budget Verification
- Run `bun run check && bun test && bun run lint && bunx eslint functions/ && bun run build`.
- Confirm production bundle size strictly remains < 500 kB.
