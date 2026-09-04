import { MessageSquare, Trash2 } from "lucide-react";

import type { ReaderAnnotation } from "@/types/reader";

interface ReaderAnnotationsPanelProps {
    annotations: ReaderAnnotation[];
    onDeleteAnnotation: (id: string) => void;
    onGoToAnnotation: (cfi: string) => void;
}

export function ReaderAnnotationsPanel({
    annotations,
    onGoToAnnotation,
    onDeleteAnnotation,
}: ReaderAnnotationsPanelProps) {
    // Sort newest first
    const sorted = [...annotations].sort((a, b) => b.createdAt - a.createdAt);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-black/5 dark:border-white/5">
                <h2 className="font-semibold text-light-text dark:text-dark-text">Annotations</h2>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-fadeIn">
                        <div className="w-14 h-14 mb-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] flex items-center justify-center border border-black/[0.06] dark:border-white/[0.06]">
                            <MessageSquare className="w-6 h-6 text-light-text-muted dark:text-dark-text-muted" strokeWidth={1.5} />
                        </div>
                        <p className="text-light-text dark:text-dark-text font-medium">No highlights yet</p>
                        <p className="mt-1 text-sm text-light-text-muted dark:text-dark-text-muted">Select text while reading to create highlights and notes.</p>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {sorted.map((item) => (
                            <div key={item.id} className="group relative border-b border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
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
