# Architecture Specification: Inline Footnote & Endnote Instant Popover

> **Executor instructions**: Execute this specification systematically. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this specification
> in `architecture-specs/README.md`.
>
> **Drift check (run first)**: `git diff --stat 8f4bf62..HEAD -- apps/web/src/reader/foliate/FoliateRendition.ts apps/web/src/hooks/useReaderEngine.ts`

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Prerequisites**: High-Legibility Typography & Bionic Reading Fixation, Quality Gate & Format Resilience
- **Category**: Reader Experience / Navigation & Annotations
- **Documented at**: commit `8f4bf62`, 2026-09-13
- **Status**: VERIFIED

## Why this matters

Reading academic literature, translated works, non-fiction, and classics with extensive explanatory notes is frequently disrupted when clicking a footnote link navigates the reader away from their current page to a distant appendix or chapter end. Readers lose their flow and struggle to regain their exact reading position. An instant, non-intrusive footnote popover extracts and displays note contents on hover or tap directly adjacent to the anchor reference, preserving the reading position while offering a secondary option to navigate to the source chapter if desired.

## Current state

The relevant files:
- `apps/web/src/reader/foliate/FoliateRendition.ts`: Foliate rendition bridging `foliate-view` events, including `link` click events.
- `apps/web/src/reader/engine/FoliateReaderSession.ts`: Reader session facade wrapping rendition.
- `apps/web/src/hooks/useReaderEngine.ts`: Primary reader engine hook consumed by `ReaderView`.
- `apps/web/src/components/pages/ReaderView.tsx`: Main reading interface.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `bun run check`          | exit 0, no errors   |
| Tests     | `bun test`               | all pass            |
| Lint      | `bun run lint`           | exit 0              |
| Build     | `bun run build`          | exit 0, < 500 kB    |

## Scope

**In scope**:
- Create `apps/web/src/utils/footnoteResolver.ts`:
  - `isFootnoteLink(element: HTMLElement | null, href: string): boolean`: Heuristic detection of EPUB 3 `noteref`, `doc-noteref`, superscript links, footnote anchor patterns (`#fn`, `#footnote`, `#note`), and class names.
  - `cleanFootnoteContent(container: Element): { contentHtml: string; contentText: string; title: string }`: Extracts note text while stripping return backlinks (`↩`, `↑`, `back`, `epub:type="backlink"`).
  - `resolveFootnote(rawBook: FoliateRawBook, currentDoc: Document, href: string): Promise<ResolvedFootnote | null>`: Resolves target elements whether within the current chapter or across external document sections.
  - Unit tests in `apps/web/src/utils/footnoteResolver.test.ts`.
- Create `apps/web/src/components/reader/ReaderFootnotePopover.tsx`:
  - Lightweight, responsive floating card positioned adjacent to the footnote anchor.
  - Formatted note content preview with scrollable container.
  - Header with badge and close button.
  - Secondary action button: "Jump to original location in book" (`onNavigate`).
  - Outside click and Escape key dismissal.
- Wire into `FoliateRendition.ts` and `useReaderEngine.ts`:
  - Listen to `link` event on `this.view`.
  - If `isFootnoteLink`, prevent default navigation and emit `footnote` event with resolved content and bounding box.
  - Expose active footnote state in `useReaderEngine` and render `ReaderFootnotePopover` in `ReaderView`.

**Out of scope**:
- `apps/desktop/src-tauri/*`
- `apps/desktop/build-appimage.sh`
- `apps/mobile/*`
- Mutating or editing footnote content in the source EPUB file.

## Execution Sequence

### Work Unit 1: Footnote Detection & Resolution Engine
- Implement `apps/web/src/utils/footnoteResolver.ts` with heuristics, backlink stripping, and asynchronous section resolving.
- Add comprehensive unit tests in `apps/web/src/utils/footnoteResolver.test.ts` covering same-document notes, external section notes, and complex nested HTML.

### Work Unit 2: Footnote Popover Component
- Implement `apps/web/src/components/reader/ReaderFootnotePopover.tsx` with smooth floating positioning, dark/light theme integration, and keyboard dismissal.

### Work Unit 3: Rendition Link Interception & View Integration
- Wire footnote link interception in `FoliateRendition.ts` via the `link` event.
- Expose `activeFootnote` and dismissal actions in `useReaderEngine.ts`.
- Integrate `ReaderFootnotePopover` into `ReaderView.tsx`.
- Execute full quality verification: `bun run check && bun test && bun run lint && bunx eslint functions/ && bun run build`.

## STOP conditions

- If footnote link interception prevents ordinary navigational hyperlinks (table of contents, external websites).
- If production web bundle exceeds 500 kB.
