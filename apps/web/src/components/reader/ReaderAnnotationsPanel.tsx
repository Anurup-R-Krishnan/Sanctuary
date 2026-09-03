import { X, MessageSquare, Trash2 } from "lucide-react";
import React from "react";

import type { ReaderAnnotation } from "@/types/reader";

import { IconButton } from "@/components/ui/IconButton";

interface ReaderAnnotationsPanelProps {
    annotations: ReaderAnnotation[];
    isOpen: boolean;
    onClose: () => void;
    onDeleteAnnotation: (id: string) => void;
    onGoToAnnotation: (cfi: string) => void;
}

export function ReaderAnnotationsPanel({
    isOpen,
    onClose,
    annotations,
    onGoToAnnotation,
    onDeleteAnnotation,
}: ReaderAnnotationsPanelProps) {
    if (!isOpen) return null;

    // Sort newest first
    const sorted = [...annotations].sort((a, b) => b.createdAt - a.createdAt);

    return (
        <div className="absolute left-0 top-0 bottom-0 w-80 bg-light-primary dark:bg-dark-primary shadow-2xl border-r border-black/5 dark:border-white/5 flex flex-col z-[100] animate-slideInLeft pointer-events-auto">
            {/* Header */}
            <div className="p-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                <h2 className="font-semibold text-light-text dark:text-dark-text">Annotations</h2>
                <IconButton icon={<X className="w-5 h-5" />} label="Close annotations" onClick={onClose} variant="ghost" />
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                {sorted.length === 0 ? (
                    <div className="p-6 text-center text-sm text-light-text-muted dark:text-dark-text-muted">
                        No highlights or notes yet.
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {sorted.map((item) => (
                            <div key={item.id} className="group relative border-b border-black/5 dark:border-white/5 hover:bg-black-[0.02] dark:hover:bg-white-[0.02] transition-colors">
                                <button
                                    type="button"
                                    onClick={() => onGoToAnnotation(item.cfiRange)}
                                    className="w-full text-left p-4 pr-12"
                                >
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <div
                                            className="w-3 h-3 rounded-full shadow-sm"
                                            style={{ backgroundColor: item.color }}
                                        />
                                        <span className="text-xs font-medium text-light-accent dark:text-dark-accent truncate">
                                            {item.chapterLabel || "Unknown Chapter"}
                                        </span>
                                    </div>
                                    
                                    <p className="text-sm text-light-text dark:text-dark-text leading-relaxed line-clamp-3 mb-2 pl-5 border-l-2 border-black/10 dark:border-white/10">
                                        {item.text}
                                    </p>

                                    {item.note && (
                                        <div className="flex items-start gap-2 mt-2 bg-black/5 dark:bg-white/5 p-3 rounded-lg">
                                            <MessageSquare className="w-4 h-4 text-light-text-muted dark:text-dark-text-muted shrink-0 mt-0.5" />
                                            <p className="text-sm text-light-text dark:text-dark-text">{item.note}</p>
                                        </div>
                                    )}
                                </button>
                                
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onDeleteAnnotation(item.id); }}
                                    className="absolute right-3 top-4 p-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                                    aria-label="Delete annotation"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
