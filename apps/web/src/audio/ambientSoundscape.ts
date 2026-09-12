export * from "./ambientTypes";

import type { SoundscapeType } from "./ambientTypes";

export interface AmbientSoundscapeState {
  activeSoundscape: SoundscapeType | null;
  isPlaying: boolean;
  sleepTimerEndsAt: number | null;
  sleepTimerMinutes: number | null;
  volume: number; // 0 to 100
}

export class AmbientSoundscapeEngine {
  private activeNodes: Array<{ disconnect: () => void; stop?: () => void }> = [];
  private activeSoundscape: SoundscapeType | null = null;
  private audioCtx: AudioContext | null = null;
  private brownNoiseBuffer: AudioBuffer | null = null;
  private crackleIntervalId: ReturnType<typeof setInterval> | null = null;
  private masterGain: GainNode | null = null;
  private pinkNoiseBuffer: AudioBuffer | null = null;
  private sleepTimerEndsAt: number | null = null;
  private sleepTimerId: ReturnType<typeof setTimeout> | null = null;
  private sleepTimerMinutes: number | null = null;
  private volume: number = 50;
  private whiteNoiseBuffer: AudioBuffer | null = null;

  constructor(providedCtx?: AudioContext) {
    if (providedCtx) {
      this.audioCtx = providedCtx;
    }
  }

  public getActiveSoundscape(): SoundscapeType | null {
    return this.activeSoundscape;
  }

  public getSleepTimerEndsAt(): number | null {
    return this.sleepTimerEndsAt;
  }

  public getSleepTimerMinutes(): number | null {
    return this.sleepTimerMinutes;
  }

  public getState(): AmbientSoundscapeState {
    return {
      activeSoundscape: this.activeSoundscape,
      isPlaying: this.activeSoundscape !== null,
      sleepTimerEndsAt: this.sleepTimerEndsAt,
      sleepTimerMinutes: this.sleepTimerMinutes,
      volume: this.volume,
    };
  }

  public getVolume(): number {
    return this.volume;
  }

  public isPlaying(): boolean {
    return this.activeSoundscape !== null;
  }

  public play(type: SoundscapeType): void {
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => { /* ignore */ });
    }

    if (this.activeSoundscape === type) {
      return;
    }

    this.stopActiveSoundscape(false);
    this.activeSoundscape = type;

    switch (type) {
      case "fireplace":
        this.startFireplace(ctx);
        break;
      case "pink-noise":
        this.startPinkNoise(ctx);
        break;
      case "rain":
        this.startRain(ctx);
        break;
      case "waves":
        this.startWaves(ctx);
        break;
      case "white-noise":
        this.startWhiteNoise(ctx);
        break;
      case "wind":
        this.startWind(ctx);
        break;
    }

    this.applyVolume(this.volume, true);
  }

  public setSleepTimer(minutes: number | null, onExpire?: () => void): void {
    this.clearSleepTimer();
    this.sleepTimerMinutes = minutes;

    if (minutes === null || minutes <= 0) {
      this.sleepTimerEndsAt = null;
      return;
    }

    this.sleepTimerEndsAt = Date.now() + minutes * 60 * 1000;
    const ms = minutes * 60 * 1000;

    this.sleepTimerId = setTimeout(() => {
      this.fadeOutAndStop(3.0, () => {
        this.clearSleepTimer();
        onExpire?.();
      });
    }, ms);
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(100, volume));
    this.applyVolume(this.volume, false);
  }

  public stop(): void {
    this.stopActiveSoundscape(true);
  }

  private applyVolume(vol: number, rampUp: boolean): void {
    if (!this.masterGain || !this.audioCtx) return;
    const normalized = Math.max(0, Math.min(1, vol / 100));
    const now = this.audioCtx.currentTime;

    try {
      if (rampUp) {
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(0, now);
        this.masterGain.gain.linearRampToValueAtTime(normalized, now + 0.3);
      } else {
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.linearRampToValueAtTime(normalized, now + 0.05);
      }
    } catch {
      this.masterGain.gain.value = normalized;
    }
  }

  private clearSleepTimer(): void {
    if (this.sleepTimerId) {
      clearTimeout(this.sleepTimerId);
      this.sleepTimerId = null;
    }
    this.sleepTimerEndsAt = null;
    this.sleepTimerMinutes = null;
  }

  private ensureAudioContext(): AudioContext | null {
    if (this.audioCtx) return this.audioCtx;

    const AudioContextClass =
      typeof window !== "undefined"
        ? window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        : null;

    if (!AudioContextClass) return null;

    try {
      this.audioCtx = new AudioContextClass();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = this.volume / 100;
      this.masterGain.connect(this.audioCtx.destination);
    } catch {
      return null;
    }

    return this.audioCtx;
  }

  private fadeOutAndStop(durationSeconds: number, callback?: () => void): void {
    if (!this.masterGain || !this.audioCtx || !this.activeSoundscape) {
      this.stopActiveSoundscape(true);
      callback?.();
      return;
    }

    const now = this.audioCtx.currentTime;
    try {
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(0.0001, now + durationSeconds);
    } catch {
      this.masterGain.gain.value = 0;
    }

    setTimeout(() => {
      this.stopActiveSoundscape(true);
      callback?.();
    }, durationSeconds * 1000);
  }

  private getBrownNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.brownNoiseBuffer) return this.brownNoiseBuffer;
    const duration = 4.0;
    const sampleRate = ctx.sampleRate || 44100;
    const frameCount = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const output = buffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < frameCount; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Gain compensation
    }

    this.brownNoiseBuffer = buffer;
    return buffer;
  }

  private getPinkNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.pinkNoiseBuffer) return this.pinkNoiseBuffer;
    const duration = 4.0;
    const sampleRate = ctx.sampleRate || 44100;
    const frameCount = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const output = buffer.getChannelData(0);

    // Paul Kellet's filtered noise algorithm for accurate -3dB/octave pink noise
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;

    for (let i = 0; i < frameCount; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;
      output[i] = pink * 0.11;
    }

    this.pinkNoiseBuffer = buffer;
    return buffer;
  }

  private getWhiteNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.whiteNoiseBuffer) return this.whiteNoiseBuffer;
    const duration = 4.0;
    const sampleRate = ctx.sampleRate || 44100;
    const frameCount = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const output = buffer.getChannelData(0);

    for (let i = 0; i < frameCount; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.whiteNoiseBuffer = buffer;
    return buffer;
  }

  private startFireplace(ctx: AudioContext): void {
    if (!this.masterGain) return;

    // 1. Deep rumble (brown noise through lowpass)
    const rumbleSource = ctx.createBufferSource();
    rumbleSource.buffer = this.getBrownNoiseBuffer(ctx);
    rumbleSource.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 180;

    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.8;

    rumbleSource.connect(lowpass);
    lowpass.connect(rumbleGain);
    rumbleGain.connect(this.masterGain);
    rumbleSource.start();

    this.activeNodes.push({
      disconnect: () => {
        rumbleSource.disconnect();
        lowpass.disconnect();
        rumbleGain.disconnect();
      },
      stop: () => {
        try {
          rumbleSource.stop();
        } catch { /* ignore */ }
      },
    });

    // 2. Procedural crackle pops (scheduled transient impulses)
    this.crackleIntervalId = setInterval(() => {
      if (!this.masterGain || !this.audioCtx || this.activeSoundscape !== "fireplace") return;

      // Random burst chance
      if (Math.random() > 0.45) return;

      const popSource = ctx.createBufferSource();
      popSource.buffer = this.getWhiteNoiseBuffer(ctx);

      const popFilter = ctx.createBiquadFilter();
      popFilter.type = "bandpass";
      popFilter.frequency.value = 1200 + Math.random() * 2400;
      popFilter.Q.value = 6.0;

      const popGain = ctx.createGain();
      const now = ctx.currentTime;
      const duration = 0.015 + Math.random() * 0.035;
      const popVol = 0.15 + Math.random() * 0.55;

      try {
        popGain.gain.setValueAtTime(popVol, now);
        popGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        popSource.connect(popFilter);
        popFilter.connect(popGain);
        popGain.connect(this.masterGain);

        popSource.start(now);
        popSource.stop(now + duration + 0.02);

        setTimeout(() => {
          try {
            popSource.disconnect();
            popFilter.disconnect();
            popGain.disconnect();
          } catch { /* ignore */ }
        }, (duration + 0.05) * 1000);
      } catch { /* ignore */ }
    }, 120);
  }

  private startPinkNoise(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const source = ctx.createBufferSource();
    source.buffer = this.getPinkNoiseBuffer(ctx);
    source.loop = true;

    const gain = ctx.createGain();
    gain.gain.value = 0.7;

    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();

    this.activeNodes.push({
      disconnect: () => {
        source.disconnect();
        gain.disconnect();
      },
      stop: () => {
        try {
          source.stop();
        } catch { /* ignore */ }
      },
    });
  }

  private startRain(ctx: AudioContext): void {
    if (!this.masterGain) return;

    // Continuous rain body (pink noise filtered)
    const rainSource = ctx.createBufferSource();
    rainSource.buffer = this.getPinkNoiseBuffer(ctx);
    rainSource.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 1100;

    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 240;

    const rainGain = ctx.createGain();
    rainGain.gain.value = 0.85;

    rainSource.connect(lowpass);
    lowpass.connect(highpass);
    highpass.connect(rainGain);
    rainGain.connect(this.masterGain);
    rainSource.start();

    // Secondary soft droplets (filtered white noise resonance)
    const dropletSource = ctx.createBufferSource();
    dropletSource.buffer = this.getWhiteNoiseBuffer(ctx);
    dropletSource.loop = true;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 2200;
    bandpass.Q.value = 2.0;

    const dropletGain = ctx.createGain();
    dropletGain.gain.value = 0.25;

    dropletSource.connect(bandpass);
    bandpass.connect(dropletGain);
    dropletGain.connect(this.masterGain);
    dropletSource.start();

    this.activeNodes.push({
      disconnect: () => {
        rainSource.disconnect();
        lowpass.disconnect();
        highpass.disconnect();
        rainGain.disconnect();
        dropletSource.disconnect();
        bandpass.disconnect();
        dropletGain.disconnect();
      },
      stop: () => {
        try {
          rainSource.stop();
          dropletSource.stop();
        } catch { /* ignore */ }
      },
    });
  }

  private startWaves(ctx: AudioContext): void {
    if (!this.masterGain) return;

    const waveSource = ctx.createBufferSource();
    waveSource.buffer = this.getPinkNoiseBuffer(ctx);
    waveSource.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 420;
    filter.Q.value = 1.1;

    const waveGain = ctx.createGain();
    waveGain.gain.value = 0.45;

    // LFO to swell wave amplitude and frequency periodically (11 second period)
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.09;

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.35;

    lfo.connect(lfoGain);
    lfoGain.connect(waveGain.gain);

    waveSource.connect(filter);
    filter.connect(waveGain);
    waveGain.connect(this.masterGain);

    waveSource.start();
    lfo.start();

    this.activeNodes.push({
      disconnect: () => {
        waveSource.disconnect();
        filter.disconnect();
        waveGain.disconnect();
        lfo.disconnect();
        lfoGain.disconnect();
      },
      stop: () => {
        try {
          waveSource.stop();
          lfo.stop();
        } catch { /* ignore */ }
      },
    });
  }

  private startWhiteNoise(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const source = ctx.createBufferSource();
    source.buffer = this.getWhiteNoiseBuffer(ctx);
    source.loop = true;

    const gain = ctx.createGain();
    gain.gain.value = 0.5;

    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();

    this.activeNodes.push({
      disconnect: () => {
        source.disconnect();
        gain.disconnect();
      },
      stop: () => {
        try {
          source.stop();
        } catch { /* ignore */ }
      },
    });
  }

  private startWind(ctx: AudioContext): void {
    if (!this.masterGain) return;

    const windSource = ctx.createBufferSource();
    windSource.buffer = this.getPinkNoiseBuffer(ctx);
    windSource.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 340;
    filter.Q.value = 2.2;

    const windGain = ctx.createGain();
    windGain.gain.value = 0.55;

    // Slow LFO for wind gust swells (8 second period)
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.125;

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.25;

    lfo.connect(lfoGain);
    lfoGain.connect(windGain.gain);

    windSource.connect(filter);
    filter.connect(windGain);
    windGain.connect(this.masterGain);

    windSource.start();
    lfo.start();

    this.activeNodes.push({
      disconnect: () => {
        windSource.disconnect();
        filter.disconnect();
        windGain.disconnect();
        lfo.disconnect();
        lfoGain.disconnect();
      },
      stop: () => {
        try {
          windSource.stop();
          lfo.stop();
        } catch { /* ignore */ }
      },
    });
  }

  private stopActiveSoundscape(resetTimer: boolean): void {
    if (this.crackleIntervalId) {
      clearInterval(this.crackleIntervalId);
      this.crackleIntervalId = null;
    }

    for (const node of this.activeNodes) {
      try {
        node.stop?.();
      } catch { /* ignore */ }
      try {
        node.disconnect();
      } catch { /* ignore */ }
    }
    this.activeNodes = [];
    this.activeSoundscape = null;

    if (resetTimer) {
      this.clearSleepTimer();
    }
  }
}

// Singleton audio engine instance for reader session
export const ambientAudioEngine = new AmbientSoundscapeEngine();
