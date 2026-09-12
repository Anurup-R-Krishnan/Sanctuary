# Architecture Specification: Ambient Soundscapes & Focus Audio Synthesizer

> **Executor instructions**: Execute this specification systematically. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this specification
> in `architecture-specs/README.md`.
>
> **Drift check (run first)**: `git diff --stat 4e61ec1..HEAD -- apps/web/src/components/reader/ReaderOverlay.tsx apps/web/src/components/reader/ReaderHeader.tsx`

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Prerequisites**: In-Book Speech Synthesis, Quality Gate & Format Resilience
- **Category**: Reader Audio / Focus & Accessibility
- **Documented at**: commit `4e61ec1`, 2026-09-13
- **Status**: VERIFIED

## Why this matters

Reading in modern environments presents constant acoustic distractions — coffee shop chatter, transit rumbles, office noise, or household activity. Many readers prefer auditory masking to achieve deep focus. External streaming audio services introduce context-switching, network latency, subscription walls, and distracting lyrics.

By synthesizing procedural acoustic soundscapes directly inside Sanctuary using native HTML5 Web Audio API nodes:
1. **0 kB Audio Asset Footprint**: No audio mp3/ogg files need to be shipped or downloaded over the wire.
2. **Infinite Non-Repeating Soundscapes**: Generative audio nodes (rain, ocean waves, fireplace crackle, wind, white and pink noise) never loop abruptly or get repetitive.
3. **Completely Offline & Instant**: Operates anywhere without network connectivity, respecting battery and device memory.
4. **Deep Reading Integration**: Seamlessly controllable via reader header, floating audio popover, or appearance settings with volume blend and sleep timers.

## Current state

The relevant files:
- `apps/web/src/components/reader/ReaderHeader.tsx`: Reader navigation bar with action buttons.
- `apps/web/src/components/reader/ReaderOverlay.tsx`: Primary overlay orchestrator with lazy-loaded modules.
- `apps/web/src/components/reader/ReaderSettings.tsx`: Settings panel with theme, typography, layout, and TTS controls.
- `apps/web/src/components/reader/ReaderTTSBar.tsx`: Speech synthesis bottom dock.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `bun run check`          | exit 0, no errors   |
| Tests     | `bun test`               | all pass            |
| Lint      | `bun run lint`           | exit 0              |
| Build     | `bun run build`          | exit 0, < 500 kB    |

## Scope

**In scope**:
- Create `apps/web/src/audio/ambientSoundscape.ts`:
  - Web Audio API procedural soundscape engine.
  - Soundscape types: `rain`, `waves`, `fireplace`, `wind`, `white-noise`, `pink-noise`.
  - Algorithmic noise generation: Kellet filter pink noise, Brownian rumble, bandpass droplet filtering, LFO wave swell modulation, and Poisson-distributed crackle transients.
  - Smooth gain ramps (`linearRampToValueAtTime`) to eliminate pops/clicks.
  - Sleep timer with auto-fadeout.
- Create unit tests in `apps/web/src/audio/ambientSoundscape.test.ts`:
  - Mock Web Audio API nodes (`AudioContext`, `BiquadFilterNode`, `GainNode`, `AudioBufferSourceNode`, `OscillatorNode`).
  - Validate soundscape initiation, switching, volume scaling, timer lifecycle, and node cleanup.
- Create `apps/web/src/store/useAmbientSoundStore.ts`:
  - Lightweight Zustand store managing `activeSoundscape`, `volume` (0-100), `isPlaying`, and `sleepTimerMinutes`.
  - LocalStorage persistence for user preferences.
- Create `apps/web/src/components/reader/ReaderAmbientSoundPopover.tsx`:
  - Accessible floating popover with soundscape cards, animated audio wave active state, volume slider, and sleep timer selector.
  - Lazy-loaded via `React.lazy` in `ReaderOverlay.tsx` to protect the 500 kB main bundle budget.
- Wire into `ReaderHeader.tsx`:
  - Add ambient soundscape button with active playing state indicator and click toggle.
- Integrate into `ReaderSettings.tsx`:
  - Ambient soundscape section in Reader Settings for unified customization.

**Out of scope**:
- `apps/desktop/src-tauri/*`
- `apps/desktop/build-appimage.sh`
- `apps/mobile/*`
- Loading external remote mp3/wav audio files from CDNs.

## Execution Sequence

### Work Unit 1: Procedural Web Audio API Soundscape Engine
- Implement `apps/web/src/audio/ambientSoundscape.ts` with pure procedural audio node graphs.
- Implement `apps/web/src/audio/ambientSoundscape.test.ts` verifying node graph construction, volume ramps, and cleanup.

### Work Unit 2: Ambient Soundscape State Store
- Implement `apps/web/src/store/useAmbientSoundStore.ts` tracking soundscape selection, volume, play state, and sleep timer countdown.

### Work Unit 3: Lazy-Loaded UI Popover & Settings Integration
- Implement `apps/web/src/components/reader/ReaderAmbientSoundPopover.tsx` with responsive layout, volume slider, and sleep timer.
- Wire toggle into `ReaderHeader.tsx` and lazy-load popover in `ReaderOverlay.tsx`.
- Add quick ambient audio controls into `ReaderSettings.tsx`.

### Work Unit 4: Quality & Bundle Budget Verification
- Run `bun run check && bun test && bun run lint && bunx eslint functions/ && bun run build`.
- Verify production bundle strictly remains < 500 kB.
