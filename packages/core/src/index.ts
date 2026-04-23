export type SessionMode = "guest" | "clerk";

export interface ReaderSettingsV2 {
  dailyGoal: number;
  weeklyGoal: number;
  themePreset: "paper" | "ivory" | "ink";
  fontScale: number;
  lineHeight: number;
  textWidth: number;
  motion: "full" | "reduced";
  tapZones: boolean;
  swipeNav: boolean;
  autoHideMs: number;
  showProgress: boolean;
  showPageMeta: boolean;
  accent: string;
}

export interface LibraryItemV2 {
  id: string;
  title: string;
  author: string;
  coverUrl?: string | null;
  progressPercent: number;
  lastLocation?: string | null;
  bookmarks?: Array<{ cfi: string; title: string }>;
  status: "to-read" | "reading" | "finished";
  favorite: boolean;
  updatedAt: string;
}

export interface ReadingSessionV2 {
  id: string;
  bookId: string;
  startedAt: string;
  endedAt?: string | null;
  durationSec: number;
  pagesAdvanced: number;
  device: "android" | "desktop" | "web";
}

export interface ReadingGoalsV2 {
  day: {
    date: string;
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
  constructor(private readonly options: ApiClientOptions) {}

  private async headers() {
    const token = await this.options.getToken?.();
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
