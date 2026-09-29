import { env } from "@huggingface/transformers";
import { KokoroTTS } from "kokoro-js";

import type { KokoroVoiceId, KokoroWorkerRequest, KokoroWorkerResponse } from "./kokoroProtocol";

import { KOKORO_MODEL_ID } from "./kokoroProtocol";

const HF_PREFIX = `https://huggingface.co/${KOKORO_MODEL_ID}/resolve/main/`;

const scope = self as unknown as {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  onmessage: ((event: MessageEvent<KokoroWorkerRequest>) => void) | null;
  postMessage: (message: KokoroWorkerResponse, transfer?: Transferable[]) => void;
};

let ttsPromise: Promise<KokoroTTS> | null = null;
let queue: Promise<unknown> = Promise.resolve();
const fileProgress = new Map<string, { loaded: number; total: number }>();

function post(message: KokoroWorkerResponse, transfer?: Transferable[]) {
  scope.postMessage(message, transfer);
}

function configure(modelBase: string | null, runtimeBase: string) {
  const onnx = env.backends.onnx as { wasm?: { numThreads?: number; wasmPaths?: string } };
  if (onnx.wasm) {
    onnx.wasm.wasmPaths = runtimeBase;
    onnx.wasm.numThreads = globalThis.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
  }
  env.allowLocalModels = false;
  if (!modelBase) return;
  const base = modelBase.endsWith("/") ? modelBase : `${modelBase}/`;
  env.remoteHost = base;
  env.remotePathTemplate = "{model}/";
  const nativeFetch = scope.fetch.bind(self);
  scope.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith(HF_PREFIX)) return nativeFetch(`${base}${KOKORO_MODEL_ID}/${url.slice(HF_PREFIX.length)}`, init);
    return nativeFetch(input, init);
  };
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

function load(modelBase: string | null, runtimeBase: string): Promise<KokoroTTS> {
  if (!ttsPromise) {
    configure(modelBase, runtimeBase);
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
    load(request.modelBase, request.runtimeBase)
      .then(() => post({ type: "ready" }))
      .catch((error: unknown) => post({ message: error instanceof Error ? error.message : String(error), type: "error" }));
    return;
  }
  const job = queue.then(async () => {
    const tts = await load(request.modelBase, request.runtimeBase);
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
