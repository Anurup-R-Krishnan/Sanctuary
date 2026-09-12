# Architecture Specification: High-Legibility Typography & Bionic Reading Fixation

> **Executor instructions**: Execute this specification systematically. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this specification
> in `architecture-specs/README.md`.
>
> **Drift check (run first)**: `git diff --stat 2c99ed6..HEAD -- apps/web/src/store/useSettingsStore.ts apps/web/src/components/reader/ReaderSettings.tsx`

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Prerequisites**: Dynamic Chapter Reading Time & Speed Estimator, Storage Dashboard & Offline Caching
- **Category**: Reader Experience / Accessibility & Legibility
- **Documented at**: commit `2c99ed6`, 2026-09-13
- **Status**: VERIFIED

## Why this matters

Visual fatigue and reading speed limitations affect readers of all ages and abilities. Readers with dyslexia or attention difficulties often struggle with standard block typography. Bionic Reading guides visual saccades by bolding the initial fixations of words, accelerating comprehension and skimming efficiency. Combined with OpenDyslexic weighted typefaces and fine-grained letter-spacing calibration, Sanctuary provides a best-in-class accessible reading environment without relying on closed external subscription services.

## Current state

The relevant files:
- `apps/web/src/store/useSettingsStore.ts`: Global reader settings store with persistence and remote D1 sync.
- `apps/web/src/config/readerConfig.ts`: Color presets and font pairings.
- `apps/web/src/reader/engine/ReaderThemeController.ts`: CSS rule generator for reader iframes and documents.
- `apps/web/src/components/reader/ReaderSettings.tsx`: Reader configuration drawer UI.
- `apps/web/src/reader/foliate/FoliateRendition.ts`: Foliate rendition document style injector.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `bun run check`          | exit 0, no errors   |
| Tests     | `bun test`               | all pass            |
| Lint      | `bun run lint`           | exit 0              |
| Build     | `bun run build`          | exit 0, < 500 kB    |

## Scope

**In scope**:
- Create `apps/web/src/utils/bionicReading.ts`:
  - Algorithmic fixation calculation based on word length.
  - Non-destructive DOM walker that wraps word fixations in `<b class="bionic-fixation">`.
  - Reversible restoration function that returns original text nodes intact when toggled off.
  - Unit tests in `apps/web/src/utils/bionicReading.test.ts`.
- Extend `apps/web/src/config/readerConfig.ts`:
  - Add `opendyslexic` and `jetbrains-mono` font pairings.
- Extend `apps/web/src/store/useSettingsStore.ts`:
  - Add `bionicReading: boolean` (default false) and `letterSpacing: number` (default 0).
  - Add `setBionicReading` and `setLetterSpacing` actions with persistence and remote sync.
- Update `apps/web/src/reader/engine/ReaderThemeController.ts`:
  - Add `letterSpacing` and `bionicReading` to `ReaderThemeConfig`.
  - Inject body letter-spacing and Bionic fixation styling.
- Update `apps/web/src/components/reader/ReaderSettings.tsx`:
  - Add Letter Spacing slider (-0.5px to 4px).
  - Add Bionic Reading toggle switch.
- Update `apps/web/src/reader/foliate/FoliateRendition.ts`:
  - Execute non-destructive bionic transformation on document injection when enabled.

**Out of scope**:
- `apps/desktop/src-tauri/*`
- `apps/desktop/build-appimage.sh`
- `apps/mobile/*`
- Proprietary closed-source Bionic Reading APIs or server roundtrips.

## Execution Sequence

### Work Unit 1: Bionic Reading Fixation Engine & Algorithm
- Implement `apps/web/src/utils/bionicReading.ts` with word fixation calculation, HTML formatting, and reversible DOM text node transformation.
- Add unit tests in `apps/web/src/utils/bionicReading.test.ts` covering punctuation, short words, hyphenated compounds, and restoration reversibility.

### Work Unit 2: Settings Store & Typography Controller Extensions
- Update `useSettingsStore.ts` with `bionicReading` and `letterSpacing` state, defaults, and sync handlers.
- Update `readerConfig.ts` with `opendyslexic` and `jetbrains-mono` font pairings.
- Update `ReaderThemeController.ts` to generate body letter-spacing and font family rules.

### Work Unit 3: Reader Settings UI & Document Injection
- Add Letter Spacing slider and Bionic Reading toggle to `ReaderSettings.tsx`.
- Connect document transformation in `FoliateRendition.ts` upon document render and style update.
- Run complete quality verification: `bun run check && bun test && bun run lint && bun run build`.

## STOP conditions

- If text node transformation mutates or deletes original text content.
- If production web bundle exceeds 500 kB.
