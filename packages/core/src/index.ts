export type SessionMode = "guest" | "clerk";

export interface ReaderSettingsV2 {
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

  async getSettings(): Promise<ReaderSettingsV2> {
    const res = await fetch(`${this.options.baseUrl}/api/v2/settings`, { headers: await this.headers() });
    if (!res.ok) throw new Error(`Failed to fetch settings (${res.status})`);
    return (await res.json()) as ReaderSettingsV2;
  }

  async saveSettings(payload: ReaderSettingsV2): Promise<void> {
    const res = await fetch(`${this.options.baseUrl}/api/v2/settings`, {
      method: "PUT",
      headers: await this.headers(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Failed to save settings (${res.status})`);
  }

  async getLibrary(): Promise<LibraryItemV2[]> {
    const res = await fetch(`${this.options.baseUrl}/api/v2/library`, { headers: await this.headers() });
    if (!res.ok) throw new Error(`Failed to fetch library (${res.status})`);
    return (await res.json()) as LibraryItemV2[];
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
    const res = await fetch(`${this.options.baseUrl}/api/v2/library?id=${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: await this.headers(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Failed to update library item (${res.status})`);
  }

  async getSessions(): Promise<ReadingSessionV2[]> {
    const res = await fetch(`${this.options.baseUrl}/api/v2/sessions`, { headers: await this.headers() });
    if (!res.ok) throw new Error(`Failed to fetch sessions (${res.status})`);
    return (await res.json()) as ReadingSessionV2[];
  }

  async saveSession(payload: ReadingSessionV2): Promise<void> {
    const res = await fetch(`${this.options.baseUrl}/api/v2/sessions`, {
      method: "POST",
      headers: await this.headers(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Failed to save session (${res.status})`);
  }
}
