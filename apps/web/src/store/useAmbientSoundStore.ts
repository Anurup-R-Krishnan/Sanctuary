import { create } from "zustand";

import type { AmbientSoundscapeEngine } from "@/audio/ambientSoundscape";
import type { SoundscapeType } from "@/audio/ambientTypes";

let enginePromise: Promise<AmbientSoundscapeEngine> | null = null;

function getEngine(): Promise<AmbientSoundscapeEngine> {
  if (!enginePromise) {
    enginePromise = import("@/audio/ambientSoundscape").then(
      (m) => m.ambientAudioEngine
    );
  }
  return enginePromise;
}

const STORAGE_KEY = "sanctuary-ambient-sound";

interface StoredAmbientPreferences {
  activeSoundscape: SoundscapeType | null;
  volume: number;
}

function loadSavedPreferences(): StoredAmbientPreferences {
  if (typeof window === "undefined") {
    return { activeSoundscape: "rain", volume: 50 };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { activeSoundscape: "rain", volume: 50 };
    const parsed = JSON.parse(raw);
    return {
      activeSoundscape: parsed.activeSoundscape ?? "rain",
      volume: typeof parsed.volume === "number" ? parsed.volume : 50,
    };
  } catch {
    return { activeSoundscape: "rain", volume: 50 };
  }
}

function savePreferences(activeSoundscape: SoundscapeType | null, volume: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ activeSoundscape, volume })
    );
  } catch {
    /* Storage quota or private browsing */
  }
}

export interface AmbientSoundState {
  activeSoundscape: SoundscapeType | null;
  isPlaying: boolean;
  isPopoverOpen: boolean;
  pause: () => void;
  play: (type: SoundscapeType) => void;
  setPopoverOpen: (open: boolean) => void;
  setSleepTimer: (minutes: number | null) => void;
  setVolume: (volume: number) => void;
  sleepTimerEndsAt: number | null;
  sleepTimerMinutes: number | null;
  togglePlay: () => void;
  togglePopover: () => void;
  volume: number;
}

const initialPrefs = loadSavedPreferences();

export const useAmbientSoundStore = create<AmbientSoundState>((set, get) => ({
  activeSoundscape: initialPrefs.activeSoundscape,
  isPopoverOpen: false,
  isPlaying: false,
  pause: () => {
    void getEngine().then((engine) => engine.stop());
    set({ isPlaying: false });
  },
  play: (type: SoundscapeType) => {
    const { volume } = get();
    void getEngine().then((engine) => {
      engine.setVolume(volume);
      engine.play(type);
    });
    savePreferences(type, volume);
    set({ activeSoundscape: type, isPlaying: true });
  },
  setPopoverOpen: (isPopoverOpen) => set({ isPopoverOpen }),
  setSleepTimer: (minutes) => {
    void getEngine().then((engine) => {
      engine.setSleepTimer(minutes, () => {
        set({
          isPlaying: false,
          sleepTimerEndsAt: null,
          sleepTimerMinutes: null,
        });
      });
      set({
        sleepTimerEndsAt: engine.getSleepTimerEndsAt(),
      });
    });
    const endsAt =
      minutes && minutes > 0 ? Date.now() + minutes * 60 * 1000 : null;
    set({
      sleepTimerEndsAt: endsAt,
      sleepTimerMinutes: minutes,
    });
  },
  setVolume: (volume) => {
    const clamped = Math.max(0, Math.min(100, volume));
    void getEngine().then((engine) => {
      engine.setVolume(clamped);
    });
    savePreferences(get().activeSoundscape, clamped);
    set({ volume: clamped });
  },
  sleepTimerEndsAt: null,
  sleepTimerMinutes: null,
  togglePlay: () => {
    const { activeSoundscape, isPlaying, play } = get();
    if (isPlaying) {
      get().pause();
    } else {
      play(activeSoundscape ?? "rain");
    }
  },
  togglePopover: () => set((s) => ({ isPopoverOpen: !s.isPopoverOpen })),
  volume: initialPrefs.volume,
}));
