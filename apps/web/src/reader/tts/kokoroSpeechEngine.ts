import type { SpeechEngine, SpeechPlayback, SpeechRequest } from "./speechEngine";

import { encodeWav, kokoroClient } from "./kokoroClient";
import { DEFAULT_KOKORO_VOICE } from "./kokoroProtocol";

let voice: string = DEFAULT_KOKORO_VOICE;
let activeElement: HTMLAudioElement | null = null;

function speedFor(request: SpeechRequest): number {
  return Math.max(0.5, Math.min(2, request.rate));
}

function releaseElement(element: HTMLAudioElement) {
  element.pause();
  const src = element.src;
  element.removeAttribute("src");
  element.load();
  if (src.startsWith("blob:")) URL.revokeObjectURL(src);
  if (activeElement === element) activeElement = null;
}

export function setKokoroVoice(next: string): void {
  voice = next;
}

export const kokoroSpeechEngine: SpeechEngine = {
  id: "kokoro",
  prefetch: (request) => {
    if (kokoroClient.getState().status !== "ready") return;
    void kokoroClient.synthesize(request.text, voice, speedFor(request)).catch(() => undefined);
  },
  speak: (request, { onEnd, onError }): SpeechPlayback => {
    let cancelled = false;
    let paused = false;
    const element = document.createElement("audio");
    element.preload = "auto";
    if (activeElement && activeElement !== element) releaseElement(activeElement);
    activeElement = element;

    element.onended = () => {
      if (cancelled) return;
      releaseElement(element);
      onEnd();
    };
    element.onerror = () => {
      if (cancelled) return;
      releaseElement(element);
      onError();
    };

    kokoroClient
      .synthesize(request.text, voice, speedFor(request))
      .then(({ sampleRate, samples }) => {
        if (cancelled) return;
        element.src = URL.createObjectURL(encodeWav(samples, sampleRate));
        if (!paused) void element.play().catch(() => (cancelled ? undefined : onError()));
      })
      .catch(() => {
        if (!cancelled) onError();
      });

    return {
      cancel: () => {
        cancelled = true;
        releaseElement(element);
      },
      pause: () => {
        paused = true;
        element.pause();
      },
      resume: () => {
        paused = false;
        if (!element.src) return true;
        void element.play().catch(() => onError());
        return true;
      },
    };
  },
  stopAll: () => {
    if (activeElement) releaseElement(activeElement);
  },
};
