import type { KokoroWorkerRequest, KokoroWorkerResponse } from "./kokoroProtocol";

export type KokoroStatus = "error" | "idle" | "loading" | "ready";

export interface KokoroState {
  error: string | null;
  loadedBytes: number;
  status: KokoroStatus;
  totalBytes: number;
}

export interface KokoroAudio {
  sampleRate: number;
  samples: Float32Array;
}

const CACHE_LIMIT = 6;

function resolveBase(value: string | undefined, fallback: string | null): string | null {
  const raw = value?.trim();
  if (!raw) return fallback;
  if (typeof window === "undefined") return raw;
  return new URL(raw.endsWith("/") ? raw : `${raw}/`, window.location.href).href;
}

class KokoroClient {
  private worker: Worker | null = null;
  private nextId = 1;
  private pending = new Map<number, { reject: (error: Error) => void; resolve: (audio: KokoroAudio) => void }>();
  private cache = new Map<string, Promise<KokoroAudio>>();
  private listeners = new Set<(state: KokoroState) => void>();
  private readyWaiters: Array<{ reject: (error: Error) => void; resolve: () => void }> = [];
  private state: KokoroState = { error: null, loadedBytes: 0, status: "idle", totalBytes: 0 };

  private get location() {
    const runtimeFallback = typeof window === "undefined" ? "/ort/" : new URL("/ort/", window.location.href).href;
    return {
      modelBase: resolveBase(import.meta.env.VITE_KOKORO_MODEL_BASE, null),
      runtimeBase: resolveBase(import.meta.env.VITE_KOKORO_RUNTIME_BASE, runtimeFallback) ?? runtimeFallback,
    };
  }

  getState(): KokoroState {
    return this.state;
  }

  subscribe(listener: (state: KokoroState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  isSupported(): boolean {
    return typeof Worker !== "undefined" && typeof WebAssembly !== "undefined";
  }

  load(): Promise<void> {
    if (this.state.status === "ready") return Promise.resolve();
    const waiter = new Promise<void>((resolve, reject) => this.readyWaiters.push({ reject, resolve }));
    if (this.state.status !== "loading") {
      this.setState({ error: null, status: "loading" });
      this.send({ type: "load", ...this.location });
    }
    return waiter;
  }

  synthesize(text: string, voice: string, speed: number): Promise<KokoroAudio> {
    const key = `${voice}|${speed.toFixed(2)}|${text}`;
    const cached = this.cache.get(key);
    if (cached) {
      this.cache.delete(key);
      this.cache.set(key, cached);
      return cached;
    }
    const request = this.load().then(
      () =>
        new Promise<KokoroAudio>((resolve, reject) => {
          const id = this.nextId++;
          this.pending.set(id, { reject, resolve });
          this.send({ id, speed, text, type: "generate", voice, ...this.location });
        })
    );
    request.catch(() => this.cache.delete(key));
    this.cache.set(key, request);
    while (this.cache.size > CACHE_LIMIT) {
      const oldest = this.cache.keys().next().value;
      if (oldest === undefined) break;
      this.cache.delete(oldest);
    }
    return request;
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(new URL("./kokoro.worker.ts", import.meta.url), { name: "kokoro-tts", type: "module" });
    worker.onmessage = (event: MessageEvent<KokoroWorkerResponse>) => this.handleMessage(event.data);
    worker.onerror = (event) => this.fail(event.message || "The voice engine stopped unexpectedly.");
    this.worker = worker;
    return worker;
  }

  private send(message: KokoroWorkerRequest) {
    this.ensureWorker().postMessage(message);
  }

  private handleMessage(message: KokoroWorkerResponse) {
    switch (message.type) {
      case "progress":
        this.setState({ loadedBytes: message.loaded, totalBytes: message.total });
        break;
      case "ready":
        this.setState({ error: null, status: "ready" });
        for (const waiter of this.readyWaiters.splice(0)) waiter.resolve();
        break;
      case "error":
        this.fail(message.message);
        break;
      case "audio": {
        const entry = this.pending.get(message.id);
        this.pending.delete(message.id);
        entry?.resolve({ sampleRate: message.sampleRate, samples: message.samples });
        break;
      }
      case "failed": {
        const entry = this.pending.get(message.id);
        this.pending.delete(message.id);
        entry?.reject(new Error(message.message));
        break;
      }
    }
  }

  private fail(message: string) {
    this.setState({ error: message, status: "error" });
    const error = new Error(message);
    for (const waiter of this.readyWaiters.splice(0)) waiter.reject(error);
    for (const entry of this.pending.values()) entry.reject(error);
    this.pending.clear();
    this.cache.clear();
    this.worker?.terminate();
    this.worker = null;
  }

  private setState(patch: Partial<KokoroState>) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener(this.state);
  }
}

export const kokoroClient = new KokoroClient();

export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  writeText(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]!));
    view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}
