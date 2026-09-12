import { BookOpen, Copy, Edit3, Highlighter, Quote, Underline, Volume2 } from "lucide-react";
import React, { memo } from "react";

import type { ReaderSelection } from "@/types/reader";

interface ReaderSelectionMenuProps {
    onAddNote: () => void;
    onCopy: () => void;
    onCreateQuoteCard?: () => void;
    onDefine?: () => void;
    onHighlight: (color?: string) => void;
    onSpeak: () => void;
    onUnderline: () => void;
    selection: ReaderSelection | null;
}

function ReaderSelectionMenuImpl({
    onAddNote,
    onCopy,
    onCreateQuoteCard,
    onDefine,
    onHighlight,
    onSpeak,
    onUnderline,
    selection
}: ReaderSelectionMenuProps) {
    if (!selection) return null;

    // In a real app we'd position this absolutely based on the epub.js iframe selection rects.
    // For this integration, we'll place it fixed at the bottom center when text is selected,
    // which is mobile-friendly and avoids complex cross-iframe coordinate math.

    const ActionBtn = ({
        ariaLabel,
        icon: Icon,
        label,
        onClick
    }: {
        ariaLabel?: string;
        icon: React.ElementType;
        label: string;
        onClick: () => void;
    }) => (
        <button
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClick();
            }}
            className="p-3 flex flex-col items-center gap-1 hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 active:scale-[0.95] transition-all duration-instant rounded-xl text-light-text dark:text-dark-text"
            title={label}
            aria-label={ariaLabel || label}
        >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
        </button>
    );

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] bg-light-primary dark:bg-dark-primary shadow-2xl rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden flex items-center animate-slideUp pointer-events-auto">
            {onDefine && (
                <>
                    <ActionBtn aria-label="Define word" icon={BookOpen} label="Define" onClick={onDefine} />
                    <div className="w-px h-8 bg-black/10 dark:bg-white/10" />
                </>
            )}
            <ActionBtn aria-label="Highlight text" icon={Highlighter} label="Highlight" onClick={() => onHighlight()} />
            <ActionBtn aria-label="Underline text" icon={Underline} label="Underline" onClick={onUnderline} />
            <div className="w-px h-8 bg-black/10 dark:bg-white/10" />
            <ActionBtn aria-label="Add note" icon={Edit3} label="Note" onClick={onAddNote} />
            <ActionBtn aria-label="Copy selection" icon={Copy} label="Copy" onClick={onCopy} />
            {onCreateQuoteCard && (
                <ActionBtn aria-label="Create quote card" icon={Quote} label="Quote" onClick={onCreateQuoteCard} />
            )}
            <div className="w-px h-8 bg-black/10 dark:bg-white/10" />
            <ActionBtn aria-label="Speak selection" icon={Volume2} label="Speak" onClick={onSpeak} />
        </div>
    );
}

export const ReaderSelectionMenu = memo(ReaderSelectionMenuImpl);
