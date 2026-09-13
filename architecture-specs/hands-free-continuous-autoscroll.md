# Architecture Specification: Hands-Free Continuous Auto-Scroll & Calibrated Pacing

> **Executor instructions**: Execute this specification systematically. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this specification
> in `architecture-specs/README.md`.
>
> **Drift check (run first)**: `git diff --stat 202b60a..HEAD -- apps/web/src/components/pages/ReaderView.tsx apps/web/src/components/reader/ReaderHeader.tsx`

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Prerequisites**: Dynamic Chapter Reading Time & Adaptive Speed Estimator, Zen Focus Immersion
- **Category**: Reader Experience / Accessibility & Automation
- **Documented at**: commit `202b60a`, 2026-09-13
- **Status**: VERIFIED

## Why this matters

Hands-free reading empowers readers to enjoy books without manual page turns or physical interactions — ideal during physical workouts, treadmill walking, cooking, or for readers with limited mobility.

A naive implementation with `setInterval` or discrete page flips leads to jarring motion sickness. Hands-Free Continuous Auto-Scroll & Calibrated Pacing introduces:
1. **Delta-Time `requestAnimationFrame` Precision**: Sub-pixel smooth scrolling calibrated to high-refresh-rate displays (60 Hz, 120 Hz, 144 Hz).
2. **Calibrated Velocity Modes**:
   - Speed presets (Very Slow, Slow, Standard, Brisk, Swift) with granular pixel/second controls.
   - WPM-to-velocity calibration matching user reading rhythm.
3. **Smart Interaction Interruption**: Automatically suspends scrolling when the user manually scrolls or touches the viewport, smoothly resuming after inactivity.
4. **Visual Pacer Guide**: Optional subtle reading guide hairline that focuses ocular tracking.
5. **Code-Split Floating Controller Dock**: Accessible keyboard shortcuts (`A` to toggle, `[` and `]` to adjust speed), zero impact on main bundle.

## Work Units

- [x] **Work Unit 1**: Auto-scroll mathematical pacing engine (`apps/web/src/utils/autoScrollEngine.ts` and test suite).
  - Velocity calculation (pixels per second based on WPM, line height, and viewport dimensions).
  - Sub-pixel accumulation math for delta-time tick rendering.
  - Pause-on-interaction state machine and auto-resume delay calculations.
- [x] **Work Unit 2**: Code-split interactive auto-scroll floating dock (`apps/web/src/components/reader/ReaderAutoScrollController.tsx`).
  - Floating pill dock with Play/Pause, speed stepper (-/+), velocity indicator, pacer hairline toggle, and close.
  - Responsive, dark/light theme aware, accessible button labels.
- [x] **Work Unit 3**: In-reader integration (`ReaderHeader.tsx`, `useReaderShortcuts.ts`, and `ReaderView.tsx`).
  - Header action button with `ChevronsDown` icon.
  - Keyboard shortcut (`A` / `a` to toggle auto-scroll, `[` / `]` for speed).
  - DOM container scroll binding and optional pacer line overlay.
  - Code-split lazy import (`React.lazy()`) for zero main-bundle footprint.
- [x] **Work Unit 4**: Verification & Production Bundle Budget Assurance.
  - Pass all unit tests (`bun test`).
  - Pass TypeScript check (`bun run check`).
  - Pass ESLint (`bun run lint`, `bunx eslint functions/`).
  - Confirm production web bundle remains strictly under 500 kB.

## Verification Gate

```bash
bun test apps/web/src/utils/autoScrollEngine.test.ts
bun test
bun run check
bun run lint
bunx eslint functions/
bun run build
```
