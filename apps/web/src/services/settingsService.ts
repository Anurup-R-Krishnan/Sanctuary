import { logErrorOnce, readJsonSafely } from "./http";

const API_URL = "/api/v2/settings";

export interface ISettingsService {
    getItem<T>(key: string, token?: string): Promise<T | null>;
    setItem<T>(key: string, value: T, token?: string): Promise<void>;
    getSettings(token?: string): Promise<any>;
    saveSettings(settings: any, token?: string): Promise<void>;
}

let settingsCache: any = null;
let saveTimeout: any = null;
let fetchPromise: Promise<any> | null = null;

export const settingsService: ISettingsService = {
    async getSettings(token?: string): Promise<any> {
        if (settingsCache) return settingsCache;
        if (fetchPromise) return fetchPromise;

        fetchPromise = (async () => {
            try {
                const headers: HeadersInit = {};
                if (token) headers["Authorization"] = `Bearer ${token}`;

                const res = await fetch(API_URL, { headers });
                const data = await readJsonSafely<any>(res, "Failed to fetch settings");
                if (data) {
                    settingsCache = data;
                    return data;
                }
            } catch (e) {
                logErrorOnce("settings-fetch", "Failed to fetch settings:", e);
            } finally {
                fetchPromise = null;
            }
            return null;
        })();

        return fetchPromise;
    },

    async saveSettings(settings: any, token?: string): Promise<void> {
        settingsCache = { ...settingsCache, ...settings };
        try {
            const headers: HeadersInit = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch(API_URL, {
                method: "PUT",
                headers,
                body: JSON.stringify(settingsCache),
            });
            if (!res.ok) {
                const message = await res.text();
                throw new Error(`Failed to save settings (${res.status}): ${message || res.statusText}`);
            }
        } catch (e) {
            console.error("Failed to save settings:", e);
        }
    },

    async getItem<T>(key: string, token?: string): Promise<T | null> {
        if (!settingsCache) {
            await this.getSettings(token);
        }
        return settingsCache ? (settingsCache[key] as T) : null;
    },

    async setItem<T>(key: string, value: T, token?: string): Promise<void> {
        if (!settingsCache) {
            await this.getSettings(token);
            if (!settingsCache) settingsCache = {};
        }

        settingsCache[key] = value;

        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            this.saveSettings(settingsCache, token);
        }, 1000);
    }
};
