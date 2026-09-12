# Plan 005: Native Media Session & System-Level Background Audio Playback

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 54f0583..HEAD -- apps/web/src/reader/foliate/FoliateTTSController.ts apps/web/src/components/reader/ReaderTTSBar.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: Plan 001
- **Category**: direction
- **Planned at**: commit `54f0583`, 2026-09-12

## Why this matters

Sanctuary now has synchronized in-book TTS that highlights sentences and advances chapters automatically. However, when users lock their phone, switch apps, or use Bluetooth headphone buttons, the playback lacks system-level awareness. By integrating the standard `navigator.mediaSession` API, Sanctuary can display rich book metadata (title, author, cover artwork) on mobile lockscreens, smartwatch notifications, and OS media overlays (macOS Control Center, Windows Media Flyout), and handle hardware play/pause/skip buttons directly.

## Current state

The relevant files:
- `apps/web/src/reader/foliate/FoliateTTSController.ts`: Core TTS controller handling `SpeechSynthesis` sentence segmentation, DOM mark highlighting, and chapter advancement.
- `apps/web/src/hooks/useReaderSpeech.ts`: React hook managing speech synthesis state, speed, and continuous reading session.
- `apps/web/src/components/reader/ReaderTTSBar.tsx`: Floating dock displaying Play/Pause, sentence skip buttons, and speed selector.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `bun run check`          | exit 0, no errors   |
| Tests     | `bun test`               | all pass            |
| Lint      | `bun run lint`           | exit 0              |
| Build     | `bun run build`          | exit 0, < 500 kB    |

## Scope

**In scope** (the only files you should modify or create):
- `apps/web/src/reader/foliate/MediaSessionController.ts` (create)
- `apps/web/src/reader/foliate/FoliateTTSController.ts` (wire MediaSession updates)
- `apps/web/src/reader/foliate/mediaSession.test.ts` (create)
- `apps/web/src/hooks/useReaderSpeech.ts` (pass book metadata to controller)

**Out of scope** (do NOT touch):
- `apps/desktop/src-tauri/*`
- `apps/desktop/build-appimage.sh`
- `apps/mobile/*`
- `functions/*`

## Steps

### Step 1: Implement `MediaSessionController.ts`
Create `apps/web/src/reader/foliate/MediaSessionController.ts`:
- Safely guards `typeof navigator !== "undefined" && "mediaSession" in navigator`.
- Methods:
  - `updateMetadata(meta: { title: string; author?: string; coverUrl?: string; chapter?: string })`: sets `navigator.mediaSession.metadata = new MediaMetadata(...)`.
  - `setActionHandlers(handlers: { onPlay: () => void; onPause: () => void; onNext: () => void; onPrevious: () => void })`: binds `play`, `pause`, `previoustrack`, `nexttrack` to hardware/lockscreen controls.
  - `setPlaybackState(state: "none" | "paused" | "playing")`: updates `navigator.mediaSession.playbackState`.
  - `destroy()`: clears action handlers and metadata.

### Step 2: Wire MediaSession into `FoliateTTSController.ts`
In `FoliateTTSController.ts`:
- Accept optional book metadata `{ title: string; author?: string; coverUrl?: string }`.
- Synchronize playback state changes (`playing`, `paused`, `idle`) to `mediaSessionController`.
- Hook hardware `nexttrack` to `nextSentence()` / `nextChapter()` and `previoustrack` to `prevSentence()`.

### Step 3: Write Unit Tests in `mediaSession.test.ts`
Create `apps/web/src/reader/foliate/mediaSession.test.ts`:
- Test metadata initialization and update behavior with mock `navigator.mediaSession`.
- Test hardware action handlers trigger expected callback functions.
- Test graceful fallback in environments without `mediaSession`.

**Verify**: `bun run check && bun test && bun run lint && bun run build` → exit 0
