import { getGuestId } from "./guestIdentity";
const errorKeys = new Set<string>();

export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

type RetryOptions = {
  retries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
};

export function buildApiHeaders(
  token?: string,
  base: HeadersInit = {},
): HeadersInit {
  const headers = new Headers(base);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  } else {
    headers.set("X-Guest-Id", getGuestId());
  }
  return headers;
}

export function logErrorOnce(key: string, message: string, error: unknown) {
  if (errorKeys.has(key)) return;
  errorKeys.add(key);
  console.error(message, error);
}

export function logError(message: string, error: unknown) {
  console.error(message, error);
}

export function logWarn(message: string, error: unknown) {
  console.warn(message, error);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(status: number): boolean {
  return status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: RetryOptions = {},
): Promise<Response> {
  const retries = options.retries ?? 2;
  const retryDelayMs = options.retryDelayMs ?? 250;
  const timeoutMs = options.timeoutMs ?? 10_000;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const timeoutController = new AbortController();
      const externalSignal = init?.signal;
      let timedOut = false;
      const onExternalAbort = () => timeoutController.abort();
      if (externalSignal) {
        if (externalSignal.aborted) {
          throw new Error("Request was aborted");
        }
        externalSignal.addEventListener("abort", onExternalAbort, { once: true });
      }
      const timeoutId = setTimeout(() => {
        timedOut = true;
        timeoutController.abort();
      }, timeoutMs);

      let response: Response;
      try {
        response = await fetch(input, { ...init, signal: timeoutController.signal });
      } catch (error) {
        if (timedOut) {
          throw new Error(`Request timed out after ${timeoutMs}ms`);
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
        externalSignal?.removeEventListener("abort", onExternalAbort);
      }

      if (response.ok || !shouldRetry(response.status) || attempt >= retries) {
        return response;
      }
    } catch (error) {
      if (attempt >= retries) throw error;
    }
    attempt += 1;
    await sleep(retryDelayMs * attempt);
  }
}

export async function readJsonSafely<T>(res: Response, fallbackMessage: string): Promise<T> {
  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      if (res.ok) {
        throw new Error(`${fallbackMessage}: invalid JSON response`);
      }
      parsed = null;
    }
  }
  if (!res.ok) {
    const errMessage = typeof (parsed as { error?: unknown })?.error === "string"
      ? (parsed as { error: string }).error
      : `${fallbackMessage} (${res.status})`;
    throw new ApiError(errMessage, res.status, parsed);
  }
  return parsed as T;
}
