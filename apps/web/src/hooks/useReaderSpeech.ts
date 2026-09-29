import { useState, useCallback, useEffect, useRef } from "react";

import type { IReaderSession } from "../reader/contracts/engine";
import type {
  TTSBookMetadata,
  TTSControllerState,
} from "../reader/foliate/FoliateTTSController";

import { kokoroSpeechEngine, setKokoroVoice } from "../reader/tts/kokoroSpeechEngine";
import { type SpeechPlayback, systemSpeechEngine } from "../reader/tts/speechEngine";
import { useSettingsShallow } from "../store/useSettingsStore";

export interface SpeechState {
  currentText: string | null;
  error: string | null;
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

export function pickDefaultVoice(voices: SpeechSynthesisVoice[], locale: string): SpeechSynthesisVoice | undefined {
  const language = locale.toLowerCase();
  const base = language.split("-")[0];
  const score = (voice: SpeechSynthesisVoice) => {
    const lang = voice.lang.toLowerCase().replace("_", "-");
    let value = 0;
    if (lang === language) value += 4;
    else if (lang.split("-")[0] === base) value += 3;
    if (voice.localService) value += 1;
    if (voice.default) value += 1;
    return value;
  };
  return [...voices].sort((a, b) => score(b) - score(a))[0];
}

export const useReaderSpeech = (options?: UseReaderSpeechOptions) => {
  const session = options?.session;
  const bookId = options?.bookId;
  const [state, setState] = useState<SpeechState>({
    currentText: null,
    error: null,
    isContinuous: false,
    isPaused: false,
    isPlaying: false,
    isSupported: typeof window !== "undefined" && "speechSynthesis" in window,
    rate: 1.0,
  });

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const {
    kokoroVoice,
    ttsEngine,
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
    kokoroVoice: s.kokoroVoice,
    ttsEngine: s.ttsEngine,
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
  const engine = ttsEngine === "kokoro" ? kokoroSpeechEngine : systemSpeechEngine;
  const adHocPlaybackRef = useRef<SpeechPlayback | null>(null);

  useEffect(() => {
    setKokoroVoice(kokoroVoice);
  }, [kokoroVoice]);

  const hasVoiceChoice = !!activeVoiceURI;
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    const loadVoices = () => {
      const available = synth.getVoices();
      setVoices(available);
      if (available.length > 0 && !hasVoiceChoice) {
        const preferred = pickDefaultVoice(available, navigator.language);
        if (preferred) setTtsVoiceURI(preferred.voiceURI);
      }
    };
    loadVoices();
    synth.addEventListener("voiceschanged", loadVoices);
    return () => synth.removeEventListener("voiceschanged", loadVoices);
  }, [hasVoiceChoice, setTtsVoiceURI]);

  // Keep state synchronized with Foliate session's TTS controller if present
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rendition = (session as any)?.renditionInstance || (session as any)?.rendition;
    if (rendition?.getTTSController) {
      const controller = rendition.getTTSController();
      controller.setEngine(engine);
      controller.setVoice(activeVoiceURI);
      controller.setRate(ttsRate);
      controller.setPitch(ttsPitch);
      controller.setParagraphPause(ttsParagraphPauseMs);
      return controller.subscribe((ttsState: TTSControllerState) => {
        setState((s) => ({
          ...s,
          currentText: ttsState.currentSentence,
          error: ttsState.error,
          isContinuous: ttsState.isPlaying || ttsState.isPaused,
          isPaused: ttsState.isPaused,
          isPlaying: ttsState.isPlaying,
          rate: ttsState.rate,
        }));
      });
    }
  }, [session, engine, activeVoiceURI, ttsRate, ttsPitch, ttsParagraphPauseMs]);

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
      adHocPlaybackRef.current?.cancel();
      const finish = () => setState((s) => ({ ...s, currentText: null, isContinuous: false, isPaused: false, isPlaying: false }));
      setState((s) => ({ ...s, currentText: text, isContinuous: false, isPaused: false, isPlaying: true }));
      adHocPlaybackRef.current = engine.speak(
        { pitch: ttsPitch, rate: ttsRate, text, voice: activeVoiceURI },
        { onEnd: finish, onError: finish }
      );
    },
    [engine, activeVoiceURI, ttsRate, ttsPitch]
  );

  useEffect(() => () => adHocPlaybackRef.current?.cancel(), []);

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

  const getRendition = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = session as any;
    return s?.renditionInstance || s?.rendition || null;
  }, [session]);

  const startBookSpeech = useCallback(
    async (fromCurrentLocation: boolean = true) => {
      adHocPlaybackRef.current?.cancel();
      const rendition = getRendition();
      if (typeof rendition?.startTTS === "function") {
        await rendition.startTTS(fromCurrentLocation);
        return;
      }
      await getTTSController()?.start(fromCurrentLocation);
    },
    [getRendition, getTTSController]
  );

  const startSpeechFromCfi = useCallback(
    async (cfi: string) => {
      adHocPlaybackRef.current?.cancel();
      const rendition = getRendition();
      if (typeof rendition?.startTTSFromCfi === "function") await rendition.startTTSFromCfi(cfi);
      else await getTTSController()?.start(true);
    },
    [getRendition, getTTSController]
  );

  const pauseBookSpeech = useCallback(() => {
    const ctrl = getTTSController();
    if (ctrl) {
      ctrl.pause();
    } else if (adHocPlaybackRef.current) {
      adHocPlaybackRef.current.pause();
      setState((s) => ({ ...s, isPaused: true }));
    }
  }, [getTTSController]);

  const resumeBookSpeech = useCallback(() => {
    const ctrl = getTTSController();
    if (ctrl) {
      ctrl.resume();
    } else if (adHocPlaybackRef.current) {
      adHocPlaybackRef.current.resume();
      setState((s) => ({ ...s, isPaused: false }));
    }
  }, [getTTSController]);

  const stopBookSpeech = useCallback(() => {
    const ctrl = getTTSController();
    if (ctrl) {
      ctrl.stop();
    } else {
      adHocPlaybackRef.current?.cancel();
      adHocPlaybackRef.current = null;
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
    startSpeechFromCfi,
    stop: stopBookSpeech,
    stopBookSpeech,
    togglePlayPause,
    voices,
  };
};
