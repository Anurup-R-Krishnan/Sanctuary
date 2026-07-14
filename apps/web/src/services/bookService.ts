import type { SanctuaryApiClient } from "@sanctuary/core";

import type { Book } from "@/types";

import { getBookById } from "@/utils/db";

import { API } from "./api";
import { readJsonSafely, encodeId } from "./http";
import { syncQueue } from "./SyncQueue";

export const bookService = {
    async getBooks(api: SanctuaryApiClient): Promise<Book[]> {
        const books = await api.getLibrary();
        const bookmarkIdFromCfi = (bookId: string, cfi: string) => `${bookId}:${encodeURIComponent(cfi)}`;
        return books.map((b) => ({
            id: b.id,
            title: b.title,
            author: b.author,
            coverUrl: b.coverUrl || "",
            progress: Math.max(0, Math.round(Number(b.progressPercent || 0))),
            lastLocation: b.lastLocation || "",
            bookmarks: (b.bookmarks || []).map((bm) => ({
                id: bookmarkIdFromCfi(b.id, bm.cfi),
                cfi: bm.cfi,
                title: bm.title || "Bookmark",
                createdAt: new Date().toISOString(),
            })),
            readingList: b.status,
            isFavorite: b.favorite,
            addedAt: b.updatedAt,
            lastOpenedAt: b.updatedAt,
            epubBlob: null,
        }));
    },

    async getBookContent(id: string, api: SanctuaryApiClient): Promise<Blob> {
        const local = await getBookById(id).catch(() => null);
        if (local?.epubBlob) return local.epubBlob;

        const res = await api.fetchRaw(API.CONTENT(encodeId(id)));
        if (!res.ok) throw new Error("Failed to fetch book content");
        const { url } = await res.json() as { url: string };

        const blobRes = await fetch(url);
        if (!blobRes.ok) throw new Error("Failed to download book from storage");
        return await blobRes.blob();
    },

    async addBook(file: File, metadata: Book, api: SanctuaryApiClient, coverBlob?: Blob | null): Promise<{ coverUrl?: string | null }> {
        const formData = new FormData();
        formData.append("file", file, file.name || `${metadata.id}.epub`);
        if (coverBlob && coverBlob.size > 0) {
            formData.append("cover", coverBlob, `${metadata.id}.cover`);
        }
        formData.append(
            "metadata",
            JSON.stringify({
                id: metadata.id,
                title: metadata.title,
                author: metadata.author,
                contentHash: metadata.contentHash,
                progress: 0,
                totalPages: Math.max(1, metadata.totalPages || 100),
                lastLocation: metadata.lastLocation || "",
                favorite: !!metadata.isFavorite,
                bookmarks: (metadata.bookmarks || []).map((bm) => ({ cfi: bm.cfi, title: bm.title })),
            })
        );

        try {
            const res = await api.fetchRaw(API.LIBRARY, {
                method: "POST",
                body: formData,
            });
            return await readJsonSafely<{ success: boolean; coverUrl?: string | null }>(res, "Failed to save book");
        } catch (error) {
            // Best-effort cleanup for partial backend writes (binary uploaded, metadata failed).
            await api.deleteLibraryItem(metadata.id).catch(() => undefined);
            throw error;
        }
    },

    async uploadBookCover(id: string, coverBlob: Blob, api: SanctuaryApiClient): Promise<string> {
        const res = await api.fetchRaw(`${API.CONTENT(encodeId(id))}?asset=cover`, {
            method: "PUT",
            headers: { "Content-Type": coverBlob.type || "image/jpeg" },
            body: coverBlob,
        });
        const data = await readJsonSafely<{ success: boolean; coverUrl?: string }>(res, "Failed to upload cover");
        if (!data.coverUrl) throw new Error("Cover upload succeeded but no cover URL was returned");
        return data.coverUrl;
    },

    async _patchBook(id: string, body: unknown): Promise<void> {
        syncQueue.enqueue("PATCH_LIBRARY", { id, data: body });
    },

    async updateBook(id: string, updates: Partial<Book>): Promise<void> {
        return this._patchBook(id, {
            title: updates.title,
            author: updates.author,
            coverUrl: updates.coverUrl,
            progress: updates.progress,
            totalPages: updates.totalPages,
            lastLocation: updates.lastLocation,
            favorite: updates.isFavorite,
            bookmarks: updates.bookmarks?.map((bm) => ({ cfi: bm.cfi, title: bm.title })),
        });
    },

    async updateBookProgress(id: string, progress: number, lastLocation: string): Promise<void> {
        return this._patchBook(id, {
            progress,
            lastLocation,
        });
    }
};
