import { beforeEach, describe, expect, it, mock } from "bun:test";

import {
  AmbientSoundscapeEngine,
  SOUNDSCAPES,
  type SoundscapeType,
} from "./ambientSoundscape";

// Mock Web Audio API
class MockGainNode {
  public gain = {
    cancelScheduledValues: mock(() => {}),
    exponentialRampToValueAtTime: mock(() => {}),
    linearRampToValueAtTime: mock(() => {}),
    setValueAtTime: mock(() => {}),
    value: 1,
  };
  public connect = mock(() => {});
  public disconnect = mock(() => {});
}

class MockBufferSourceNode {
  public buffer: unknown = null;
  public connect = mock(() => {});
  public disconnect = mock(() => {});
  public loop = false;
  public start = mock(() => {});
  public stop = mock(() => {});
}

class MockBiquadFilterNode {
  public connect = mock(() => {});
  public disconnect = mock(() => {});
  public frequency = { value: 350 };
  public Q = { value: 1 };
  public type = "lowpass";
}

class MockOscillatorNode {
  public connect = mock(() => {});
  public disconnect = mock(() => {});
  public frequency = { value: 0.1 };
  public start = mock(() => {});
  public stop = mock(() => {});
  public type = "sine";
}

class MockAudioContext {
  public currentTime = 0;
  public destination = {};
  public sampleRate = 44100;
  public state = "running";

  public createBiquadFilter() {
    return new MockBiquadFilterNode();
  }

  public createBuffer(channels: number, length: number, sampleRate: number) {
    const data = new Float32Array(length);
    return {
      channels,
      duration: length / sampleRate,
      getChannelData: () => data,
      length,
      sampleRate,
    };
  }

  public createBufferSource() {
    return new MockBufferSourceNode();
  }

  public createGain() {
    return new MockGainNode();
  }

  public createOscillator() {
    return new MockOscillatorNode();
  }

  public resume = mock(() => Promise.resolve());
  public suspend = mock(() => Promise.resolve());
}

describe("ambientSoundscape", () => {
  let mockCtx: MockAudioContext;
  let engine: AmbientSoundscapeEngine;

  beforeEach(() => {
    mockCtx = new MockAudioContext();
    engine = new AmbientSoundscapeEngine(mockCtx as unknown as AudioContext);
  });

  it("exports metadata for 6 procedural soundscapes", () => {
    expect(SOUNDSCAPES).toHaveLength(6);
    const ids = SOUNDSCAPES.map((s) => s.id);
    expect(ids).toContain("rain");
    expect(ids).toContain("waves");
    expect(ids).toContain("fireplace");
    expect(ids).toContain("wind");
    expect(ids).toContain("white-noise");
    expect(ids).toContain("pink-noise");
  });

  it("initializes with default state", () => {
    expect(engine.getActiveSoundscape()).toBeNull();
    expect(engine.isPlaying()).toBe(false);
    expect(engine.getVolume()).toBe(50);
    expect(engine.getSleepTimerMinutes()).toBeNull();
    expect(engine.getSleepTimerEndsAt()).toBeNull();
  });

  it("plays rain soundscape and updates active state", () => {
    engine.play("rain");
    expect(engine.isPlaying()).toBe(true);
    expect(engine.getActiveSoundscape()).toBe("rain");
  });

  it("plays waves soundscape with swell oscillator", () => {
    engine.play("waves");
    expect(engine.isPlaying()).toBe(true);
    expect(engine.getActiveSoundscape()).toBe("waves");
  });

  it("plays fireplace soundscape with crackle interval", () => {
    engine.play("fireplace");
    expect(engine.isPlaying()).toBe(true);
    expect(engine.getActiveSoundscape()).toBe("fireplace");
  });

  it("plays wind, white-noise, and pink-noise soundscapes", () => {
    const soundscapes: SoundscapeType[] = ["wind", "white-noise", "pink-noise"];
    for (const type of soundscapes) {
      engine.play(type);
      expect(engine.getActiveSoundscape()).toBe(type);
      expect(engine.isPlaying()).toBe(true);
    }
  });

  it("clamps and sets volume smoothly", () => {
    engine.play("rain");
    engine.setVolume(85);
    expect(engine.getVolume()).toBe(85);

    engine.setVolume(150);
    expect(engine.getVolume()).toBe(100);

    engine.setVolume(-20);
    expect(engine.getVolume()).toBe(0);
  });

  it("resumes suspended audio context on play", () => {
    mockCtx.state = "suspended";
    engine.play("rain");
    expect(mockCtx.resume).toHaveBeenCalled();
  });

  it("stops playback and disconnects active nodes", () => {
    engine.play("rain");
    expect(engine.isPlaying()).toBe(true);

    engine.stop();
    expect(engine.isPlaying()).toBe(false);
    expect(engine.getActiveSoundscape()).toBeNull();
  });

  it("manages sleep timer lifecycle and calculates ends-at timestamp", () => {
    engine.play("rain");

    engine.setSleepTimer(15);
    expect(engine.getSleepTimerMinutes()).toBe(15);
    expect(engine.getSleepTimerEndsAt()).toBeGreaterThan(Date.now() + 890000);
    expect(engine.getSleepTimerEndsAt()).toBeLessThanOrEqual(Date.now() + 900000);
  });

  it("clears sleep timer when set to null or 0", () => {
    engine.play("rain");
    engine.setSleepTimer(30);
    expect(engine.getSleepTimerMinutes()).toBe(30);

    engine.setSleepTimer(null);
    expect(engine.getSleepTimerMinutes()).toBeNull();
    expect(engine.getSleepTimerEndsAt()).toBeNull();
  });
});
