const GUEST_ID_KEY = "sanctuary_guest_id";

function createGuestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "_");
  }
  return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getGuestId(): string {
  if (typeof window === "undefined" || !window.localStorage) return "guest_anon";

  const existing = window.localStorage.getItem(GUEST_ID_KEY);
  if (existing && existing.length >= 8 && existing.length <= 128) {
    return existing;
  }

  const next = createGuestId();
  window.localStorage.setItem(GUEST_ID_KEY, next);
  return next;
}
