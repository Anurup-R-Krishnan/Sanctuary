export type SessionMode = "guest" | "clerk";

export interface ReaderSettingsV2 {
  accent: string;
  autoHideMs: number;
  dailyGoal: number;
  fontScale: number;
  lineHeight: number;
  motion: "full" | "reduced";
  showPageMeta: boolean;
  showProgress: boolean;
  swipeNav: boolean;
  tapZones: boolean;
  textWidth: number;
  themePreset: "paper" | "ivory" | "ink";
  weeklyGoal: number;
}

export interface LibraryItemV2 {
  author: string;
  bookmarks?: Array<{ cfi: string; title: string }>;
  coverUrl?: string | null;
  favorite: boolean;
  id: string;
  lastLocation?: string | null;
  progressPercent: number;
  status: "to-read" | "reading" | "finished";
  title: string;
  updatedAt: string;
}

export interface ReadingSessionV2 {
  bookId: string;
  device: "android" | "desktop" | "web" | "ios" | "mobile" | string;
  durationSec: number;
  endedAt?: string | null;
  id: string;
  pagesAdvanced: number;
  startedAt: string;
}

export interface ReadingGoalsV2 {
  day: {
    date: string;
    totalMinutes: number;
    targetMinutes: number;
    progressPercent: number;
  };
  month: {
    startDate: string;
    endDate: string;
    totalMinutes: number;
    targetMinutes: number;
    progressPercent: number;
  };
  week: {
    startDate: string;
    endDate: string;
    totalMinutes: number;
    targetMinutes: number;
    progressPercent: number;
  };
}

export type ReaderSettingsDefaults = ReaderSettingsV2;

export const readerSettingsDefaults: ReaderSettingsDefaults = {
  dailyGoal: 30,
  weeklyGoal: 150,
  themePreset: "paper",
  fontScale: 100,
  lineHeight: 1.6,
  textWidth: 70,
  motion: "full",
  tapZones: true,
  swipeNav: true,
  autoHideMs: 4500,
  showProgress: true,
  showPageMeta: true,
  accent: "#B37A4C"
};

export const colors = {
  accent: "#B37A4C",
  accentStrong: "#8E5A35",
  fg: "#1E1A16",
  bg: "#FFFDF8",
  darkFg: "#F4EEE6",
  darkBg: "#141210"
} as const;

export interface ApiClientOptions {
  baseUrl: string;
  getToken?: () => Promise<string | null>;
}

const jsonHeaders = { "Content-Type": "application/json" };

export class SanctuaryApiClient {
  constructor(public readonly options: ApiClientOptions) {}

  public async getToken(): Promise<string | null> {
    return this.options.getToken?.() ?? null;
  }

  private async headers() {
    const token = await this.getToken();
    if (!token) return jsonHeaders;
    return { ...jsonHeaders, Authorization: `Bearer ${token}` };
  }

  private async fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
    const baseHeaders = await this.headers();
    const res = await fetch(`${this.options.baseUrl}${path}`, {
      ...init,
      headers: { ...baseHeaders, ...init?.headers }
    });
    if (!res.ok) throw new Error(`Request to ${path} failed (${res.status})`);
    return res.json() as Promise<T>;
  }

  public async fetchRaw(path: string, init?: RequestInit): Promise<Response> {
    const baseHeaders = await this.headers();
    
    // Allow overriding or omitting headers (like Content-Type for FormData)
    const headers = new Headers(baseHeaders as HeadersInit);
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    // Remove Content-Type if it's undefined (fetch handles FormData boundaries automatically)
    if (init?.body instanceof FormData) {
      headers.delete("Content-Type");
    }

    return fetch(`${this.options.baseUrl}${path}`, {
      ...init,
      headers
    });
  }

  async getSettings(): Promise<ReaderSettingsV2> {
    return this.fetchJson<ReaderSettingsV2>("/api/settings");
  }

  async saveSettings(payload: ReaderSettingsV2): Promise<void> {
    await this.fetchJson<void>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  }

  async getLibrary(): Promise<LibraryItemV2[]> {
    return this.fetchJson<LibraryItemV2[]>("/api/library");
  }

  async patchLibraryItem(
    id: string,
    payload: {
      title?: string;
      author?: string;
      progress?: number;
      totalPages?: number;
      lastLocation?: string;
      favorite?: boolean;
      bookmarks?: Array<{ cfi: string; title: string }>;
    }
  ): Promise<void> {
    await this.fetchJson<void>(`/api/library?id=${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  }

  async deleteLibraryItem(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/library?id=${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
  }

  async getSessions(): Promise<ReadingSessionV2[]> {
    return this.fetchJson<ReadingSessionV2[]>("/api/sessions");
  }

  async saveSession(payload: ReadingSessionV2): Promise<void> {
    await this.fetchJson<void>("/api/sessions", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  async getGoals(): Promise<ReadingGoalsV2> {
    return this.fetchJson<ReadingGoalsV2>("/api/goals");
  }
}

export const STORAGE_KEYS = {
  LIBRARY: "sanctuary:library-cache",
  GOALS: "sanctuary:goals-cache",
  PROGRESS_QUEUE: "sanctuary:progress-queue",
  SESSIONS_QUEUE: "sanctuary:sessions-queue",
} as const;

export const SYNC_TIMING = {
  RETRY_INITIAL_MS: 1200,
  RETRY_MAX_MS: 20000,
  SCHEDULE_DEBOUNCE_MS: 500,
  INIT_SCHEDULE_MS: 150,
};

export type ReaderSettings = ReaderSettingsV2;
export type LibraryItem = LibraryItemV2;
export type ReadingSession = ReadingSessionV2;
export type ReadingGoals = ReadingGoalsV2;
