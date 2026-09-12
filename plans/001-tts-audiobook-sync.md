# Plan 001: Audio & Synchronized In-Book TTS with Foliate Engine

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 553e7f6..HEAD -- apps/web/src/hooks/useReaderSpeech.ts apps/web/src/reader/foliate/FoliateRendition.ts apps/web/src/reader/engine/FoliateReaderSession.ts apps/web/src/components/reader/ReaderOverlay.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `553e7f6`, 2026-09-12

## Why this matters

Sanctuary currently provides only basic text selection speech (`useReaderSpeech.ts`), where a user can manually highlight a phrase and click a small menu button to hear it once. Readers expect a full "Audiobook / Read Aloud" experience: continuous speech that walks through the chapter, visual sentence or word tracking in the rendered book view, and floating playback controls (play, pause, skip sentence, speed 0.75x–2.0x). Foliate-js already packages a high-performance DOM text walker and SSML/mark generator in `foliate-js/tts.js`. Wiring this into `FoliateRendition` and exposing a dedicated floating `ReaderTTSBar` elevates Sanctuary into a complete dual-mode reading and listening platform.

## Current state

The relevant files:
- `apps/web/src/hooks/useReaderSpeech.ts`: Only reads single strings passed to `speak(text: string)`. Does not interface with the Foliate DOM or track active book sentences.
- `apps/web/src/reader/foliate/FoliateRendition.ts`: Renders Foliate documents inside an overlayer; has `renderer.getContents()` and `this.view` references, but no TTS session management.
- `apps/web/src/reader/engine/FoliateReaderSession.ts`: Exposes rendition methods to React hooks (`goTo`, `next`, `prev`, `search`), but no TTS controller methods.
- `apps/web/src/components/reader/ReaderOverlay.tsx`: Displays top and bottom navigation bars, bookmarks, and chapters, but has no floating audio playback dock.
- `apps/web/src/store/useSettingsStore.ts`: Already stores `ttsVoiceURI`, `ttsRate`, `ttsPitch`.

Current code in `apps/web/src/hooks/useReaderSpeech.ts:52-72`:
```typescript
    const speak = useCallback((text: string) => {
        if (!window.speechSynthesis) return;
        
        window.speechSynthesis.cancel(); // Stop any current speech
        
        setTimeout(() => {
            const utterance = new SpeechSynthesisUtterance(text);
            if (ttsVoiceURI) {
                const voice = voices.find(v => v.voiceURI === ttsVoiceURI);
                if (voice) utterance.voice = voice;
            }
            utterance.rate = ttsRate;
            utterance.pitch = ttsPitch;
            
            utterance.onstart = () => setState(s => ({ ...s, isPlaying: true, isPaused: false, currentText: text }));
            utterance.onend = () => setState(s => ({ ...s, isPlaying: false, isPaused: false, currentText: null }));
            utterance.onerror = () => setState(s => ({ ...s, isPlaying: false, isPaused: false, currentText: null }));
            
            window.speechSynthesis.speak(utterance);
        }, 50);
    }, [voices, ttsVoiceURI, ttsRate, ttsPitch]);
```

Repo conventions to follow:
- React hooks follow the single-responsibility pattern with typed interfaces (see `apps/web/src/hooks/useReaderSearch.ts`).
- Clean separation between engine layer (`FoliateRendition.ts`) and presentation layer (`ReaderOverlay.tsx`).
- Styling uses Tailwind CSS dark/light token classes (`bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border shadow-lg rounded-2xl`).

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `bun run check`          | exit 0, no errors   |
| Tests     | `bun test`               | all pass            |
| Lint      | `bun run lint`           | exit 0              |
| Build     | `bun run build`          | exit 0, < 500 kB    |

## Scope

**In scope** (the only files you should modify or create):
- `apps/web/src/reader/foliate/FoliateTTSController.ts` (create)
- `apps/web/src/reader/foliate/FoliateRendition.ts` (wire TTS lifecycle & highlight overlayer)
- `apps/web/src/reader/engine/FoliateReaderSession.ts` (expose TTS methods)
- `apps/web/src/hooks/useReaderSpeech.ts` (upgrade to support book TTS session & sentence tracking)
- `apps/web/src/components/reader/ReaderTTSBar.tsx` (create floating audio playback dock)
- `apps/web/src/components/reader/ReaderOverlay.tsx` (render TTS bar when active)
- `apps/web/src/reader/foliate/readerTts.test.ts` (create unit tests)

**Out of scope** (do NOT touch):
- `apps/desktop/src-tauri/*`
- `apps/desktop/build-appimage.sh`
- `apps/mobile/*`
- Foliate internal parser files in `node_modules/foliate-js/`

## Git workflow

- Branch: `advisor/001-tts-audiobook-sync`
- Commit message style: Conventional Commits, e.g. `feat(reader): continuous tts playback with visual sentence tracking`

## Steps

### Step 1: Create `FoliateTTSController` using Foliate's native TTS walker
Create `apps/web/src/reader/foliate/FoliateTTSController.ts`.
It must:
1. Dynamically import `foliate-js/tts.js`.
2. Accept the active `Document`, text walker, and a highlight callback `(range: Range) => void`.
3. Provide `start()`, `pause()`, `resume()`, `next()`, `prev()`, and `destroy()`.
4. Manage the `SpeechSynthesisUtterance` instance, binding `utterance.onboundary` to update visual highlight marks via `tts.setMark(e.name)`.
5. Support rate (0.75x–2.0x), pitch, and voice selection from settings.

**Verify**: `bun run check` → exit 0

### Step 2: Wire TTS methods into `FoliateRendition` and `FoliateReaderSession`
In `FoliateRendition.ts`:
1. Add `startTTS(fromCurrentLocation?: boolean)` and `stopTTS()`.
2. In the highlight callback of `FoliateTTSController`, apply a temporary SVG/DOM overlayer mark `.sanctuary-tts-active` (yellow subtle highlight with rounded border) over the speaking range.
3. Automatically clear TTS highlights when the session ends or when page navigation occurs.

In `FoliateReaderSession.ts`:
1. Expose `startTTS()`, `stopTTS()`, `pauseTTS()`, `resumeTTS()`, `nextTTS()`, `prevTTS()`.

**Verify**: `bun run check` → exit 0

### Step 3: Upgrade `useReaderSpeech.ts` with continuous session state
Update `apps/web/src/hooks/useReaderSpeech.ts`:
1. Add `isContinuous: boolean`, `currentSentence: string | null`, `rate: number`.
2. Add actions: `startBookSpeech()`, `stopBookSpeech()`, `togglePlayPause()`, `nextSentence()`, `prevSentence()`, `setRate(r: number)`.
3. Keep backward compatibility with existing `speak(text)` for ad-hoc selection reading.

**Verify**: `bun run check` → exit 0

### Step 4: Create floating `ReaderTTSBar.tsx` and integrate into `ReaderOverlay.tsx`
Create `apps/web/src/components/reader/ReaderTTSBar.tsx`:
1. Sleek floating pill at the bottom of the screen (above bottom bar if visible, or standalone at bottom center).
2. Controls:
   - Play / Pause toggle button (with Lucide icons `Play`, `Pause`).
   - Skip forward / backward sentence buttons (`SkipBack`, `SkipForward`).
   - Speed selector pill (cycling 0.75x → 1.0x → 1.25x → 1.5x → 2.0x).
   - Close button to stop TTS and dismiss the bar.
3. Add a "Listen" headphone icon (`Headphones`) to `ReaderOverlay.tsx` top action bar next to Search and Bookmark buttons.
4. Clicking `Headphones` starts `useReaderSpeech.startBookSpeech()` and reveals the floating `ReaderTTSBar`.

**Verify**: `bun run check` && `bun run lint` → exit 0

### Step 5: Add unit tests in `readerTts.test.ts`
Create `apps/web/src/reader/foliate/readerTts.test.ts`:
1. Test TTS controller initialization with mock DOM document.
2. Test sentence segmentation and mark extraction.
3. Test speech state transitions (start, pause, resume, stop).

**Verify**: `bun test apps/web/src/reader/foliate/readerTts.test.ts` → all pass

## Test plan

- Test continuous TTS start from beginning of current chapter.
- Test sentence highlight callback updates active mark.
- Test pause/resume maintains current sentence position.
- Test speed adjustment dynamically updates playback rate.
- Test close button cleans up all TTS overlayer highlights.

## Done criteria

- [ ] `bun run check` exits 0 with 0 errors.
- [ ] `bun test` exits 0 with all tests passing.
- [ ] `bun run lint` exits 0.
- [ ] `bun run build` succeeds under 500 kB chunk threshold.
- [ ] `ReaderTTSBar` appears cleanly on clicking Headphones icon.
- [ ] `plans/README.md` status row updated to DONE.

## STOP conditions

- If `foliate-js/tts.js` fails to resolve or requires Node-incompatible Web APIs during build, stop and report.
- If TTS mark highlighting conflicts with user-created note annotations in Overlayer, stop and report.

## Maintenance notes

- When mobile apps (`apps/mobile`) implement native text-to-speech, they can tap into the same `useReaderSpeech` interface through the shared WebView bridge.
