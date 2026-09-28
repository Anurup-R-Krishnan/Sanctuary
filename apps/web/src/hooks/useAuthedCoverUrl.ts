import { useEffect, useState } from "react";

import { useSanctuaryApi } from "@/api/useSanctuaryApi";

/**
 * Covers stored on the server are served from `/api/content/<id>?asset=cover`,
 * which needs the Bearer token — a plain <img src> can't send it. This hook
 * fetches such URLs with auth and returns a blob URL; any other URL (local
 * blob:, data:, remote catalog images) is returned unchanged.
 *
 * Blob URLs are cached per cover URL for the page's lifetime, so every card
 * showing the same book shares one download.
 */
const cache = new Map<string, Promise<string | null>>();

function isApiCoverUrl(url: string): boolean {
  try {
    const apiOrigin = new URL(import.meta.env.VITE_API_BASE_URL || window.location.origin).origin;
    const parsed = new URL(url, window.location.origin);
    // Same origin as the API only: never send the Bearer token to another host.
    return parsed.origin === apiOrigin && parsed.pathname.startsWith("/api/content/");
  } catch {
    return false;
  }
}

export function useAuthedCoverUrl(url: string | null | undefined): string | null {
  const api = useSanctuaryApi();
  const needsAuth = !!url && isApiCoverUrl(url);
  const [resolved, setResolved] = useState<string | null>(needsAuth ? null : (url ?? null));

  useEffect(() => {
    if (!url || !needsAuth) {
      setResolved(url ?? null);
      return;
    }
    let cancelled = false;
    let pending = cache.get(url);
    if (!pending) {
      pending = api
        .fetchRaw(url)
        .then(async (res) => (res.ok ? URL.createObjectURL(await res.blob()) : null))
        .catch(() => null);
      cache.set(url, pending);
      // A failure (offline, 401 before sign-in completes) shouldn't stick.
      void pending.then((value) => {
        if (value === null) cache.delete(url);
      });
    }
    void pending.then((value) => {
      if (!cancelled) setResolved(value);
    });
    return () => {
      cancelled = true;
    };
  }, [api, needsAuth, url]);

  return resolved;
}
