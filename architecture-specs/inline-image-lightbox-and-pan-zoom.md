# Architecture Specification: Inline Image Lightbox & Deep Pan-Zoom Viewer

> **Executor instructions**: Execute this specification systematically. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this specification
> in `architecture-specs/README.md`.
>
> **Drift check (run first)**: `git diff --stat d09c109..HEAD -- apps/web/src/reader/foliate/FoliateRendition.ts apps/web/src/components/pages/ReaderView.tsx`

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Prerequisites**: Inline Footnote & Endnote Instant Popover, Multi-Color Highlighting
- **Category**: Reader Experience / Media & Formatting
- **Documented at**: commit `d09c109`, 2026-09-13
- **Status**: READY

## Why this matters

Illustrated books, technical volumes, fantasy literature with world maps, and non-fiction with archival plates rely heavily on visual material. In typical reflowable e-reader viewports, images are constrained to the current column width, rendering fine map labels, architectural diagrams, and intricate drawings unreadable. Furthermore, dark mode reading themes often invert text while leaving black-ink diagrams transparent or unreadable against dark backgrounds.

A dedicated in-reader image lightbox provides smooth pan-and-zoom (1.0x to 5.0x), inverted contrast toggling, caption extraction from `<figcaption>`, and download/copy capabilities, completely without adding any third-party bundle weight.

## Current state

The relevant files:
- `apps/web/src/reader/foliate/FoliateRendition.ts`: Renders EPUB and document chapters into iframe documents. Intercepts link clicks for footnotes.
- `apps/web/src/reader/contracts/engine.ts`: Defines `ReaderSessionEvents` and rendition contracts.
- `apps/web/src/reader/engine/FoliateReaderSession.ts`: Adapts Foliate events to reader engine session listeners.
- `apps/web/src/components/reader/ReaderEngineHost.tsx`: Hosts the reading canvas.
- `apps/web/src/components/pages/ReaderView.tsx`: Main reader view coordinator.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `bun run check`          | exit 0, no errors   |
| Tests     | `bun test`               | all pass            |
| Lint      | `bun run lint`           | exit 0              |
| Build     | `bun run build`          | exit 0, < 500 kB    |

## Scope

**In scope**:
- Intercept image clicks (`img`, `svg image`, `picture`) within document iframes in `apps/web/src/reader/foliate/FoliateRendition.ts`:
  - Extract `src`, `alt`, `title`, and associated `<figcaption>` or surrounding text.
  - Avoid triggering navigation or page turns when clicking an image.
  - Emit `"image-click"` on `FoliateRendition` and propagate through `ReaderSessionEvents`.
- Implement `apps/web/src/components/reader/ReaderImageLightbox.tsx`:
  - Full-screen modal with backdrop blur.
  - Multi-touch pinch zoom, mouse-wheel zoom, and drag panning with clamp boundaries.
  - Floating controls dock: Zoom In, Zoom Out, Reset (100%), Invert Colors (dark mode support), Download image, Close.
  - Caption and alt text display bar.
  - Keyboard listeners (`Escape` to close, `+`/`-` zoom, `Arrow` keys pan).
- Code-split `ReaderImageLightbox` with `React.lazy` in `ReaderView.tsx`.
- Unit tests verifying image payload resolution and lightbox state calculations.

**Out of scope**:
- `apps/desktop/src-tauri/*`
- `apps/desktop/build-appimage.sh`
- `apps/mobile/*`
- External panzoom npm libraries.

## Execution Sequence

### Work Unit 1: Document Image Click Interception & Event Propagation
- Extend `ReaderSessionEvents` and `FoliateRendition` with `image-click` event definition.
- Inject delegated click handler on document bodies in `FoliateRendition.ts`.
- Propagate event through `FoliateReaderSession.ts` and `useReaderEngine.ts`.

### Work Unit 2: Pan-Zoom Image Lightbox Component
- Implement `apps/web/src/components/reader/ReaderImageLightbox.tsx` with smooth panning, zoom clamp math, contrast inversion, and caption display.
- Add unit tests verifying zoom calculations and event handlers.

### Work Unit 3: Reader View Integration & Code Splitting
- Connect `image-click` in `ReaderView.tsx` to mount `ReaderImageLightbox` via `React.lazy`.
- Verify outside clicks and escape shortcuts cleanly dismiss the lightbox.

### Work Unit 4: Quality & Bundle Budget Verification
- Run `bun run check && bun test && bun run lint && bunx eslint functions/ && bun run build`.
- Confirm production bundle size strictly remains < 500 kB.
