# Architecture Specification: Custom Reader Themes, Paper Palettes & OLED Contrast Studio

> **Executor instructions**: Execute this specification systematically. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this specification
> in `architecture-specs/README.md`.
>
> **Drift check (run first)**: `git diff --stat 25566d5..HEAD -- apps/web/src/config/readerConfig.ts apps/web/src/components/reader/ReaderSettings.tsx`

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Prerequisites**: High-Legibility Typography & Bionic Reading Fixation, Foliate Engine Core
- **Category**: Reader Experience / Visual Ergonomics
- **Documented at**: commit `25566d5`, 2026-09-13
- **Status**: VERIFIED

## Why this matters

Reading comfort is the foundational physical requirement of any e-reading platform. Readers spend hundreds of hours immersed in digital texts across diverse environments: direct sunlight, cafe ambiance, dim bedside lamps, or complete darkness:
1. **Ocular Health & WCAG Compliance**: Reading text with insufficient contrast causes severe eye strain, fatigue, and headaches. Integrating a real-time W3C WCAG 2.1 relative luminance and contrast engine ensures users are guided toward ergonomically sound combinations (AA >= 4.5:1, AAA >= 7:1).
2. **True OLED Dark Mode**: Standard dark modes (e.g. `#1a1a1a`) keep OLED pixels illuminated. Pure `#000000` pitch black completely powers down display subpixels, maximizing battery life on mobile and tablet devices while eliminating backlight bleed.
3. **Atmospheric Color Palettes**: Popular, beloved reading palettes—such as Solarized (designed by Ethan Schoonover specifically for prolonged terminal and reading comfort), Nord Aurora, Gruvbox Warm, Rosé Pine, and Sage Forest—provide tailored emotional tones for different literary genres.
4. **Bespoke Paper & Ink Studio**: Readers can formulate custom paper hues, font shades, and accent tints, preview them live against sample typography with real-time contrast metrics, and persist their custom themes.
5. **Bundle Protection**: All color calculations, luminance math, and contrast evaluations are implemented in pure vanilla TypeScript with zero external dependencies to preserve Sanctuary's strict < 500 kB production web bundle ceiling.

## Work Units

- [x] **Work Unit 1**: WCAG 2.1 Relative Luminance & Contrast Calculation Engine (`apps/web/src/utils/contrastEngine.ts` and test suite).
  - W3C sRGB gamma expansion and relative luminance algorithm ($L = 0.2126R + 0.7152G + 0.0722B$).
  - Contrast ratio computation $((L_1 + 0.05) / (L_2 + 0.05))$.
  - WCAG conformance rating resolver (`AAA`, `AA`, `Fail`).
  - Hex parsing, RGB conversion, and tone adjustment utilities.
- [x] **Work Unit 2**: Extended Curated Color Presets & Custom Palette Model (`apps/web/src/config/readerConfig.ts`).
  - Add Solarized Light, Solarized Dark, Nord Polar, Gruvbox Amber, Rosé Pine, Sage Forest, and True OLED Black presets.
  - Define `CustomPalette` interface with user-assigned names and tags.
- [x] **Work Unit 3**: Custom Palettes Persistence in Settings Store (`apps/web/src/store/useSettingsStore.ts`).
  - Add `customPalettes: CustomPalette[]` array with add, update, and remove actions.
  - Persist to local storage and support sync.
- [x] **Work Unit 4**: Theme Studio & Contrast Verification Modal (`apps/web/src/components/reader/ThemeStudioModal.tsx`).
  - Code-split modal with live typography preview swatch.
  - Real-time contrast meter with dynamic badge (`AAA`, `AA`, `Low Contrast`).
  - Interactive hex and color pickers with curated quick-swatch palettes.
  - Integrated launcher button from `ReaderSettings.tsx`.
- [x] **Work Unit 5**: Verification & Quality Gate.
  - Pass all unit tests (`bun test`).
  - Zero TypeScript errors (`bun run check`).
  - Zero ESLint warnings (`bun run lint`, `bunx eslint functions/`).
  - Maintain production web bundle strictly under 500 kB.

## Verification Gate

```bash
bun test apps/web/src/utils/contrastEngine.test.ts
bun test
bun run check
bun run lint
bunx eslint functions/
bun run build
```
