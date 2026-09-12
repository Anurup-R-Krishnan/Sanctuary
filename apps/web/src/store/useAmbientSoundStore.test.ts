import { beforeEach, describe, expect, it, spyOn } from "bun:test";

import { ambientAudioEngine } from "@/audio/ambientSoundscape";

import { useAmbientSoundStore } from "./useAmbientSoundStore";

describe("useAmbientSoundStore", () => {
  beforeEach(() => {
    useAmbientSoundStore.setState({
      activeSoundscape: "rain",
      isPopoverOpen: false,
      isPlaying: false,
      sleepTimerEndsAt: null,
      sleepTimerMinutes: null,
      volume: 50,
    });
  });

  it("updates state and calls engine on play", async () => {
    const playSpy = spyOn(ambientAudioEngine, "play").mockImplementation(() => {});
    const volSpy = spyOn(ambientAudioEngine, "setVolume").mockImplementation(() => {});

    useAmbientSoundStore.getState().play("waves");
    await new Promise((r) => setTimeout(r, 10));

    expect(playSpy).toHaveBeenCalledWith("waves");
    expect(volSpy).toHaveBeenCalledWith(50);
    expect(useAmbientSoundStore.getState().activeSoundscape).toBe("waves");
    expect(useAmbientSoundStore.getState().isPlaying).toBe(true);

    playSpy.mockRestore();
    volSpy.mockRestore();
  });

  it("pauses soundscape and updates isPlaying", async () => {
    const stopSpy = spyOn(ambientAudioEngine, "stop").mockImplementation(() => {});
    useAmbientSoundStore.setState({ isPlaying: true });

    useAmbientSoundStore.getState().pause();
    await new Promise((r) => setTimeout(r, 10));

    expect(stopSpy).toHaveBeenCalled();
    expect(useAmbientSoundStore.getState().isPlaying).toBe(false);

    stopSpy.mockRestore();
  });

  it("toggles play/pause correctly", async () => {
    const playSpy = spyOn(ambientAudioEngine, "play").mockImplementation(() => {});
    const stopSpy = spyOn(ambientAudioEngine, "stop").mockImplementation(() => {});

    // Inactive -> play
    useAmbientSoundStore.getState().togglePlay();
    await new Promise((r) => setTimeout(r, 10));
    expect(playSpy).toHaveBeenCalledWith("rain");
    expect(useAmbientSoundStore.getState().isPlaying).toBe(true);

    // Active -> pause
    useAmbientSoundStore.getState().togglePlay();
    await new Promise((r) => setTimeout(r, 10));
    expect(stopSpy).toHaveBeenCalled();
    expect(useAmbientSoundStore.getState().isPlaying).toBe(false);

    playSpy.mockRestore();
    stopSpy.mockRestore();
  });

  it("adjusts volume and syncs to engine", async () => {
    const volSpy = spyOn(ambientAudioEngine, "setVolume").mockImplementation(() => {});

    useAmbientSoundStore.getState().setVolume(75);
    await new Promise((r) => setTimeout(r, 10));
    expect(volSpy).toHaveBeenCalledWith(75);
    expect(useAmbientSoundStore.getState().volume).toBe(75);

    // Clamp bounds
    useAmbientSoundStore.getState().setVolume(120);
    await new Promise((r) => setTimeout(r, 10));
    expect(useAmbientSoundStore.getState().volume).toBe(100);

    useAmbientSoundStore.getState().setVolume(-10);
    await new Promise((r) => setTimeout(r, 10));
    expect(useAmbientSoundStore.getState().volume).toBe(0);

    volSpy.mockRestore();
  });

  it("toggles and sets popover open state", () => {
    expect(useAmbientSoundStore.getState().isPopoverOpen).toBe(false);

    useAmbientSoundStore.getState().togglePopover();
    expect(useAmbientSoundStore.getState().isPopoverOpen).toBe(true);

    useAmbientSoundStore.getState().setPopoverOpen(false);
    expect(useAmbientSoundStore.getState().isPopoverOpen).toBe(false);
  });

  it("sets sleep timer and tracks countdown", async () => {
    const timerSpy = spyOn(ambientAudioEngine, "setSleepTimer").mockImplementation(
      () => {}
    );
    const endSpy = spyOn(ambientAudioEngine, "getSleepTimerEndsAt").mockReturnValue(
      Date.now() + 900000
    );

    useAmbientSoundStore.getState().setSleepTimer(15);
    await new Promise((r) => setTimeout(r, 10));
    expect(timerSpy).toHaveBeenCalled();
    expect(useAmbientSoundStore.getState().sleepTimerMinutes).toBe(15);

    timerSpy.mockRestore();
    endSpy.mockRestore();
  });
});
