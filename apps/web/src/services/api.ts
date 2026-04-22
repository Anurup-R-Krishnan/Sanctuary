export const API = {
  LIBRARY: "/api/library",
  SETTINGS: "/api/settings",
  CONTENT: (id: string) => `/api/content/${encodeURIComponent(id)}`,
} as const;
