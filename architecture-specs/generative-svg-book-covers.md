# Architecture Specification: Fallback Generative SVG Book Covers

> **Executor instructions**: Execute this specification systematically. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this specification
> in `architecture-specs/README.md`.
>
> **Drift check (run first)**: `git diff --stat 338dc71..HEAD -- apps/web/src/components/ui/BookCard.tsx`

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Prerequisites**: Native PDF Fixed-Layout Support, Collections & Batch Library Operations
- **Category**: Visual Design / Library Experience
- **Documented at**: commit `338dc71`, 2026-09-13
- **Status**: VERIFIED

## Why this matters

Plain text files (TXT, MD), standalone HTML documents, and many open-domain e-books lack embedded cover artwork. In current library grids and search modals, coverless books display as monotonous, identical gray placeholders with clipped sans-serif text. A deterministic generative SVG cover system procedurally styles each coverless book with publication-grade book cloth textures, foil borders, geometric motifs, and elegant serif typography derived deterministically from the book's title and author hash, instantly transforming a sparse library into a handsome digital shelf.

## Current state

The relevant files:
- `apps/web/src/components/ui/BookCard.tsx`: Library book cards rendering covers with fallback gray placeholder.
- `apps/web/src/components/library/CatalogBookCard.tsx`: OPDS catalog browser book card.
- `apps/web/src/components/library/GlobalSearchModal.tsx`: Global cross-book search preview cards.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `bun run check`          | exit 0, no errors   |
| Tests     | `bun test`               | all pass            |
| Lint      | `bun run lint`           | exit 0              |
| Build     | `bun run build`          | exit 0, < 500 kB    |

## Scope

**In scope**:
- Create `apps/web/src/utils/generativeCover.ts`:
  - Deterministic polynomial hash string calculation.
  - 6 classical book cloth palettes (Terracotta, Midnight Navy, Forest Sage, Royal Amethyst, Warm Ochre, Obsidian Carbon).
  - 4 procedural SVG geometric motifs (concentric arches, diamond lattice, celestial circles, minimal bookplate).
  - Book spine crease shading gradient and gold foil border.
  - Multi-line SVG text wrapping for book title and author.
  - Generates inline SVG JSX and standalone SVG data URLs.
- Create `apps/web/src/components/ui/GenerativeBookCover.tsx`:
  - Reusable component handling sizing, aspect ratios (`compact`, `default`, `featured`), and high-DPI scaling.
- Integrate `GenerativeBookCover` into `BookCard.tsx`, `CatalogBookCard.tsx`, and `GlobalSearchModal.tsx`.
- Add unit tests in `apps/web/src/utils/generativeCover.test.ts`.

**Out of scope**:
- `apps/desktop/src-tauri/*`
- `apps/desktop/build-appimage.sh`
- `apps/mobile/*`
- Heavy AI image generation or server-side canvas dependencies.

## Execution Sequence

### Work Unit 1: Deterministic Generative SVG Engine & Math Utilities
- Implement `apps/web/src/utils/generativeCover.ts` with deterministic hashing, color palette resolution, geometric pattern rendering, and SVG text layout.
- Add unit tests in `apps/web/src/utils/generativeCover.test.ts` verifying hash determinism, palette distribution, and valid SVG output.

### Work Unit 2: Generative Cover Component & Responsive Scaling
- Create `apps/web/src/components/ui/GenerativeBookCover.tsx` with responsive aspect ratio handling and accessible SVG semantics.
- Add unit tests verifying component props and class rendering.

### Work Unit 3: Library Card & Search Modal Integration
- Update `BookCard.tsx`, `CatalogBookCard.tsx`, and `GlobalSearchModal.tsx` to display generative book covers when `coverUrl` is absent or encounters a load error.
- Run complete quality gates: `bun run check && bun test && bun run lint && bun run build`.

## STOP conditions

- If generative SVG introduces runtime errors or increases bundle size above 500 kB.
- If identical title/author pairs produce varying covers across re-renders.
