export type SpeechEngineId = "kokoro" | "system";

export interface SpeechRequest {
  pitch: number;
  rate: number;
  text: string;
  voice: string | null;
}

export interface SpeechCallbacks {
  onEnd: () => void;
  onError: () => void;
}

export interface SpeechPlayback {
  cancel: () => void;
  pause: () => void;
  resume: () => boolean;
}

export interface SpeechEngine {
  readonly id: SpeechEngineId;
  prefetch?: (request: SpeechRequest) => void;
  speak: (request: SpeechRequest, callbacks: SpeechCallbacks) => SpeechPlayback;
  stopAll: () => void;
}

const noopPlayback: SpeechPlayback = { cancel: () => undefined, pause: () => undefined, resume: () => false };

function hasSpeechSynthesis(): boolean {
  return typeof window !== "undefined" && !!window.speechSynthesis && typeof SpeechSynthesisUtterance !== "undefined";
}

const liveUtterances = new Set<SpeechSynthesisUtterance>();
const CANCEL_SETTLE_MS = 60;
const KEEPALIVE_MS = 10000;

export const systemSpeechEngine: SpeechEngine = {
  id: "system",
  speak: ({ pitch, rate, text, voice }, { onEnd, onError }) => {
    if (!hasSpeechSynthesis()) {
      queueMicrotask(onError);
      return noopPlayback;
    }
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    if (voice) {
      const match = synth.getVoices?.().find((v) => v.voiceURI === voice);
      if (match) {
        utterance.voice = match;
        utterance.lang = match.lang;
      }
    }

    let cancelled = false;
    let started = false;
    let keepAlive: ReturnType<typeof setInterval> | null = null;
    let startTimer: ReturnType<typeof setTimeout> | null = null;
    const release = () => {
      liveUtterances.delete(utterance);
      if (keepAlive) clearInterval(keepAlive);
      keepAlive = null;
    };
    utterance.onstart = () => {
      started = true;
      keepAlive = setInterval(() => {
        if (synth.speaking && !synth.paused) {
          synth.pause();
          synth.resume();
        }
      }, KEEPALIVE_MS);
    };
    utterance.onend = () => {
      release();
      if (!cancelled) onEnd();
    };
    utterance.onerror = (event) => {
      release();
      if (cancelled || event.error === "interrupted" || event.error === "canceled") return;
      onError();
    };

    liveUtterances.add(utterance);
    const begin = () => {
      startTimer = null;
      if (cancelled) return;
      if (synth.paused) synth.resume();
      synth.speak(utterance);
    };
    if (synth.speaking || synth.pending) {
      synth.cancel();
      startTimer = setTimeout(begin, CANCEL_SETTLE_MS);
    } else {
      begin();
    }

    return {
      cancel: () => {
        cancelled = true;
        if (startTimer) clearTimeout(startTimer);
        release();
        if (started || synth.speaking || synth.pending) synth.cancel();
      },
      pause: () => {
        cancelled = true;
        if (startTimer) clearTimeout(startTimer);
        release();
        synth.cancel();
      },
      resume: () => false,
    };
  },
  stopAll: () => {
    if (hasSpeechSynthesis()) window.speechSynthesis.cancel();
  },
};
