import { useState, useCallback, useEffect } from "react";

import type { IReaderSession } from "../reader/contracts/engine";
import type {
  TTSBookMetadata,
  TTSControllerState,
} from "../reader/foliate/FoliateTTSController";

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
  bookId?: string;
  bookMetadata?: TTSBookMetadata;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session?: IReaderSession | any;
}

export const useReaderSpeech = (options?: UseReaderSpeechOptions) => {
  const session = options?.session;
  const bookId = options?.bookId;
  const [state, setState] = useState<SpeechState>({
    currentText: null,
    isContinuous: false,
    isPaused: false,
    isPlaying: false,
    isSupported: typeof window !== "undefined" && "speechSynthesis" in window,
    rate: 1.0,
  });

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const {
    bookVoiceOverrides,
    setBookVoiceOverride,
    setTtsParagraphPauseMs,
    setTtsRate,
    setTtsVoiceURI,
    ttsParagraphPauseMs,
    ttsPitch,
    ttsRate,
    ttsVoiceURI,
  } = useSettingsShallow((s) => ({
    bookVoiceOverrides: s.bookVoiceOverrides,
    setBookVoiceOverride: s.setBookVoiceOverride,
    setTtsParagraphPauseMs: s.setTtsParagraphPauseMs,
    setTtsRate: s.setTtsRate,
    setTtsVoiceURI: s.setTtsVoiceURI,
    ttsParagraphPauseMs: s.ttsParagraphPauseMs,
    ttsPitch: s.ttsPitch,
    ttsRate: s.ttsRate,
    ttsVoiceURI: s.ttsVoiceURI,
  }));

  const activeVoiceURI = (bookId && bookVoiceOverrides[bookId]) || ttsVoiceURI;

  // Load available voices
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
      if (available.length > 0 && !activeVoiceURI) {
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
  }, [activeVoiceURI, setTtsVoiceURI]);

  // Keep state synchronized with Foliate session's TTS controller if present
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rendition = (session as any)?.renditionInstance || (session as any)?.rendition;
    if (rendition?.getTTSController) {
      const controller = rendition.getTTSController();
      controller.setVoice(activeVoiceURI);
      controller.setRate(ttsRate);
      controller.setParagraphPause(ttsParagraphPauseMs);
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
  }, [session, activeVoiceURI, ttsRate, ttsParagraphPauseMs]);

  const metaTitle = options?.bookMetadata?.title;
  const metaAuthor = options?.bookMetadata?.author;
  const metaCover = options?.bookMetadata?.coverUrl;
  const metaChapter = options?.bookMetadata?.chapter;

  // Keep media session metadata updated on chapter or book change
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rendition = (session as any)?.renditionInstance || (session as any)?.rendition;
    if (rendition?.getTTSController && metaTitle) {
      const controller = rendition.getTTSController();
      controller.setBookMetadata({
        title: metaTitle,
        author: metaAuthor,
        coverUrl: metaCover,
        chapter: metaChapter,
      });
    }
  }, [session, metaTitle, metaAuthor, metaCover, metaChapter]);

  // Ad-hoc speech for selected text
  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;

      window.speechSynthesis.cancel();

      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        if (activeVoiceURI) {
          const voice = voices.find((v) => v.voiceURI === activeVoiceURI);
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
    [voices, activeVoiceURI, ttsRate, ttsPitch]
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

  const changeVoice = useCallback(
    (voiceURI: string) => {
      if (bookId) {
        setBookVoiceOverride(bookId, voiceURI);
      }
      setTtsVoiceURI(voiceURI);
      getTTSController()?.setVoice(voiceURI);
    },
    [bookId, getTTSController, setBookVoiceOverride, setTtsVoiceURI]
  );

  const changeParagraphPause = useCallback(
    (ms: number) => {
      setTtsParagraphPauseMs(ms);
      getTTSController()?.setParagraphPause(ms);
    },
    [getTTSController, setTtsParagraphPauseMs]
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
    activeVoiceURI,
    changeParagraphPause,
    changeRate,
    changeVoice,
    nextSentence,
    paragraphPauseMs: ttsParagraphPauseMs,
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
