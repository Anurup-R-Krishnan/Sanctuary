/**
 * @deprecated Deprecated in favor of SpineWeightProgressEstimator.
 * Retained for backwards compatibility with legacy caches.
 */
import { getReaderCache, putReaderCache, deleteReaderCache } from "../../utils/db";
import { safeStorageGet } from "./storage";

const PREFIX = "sanctuary:epub-locations:v1:";

interface CachedLocation {
    bookId: string;
    breakSize: number;
    createdAt: number;
    fingerprint: string;
    locations: string;
    version: 1;
}

export const getFileFingerprint = (bookId: string, blob: Blob): string =>
    `${bookId}:${blob.size}:${blob.type || "application/epub+zip"}`;

export async function loadCachedLocations(
    bookId: string,
    fingerprint: string,
    breakSize: number,
): Promise<string | null> {
    const key = `${PREFIX}${bookId}:${fingerprint}`;
    
    // Fallback migration and cleanup: check localStorage for any legacy caches
    // We iterate over all keys because old fingerprints would otherwise leak storage forever.
    for (let i = 0; i < window.localStorage.length; i++) {
        const storageKey = window.localStorage.key(i);
        if (storageKey?.startsWith(PREFIX)) {
            if (storageKey === key) {
                const raw = safeStorageGet(key);
                if (raw) {
                    try {
                        const cached = JSON.parse(raw) as CachedLocation;
                        if (cached.version === 1 && cached.bookId === bookId && cached.fingerprint === fingerprint && cached.breakSize === breakSize && cached.locations) {
                            // Migrate to IDB
                            await saveCachedLocations(bookId, fingerprint, breakSize, cached.locations);
                        }
                    } catch { /* ignore */ }
                }
            }
            // Always remove any key starting with PREFIX to free quota
            window.localStorage.removeItem(storageKey);
            // Adjust iterator because we removed an item
            i--;
        }
    }
    // We return early if we successfully migrated it above? Actually, if we migrated it, 
    // it's now in IDB, so we can just let the IDB check below find it and return it!

    try {
        const cached = await getReaderCache<CachedLocation>(key);
        if (!cached) return null;
        if (
            cached.version !== 1 ||
            cached.bookId !== bookId ||
            cached.fingerprint !== fingerprint ||
            cached.breakSize !== breakSize ||
            !cached.locations
        ) {
            await deleteReaderCache(key);
            return null;
        }
        return cached.locations;
    } catch {
        return null;
    }
}

export async function saveCachedLocations(
    bookId: string,
    fingerprint: string,
    breakSize: number,
    locations: string,
): Promise<void> {
    const key = `${PREFIX}${bookId}:${fingerprint}`;
    const cached: CachedLocation = {
        version: 1,
        bookId,
        fingerprint,
        breakSize,
        locations,
        createdAt: Date.now(),
    };
    try {
        await putReaderCache(key, cached);
    } catch {
        // Silently ignore if IDB fails (e.g. private mode or quota exceeded),
        // we shouldn't break the reader just because cache saving failed.
    }
}
