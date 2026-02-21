const errorKeys = new Set<string>();

export function logErrorOnce(key: string, message: string, error: unknown) {
  if (errorKeys.has(key)) return;
  errorKeys.add(key);
  console.error(message, error);
}

export async function readJsonSafely<T>(res: Response, fallbackMessage: string): Promise<T> {
  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }
  if (!res.ok) {
    const errMessage = typeof (parsed as { error?: unknown })?.error === "string"
      ? (parsed as { error: string }).error
      : `${fallbackMessage} (${res.status})`;
    throw new Error(errMessage);
  }
  return (parsed || {}) as T;
}
