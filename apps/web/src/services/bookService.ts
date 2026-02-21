import type { Book } from "@/types";
import { buildApiHeaders, fetchWithRetry, readJsonSafely } from "./http";
import { getBookById } from "@/utils/db";

interface LibraryItemV2 {
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

export interface IBookService {
    getBooks(token?: string): Promise<Book[]>;
    getBookContent(id: string, token?: string): Promise<Blob>;
    addBook(file: File, metadata: Book, token?: string, coverBlob?: Blob | null): Promise<{ coverUrl?: string | null }>;
    uploadBookCover(id: string, coverBlob: Blob, token?: string): Promise<string>;
    updateBook(id: string, updates: Partial<Book>, token?: string): Promise<void>;
    updateBookProgress(id: string, progress: number, lastLocation: string, token?: string): Promise<void>;
}

export const bookService: IBookService = {
    async getBooks(token?: string): Promise<Book[]> {
        const headers = buildApiHeaders(token);
        const res = await fetchWithRetry("/api/v2/library", { headers }, { retries: 2 });
        const books = (await readJsonSafely<LibraryItemV2[] | null>(res, "Failed to fetch books")) || [];
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

    async getBookContent(id: string, token?: string): Promise<Blob> {
        const local = await getBookById(id).catch(() => null);
        if (local?.epubBlob) return local.epubBlob;

        const headers = buildApiHeaders(token);
        const res = await fetchWithRetry(`/api/content/${encodeURIComponent(id)}`, { headers }, { retries: 2 });
        if (!res.ok) throw new Error("Failed to fetch book content");
        return await res.blob();
    },

    async addBook(file: File, metadata: Book, token?: string, coverBlob?: Blob | null): Promise<{ coverUrl?: string | null }> {
        const headers = buildApiHeaders(token);

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
                progress: 0,
                totalPages: Math.max(1, metadata.totalPages || 100),
                lastLocation: metadata.lastLocation || "",
                favorite: !!metadata.isFavorite,
                bookmarks: (metadata.bookmarks || []).map((bm) => ({ cfi: bm.cfi, title: bm.title })),
            })
        );

        try {
            const res = await fetch("/api/v2/library", {
                method: "POST",
                headers,
                body: formData,
            });
            return await readJsonSafely<{ success: boolean; coverUrl?: string | null }>(res, "Failed to save book");
        } catch (error) {
            // Best-effort cleanup for partial backend writes (binary uploaded, metadata failed).
            await fetch(`/api/v2/library?id=${encodeURIComponent(metadata.id)}`, {
                method: "DELETE",
                headers,
            }).catch(() => undefined);
            throw error;
        }
    },

    async uploadBookCover(id: string, coverBlob: Blob, token?: string): Promise<string> {
        const headers = buildApiHeaders(token, { "Content-Type": coverBlob.type || "image/jpeg" });
        const res = await fetch(`/api/content/${encodeURIComponent(id)}?asset=cover`, {
            method: "PUT",
            headers,
            body: coverBlob,
        });
        const data = await readJsonSafely<{ success: boolean; coverUrl?: string }>(res, "Failed to upload cover");
        if (!data.coverUrl) throw new Error("Cover upload succeeded but no cover URL was returned");
        return data.coverUrl;
    },

    async updateBook(id: string, updates: Partial<Book>, token?: string): Promise<void> {
        const headers = buildApiHeaders(token, { "Content-Type": "application/json" });
        const res = await fetch(`/api/v2/library?id=${encodeURIComponent(id)}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({
                title: updates.title,
                author: updates.author,
                coverUrl: updates.coverUrl,
                progress: updates.progress,
                totalPages: updates.totalPages,
                lastLocation: updates.lastLocation,
                favorite: updates.isFavorite,
                bookmarks: updates.bookmarks?.map((bm) => ({ cfi: bm.cfi, title: bm.title })),
            }),
        });
        await readJsonSafely<{ success: boolean }>(res, "Failed to update book");
    },

    async updateBookProgress(id: string, progress: number, lastLocation: string, token?: string): Promise<void> {
        const headers = buildApiHeaders(token, { "Content-Type": "application/json" });
        const res = await fetchWithRetry(`/api/v2/library?id=${encodeURIComponent(id)}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({
                progress,
                lastLocation,
            }),
        }, { retries: 2 });
        await readJsonSafely<{ success: boolean }>(res, "Failed to update reading progress");
    }
};
