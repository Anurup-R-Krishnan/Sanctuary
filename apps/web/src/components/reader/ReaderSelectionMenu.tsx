import { Highlighter, Underline, Edit3, Copy, Volume2 } from "lucide-react";
import React from "react";

import type { ReaderSelection } from "@/types/reader";

interface ReaderSelectionMenuProps {
    onAddNote: () => void;
    onCopy: () => void;
    onHighlight: (color?: string) => void;
    onSpeak: () => void;
    onUnderline: () => void;
    selection: ReaderSelection | null;
}

export function ReaderSelectionMenu({
    selection,
    onHighlight,
    onUnderline,
    onAddNote,
    onCopy,
    onSpeak
}: ReaderSelectionMenuProps) {
    if (!selection) return null;

    // In a real app we'd position this absolutely based on the epub.js iframe selection rects.
    // For this integration, we'll place it fixed at the bottom center when text is selected,
    // which is mobile-friendly and avoids complex cross-iframe coordinate math.

    const ActionBtn = ({ icon: Icon, label, onClick }: { icon: React.ElementType, label: string, onClick: () => void }) => (
        <button
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClick();
            }}
            className="p-3 flex flex-col items-center gap-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-light-text dark:text-dark-text"
            title={label}
        >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
        </button>
    );

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] bg-light-primary dark:bg-dark-primary shadow-2xl rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden flex items-center animate-slideUp pointer-events-auto">
            <ActionBtn icon={Highlighter} label="Highlight" onClick={() => onHighlight()} />
            <ActionBtn icon={Underline} label="Underline" onClick={onUnderline} />
            <div className="w-px h-8 bg-black/10 dark:bg-white/10" />
            <ActionBtn icon={Edit3} label="Note" onClick={onAddNote} />
            <ActionBtn icon={Copy} label="Copy" onClick={onCopy} />
            <div className="w-px h-8 bg-black/10 dark:bg-white/10" />
            <ActionBtn icon={Volume2} label="Speak" onClick={onSpeak} />
        </div>
    );
}
