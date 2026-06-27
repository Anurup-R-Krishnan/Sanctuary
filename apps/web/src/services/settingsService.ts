import { API } from "./api";
import { logErrorOnce, readJsonSafely, buildAuthHeaders } from "./http";

type SettingsMap = Record<string, unknown>;



let settingsCache: SettingsMap | null = null;
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let fetchPromise: Promise<SettingsMap | null> | null = null;
let saveInFlight: Promise<void> | null = null;
let pendingSaveToken: string | undefined;
let dirty = false;
let lifecycleAttached = false;

const buildHeaders = (token?: string): HeadersInit => ({
  ...buildAuthHeaders(token),
  "Content-Type": "application/json",
});

const cloneCache = (): SettingsMap => ({ ...(settingsCache || {}) });

const saveSnapshot = async (snapshot: SettingsMap, token?: string) => {
    const res = await fetch(API.SETTINGS, {
        method: "PUT",
        headers: buildHeaders(token),
        body: JSON.stringify(snapshot),
        keepalive: true,
    });
    if (!res.ok) {
        const message = await res.text();
        throw new Error(`Failed to save settings (${res.status}): ${message || res.statusText}`);
    }
};

const drainSaveQueue = async (): Promise<void> => {
    if (saveInFlight) return saveInFlight;

    saveInFlight = (async () => {
        while (dirty) {
            dirty = false;
            const snapshot = cloneCache();
            try {
                await saveSnapshot(snapshot, pendingSaveToken);
            } catch (error) {
                console.error("Failed to save settings:", error);
            }
        }
    })().finally(() => {
        saveInFlight = null;
    });

    return saveInFlight;
};

const enqueueSave = async (token?: string) => {
    if (token) pendingSaveToken = token;
    dirty = true;
    await drainSaveQueue();
};



const flushOnPageHide = () => {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
    }

    if (!dirty || !settingsCache) return;

    dirty = false;
    const snapshot = cloneCache();
    void saveSnapshot(snapshot, pendingSaveToken).catch((error) => {
        console.error("Failed to flush settings on page hide:", error);
    });
};

const attachLifecycleHandlers = () => {
    if (lifecycleAttached || typeof window === "undefined") return;
    lifecycleAttached = true;

    window.addEventListener("pagehide", flushOnPageHide);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") flushOnPageHide();
    });
};

export const settingsService = {
    async getSettings(token?: string): Promise<SettingsMap | null> {
        if (settingsCache) return settingsCache;
        if (fetchPromise) return fetchPromise;

        attachLifecycleHandlers();

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

    async saveSettings(settings: SettingsMap, token?: string): Promise<void> {
        settingsCache = { ...(settingsCache || {}), ...settings };
        await enqueueSave(token);
    }
};
