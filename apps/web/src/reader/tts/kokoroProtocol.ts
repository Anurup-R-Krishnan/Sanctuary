export const KOKORO_MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";

export const KOKORO_VOICES = [
  { id: "af_heart", label: "Heart", region: "American", gender: "Female" },
  { id: "af_bella", label: "Bella", region: "American", gender: "Female" },
  { id: "af_nicole", label: "Nicole", region: "American", gender: "Female" },
  { id: "af_sarah", label: "Sarah", region: "American", gender: "Female" },
  { id: "af_kore", label: "Kore", region: "American", gender: "Female" },
  { id: "am_michael", label: "Michael", region: "American", gender: "Male" },
  { id: "am_fenrir", label: "Fenrir", region: "American", gender: "Male" },
  { id: "am_puck", label: "Puck", region: "American", gender: "Male" },
  { id: "bf_emma", label: "Emma", region: "British", gender: "Female" },
  { id: "bf_isabella", label: "Isabella", region: "British", gender: "Female" },
  { id: "bm_george", label: "George", region: "British", gender: "Male" },
  { id: "bm_fable", label: "Fable", region: "British", gender: "Male" },
] as const;

export type KokoroVoiceId = (typeof KOKORO_VOICES)[number]["id"];

export const DEFAULT_KOKORO_VOICE: KokoroVoiceId = "af_heart";

export function isKokoroVoice(value: unknown): value is KokoroVoiceId {
  return typeof value === "string" && KOKORO_VOICES.some((voice) => voice.id === value);
}

interface KokoroLocation {
  modelBase: string | null;
  runtimeBase: string;
}

export type KokoroWorkerRequest =
  | ({ type: "load" } & KokoroLocation)
  | ({ id: number; speed: number; text: string; type: "generate"; voice: string } & KokoroLocation);

export type KokoroWorkerResponse =
  | { id: number; message: string; type: "failed" }
  | { id: number; sampleRate: number; samples: Float32Array; type: "audio" }
  | { loaded: number; total: number; type: "progress" }
  | { message: string; type: "error" }
  | { type: "ready" };
