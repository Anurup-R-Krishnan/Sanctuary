import { env } from "@huggingface/transformers";
import { KokoroTTS } from "kokoro-js";

import type { KokoroVoiceId, KokoroWorkerRequest, KokoroWorkerResponse } from "./kokoroProtocol";

import { KOKORO_MODEL_ID } from "./kokoroProtocol";

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<KokoroWorkerRequest>) => void) | null;
  postMessage: (message: KokoroWorkerResponse, transfer?: Transferable[]) => void;
};

let ttsPromise: Promise<KokoroTTS> | null = null;
let device: "cpu" | "gpu" = "cpu";
let queue: Promise<unknown> = Promise.resolve();
const fileProgress = new Map<string, { loaded: number; total: number }>();

function post(message: KokoroWorkerResponse, transfer?: Transferable[]) {
  scope.postMessage(message, transfer);
}

function currentThreads(): number {
  return globalThis.crossOriginIsolated ? Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 2) - 1)) : 1;
}

function configure(runtimeBase: string) {
  const onnx = env.backends.onnx as { wasm?: { numThreads?: number; wasmPaths?: string } };
  if (onnx.wasm) {
    onnx.wasm.wasmPaths = runtimeBase;
    onnx.wasm.numThreads = currentThreads();
  }
  env.allowLocalModels = false;
}

function reportProgress(info: unknown) {
  const data = info as { file?: string; loaded?: number; status?: string; total?: number };
  if (data.status !== "progress" || !data.file || !data.total) return;
  fileProgress.set(data.file, { loaded: data.loaded ?? 0, total: data.total });
  let loaded = 0;
  let total = 0;
  for (const entry of fileProgress.values()) {
    loaded += entry.loaded;
    total += entry.total;
  }
  post({ loaded, total, type: "progress" });
}

interface GpuAdapterLike {
  info?: { architecture?: string; isFallbackAdapter?: boolean };
  isFallbackAdapter?: boolean;
}

const GPU_WARMUP_LIMIT_MS = 4000;

async function hasHardwareGpu(): Promise<boolean> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(options?: { powerPreference?: string }): Promise<GpuAdapterLike | null> } }).gpu;
  if (!gpu) return false;
  try {
    const adapter = await gpu.requestAdapter({ powerPreference: "high-performance" });
    if (!adapter) return false;
    const fallback = adapter.isFallbackAdapter ?? adapter.info?.isFallbackAdapter ?? false;
    return !fallback && adapter.info?.architecture !== "swiftshader";
  } catch {
    return false;
  }
}

async function loadModel(): Promise<KokoroTTS> {
  if (await hasHardwareGpu()) {
    try {
      const tts = await KokoroTTS.from_pretrained(KOKORO_MODEL_ID, { device: "webgpu", dtype: "fp32", progress_callback: reportProgress });
      const started = performance.now();
      await tts.generate("Ready to read.", { voice: "af_heart" });
      if (performance.now() - started < GPU_WARMUP_LIMIT_MS) {
        device = "gpu";
        return tts;
      }
    } catch {
      fileProgress.clear();
    }
    fileProgress.clear();
  }
  device = "cpu";
  return KokoroTTS.from_pretrained(KOKORO_MODEL_ID, { device: "wasm", dtype: "q8", progress_callback: reportProgress });
}

function load(runtimeBase: string): Promise<KokoroTTS> {
  if (!ttsPromise) {
    configure(runtimeBase);
    ttsPromise = loadModel();
    ttsPromise.catch(() => {
      ttsPromise = null;
    });
  }
  return ttsPromise;
}

scope.onmessage = (event) => {
  const request = event.data;
  if (request.type === "load") {
    load(request.runtimeBase)
      .then(() => post({ device, threads: currentThreads(), type: "ready" }))
      .catch((error: unknown) => post({ message: error instanceof Error ? error.message : String(error), type: "error" }));
    return;
  }
  const job = queue.then(async () => {
    const tts = await load(request.runtimeBase);
    const audio = await tts.generate(request.text, {
      speed: request.speed,
      voice: request.voice as KokoroVoiceId,
    });
    const samples = audio.audio instanceof Float32Array ? audio.audio : new Float32Array(audio.audio);
    post({ id: request.id, sampleRate: audio.sampling_rate, samples, type: "audio" }, [samples.buffer]);
  }).catch((error: unknown) => {
    post({ id: request.id, message: error instanceof Error ? error.message : String(error), type: "failed" });
  });
  queue = job;
};
