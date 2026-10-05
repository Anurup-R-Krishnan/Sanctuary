import { Download, RotateCcw } from "lucide-react";
import { type ReactNode, useSyncExternalStore } from "react";

import { kokoroClient, type KokoroState } from "@/reader/tts/kokoroClient";
import { KOKORO_VOICES } from "@/reader/tts/kokoroProtocol";
import { useSettingsShallow } from "@/store/useSettingsStore";
import { cx } from "@/utils/cx";

interface ReadAloudSettingsProps {
  renderSlider: (props: { format: (v: number) => string; label: string; max: number; min: number; onChange: (v: number) => void; step: number; value: number }) => ReactNode;
  voices: SpeechSynthesisVoice[];
}

const subscribe = (listener: () => void) => kokoroClient.subscribe(listener);
const snapshot = (): KokoroState => kokoroClient.getState();

function formatMegabytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

function useKokoroState(): KokoroState {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function ReadAloudSettings({ renderSlider, voices }: ReadAloudSettingsProps) {
  const state = useSettingsShallow((s) => ({
    kokoroVoice: s.kokoroVoice,
    setKokoroVoice: s.setKokoroVoice,
    setTtsEngine: s.setTtsEngine,
    setTtsPitch: s.setTtsPitch,
    setTtsRate: s.setTtsRate,
    setTtsVoiceURI: s.setTtsVoiceURI,
    ttsEngine: s.ttsEngine,
    ttsPitch: s.ttsPitch,
    ttsRate: s.ttsRate,
    ttsVoiceURI: s.ttsVoiceURI,
  }));
  const kokoro = useKokoroState();
  const kokoroSupported = kokoroClient.isSupported();
  const isKokoro = state.ttsEngine === "kokoro";
  const percent = kokoro.totalBytes > 0 ? Math.round((kokoro.loadedBytes / kokoro.totalBytes) * 100) : 0;

  const engines = [
    { description: "Voices installed on this device", id: "system" as const, label: "Device" },
    { description: "Natural voice, runs in the browser", id: "kokoro" as const, label: "Kokoro" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Voice engine">
        {engines.map((engine) => {
          const selected = state.ttsEngine === engine.id;
          const disabled = engine.id === "kokoro" && !kokoroSupported;
          return (
            <button
              aria-checked={selected}
              className={cx(
                "rounded-lg border px-3 py-2.5 text-left transition-colors disabled:opacity-50",
                selected ? "border-accent bg-accent/10" : "border-line bg-surface hover:border-accent/40"
              )}
              disabled={disabled}
              key={engine.id}
              onClick={() => state.setTtsEngine(engine.id)}
              role="radio"
              type="button"
            >
              <span className={cx("block text-sm font-medium", selected ? "text-accent" : "text-fg")}>{engine.label}</span>
              <span className="mt-0.5 block text-xs text-fg-muted">{engine.description}</span>
            </button>
          );
        })}
      </div>

      {isKokoro ? (
        <>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-fg-muted">Voice</span>
            <select
              className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg outline-none focus:ring-2 focus:ring-accent"
              onChange={(e) => state.setKokoroVoice(e.target.value)}
              value={state.kokoroVoice}
            >
              {KOKORO_VOICES.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.label} · {voice.region} {voice.gender.toLowerCase()}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-lg border border-line bg-surface px-3 py-3 text-xs text-fg-muted">
            {kokoro.status === "ready" && (
              <p>
                {kokoro.device === "gpu"
                  ? "Voice model loaded on the graphics card. Works offline from now on."
                  : "Voice model loaded on the processor. This device has no usable graphics acceleration, so long sentences can pause before they start."}
              </p>
            )}
            {kokoro.status === "idle" && (
              <div className="flex items-center justify-between gap-3">
                <p>The voice model downloads once and stays on this device: about 330 MB with graphics acceleration, 90 MB without.</p>
                <button
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line bg-surface-raised px-2.5 py-1.5 font-medium text-fg hover:border-accent/50 hover:text-accent"
                  onClick={() => void kokoroClient.load().catch(() => undefined)}
                  type="button"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
              </div>
            )}
            {kokoro.status === "loading" && (
              <div>
                <div className="flex justify-between">
                  <span>Downloading voice model</span>
                  <span className="tabular-nums">
                    {kokoro.totalBytes > 0 ? `${formatMegabytes(kokoro.loadedBytes)} of ${formatMegabytes(kokoro.totalBytes)}` : "Starting"}
                  </span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${percent}%` }} />
                </div>
              </div>
            )}
            {kokoro.status === "error" && (
              <div className="flex items-center justify-between gap-3">
                <p className="text-danger">The voice model could not load: {kokoro.error}</p>
                <button
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line bg-surface-raised px-2.5 py-1.5 font-medium text-fg hover:border-accent/50"
                  onClick={() => void kokoroClient.load().catch(() => undefined)}
                  type="button"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Retry
                </button>
              </div>
            )}
          </div>
          {renderSlider({ format: (v) => `${v.toFixed(1)}x`, label: "Rate", max: 2, min: 0.5, onChange: state.setTtsRate, step: 0.1, value: state.ttsRate })}
        </>
      ) : (
        <>
          {voices.length > 0 ? (
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-fg-muted">Voice</span>
              <select
                className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg outline-none focus:ring-2 focus:ring-accent"
                onChange={(e) => state.setTtsVoiceURI(e.target.value || null)}
                value={state.ttsVoiceURI ?? ""}
              >
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-xs text-fg-muted">No voices available on this device.</p>
          )}
          {renderSlider({ format: (v) => `${v.toFixed(1)}x`, label: "Rate", max: 2, min: 0.5, onChange: state.setTtsRate, step: 0.1, value: state.ttsRate })}
          {renderSlider({ format: (v) => v.toFixed(1), label: "Pitch", max: 2, min: 0.5, onChange: state.setTtsPitch, step: 0.1, value: state.ttsPitch })}
        </>
      )}
    </div>
  );
}
