import { env } from "@huggingface/transformers";
import { KokoroTTS } from "kokoro-js";

import type { KokoroVoiceId, KokoroWorkerRequest, KokoroWorkerResponse } from "./kokoroProtocol";

import { KOKORO_MODEL_ID } from "./kokoroProtocol";

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<KokoroWorkerRequest>) => void) | null;
  postMessage: (message: KokoroWorkerResponse, transfer?: Transferable[]) => void;
};

let ttsPromise: Promise<KokoroTTS> | null = null;
let queue: Promise<unknown> = Promise.resolve();
const fileProgress = new Map<string, { loaded: number; total: number }>();

function post(message: KokoroWorkerResponse, transfer?: Transferable[]) {
  scope.postMessage(message, transfer);
}

function configure(runtimeBase: string) {
  const onnx = env.backends.onnx as { wasm?: { numThreads?: number; wasmPaths?: string } };
  if (onnx.wasm) {
    onnx.wasm.wasmPaths = runtimeBase;
    onnx.wasm.numThreads = globalThis.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
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

function load(runtimeBase: string): Promise<KokoroTTS> {
  if (!ttsPromise) {
    configure(runtimeBase);
    ttsPromise = KokoroTTS.from_pretrained(KOKORO_MODEL_ID, {
      device: "wasm",
      dtype: "q8",
      progress_callback: reportProgress,
    });
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
      .then(() => post({ type: "ready" }))
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
