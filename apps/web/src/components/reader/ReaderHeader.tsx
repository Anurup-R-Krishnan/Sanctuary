import React from "react";
import type { Book } from "@/types";
import {
    ArrowLeft,
    Bookmark,
    BookmarkCheck,
    List,
    Settings,
    Maximize2,
    Minimize2,
    MoreHorizontal,
} from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

interface ReaderHeaderProps {
    book: Book;
    isBookmarked: boolean;
    isFullscreen: boolean;
    showUI: boolean;
    onClose: () => void;
    onToggleBookmark: () => void;
    onToggleTOC: () => void;
    onToggleSettings: () => void;
    onToggleControls: () => void;
    onToggleFullscreen: () => void;
}

const ReaderHeader: React.FC<ReaderHeaderProps> = ({
    book,
    isBookmarked,
    isFullscreen,
    showUI,
    onClose,
    onToggleBookmark,
    onToggleTOC,
    onToggleSettings,
    onToggleControls,
    onToggleFullscreen,
}) => {
    const { readerForeground, readerBackground } = useSettings();

    const ActionBtn = ({ icon: Icon, label, onClick, active }: {
        icon: React.ElementType;
        label: string;
        onClick: () => void;
        active?: boolean;
    }) => (
        <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`p-2 rounded-lg transition-all duration-200 ${active
                    ? "bg-light-accent/15 dark:bg-dark-accent/15 text-light-accent dark:text-dark-accent"
                    : "hover:bg-black/5 dark:hover:bg-white/5 text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text"
                }`}
            title={label}
            aria-label={label}
        >
            <Icon className="w-5 h-5" strokeWidth={1.5} />
        </button>
    );

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 pointer-events-none transition-opacity duration-300 ${showUI ? "opacity-100" : "opacity-0"}`}
        >
            <div className="relative flex items-start justify-between p-6">
                {/* Left: Back Button (Floating) */}
                <button
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="pointer-events-auto p-3 rounded-full backdrop-blur-xl shadow-lg border border-black/5 dark:border-white/5 hover:scale-105 transition-all duration-200 group"
                    style={{ backgroundColor: `${readerBackground}E6` }}
                    aria-label="Close reader"
                >
                    <ArrowLeft 
                        className="w-5 h-5 transition-colors" 
                        style={{ color: readerForeground }}
                        strokeWidth={2} 
                    />
                </button>

                {/* Center: Title (Floating Capsule) */}
                <div 
                    className="absolute left-1/2 -translate-x-1/2 top-6 pointer-events-auto max-w-md px-6 py-3 rounded-full backdrop-blur-xl shadow-lg border border-black/5 dark:border-white/5 flex flex-col items-center justify-center transition-all duration-200"
                    style={{ backgroundColor: `${readerBackground}E6` }}
                >
                    <h1 
                        className="font-medium text-sm truncate max-w-[200px] text-center"
                        style={{ color: readerForeground }}
                    >
                        {book.title}
                    </h1>
                </div>

                {/* Right: Actions (Floating Group) */}
                <div 
                    className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-full backdrop-blur-xl shadow-lg border border-black/5 dark:border-white/5 transition-all duration-200"
                    style={{ backgroundColor: `${readerBackground}E6` }}
                >
                    <ActionBtn 
                        icon={isBookmarked ? BookmarkCheck : Bookmark} 
                        label="Bookmark" 
                        onClick={onToggleBookmark} 
                        active={isBookmarked} 
                    />
                    <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-1" />
                    <ActionBtn icon={List} label="Contents" onClick={onToggleTOC} />
                    <ActionBtn icon={Settings} label="Appearance" onClick={onToggleSettings} />
                    <ActionBtn icon={MoreHorizontal} label="Utilities" onClick={onToggleControls} />
                    <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-1" />
                    <ActionBtn 
                        icon={isFullscreen ? Minimize2 : Maximize2} 
                        label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"} 
                        onClick={onToggleFullscreen} 
                    />
                </div>
            </div>
        </header>
    );
};

export default ReaderHeader;
