# Implementation Plan: Sanctuary Reader Engine Rebuild (Foliate-js Migration)

> **Context Baseline**: Based on the comprehensive architectural audit in `sanctuary-audit-clean.txt`.  
> **Scope Mandate**: Rebuild `apps/web` reader engine and format pipeline. Preserve UI/UX, product behavior, Zustand store shapes, and offline/sync data model.  
> **Strict Boundaries**: Never touch `apps/desktop` Tauri configuration/Rust code (`apps/desktop/src-tauri/*`), `build-appimage.sh`, or `apps/mobile`.

---

## 1. Executive Summary & Goals

### The Problem
Sanctuary currently couples its reader pipeline exclusively to `epubjs` (v0.3.93):
1. **Iframe Overhead & Flashing**: EPUB chapters render within dynamically manipulated iframes requiring DOM mutation observers to bypass sandboxing and inject theme background colors to suppress white flash.
2. **Main-Thread Lag**: `locations.generate(1024)` parses the entire book on the main thread, stalling CPU and RAM on large books (e.g. *Moby Dick*).
3. **Format Lock-in**: The system only understands EPUB archives. Types, progress tracking, and search are hardcoded to epub.js objects (`EpubBookHandle`, `EpubRendition`, `SpineSection`).
4. **Fragile Scroll & Annotations**: epub.js continuous flow mode and highlight overlays detach during reflows and layout toggles.

### Target Architecture
1. **Engine Replacement**: Drop `epubjs` in favor of `foliate-js` (John Factotum's reader engine).
2. **Unified Document Model**: Implement a format-agnostic interface (`BookDocument`, `DocumentSection`, `DocumentRendition`, `DocumentLocator`).
3. **Multi-Format Support with Full Parity**:
   - Primary: `EPUB`
   - Additional: `FB2`, `MOBI`, `AZW`, `AZW3`, `TXT`, `HTML/XHTML`, `Markdown`
   - Every format receives full feature parity: paged layout, continuous scroll, typography & theme overrides, TOC/navigation, search, bookmarks, annotations, and progress tracking.
4. **Instant Lightweight Progress**: Replace `locations.generate(1024)` with spine/character-weight progress estimation.

---

## 2. Hard Boundaries & Constraints

| Component | Policy | Rationale |
| :--- | :--- | :--- |
| `apps/desktop` | **DO NOT TOUCH** | Desktop is a thin Tauri v2 WebView wrapper packaging `apps/web/dist` with a 30-line `main.rs`. It inherits all web changes automatically. |
| `apps/mobile` | **DO NOT TOUCH** | Separate Expo/React Native client out of scope for this client-side web rebuild. |
| UI Components (`apps/web/src/components/*`) | **PRESERVE** | All UI chrome (Header, Footer, ReaderSettings drawer, ReaderControls TOC drawer, Annotations panel, Search panel, BookCard, LibraryGrid) must keep existing props and behavior. |
| Zustand Stores (`apps/web/src/store/*`) | **PRESERVE** | `useBookStore`, `useReaderProgressStore`, `useSessionStore`, `useSettingsStore`, `useStatsStore`, and `useUIStore` state signatures remain untouched. |
| Storage & Sync | **PRESERVE** | IndexedDB `SanctuaryReaderDB` schema (`books`, `book_contents`, `sessions`, `annotations`, `mutations`) and Cloudflare Pages sync contracts remain compatible. |

---

## 3. Phased Implementation Roadmap

```text
Phase 0: Format-Agnostic Interface Definition (Pure types, zero runtime breaks)
    │
    ▼
Phase 1: Foliate-js EPUB Adapter Spike (Isolated sandbox route, no existing code touched)
    │
    ▼
Phase 2: ReaderSession Internal Adapter Swap (Dual-engine feature flag fallback)
    │
    ▼
Phase 3: Core Feature Migration & epub.js Deprecation (TOC, CFI locators, Bookmarks, Annotations, Search)
    │
    ▼
Phase 4: Multi-Format Decoders (FB2, MOBI, AZW, AZW3, TXT, HTML, Markdown)
    │
    ▼
Phase 5: Lightweight Spine/Character-Weight Progress Engine (Replace locations.generate)
```

---

### Phase 0: Format-Agnostic Interface Definitions

**Objective**: Establish pure TypeScript contracts for the reader engine, document model, rendition, locators, and progress without touching runtime execution.

- **Key Files Created**:
  - `apps/web/src/reader/contracts/document.ts` (Document, Section, Metadata, TocItem)
  - `apps/web/src/reader/contracts/rendition.ts` (Renderer, Rendition, FlowOptions, ThemeStyles, Selection)
  - `apps/web/src/reader/contracts/locator.ts` (Locator, Progress, Range, CFI-equivalent)
  - `apps/web/src/reader/contracts/engine.ts` (ReaderEngine, Callbacks, SessionOptions)
  - `apps/web/src/reader/contracts/index.ts` (Unified export barrel)
- **Compatibility Target**:
  - Types must directly map to `ReaderSessionOptions`, `ReaderSessionCallbacks`, `ReaderPosition`, and `ReaderStatus` currently expected by `useReaderEngine.ts`.
- **TDD / Verification Gate**:
  - `bun run check` exits `0` with zero type errors.
  - Zero modifications to existing runtime behavior.

---

### Phase 1: Foliate-js EPUB Adapter Spike (Isolated Route)

**Objective**: Validate `foliate-js` EPUB parsing and DOM rendering inside Vite/React without disturbing existing reader routes.

- **Tasks**:
  1. Integrate `foliate-js` package or vendor clean ES modules in `apps/web/src/reader/vendor/foliate/`.
  2. Implement `FoliateEpubDocument` implementing `BookDocument`.
  3. Implement `FoliateDomRenderer` implementing `DocumentRendition` (custom element / column paginator + continuous scroll).
  4. Create an isolated dev/test route: `apps/web/src/components/dev/FoliateTestHarness.tsx` rendered at `/__dev_reader_test`.
  5. Verify rendering with `mobydick.epub` (already located at repo root).
- **TDD / Verification Gate**:
  - Unit test `foliateEpubAdapter.test.ts` verifying:
    - EPUB metadata extraction (title, author, direction).
    - Spine section iteration and TOC extraction.
  - Test harness renders chapters, paginates forward/backward, and toggles between paginated and scrolled layout without white flashes or crashes.
  - `bun run check` exits `0`.

---

### Phase 2: ReaderSession Internal Adapter Swap (Dual-Engine Fallback)

**Objective**: Refactor `ReaderSession.ts` to delegate to the new format-agnostic engine, keeping `epub.js` available via feature flag.

- **Tasks**:
  1. Introduce feature flag `VITE_READER_ENGINE="foliate"` (defaults to foliate, allows `"epubjs"` fallback).
  2. Refactor `ReaderSession` class to act as a facade implementing `IReaderSession`:
     - If `engine === "foliate"`, delegate to `FoliateReaderEngine`.
     - If `engine === "epubjs"`, delegate to legacy `EpubjsReaderEngine`.
  3. Maintain exact method signatures on `ReaderSession`:
     - `next(): Promise<void>`
     - `prev(): Promise<void>`
     - `display(target: string): Promise<boolean>`
     - `setFlow(next: ReaderFlowOptions): Promise<void>`
     - `updateReaderBackground(bg: string): void`
     - `destroy(): void`
  4. Keep `useReaderEngine.ts` and `ReaderEngineHost.tsx` consuming `ReaderSession` without changing component props or React hooks.
- **TDD / Verification Gate**:
  - `bun test apps/web/src/services/bookContentRepository.test.ts` exits `0`.
  - Open EPUB in main app UI: verify book loads, page turns work, theme changes apply, and layout switches smoothly.
  - `bun run check` exits `0`.

---

### Phase 3: Core Feature Migration & epub.js Deprecation

**Objective**: Port all reader capabilities to foliate-js natively, migrate locators, and delete `epubjs`.

- **Step 3.1: Table of Contents & Navigation**:
  - Foliate TOC tree mapped to `TocItem[]`.
  - Chapter heading resolution during relocation (`findTocLabel`).
  - *Verify*: Chapter drawer displays full hierarchy, clicking any chapter jumps immediately.
- **Step 3.2: Position & CFI-Equivalent Locators**:
  - Map Foliate CFI / progression locators to `ReaderPosition.cfi` and `ReaderPosition.location`.
  - Maintain backward compatibility: if saved location is an epub.js CFI, resolve gracefully or fallback to chapter start (`displayWithFallbacks`).
  - *Verify*: Reopening an existing book resumes at correct reading position.
- **Step 3.3: Bookmarks**:
  - Bookmarks stored in `Book.bookmarks` use standardized locator strings.
  - *Verify*: Adding, viewing, clicking, and removing bookmarks in TOC drawer.
- **Step 3.4: Text Selection & Annotations**:
  - Text selection via native DOM selection API instead of iframe content hook.
  - Highlight rendering using Foliate overlayer / DOM marks instead of `rendition.annotations.highlight`.
  - Persistent notes loaded from IndexedDB `annotations` store.
  - *Verify*: Highlighting text in 4 colors, adding notes, and verifying highlights persist across page turns and window resizes.
- **Step 3.5: Full-Text Search**:
  - Port `useReaderSearch.ts` to search across Foliate spine sections.
  - *Verify*: Search query returns matching excerpts with chapter labels; clicking result navigates directly to match.
- **Step 3.6: Deprecate & Remove epub.js**:
  - Remove legacy `epubjs` imports and remove `epubjs` from `package.json`.
- **TDD / Verification Gate**:
  - New test suites:
    - `readerNavigation.test.ts`
    - `readerAnnotations.test.ts`
    - `readerSearch.test.ts`
  - `grep -Rni "epubjs" apps/web/src` returns 0 matches.
  - `bun run check` exits `0`.

---

### Phase 4: Multi-Format Decoders

**Objective**: Enable FB2, MOBI, AZW, AZW3, TXT, HTML/XHTML, and Markdown through the same format-agnostic interface.

- **Step 4.1: File Detection & Format Router**:
  - Detect format via file signature / extension (`.epub`, `.mobi`, `.azw`, `.azw3`, `.fb2`, `.txt`, `.md`, `.html`, `.xhtml`).
  - Route Blob to corresponding format parser.
- **Step 4.2: MOBI / AZW / AZW3 Adapter**:
  - Integrate Foliate MOBI/KF8 parser (`mobi.js`).
  - Extract metadata, PalmDOC/HTML sections, and images into `BookDocument`.
- **Step 4.3: FB2 Adapter**:
  - Integrate FictionBook XML parser (`fb2.js`).
  - Parse binary base64 covers and XML body into structured DOM sections.
- **Step 4.4: Plain Text & Markdown Adapter**:
  - Format plain text into clean, reflowable HTML paragraphs.
  - Format Markdown via lightweight parser into semantic HTML with generated TOC from `#`, `##`, `###` headings.
- **Step 4.5: HTML / XHTML Adapter**:
  - Normalize standalone HTML/XHTML files into a single-section `BookDocument`.
- **TDD / Verification Gate**:
  - Format test suite `formatParsers.test.ts` loading sample fixtures for every supported format.
  - Verify every format supports:
    - Paginated & scroll mode
    - Font/margin/theme customization
    - Bookmarking & TOC
  - `bun run check` exits `0`.

---

### Phase 5: Lightweight Spine/Character-Weight Progress Engine

**Objective**: Eliminate `locations.generate(1024)` main-thread lag with instant character-weight progress estimation.

- **Algorithm**:
  - On document load, compute the uncompressed character length (or text content byte size) of each spine section:
    `sectionWeights = [w_0, w_1, ..., w_{n-1}]`, `totalWeight = sum(sectionWeights)`.
  - Progress fraction at section i, offset p in [0, 1]:
    `Progress = (sum(w_0 ... w_{i-1}) + (p * w_i)) / totalWeight`
  - Computes instantaneously (<5ms) without decoding or layout-measuring the entire book.
- **Tasks**:
  1. Implement `SpineWeightProgressEstimator` in `apps/web/src/reader/engine/SpineWeightProgressEstimator.ts`.
  2. Remove `locations.generate(1024)` background loop from `ReaderSession.ts`.
  3. Update `useReaderSessionStats.ts` reading speed calculation to work with weight-based page steps.
  4. Deprecate `locationCache.ts` and IndexedDB `reader_cache` store safely.
- **TDD / Verification Gate**:
  - Unit test `progressEstimator.test.ts` testing progress accuracy across variable section lengths.
  - Verify instant first-paint on large books (0ms location generation delay).
  - `bun run check` exits `0`.

---

## 4. Maintenance Notes & STOP Conditions

### STOP and Report Conditions:
1. If a Foliate dependency introduces Node.js-only builtins (e.g. `fs`, `path`, `crypto` without web polyfills) that break Vite build.
2. If changing an interface would require modifying `apps/web/src/store/*` or `apps/web/src/components/pages/LibraryGrid.tsx`.
3. If `bun run check` fails and cannot be cleanly resolved within the reader boundary.

### Quality Bar:
- Every phase begins with a failing test and ends with passing tests + clean `bun run check`.
- Zero impact on desktop Tauri build (`build-appimage.sh` must remain untouched).
- All changes cleanly tracked with atomic git commits.
