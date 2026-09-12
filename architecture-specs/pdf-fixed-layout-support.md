# Architecture Specification: Native PDF Document Ingestion & Fixed-Layout View

> **Executor instructions**: Execute this specification systematically. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this specification
> in `architecture-specs/README.md`.
>
> **Drift check (run first)**: `git diff --stat 54f0583..HEAD -- apps/web/src/reader/formats/FormatDetector.ts apps/web/src/reader/formats/FoliateDocumentAdapter.ts`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Prerequisites**: None
- **Category**: architecture
- **Documented at**: commit `54f0583`, 2026-09-12

## Why this matters

Sanctuary currently supports 8 major digital book formats (EPUB, MOBI, AZW, AZW3, FB2, CBZ, TXT, HTML, Markdown). PDF represents the single most requested additional document type for textbooks, academic research papers, and technical manuals. By integrating PDF as a fixed-layout document in Sanctuary's format-agnostic pipeline, users can read and annotate PDF books without relying on external readers.

## Current state

The relevant files:
- `apps/web/src/reader/formats/FormatDetector.ts`: Detects formats via file extension and magic byte sequences.
- `apps/web/src/reader/formats/FoliateDocumentAdapter.ts`: Wraps decoded book documents for `FoliateRendition`.
- `apps/web/src/reader/contracts/document.ts`: Defines `BookDocument`, `BookSection`, and `BookTocItem`.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `bun run check`          | exit 0, no errors   |
| Tests     | `bun test`               | all pass            |
| Lint      | `bun run lint`           | exit 0              |
| Build     | `bun run build`          | exit 0, < 500 kB    |

## Scope

**In scope**:
- `apps/web/src/reader/formats/FormatDetector.ts`: Add `pdf` detection (`.pdf` extension, `%PDF-` magic header `0x25 0x50 0x44 0x46`).
- `apps/web/src/reader/formats/PdfParser.ts` (create): Lightweight parser generating section pages from PDF document.
- `apps/web/src/reader/formats/pdfParser.test.ts` (create): Unit test suite for PDF header inspection and page structure.
- `apps/web/src/reader/formats/formatParsers.test.ts`: Add PDF detection assertions.

**Out of scope**:
- `apps/desktop/src-tauri/*`
- `apps/desktop/build-appimage.sh`
- `apps/mobile/*`
- Heavy un-split PDF dependencies (PDF rendering worker must be lazy-loaded in an async chunk).

## Steps

### Step 1: Add PDF Detection to `FormatDetector.ts`
- Recognize `.pdf` extension as format `"pdf"`.
- Recognize magic bytes `[0x25, 0x50, 0x44, 0x46]` (`%PDF-`).

### Step 2: Implement `PdfParser.ts`
- Extract PDF catalog, page count, and title metadata.
- Generate standard `BookDocument` model with individual page canvases or fixed-layout SVG section nodes.

### Step 3: Write Unit Tests
- Create `apps/web/src/reader/formats/pdfParser.test.ts` testing PDF detection, page extraction, and edge cases.

**Verify**: `bun run check && bun test && bun run lint && bun run build` → exit 0
