export interface AuthResponseUser {
  email: string | null;
  id: string;
}

/** Absolute URL for an auth endpoint; VITE_API_BASE_URL points desktop/mobile builds at the deployed API. */
export function authApiUrl(path: string): string {
  const base = import.meta.env.VITE_API_BASE_URL || window.location.origin;
  return new URL(path, base.endsWith("/") ? base : `${base}/`).toString();
}
