import { API } from "./api";
import { logErrorOnce, readJsonSafely, buildAuthHeaders } from "./http";
import { syncQueue } from "./SyncQueue";

type SettingsMap = Record<string, unknown>;



let settingsCache: SettingsMap | null = null;
let fetchPromise: Promise<SettingsMap | null> | null = null;

const saveSnapshot = async (snapshot: SettingsMap) => {
    syncQueue.enqueue("SAVE_SETTINGS", snapshot);
};



export const settingsService = {
    async getSettings(token?: string): Promise<SettingsMap | null> {
        if (settingsCache) return settingsCache;
        if (fetchPromise) return fetchPromise;

        fetchPromise = (async () => {
            try {
                const headers = buildAuthHeaders(token);

                const res = await fetch(API.SETTINGS, { headers });
                const data = await readJsonSafely<SettingsMap | null>(res, "Failed to fetch settings");
                if (data && typeof data === "object") {
                    settingsCache = data;
                    return data;
                }
            } catch (error) {
                logErrorOnce("settings-fetch", "Failed to fetch settings:", error);
            } finally {
                fetchPromise = null;
            }
            return null;
        })();

        return fetchPromise;
    },

    async saveSettings(settings: SettingsMap): Promise<void> {
        settingsCache = { ...(settingsCache || {}), ...settings };
        saveSnapshot(settingsCache);
    }
};
