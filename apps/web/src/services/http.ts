const errorKeys = new Set<string>();

export function logErrorOnce(key: string, message: string, error: unknown) {
  if (errorKeys.has(key)) return;
  errorKeys.add(key);
  console.error(message, error);
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "HttpError";
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
      : text
        ? `${fallbackMessage} (${res.status}): ${text.slice(0, 200)}`
        : `${fallbackMessage} (${res.status})`;
    throw new HttpError(res.status, errMessage);
  }
  return parsed as T;
}

export const buildAuthHeaders = (token?: string): HeadersInit => {
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
};

export const encodeId = (id: string): string => encodeURIComponent(id);
