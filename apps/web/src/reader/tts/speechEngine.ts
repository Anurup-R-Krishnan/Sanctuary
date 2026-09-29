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

export const systemSpeechEngine: SpeechEngine = {
  id: "system",
  speak: ({ pitch, rate, text, voice }, { onEnd, onError }) => {
    if (!hasSpeechSynthesis()) return noopPlayback;
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    if (voice) {
      const match = synth.getVoices?.().find((v) => v.voiceURI === voice);
      if (match) utterance.voice = match;
    }
    let cancelled = false;
    utterance.onend = () => {
      if (!cancelled) onEnd();
    };
    utterance.onerror = (event) => {
      if (cancelled || event.error === "interrupted" || event.error === "canceled") return;
      onError();
    };
    synth.speak(utterance);
    return {
      cancel: () => {
        cancelled = true;
        synth.cancel();
      },
      pause: () => synth.pause(),
      resume: () => {
        if (!synth.paused) return false;
        synth.resume();
        return true;
      },
    };
  },
  stopAll: () => {
    if (hasSpeechSynthesis()) window.speechSynthesis.cancel();
  },
};
