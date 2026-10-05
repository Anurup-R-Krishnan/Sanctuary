import type { SpeechEngine, SpeechPlayback, SpeechRequest } from "./speechEngine";

import { encodeWav, kokoroClient } from "./kokoroClient";
import { DEFAULT_KOKORO_VOICE } from "./kokoroProtocol";

const MAX_CHUNK_CHARS = 110;
const MIN_CHUNK_CHARS = 30;

let voice: string = DEFAULT_KOKORO_VOICE;
let activeElement: HTMLAudioElement | null = null;

function speedFor(request: SpeechRequest): number {
  return Math.max(0.5, Math.min(2, request.rate));
}

export function splitForKokoro(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= MAX_CHUNK_CHARS) return clean ? [clean] : [];
  const chunks: string[] = [];
  let rest = clean;
  while (rest.length > MAX_CHUNK_CHARS) {
    const window = rest.slice(0, MAX_CHUNK_CHARS + 1);
    const punctuation = Math.max(window.lastIndexOf(", "), window.lastIndexOf("; "), window.lastIndexOf(": "), window.lastIndexOf(" — "), window.lastIndexOf(". "));
    const space = window.lastIndexOf(" ");
    const cut = punctuation >= MIN_CHUNK_CHARS ? punctuation + 1 : space >= MIN_CHUNK_CHARS ? space : MAX_CHUNK_CHARS;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
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
    const [first] = splitForKokoro(request.text);
    if (first) void kokoroClient.synthesize(first, voice, speedFor(request)).catch(() => undefined);
  },
  speak: (request, { onEnd, onError }): SpeechPlayback => {
    let cancelled = false;
    let paused = false;
    const chunks = splitForKokoro(request.text);
    const speed = speedFor(request);
    const element = document.createElement("audio");
    element.preload = "auto";
    if (activeElement && activeElement !== element) releaseElement(activeElement);
    activeElement = element;

    const synthesize = (index: number) => kokoroClient.synthesize(chunks[index]!, voice, speed);
    let chunkIndex = 0;

    const playChunk = async (index: number) => {
      if (cancelled) return;
      if (index >= chunks.length) {
        releaseElement(element);
        onEnd();
        return;
      }
      chunkIndex = index;
      try {
        const audio = await synthesize(index);
        if (index + 1 < chunks.length) void synthesize(index + 1).catch(() => undefined);
        if (cancelled) return;
        const previous = element.src;
        element.src = URL.createObjectURL(encodeWav(audio.samples, audio.sampleRate));
        if (previous.startsWith("blob:")) URL.revokeObjectURL(previous);
        if (!paused) await element.play();
      } catch {
        if (!cancelled) {
          releaseElement(element);
          onError();
        }
      }
    };

    element.onended = () => {
      if (!cancelled) void playChunk(chunkIndex + 1);
    };
    element.onerror = () => {
      if (cancelled || !element.getAttribute("src")) return;
      releaseElement(element);
      onError();
    };

    if (chunks.length === 0) queueMicrotask(onEnd);
    else void playChunk(0);

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
        if (element.getAttribute("src")) void element.play().catch(() => onError());
        return true;
      },
    };
  },
  stopAll: () => {
    if (activeElement) releaseElement(activeElement);
  },
};
