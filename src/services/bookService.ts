import type { Book } from "@/types";
import { readJsonSafely } from "./http";

export interface IBookService {
    getBooks(token?: string): Promise<Book[]>;
    getBookContent(id: string, token?: string): Promise<Blob>;
    addBook(file: File, cover: Blob | null, metadata: Book, token?: string): Promise<string>;
    updateBook(id: string, updates: Partial<Book>, token?: string): Promise<void>;
    updateBookProgress(id: string, progress: number, lastLocation: string, token?: string): Promise<void>;
    deleteBook(id: string, token?: string): Promise<void>;
}

export const bookService: IBookService = {
    async getBooks(token?: string): Promise<Book[]> {
        const headers: HeadersInit = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch("/api/books", { headers });
        const books = await readJsonSafely<any[]>(res, "Failed to fetch books");
        return books.map(b => ({
            ...b,
            epubBlob: undefined,
        }));
    },

    async getBookContent(id: string, token?: string): Promise<Blob> {
        const headers: HeadersInit = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`/api/content/${id}`, { headers });
        if (!res.ok) throw new Error("Failed to fetch book content");
        return await res.blob();
    },

    async addBook(file: File, cover: Blob | null, metadata: Book, token?: string): Promise<string> {
        const formData = new FormData();
        formData.append("file", file);
        if (cover) formData.append("cover", cover);
        formData.append("metadata", JSON.stringify(metadata));

        const headers: HeadersInit = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch("/api/books", {
            method: "PUT",
            body: formData,
            headers,
        });

        const data = await readJsonSafely<{ id: string }>(res, "Failed to upload book");
        return data.id;
    },

    async updateBook(id: string, updates: Partial<Book>, token?: string): Promise<void> {
        console.warn("Metadata update not fully implemented in backend yet", { id, updates, hasToken: Boolean(token) });
    },

    async updateBookProgress(id: string, progress: number, lastLocation: string, token?: string): Promise<void> {
        console.log("Saving progress to backend...", { id, progress, hasLocation: Boolean(lastLocation), hasToken: Boolean(token) });
    },

    async deleteBook(id: string, token?: string): Promise<void> {
        const headers: HeadersInit = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`/api/books?id=${id}`, {
            method: "DELETE",
            headers
        });
        if (!res.ok) throw new Error("Failed to delete book");
    }
};
