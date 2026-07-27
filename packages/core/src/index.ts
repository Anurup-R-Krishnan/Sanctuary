export type SessionMode = "guest" | "clerk";

export interface ReaderSettings {
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

export interface LibraryItem {
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

export interface ReadingSession {
  bookId: string;
  device: "android" | "desktop" | "web" | "ios" | "mobile" | string;
  durationSec: number;
  endedAt?: string | null;
  id: string;
  pagesAdvanced: number;
  startedAt: string;
}

export interface ReadingGoals {
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

export type ReaderSettingsDefaults = ReaderSettings;

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
    
    const headers = new Headers(baseHeaders as HeadersInit);
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (init?.body instanceof FormData) {
      headers.delete("Content-Type");
    }

    return fetch(`${this.options.baseUrl}${path}`, {
      ...init,
      headers
    });
  }

  async getSettings(): Promise<ReaderSettings> {
    return this.fetchJson<ReaderSettings>("/api/settings");
  }

  async saveSettings(payload: ReaderSettings): Promise<void> {
    await this.fetchJson<void>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  }

  async getLibrary(): Promise<LibraryItem[]> {
    return this.fetchJson<LibraryItem[]>("/api/library");
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

  async getSessions(): Promise<ReadingSession[]> {
    return this.fetchJson<ReadingSession[]>("/api/sessions");
  }

  async saveSession(payload: ReadingSession): Promise<void> {
    await this.fetchJson<void>("/api/sessions", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  async getGoals(): Promise<ReadingGoals> {
    return this.fetchJson<ReadingGoals>("/api/goals");
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
