# Architecture Specification: Quote Card Generator & Typographic Excerpt Staging

> **Executor instructions**: Execute this specification systematically. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this specification
> in `architecture-specs/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0a918b3..HEAD -- apps/web/src/components/reader/ReaderSelectionMenu.tsx apps/web/src/components/reader/ReaderAnnotationsPanel.tsx`

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Prerequisites**: In-Reader Dictionary & Vocabulary Builder, Annotation Knowledge Export & Markdown Sync
- **Category**: Reader Experience / Sharing & Typography
- **Documented at**: commit `0a918b3`, 2026-09-13
- **Status**: VERIFIED

## Why this matters

Readers cherish memorable sentences and impactful passages. In current digital readers, saving a quote usually means either copying plain text or taking a generic screenshot with distracting reader chrome, batteries, and UI controls. A dedicated typographic quote card generator enables readers to export beautiful, art-directed passage cards rendered directly with high-DPI HTML5 2D Canvas without sending personal book data to external servers or installing heavy rasterization dependencies.

## Current state

The relevant files:
- `apps/web/src/components/reader/ReaderSelectionMenu.tsx`: Selection action menu (Define, Highlight, Underline, Note, Copy, Speak).
- `apps/web/src/components/reader/ReaderAnnotationsPanel.tsx`: Drawer listing existing highlights with MD and JSON export.
- `apps/web/src/components/pages/ReaderView.tsx`: Main reader orchestrator wiring selection and overlay actions.
- `apps/web/src/types/reader.ts`: Declares `ReaderAnnotation` and `ReaderSelection`.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `bun run check`          | exit 0, no errors   |
| Tests     | `bun test`               | all pass            |
| Lint      | `bun run lint`           | exit 0              |
| Build     | `bun run build`          | exit 0, < 500 kB    |

## Scope

**In scope**:
- Create `apps/web/src/utils/quoteCardCanvas.ts`:
  - Pure native HTML5 2D Canvas drawing pipeline without external packages.
  - Multi-theme layouts: `editorial` (warm ivory serif), `obsidian` (dark minimalist), `parchment` (classic sepia), `swiss` (clean monochrome sans).
  - Multi-aspect ratio presets: `square` (1:1), `story` (9:16), `portrait` (4:5).
  - Automated dynamic font sizing and line wrapping based on quote length.
  - Generates PNG blobs, data URLs, clipboard copy (`ClipboardItem`), and Web Share triggering.
- Create `apps/web/src/components/reader/QuoteCardModal.tsx`:
  - Interactive preview modal with live theme and ratio switching.
  - Direct download, copy to clipboard, and native share buttons.
  - Code-split / lazy-loaded to ensure 0 kB impact on main reader chunk.
- Add "Quote Card" action button to `ReaderSelectionMenu.tsx` and `ReaderAnnotationsPanel.tsx`.
- Wire quote card opening state in `ReaderView.tsx`.
- Add comprehensive unit tests in `apps/web/src/utils/quoteCardCanvas.test.ts`.

**Out of scope**:
- `apps/desktop/src-tauri/*`
- `apps/desktop/build-appimage.sh`
- `apps/mobile/*`
- Heavy third-party canvas or puppeteer rendering libraries.

## Execution Sequence

### Work Unit 1: Native Canvas Quote Card Engine & Math Utilities
- Implement `apps/web/src/utils/quoteCardCanvas.ts` with word-wrap calculations, typographic styling, decorative quotes, and high-DPI canvas rendering.
- Add unit tests in `apps/web/src/utils/quoteCardCanvas.test.ts` verifying line wrapping, theme palettes, and aspect ratio dimensions.

### Work Unit 2: Interactive Quote Card Modal Component
- Implement `apps/web/src/components/reader/QuoteCardModal.tsx` with live canvas preview, theme selector chips, aspect ratio toggle, download button, and clipboard copy with toast feedback.
- Ensure strict zero bundle regression via code-splitting.

### Work Unit 3: Reader Selection & Annotation Panel Wiring
- Add quote card trigger to `ReaderSelectionMenu.tsx` and each annotation item in `ReaderAnnotationsPanel.tsx`.
- Connect active quote state in `ReaderView.tsx`.
- Run complete quality verification: `bun run check && bun test && bun run lint && bun run build`.

## STOP conditions

- If canvas rendering introduces external npm dependencies or increases main bundle chunk above 500 kB.
- If text wrapping fails on long quotes or unicode characters.
