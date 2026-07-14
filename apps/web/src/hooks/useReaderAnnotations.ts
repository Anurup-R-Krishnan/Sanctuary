import { useState, useCallback, useEffect, useRef } from "react";

import type { ReaderAnnotation, ReaderSelection } from "@/types/reader";
import type { EpubRendition } from "@/utils/epub";

import { DEFAULT_HIGHLIGHT_COLOR } from "@/types/reader";

import { getAnnotations, saveAnnotation, removeAnnotation as deleteAnnotationRecord } from "../reader/persistence/annotationRepository";

interface UseReaderAnnotationsProps {
    bookId: string;
    clearSelection: () => void;
    rendition: EpubRendition | null;
}

export const useReaderAnnotations = ({ bookId, rendition, clearSelection }: UseReaderAnnotationsProps) => {
    const [annotations, setAnnotations] = useState<ReaderAnnotation[]>([]);
    const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
    const hasRenderedInitialAnnotations = useRef(false);

    useEffect(() => {
        if (!bookId) return;
        let mounted = true;
        getAnnotations(bookId).then(loaded => {
            if (mounted) {
                setAnnotations(loaded);
                hasRenderedInitialAnnotations.current = false;
            }
        });
        return () => { mounted = false; };
    }, [bookId]);

    const renderAnnotation = useCallback((annotation: ReaderAnnotation) => {
        if (!rendition?.annotations) return;
        try {
            if (annotation.type === "highlight" || annotation.type === "note") {
                rendition.annotations.highlight(
                    annotation.cfiRange,
                    {},
                    (e: MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // If it has a note, we could potentially open the edit dialog directly here.
                    },
                    undefined,
                    { "fill": annotation.color, "fill-opacity": "0.3", "mix-blend-mode": "multiply" }
                );
            } else if (annotation.type === "underline" && rendition.annotations.underline) {
                 rendition.annotations.underline(
                    annotation.cfiRange,
                    {},
                    (e: MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                    },
                    undefined,
                    { "stroke": annotation.color, "stroke-width": "2", "stroke-opacity": "0.8" }
                 );
            }
        } catch (e) {
            console.warn("Failed to render annotation:", e);
        }
    }, [rendition]);

    useEffect(() => {
        if (!rendition || !rendition.annotations || annotations.length === 0) return;

        // epub.js sometimes re-renders pages without firing events we can catch easily,
        // so we need to ensure annotations are painted when the rendition is ready.
        // We'll rely on a relocated listener to re-paint just in case.
        const handleRelocated = () => {
             annotations.forEach(renderAnnotation);
        };
        
        rendition.on("relocated", handleRelocated);
        
        // Initial paint
        if (!hasRenderedInitialAnnotations.current) {
             annotations.forEach(renderAnnotation);
             hasRenderedInitialAnnotations.current = true;
        }

        return () => {
            rendition.off("relocated", handleRelocated);
        };
    }, [rendition, annotations, renderAnnotation]);

    const addAnnotation = useCallback((
        selection: ReaderSelection,
        type: ReaderAnnotation["type"],
        color: string = DEFAULT_HIGHLIGHT_COLOR,
        note: string = ""
    ) => {
        const newAnnotation: ReaderAnnotation = {
            id: crypto.randomUUID(),
            bookId,
            type,
            cfiRange: selection.cfiRange,
            text: selection.text,
            href: selection.href,
            chapterLabel: selection.chapterLabel,
            note,
            color,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        const updated = [...annotations, newAnnotation];
        setAnnotations(updated);
        void saveAnnotation(newAnnotation);
        renderAnnotation(newAnnotation);
        clearSelection();
        return newAnnotation;
    }, [annotations, bookId, clearSelection, renderAnnotation]);

    const removeAnnotation = useCallback((id: string) => {
        const annotation = annotations.find(a => a.id === id);
        if (!annotation) return;

        if (rendition?.annotations) {
            try {
                rendition.annotations.remove(annotation.cfiRange, annotation.type);
            } catch (e) {
                console.warn("Failed to remove annotation visually:", e);
            }
        }

        const updated = annotations.filter(a => a.id !== id);
        setAnnotations(updated);
        void deleteAnnotationRecord(id);
    }, [annotations, rendition]);

    const updateAnnotation = useCallback((id: string, note: string, color?: string) => {
        const index = annotations.findIndex(a => a.id === id);
        if (index === -1) return;

        const original = annotations[index];
        const updatedAnnotation = {
            ...original,
            note,
            color: color ?? original.color,
            updatedAt: Date.now()
        };

        // Re-render visually if color changed
        if (color && color !== original.color && rendition?.annotations) {
            try {
                 rendition.annotations.remove(original.cfiRange, original.type);
                 renderAnnotation(updatedAnnotation);
            } catch (e) {
                 console.warn("Failed to update annotation color visually:", e);
            }
        }

        const updatedList = [...annotations];
        updatedList[index] = updatedAnnotation;
        
        setAnnotations(updatedList);
        void saveAnnotation(updatedAnnotation);
    }, [annotations, rendition, renderAnnotation]);

    return {
        annotations,
        editingAnnotationId,
        setEditingAnnotationId,
        addAnnotation,
        removeAnnotation,
        updateAnnotation
    };
};
