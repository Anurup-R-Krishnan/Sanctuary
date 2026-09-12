# Architecture Specification: Comic & Manga Archive (CBZ/CBR) Reader Engine

> **Executor instructions**: Execute this specification systematically. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this specification
> in `architecture-specs/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0effadc..HEAD -- apps/web/src/reader/contracts/document.ts apps/web/src/reader/formats/FormatDetector.ts`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Prerequisites**: Native PDF Fixed-Layout Support
- **Category**: Format Architecture
- **Documented at**: commit `5128ed0`, 2026-09-13
- **Status**: VERIFIED (commit `6b7af8b`, 2026-09-13)

## Why this matters

CBZ (ZIP archive of sequential images) and CBR (RAR archive) are the universal standard digital formats for comic books, graphic novels, manga, and visual artbooks. Sanctuary's landing empty state already promises comic support, but the core engine lacks the `"cbz"` and `"cbr"` discrimination in its format pipeline. Foliate-js includes a native `comic-book.js` adapter designed specifically for fixed-layout image archives, dual-page spreads, and right-to-left manga orientation.

## Current state

The relevant files:
- `apps/web/src/reader/contracts/document.ts`: `BookFormat` union currently includes `"epub" | "fb2" | "mobi" | "azw" | "azw3" | "txt" | "html" | "xhtml" | "markdown" | "pdf"`.
- `apps/web/src/reader/formats/FormatDetector.ts`: Sniffs file extensions and magic headers.
- `apps/web/src/reader/foliate/FoliateDocumentAdapter.ts`: Instantiates format-specific Foliate book wrappers.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `bun run check`          | exit 0, no errors   |
| Tests     | `bun test`               | all pass            |
| Lint      | `bun run lint`           | exit 0              |
| Build     | `bun run build`          | exit 0, < 500 kB    |

## Scope

**In scope**:
- `apps/web/src/reader/contracts/document.ts`: Add `"cbz"` and `"cbr"` to `BookFormat` union.
- `apps/web/src/reader/formats/FormatDetector.ts`: Add `.cbz` and `.cbr` extension matching; detect comic archives by inspecting ZIP entries for image sequences (`.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`).
- `apps/web/src/reader/formats/ComicParser.ts` (create): Lightweight comic book unpacker sorting pages via natural alphanumeric collation and generating pre-paginated fixed-layout XHTML sections.
- `apps/web/src/reader/foliate/FoliateDocumentAdapter.ts`: Connect `"cbz"` and `"cbr"` in `FoliateDocumentAdapter.create()`.
- `apps/web/src/reader/formats/comicParser.test.ts` (create): Unit test suite verifying page ordering, cover extraction, and image section generation.

**Out of scope**:
- `apps/desktop/src-tauri/*`
- `apps/desktop/build-appimage.sh`
- `apps/mobile/*`
- Proprietary DRM-locked comic reader extensions.

## Steps

### Step 1: Extend `BookFormat` Contract & Detection
- In `apps/web/src/reader/contracts/document.ts`, add `"cbz" | "cbr"` to `BookFormat`.
- In `apps/web/src/reader/formats/FormatDetector.ts`, add `.cbz` and `.cbr` to `SUPPORTED_EXTENSIONS`.
- Add inspection for comic book ZIP structures (archives consisting primarily of raster image files).

### Step 2: Implement `ComicParser.ts`
- Implement lazy-loaded ZIP parser leveraging `foliate-js/vendor/fflate.js` to extract image filenames without inflating all byte arrays simultaneously.
- Natural sort page names (`page_1.png`, `page_2.png`, `page_10.png`).
- Wrap pages in pre-paginated SVG/HTML viewports with `rendition: { layout: "pre-paginated" }`.

### Step 3: Wire into `FoliateDocumentAdapter.ts`
- Add `"cbz"` and `"cbr"` cases to `FoliateDocumentAdapter.create()`.
- Expose image blob loading URLs through Foliate section loaders.

### Step 4: Verification & Tests
- Write unit tests in `comicParser.test.ts` asserting page extraction order, metadata deduction from directory structure, and fallback covers.
- Verify `bun run check && bun test && bun run lint && bun run build`.
