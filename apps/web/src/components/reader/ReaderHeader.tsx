import {
    ArrowLeft,
    BarChart2,
    Bookmark,
    BookmarkCheck,
    ChevronsDown,
    Headphones,
    Highlighter,
    List,
    Maximize2,
    Minimize2,
    Search,
    Settings,
    Sparkles,
    Waves,
    Zap,
} from "lucide-react";
import React from "react";

import type { Book } from "@/types";

import { IconButton } from "@/components/ui/IconButton";
import { useSettings } from "@/store/useSettingsStore";

interface ReaderHeaderProps {
    book: Book;
    chapterEstimatedMinutesRemaining?: number | null;
    chapterLabel?: string;
    isAmbientActive?: boolean;
    isAutoScrollActive?: boolean;
    isBookmarked: boolean;
    isFullscreen: boolean;
    isReadabilityActive?: boolean;
    isTTSActive?: boolean;
    isZenModeActive?: boolean;
    onClose: () => void;
    onToggleAmbient?: () => void;
    onToggleAnnotations: () => void;
    onToggleAutoScroll?: () => void;
    onToggleBookmark: () => void;
    onToggleFullscreen: () => void;
    onToggleReadability?: () => void;
    onToggleSearch: () => void;
    onToggleSettings: () => void;
    onToggleSpeedReader?: () => void;
    onToggleTOC: () => void;
    onToggleTTS?: () => void;
    onToggleZenMode?: () => void;
    readingSpeedWpm?: number | null;
    showUI: boolean;
}

function ReaderHeader({
    book,
    chapterEstimatedMinutesRemaining,
    chapterLabel,
    isAmbientActive,
    isAutoScrollActive,
    isBookmarked,
    isFullscreen,
    isReadabilityActive,
    isTTSActive,
    isZenModeActive,
    onClose,
    onToggleAmbient,
    onToggleAnnotations,
    onToggleAutoScroll,
    onToggleBookmark,
    onToggleFullscreen,
    onToggleReadability,
    onToggleSearch,
    onToggleSettings,
    onToggleSpeedReader,
    onToggleTOC,
    onToggleTTS,
    onToggleZenMode,
    readingSpeedWpm,
    showUI,
}: ReaderHeaderProps) {
    const readerForeground = useSettings((state) => state.readerForeground);
    const readerBackground = useSettings((state) => state.readerBackground);
    const showFloatingCapsule = useSettings((state) => state.showFloatingCapsule);

    const ActionBtn = ({ icon: Icon, label, onClick, active }: {
        icon: React.ElementType;
        label: string;
        onClick: () => void;
        active?: boolean;
    }) => (
        <IconButton
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`transition-all duration-instant ${active
                    ? "bg-light-accent/15 dark:bg-dark-accent/15 text-light-accent dark:text-dark-accent"
                    : "hover:bg-black/5 dark:hover:bg-white/5 text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text"
                }`}
            label={label}
            icon={<Icon className="w-5 h-5" strokeWidth={1.5} />}
            variant="ghost"
        />
    );

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 pointer-events-none transition-opacity duration-300 ${showUI ? "opacity-100" : "opacity-0"}`}
        >
            <div className="relative flex items-start justify-between p-3.5 sm:p-5 md:p-6">
                <IconButton
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="pointer-events-auto p-3 !rounded-full backdrop-blur-xl shadow-lg border border-black/5 dark:border-white/5 hover:scale-105 transition-all duration-instant group shrink-0"
                    style={{ backgroundColor: `${readerBackground}E6` }}
                    label="Close reader"
                    icon={<ArrowLeft className="w-5 h-5 transition-colors" style={{ color: readerForeground }} strokeWidth={2} />}
                    variant="ghost"
                />

                {/* Center: Title & Chapter Progress (Floating Capsule) */}
                {showFloatingCapsule && (
                    <div 
                        className="absolute left-1/2 -translate-x-1/2 top-3.5 sm:top-5 md:top-6 pointer-events-auto max-w-md px-5 py-2 rounded-full backdrop-blur-xl shadow-lg border border-black/5 dark:border-white/5 hidden lg:flex flex-col items-center justify-center transition-all duration-instant"
                        style={{ backgroundColor: `${readerBackground}E6` }}
                    >
                        <h1 
                            className="font-medium text-xs sm:text-sm truncate max-w-[280px] text-center"
                            style={{ color: readerForeground }}
                        >
                            {chapterLabel || book.title}
                        </h1>
                        {chapterEstimatedMinutesRemaining !== undefined && chapterEstimatedMinutesRemaining !== null && (
                            <span 
                                className="text-[10px] tracking-wide opacity-60 font-medium truncate max-w-[280px] text-center"
                                style={{ color: readerForeground }}
                            >
                                {chapterEstimatedMinutesRemaining < 1
                                    ? "< 1 min in chapter"
                                    : `${Math.round(chapterEstimatedMinutesRemaining)} min in chapter`}
                                {readingSpeedWpm ? ` · ${readingSpeedWpm} wpm` : ""}
                            </span>
                        )}
                    </div>
                )}

                {/* Right: Actions (Floating Group) */}
                <div 
                    className="pointer-events-auto flex flex-nowrap items-center gap-1 p-1.5 rounded-full backdrop-blur-xl shadow-lg border border-black/5 dark:border-white/5 transition-all duration-instant shrink-0"
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
                    <ActionBtn icon={Search} label="Search" onClick={onToggleSearch} />
                    {onToggleTTS && (
                        <ActionBtn 
                            icon={Headphones} 
                            label="Read Aloud" 
                            onClick={onToggleTTS} 
                            active={isTTSActive} 
                        />
                    )}
                    {onToggleSpeedReader && (
                        <ActionBtn 
                            icon={Zap} 
                            label="Speed Read" 
                            onClick={onToggleSpeedReader} 
                        />
                    )}
                    {onToggleReadability && (
                        <ActionBtn 
                            active={isReadabilityActive}
                            icon={BarChart2} 
                            label="Readability & Complexity" 
                            onClick={onToggleReadability} 
                        />
                    )}
                    {onToggleZenMode && (
                        <ActionBtn 
                            active={isZenModeActive}
                            icon={Sparkles} 
                            label="Zen Focus (Z)" 
                            onClick={onToggleZenMode} 
                        />
                    )}
                    {onToggleAutoScroll && (
                        <ActionBtn 
                            active={isAutoScrollActive}
                            icon={ChevronsDown} 
                            label="Auto-Scroll (A)" 
                            onClick={onToggleAutoScroll} 
                        />
                    )}
                    {onToggleAmbient && (
                        <ActionBtn 
                            icon={Waves} 
                            label="Ambient Soundscapes" 
                            onClick={onToggleAmbient} 
                            active={isAmbientActive} 
                        />
                    )}
                    <ActionBtn icon={Highlighter} label="Annotations" onClick={onToggleAnnotations} />
                    <ActionBtn icon={Settings} label="Appearance" onClick={onToggleSettings} />

                    <div className="hidden sm:block w-px h-4 bg-black/10 dark:bg-white/10 mx-1" />
                    <div className="hidden sm:block">
                        <ActionBtn 
                            icon={isFullscreen ? Minimize2 : Maximize2} 
                            label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"} 
                            onClick={onToggleFullscreen} 
                        />
                    </div>
                </div>
            </div>
        </header>
    );
};

export default ReaderHeader;
