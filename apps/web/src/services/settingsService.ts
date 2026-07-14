import type { SanctuaryApiClient } from "@sanctuary/core";

import { logErrorOnce } from "./http";
import { syncQueue } from "./SyncQueue";

type SettingsMap = Record<string, unknown>;



let settingsCache: SettingsMap | null = null;
let fetchPromise: Promise<SettingsMap | null> | null = null;

const saveSnapshot = async (snapshot: SettingsMap) => {
    syncQueue.enqueue("SAVE_SETTINGS", snapshot);
};



export const settingsService = {
    async getSettings(api: SanctuaryApiClient): Promise<SettingsMap | null> {
        if (settingsCache) return settingsCache;
        if (fetchPromise) return fetchPromise;

        fetchPromise = (async () => {
            try {
                const data = await api.getSettings();
                if (data && typeof data === "object") {
                    settingsCache = data as unknown as SettingsMap;
                    return settingsCache;
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
