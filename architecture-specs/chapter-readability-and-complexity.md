# Architecture Specification: Chapter Readability & Cognitive Complexity Metrics

> **Executor instructions**: Execute this specification systematically. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this specification
> in `architecture-specs/README.md`.
>
> **Drift check (run first)**: `git diff --stat 979d1d3..HEAD -- apps/web/src/components/pages/ReaderView.tsx apps/web/src/components/reader/ReaderHeader.tsx`

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Prerequisites**: Dynamic Chapter Reading Time & Adaptive Speed Estimator, RSVP Speed Reading
- **Category**: Reader Experience / Text Analytics & Educational
- **Documented at**: commit `979d1d3`, 2026-09-13
- **Status**: VERIFIED

## Why this matters

When readers approach long or cognitively demanding books (classic literature, philosophy, academic papers, scientific treatises, or dense fantasy worldbuilding), understanding the linguistic density and cognitive grade level of the active chapter before diving in helps calibrate mental focus and pacing.

Chapter Readability & Cognitive Complexity Metrics provides instantaneous, client-side linguistic evaluation of the current chapter or selected passage:
1. **Flesch Reading Ease**: Standardized score from 0 (very difficult / graduate level) to 100 (very easy / elementary), with qualitative categorization.
2. **Flesch-Kincaid Grade Level**: US school grade equivalence (e.g. 8.4 = 8th grade reading level).
3. **Gunning Fog Index**: Years of formal education needed to absorb the text on first reading.
4. **Lexical Diversity**: Type-Token Ratio (unique vs total tokens) and Hapax Legomena (tokens occurring exactly once) indicating vocabulary richness.
5. **Polysyllabic Vocabulary Cloud**: Highlighting the most complex, multi-syllabic words in the chapter.

All calculations run in milliseconds entirely on the client with zero network calls, zero heavy NLP dependencies, and code-split UI to protect the strict < 500 kB production web bundle budget.

## Work Units

- [x] **Work Unit 1**: Linguistic analysis engine (`apps/web/src/utils/readabilityEngine.ts` and test suite).
  - Syllable counter handling English phonetic morphology (silent e, diphthongs, suffixes `-ed`/`-es`, exceptions).
  - Sentence and word tokenizers with punctuation and whitespace normalization.
  - Flesch Reading Ease, Flesch-Kincaid Grade Level, and Gunning Fog index formulas.
  - Lexical diversity (TTR, Hapax Legomena count and ratio).
  - Polysyllabic words extraction and ranking.
- [x] **Work Unit 2**: Code-split interactive readability drawer / modal (`apps/web/src/components/reader/ReaderReadabilityModal.tsx`).
  - Score hero card with dynamic color status (emerald, blue, amber, rose).
  - Multi-metric grid: Grade level, Gunning Fog, Lexical diversity %, Estimated chapter reading time.
  - Chapter volume breakdown: Words, Sentences, Syllables, Average Sentence Length (ASL), Polysyllabic word %.
  - Polysyllabic vocabulary pills showing syllables and frequency.
- [x] **Work Unit 3**: In-reader integration (`ReaderHeader.tsx`, `ReaderOverlay.tsx`, and `ReaderView.tsx`).
  - Header action button with `BookOpenCheck` / `BarChart2` icon and tooltip.
  - Dynamic chapter text extraction from active Foliate rendition or selection.
  - Keyboard shortcut (`Shift+R` or header action).
  - Lazy loading with `React.lazy()` for zero main-bundle footprint.
- [x] **Work Unit 4**: Verification & Production Bundle Budget Assurance.
  - Pass all unit tests (`bun test`).
  - Pass TypeScript check (`bun run check`).
  - Pass ESLint (`bun run lint`, `bunx eslint functions/`).
  - Confirm production web bundle remains strictly under 500 kB.

## Verification Gate

```bash
bun test apps/web/src/utils/readabilityEngine.test.ts
bun test
bun run check
bun run lint
bunx eslint functions/
bun run build
```
