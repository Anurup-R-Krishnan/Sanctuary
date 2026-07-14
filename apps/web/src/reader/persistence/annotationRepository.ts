import type { ReaderAnnotation } from "@/types/reader";

import { getAnnotationsByBook, putAnnotation, deleteAnnotation } from "../../utils/db";

export async function getAnnotations(bookId: string): Promise<ReaderAnnotation[]> {
    try {
        return await getAnnotationsByBook(bookId);
    } catch {
        return [];
    }
}

export async function saveAnnotation(annotation: ReaderAnnotation): Promise<void> {
    try {
        await putAnnotation(annotation);
    } catch { /* ignore */ }
}

export async function removeAnnotation(id: string): Promise<void> {
    try {
        await deleteAnnotation(id);
    } catch { /* ignore */ }
}
