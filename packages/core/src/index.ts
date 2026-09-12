export type SessionMode = "guest" | "clerk";

export interface ReaderSettings {
  // Legacy fields (kept for backwards compat — server may still send these)
  accent?: string;
  autoHideMs?: number;
  barPosition?: "top" | "bottom";
  // Appearance
  brightness?: number;
  // Reader behavior
  continuous?: boolean;
  dailyGoal?: number;
  direction?: "auto" | "ltr" | "rtl";
  fontPairing?: string;
  fontScale?: number;
  // Typography
  fontSize?: number;
  grayscale?: boolean;
  hyphenation?: boolean;
  lineHeight?: number;

  maxTextWidth?: number;
  motion?: "full" | "reduced";
  pageMargin?: number;
  paragraphSpacing?: number;
  progressBarType?: "bar" | "none";
  readerBackground?: string;
  readerForeground?: string;
  reduceMotion?: boolean;

  // Accessibility
  screenReaderMode?: boolean;
  showFloatingCapsule?: boolean;
  showPageCounter?: boolean;
  showPageMeta?: boolean;

  showProgress?: boolean;
  showScrollbar?: boolean;
  // Goals & tracking
  showStreakReminder?: boolean;
  spread?: boolean;
  swipeNav?: boolean;
  tapZones?: boolean;
  textAlignment?: "left" | "justify" | "center";
  textWidth?: number;

  themePreset?: "paper" | "ivory" | "ink";
  trackingEnabled?: boolean;

  ttsPitch?: number;
  ttsRate?: number;
  // Text-to-speech
  ttsVoiceURI?: string | null;

  weeklyGoal?: number;
  writingMode?: "horizontal-tb" | "vertical-rl";
}

export interface LibraryItem {
  author: string;
  bookmarks?: Array<{ cfi: string; title: string }>;
  coverUrl?: string | null;
  favorite: boolean;
  format?: string;
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

export interface ApiClientOptions {
  baseUrl: string;
  getToken?: () => Promise<string | null>;
}

export interface CoreAnnotation {
  bookId: string;
  cfi: string;
  chapterLabel?: string;
  color?: string;
  createdAt?: string;
  href?: string;
  id: string;
  note?: string;
  text: string;
  type?: "highlight" | "underline" | "note";
  updatedAt?: string;
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
    const targetUrl = new URL(path.replace(/^\/+/, ""), this.options.baseUrl.endsWith("/") ? this.options.baseUrl : `${this.options.baseUrl}/`).toString();
    const res = await fetch(targetUrl, {
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

    const targetUrl = new URL(path.replace(/^\/+/, ""), this.options.baseUrl.endsWith("/") ? this.options.baseUrl : `${this.options.baseUrl}/`).toString();
    return fetch(targetUrl, {
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
      coverUrl?: string | null;
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

  async getAnnotations(bookId?: string): Promise<CoreAnnotation[]> {
    const query = bookId ? `?bookId=${encodeURIComponent(bookId)}` : "";
    return this.fetchJson<CoreAnnotation[]>(`/api/annotations${query}`);
  }

  async saveAnnotation(payload: CoreAnnotation): Promise<void> {
    await this.fetchJson<void>("/api/annotations", {
      body: JSON.stringify(payload),
      method: "POST"
    });
  }

  async deleteAnnotation(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/annotations?id=${encodeURIComponent(id)}`, {
      method: "DELETE"
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
