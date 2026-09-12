# Architecture Specification: Voice Selection, Audio Profiles & Natural Cadence

> **Executor instructions**: Execute this specification systematically. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this specification
> in `architecture-specs/README.md`.
>
> **Drift check (run first)**: `git diff --stat d7e5ea7..HEAD -- apps/web/src/hooks/useReaderSpeech.ts apps/web/src/components/reader/ReaderTTSBar.tsx`

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Prerequisites**: Audio & Synchronized In-Book TTS, Native Media Session Integration
- **Category**: Reader Experience / Audio
- **Documented at**: commit `d7e5ea7`, 2026-09-13
- **Status**: VERIFIED

## Why this matters

Reading fiction, classical literature, and non-fiction requires different acoustic pacing and vocal characteristics. While Sanctuary provides synchronized sentence-by-sentence text-to-speech, users are currently limited to system defaults without convenient in-reader voice switching. Allowing users to select natural voices, persist voice preferences per book or language, and insert natural paragraph breathing pauses transforms synthetic speech into an immersive audiobook experience.

## Current state

The relevant files:
- `apps/web/src/hooks/useReaderSpeech.ts`: Manages speech synthesis lifecycle and exposes `voices`.
- `apps/web/src/reader/foliate/FoliateTTSController.ts`: Handles document sentence tokenization and sequential reading.
- `apps/web/src/components/reader/ReaderTTSBar.tsx`: Floating floating playback dock.
- `apps/web/src/store/useSettingsStore.ts`: Stores global `ttsVoiceURI`, `ttsRate`, and `ttsPitch`.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `bun run check`          | exit 0, no errors   |
| Tests     | `bun test`               | all pass            |
| Lint      | `bun run lint`           | exit 0              |
| Build     | `bun run build`          | exit 0, < 500 kB    |

## Scope

**In scope**:
- Expand `ReaderTTSBar.tsx` to include an expandable voice picker popover showing available device voices filtered by language.
- Provide natural pause cadence (configurable 300ms pause after paragraph boundaries and 800ms after chapter transitions).
- Persist per-book voice override in IndexedDB or settings store.
- Add unit tests verifying voice selection, pause delays, and rate switching.

**Out of scope**:
- `apps/desktop/src-tauri/*`
- `apps/desktop/build-appimage.sh`
- `apps/mobile/*`
- Cloud-based paid neural TTS APIs (ElevenLabs, AWS Polly) to preserve 100% offline functionality.

## Execution Sequence

### Work Unit 1: Natural Cadence & Paragraph Breaks in `FoliateTTSController`
- Enhance `FoliateTTSController.ts` sentence iterator to detect paragraph and section boundaries.
- Inject micro-pause pauses (`speechPauseMs`) between paragraphs.

### Work Unit 2: Voice Picker in `ReaderTTSBar`
- Add a voice selection popover button to `ReaderTTSBar.tsx`.
- Group voices by language (e.g. English, French, Spanish, German, Japanese).
- Allow previewing voice with a short audio sample sentence.

### Work Unit 3: Verification & Quality Assurance
- Add unit tests in `readerTts.test.ts`.
- Run `bun run check && bun test && bun run lint && bun run build`.
- Verify bundle size under 500 kB budget.

## STOP conditions

- If `speechSynthesis.getVoices()` is unsupported on target browser, fallback silently to default voice.
- If bundle size increases beyond 500 kB.
