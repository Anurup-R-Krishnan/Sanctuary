import { useState, useCallback, useEffect } from "react";

import type { IReaderSession } from "../reader/contracts/engine";
import type { TTSControllerState } from "../reader/foliate/FoliateTTSController";

import { useSettingsShallow } from "../store/useSettingsStore";

export interface SpeechState {
  currentText: string | null;
  isContinuous: boolean;
  isPaused: boolean;
  isPlaying: boolean;
  isSupported: boolean;
  rate: number;
}

export interface UseReaderSpeechOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session?: IReaderSession | any;
}

export const useReaderSpeech = (options?: UseReaderSpeechOptions) => {
  const session = options?.session;
  const [state, setState] = useState<SpeechState>({
    currentText: null,
    isContinuous: false,
    isPaused: false,
    isPlaying: false,
    isSupported: typeof window !== "undefined" && "speechSynthesis" in window,
    rate: 1.0,
  });

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const { ttsVoiceURI, ttsRate, ttsPitch, setTtsVoiceURI, setTtsRate } = useSettingsShallow((s) => ({
    setTtsRate: s.setTtsRate,
    setTtsVoiceURI: s.setTtsVoiceURI,
    ttsPitch: s.ttsPitch,
    ttsRate: s.ttsRate,
    ttsVoiceURI: s.ttsVoiceURI,
  }));

  // Load available voices
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
      if (available.length > 0 && !ttsVoiceURI) {
        const defaultVoice = available.find((v) => v.default) || available[0];
        if (defaultVoice) setTtsVoiceURI(defaultVoice.voiceURI);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
        window.speechSynthesis.cancel();
      }
    };
  }, [ttsVoiceURI, setTtsVoiceURI]);

  // Keep state synchronized with Foliate session's TTS controller if present
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rendition = (session as any)?.renditionInstance || (session as any)?.rendition;
    if (rendition?.getTTSController) {
      const controller = rendition.getTTSController();
      controller.setVoice(ttsVoiceURI);
      controller.setRate(ttsRate);
      return controller.subscribe((ttsState: TTSControllerState) => {
        setState((s) => ({
          ...s,
          currentText: ttsState.currentSentence,
          isContinuous: ttsState.isPlaying || ttsState.isPaused,
          isPaused: ttsState.isPaused,
          isPlaying: ttsState.isPlaying,
          rate: ttsState.rate,
        }));
      });
    }
  }, [session, ttsVoiceURI, ttsRate]);

  // Ad-hoc speech for selected text
  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;

      window.speechSynthesis.cancel();

      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        if (ttsVoiceURI) {
          const voice = voices.find((v) => v.voiceURI === ttsVoiceURI);
          if (voice) utterance.voice = voice;
        }
        utterance.rate = ttsRate;
        utterance.pitch = ttsPitch;

        utterance.onstart = () =>
          setState((s) => ({ ...s, currentText: text, isContinuous: false, isPaused: false, isPlaying: true }));
        utterance.onend = () =>
          setState((s) => ({ ...s, currentText: null, isContinuous: false, isPaused: false, isPlaying: false }));
        utterance.onerror = () =>
          setState((s) => ({ ...s, currentText: null, isContinuous: false, isPaused: false, isPlaying: false }));

        window.speechSynthesis.speak(utterance);
      }, 50);
    },
    [voices, ttsVoiceURI, ttsRate, ttsPitch]
  );

  // Continuous book reading actions
  const getTTSController = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = session as any;
    const rendition = s?.renditionInstance || s?.rendition;
    if (rendition?.getTTSController) {
      return rendition.getTTSController();
    }
    return null;
  }, [session]);

  const startBookSpeech = useCallback(
    async (fromCurrentLocation: boolean = true) => {
      const ctrl = getTTSController();
      if (ctrl) {
        await ctrl.start(fromCurrentLocation);
      }
    },
    [getTTSController]
  );

  const pauseBookSpeech = useCallback(() => {
    const ctrl = getTTSController();
    if (ctrl) {
      ctrl.pause();
    } else if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.pause();
      setState((s) => ({ ...s, isPaused: true }));
    }
  }, [getTTSController]);

  const resumeBookSpeech = useCallback(() => {
    const ctrl = getTTSController();
    if (ctrl) {
      ctrl.resume();
    } else if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.resume();
      setState((s) => ({ ...s, isPaused: false }));
    }
  }, [getTTSController]);

  const stopBookSpeech = useCallback(() => {
    const ctrl = getTTSController();
    if (ctrl) {
      ctrl.stop();
    } else if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setState((s) => ({ ...s, currentText: null, isContinuous: false, isPaused: false, isPlaying: false }));
    }
  }, [getTTSController]);

  const nextSentence = useCallback(() => {
    getTTSController()?.next();
  }, [getTTSController]);

  const prevSentence = useCallback(() => {
    getTTSController()?.prev();
  }, [getTTSController]);

  const changeRate = useCallback(
    (newRate: number) => {
      setTtsRate(newRate);
      getTTSController()?.setRate(newRate);
      setState((s) => ({ ...s, rate: newRate }));
    },
    [getTTSController, setTtsRate]
  );

  const togglePlayPause = useCallback(() => {
    if (!state.isPlaying) {
      void startBookSpeech(true);
    } else if (state.isPaused) {
      resumeBookSpeech();
    } else {
      pauseBookSpeech();
    }
  }, [state.isPlaying, state.isPaused, startBookSpeech, resumeBookSpeech, pauseBookSpeech]);

  return {
    changeRate,
    nextSentence,
    pause: pauseBookSpeech,
    pauseBookSpeech,
    prevSentence,
    resume: resumeBookSpeech,
    resumeBookSpeech,
    speak,
    speechState: state,
    startBookSpeech,
    stop: stopBookSpeech,
    stopBookSpeech,
    togglePlayPause,
    voices,
  };
};
