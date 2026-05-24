export const API = {
  LIBRARY: "/api/library",
  SETTINGS: "/api/settings",
  GOALS: "/api/goals",
  CONTENT: (id: string) => `/api/content/${encodeURIComponent(id)}`,
} as const;
