export const API = {
  LIBRARY: "/api/library",
  SETTINGS: "/api/settings",
  GOALS: "/api/goals",
  SESSIONS: "/api/sessions",
  CONTENT: (id: string) => `/api/content/${encodeURIComponent(id)}`,
} as const;
