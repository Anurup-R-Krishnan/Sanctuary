import type { ReaderAnnotation } from "@/types/reader";

import { syncQueue } from "../../services/SyncQueue";
import { deleteAnnotation, getAnnotationsByBook, putAnnotation } from "../../utils/db";

export async function getAnnotations(bookId: string): Promise<ReaderAnnotation[]> {
    try {
        const local = await getAnnotationsByBook(bookId);
        const api = syncQueue.getApi();
        if (api) {
            try {
                const remote = await api.getAnnotations(bookId);
                if (remote && Array.isArray(remote)) {
                    const localMap = new Map(local.map((a) => [a.id, a]));
                    let changed = false;

                    for (const r of remote) {
                        const existing = localMap.get(r.id);
                        const remoteUpdatedAt = r.updatedAt ? new Date(r.updatedAt).getTime() : 0;
                        if (!existing || remoteUpdatedAt > existing.updatedAt) {
                            const merged: ReaderAnnotation = {
                                bookId: r.bookId,
                                cfiRange: r.cfi,
                                chapterLabel: r.chapterLabel || existing?.chapterLabel || "",
                                color: r.color || "#facc15",
                                createdAt: r.createdAt ? new Date(r.createdAt).getTime() : Date.now(),
                                href: r.href || existing?.href || "",
                                id: r.id,
                                note: r.note || "",
                                text: r.text,
                                type: (r.type as ReaderAnnotation["type"]) || "highlight",
                                updatedAt: remoteUpdatedAt || Date.now(),
                            };
                            await putAnnotation(merged);
                            localMap.set(r.id, merged);
                            changed = true;
                        }
                    }
                    if (changed) {
                        return Array.from(localMap.values());
                    }
                }
            } catch (err) {
                console.warn("Could not fetch remote annotations, using local:", err);
            }
        }
        return local;
    } catch {
        return [];
    }
}

export async function saveAnnotation(annotation: ReaderAnnotation): Promise<void> {
    try {
        await putAnnotation(annotation);
        await syncQueue.enqueue("SAVE_ANNOTATION", {
            bookId: annotation.bookId,
            cfi: annotation.cfiRange,
            chapterLabel: annotation.chapterLabel,
            color: annotation.color,
            createdAt: new Date(annotation.createdAt).toISOString(),
            href: annotation.href,
            id: annotation.id,
            note: annotation.note,
            text: annotation.text,
            type: annotation.type,
            updatedAt: new Date(annotation.updatedAt).toISOString(),
        });
    } catch { /* ignore */ }
}

export async function removeAnnotation(id: string): Promise<void> {
    try {
        await deleteAnnotation(id);
        await syncQueue.enqueue("DELETE_ANNOTATION", { id });
    } catch { /* ignore */ }
}
