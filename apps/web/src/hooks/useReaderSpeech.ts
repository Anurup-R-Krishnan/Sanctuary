import { useState, useCallback, useEffect } from "react";

import { useSettingsShallow } from "../store/useSettingsStore";

export interface SpeechState {
    currentText: string | null;
    isPaused: boolean;
    isPlaying: boolean;
    isSupported: boolean;
}

export const useReaderSpeech = () => {
    const [state, setState] = useState<SpeechState>({
        isPlaying: false,
        isPaused: false,
        isSupported: "speechSynthesis" in window,
        currentText: null,
    });
    
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    
    const { ttsVoiceURI, ttsRate, ttsPitch, setTtsVoiceURI } = useSettingsShallow((state) => ({
        ttsVoiceURI: state.ttsVoiceURI,
        ttsRate: state.ttsRate,
        ttsPitch: state.ttsPitch,
        setTtsVoiceURI: state.setTtsVoiceURI,
    }));

    useEffect(() => {
        if (!window.speechSynthesis) return;
        const loadVoices = () => {
            const available = window.speechSynthesis.getVoices();
            setVoices(available);
            if (available.length > 0 && !ttsVoiceURI) {
                // Try to find a default voice
                const defaultVoice = available.find(v => v.default) || available[0];
                if (defaultVoice) setTtsVoiceURI(defaultVoice.voiceURI);
            }
        };
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;

        // Stop speech when unmounting
        return () => {
            if (window.speechSynthesis) {
                window.speechSynthesis.onvoiceschanged = null;
                window.speechSynthesis.cancel();
            }
        };
    }, [ttsVoiceURI, setTtsVoiceURI]);

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
        }, 50); // Small delay to prevent browser bug dropping the next utterance
    }, [voices, ttsVoiceURI, ttsRate, ttsPitch]);

    const pause = useCallback(() => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.pause();
        setState(s => ({ ...s, isPaused: true }));
    }, []);

    const resume = useCallback(() => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.resume();
        setState(s => ({ ...s, isPaused: false }));
    }, []);

    const stop = useCallback(() => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        setState(s => ({ ...s, isPlaying: false, isPaused: false, currentText: null }));
    }, []);

    return {
        speechState: state,
        voices,
        speak,
        pause,
        resume,
        stop
    };
};
