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
    Moon,
    Search,
    Settings,
    SlidersHorizontal,
    Users,
    Waves,
    Zap,
} from "lucide-react";
import React, { Suspense, lazy, useEffect, useRef, useState } from "react";

import type { Book } from "@/types";

import { IconButton } from "@/components/ui/IconButton";
import { useSettings } from "@/store/useSettingsStore";
import { useStatsStore } from "@/store/useStatsStore";

const ReaderSessionTimer = lazy(() => import("@/components/reader/ReaderSessionTimer"));

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
    isXRayActive?: boolean;
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
    onToggleXRay?: () => void;
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
    isXRayActive,
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
    onToggleXRay,
    onToggleZenMode,
    readingSpeedWpm,
    showUI,
}: ReaderHeaderProps) {
    const readerForeground = useSettings((state) => state.readerForeground);
    const readerBackground = useSettings((state) => state.readerBackground);
    const showFloatingCapsule = useSettings((state) => state.showFloatingCapsule);
    const currentStreak = useStatsStore((state) => state.stats.currentStreak);

    const [showToolsMenu, setShowToolsMenu] = useState(false);
    const toolsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!showToolsMenu) return;
        const handleOutsideClick = (e: MouseEvent) => {
            if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
                setShowToolsMenu(false);
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setShowToolsMenu(false);
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [showToolsMenu]);

    const hasActiveTool = Boolean(
        isTTSActive || isZenModeActive || isXRayActive || isAutoScrollActive || isReadabilityActive || isAmbientActive
    );

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
                    : "hover:bg-light-border/40 dark:hover:bg-dark-border/40 text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text"
                }`}
            label={label}
            icon={<Icon className="w-5 h-5" strokeWidth={1.5} />}
            variant="ghost"
        />
    );

    const ToolItem = ({
        active,
        icon: Icon,
        label,
        onClick,
        shortcut,
    }: {
        active?: boolean;
        icon: React.ElementType;
        label: string;
        onClick: () => void;
        shortcut?: string;
    }) => (
        <button
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                active
                    ? "bg-light-accent/15 dark:bg-dark-accent/15 text-light-accent dark:text-dark-accent"
                    : "text-light-text dark:text-dark-text hover:bg-light-border/40 dark:hover:bg-dark-border/40"
            }`}
            onClick={(e) => {
                e.stopPropagation();
                setShowToolsMenu(false);
                onClick();
            }}
            type="button"
        >
            <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                <span>{label}</span>
            </div>
            {shortcut && (
                <span className="text-[10px] text-light-text-muted dark:text-dark-text-muted font-mono px-1.5 py-0.5 rounded bg-light-border/50 dark:bg-dark-border/50">
                    {shortcut}
                </span>
            )}
        </button>
    );

    const getTranslucentBg = (bg: string, alphaHex: string = "E6"): string => {
        if (bg.startsWith("#")) {
            if (bg.length === 4) {
                return `#${bg[1]}${bg[1]}${bg[2]}${bg[2]}${bg[3]}${bg[3]}${alphaHex}`;
            }
            if (bg.length === 7) {
                return `${bg}${alphaHex}`;
            }
        }
        return bg;
    };

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 pointer-events-none transition-opacity duration-300 ${showUI ? "opacity-100" : "opacity-0"}`}
        >
            <div className="flex items-start justify-between p-3.5 sm:p-5 md:p-6">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <IconButton
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="pointer-events-auto p-3 !rounded-full backdrop-blur-xl shadow-lg border border-light-border dark:border-dark-border hover:scale-105 transition-all duration-instant group shrink-0"
                        style={{ backgroundColor: getTranslucentBg(readerBackground, "E6") }}
                        label="Close reader"
                        icon={<ArrowLeft className="w-5 h-5 transition-colors" style={{ color: readerForeground }} strokeWidth={2} />}
                        variant="ghost"
                    />

                    {/* Title, Chapter Progress & Session Timer (Floating Capsule) */}
                    {showFloatingCapsule && (
                        <div
                            className="pointer-events-auto min-w-0 max-w-sm px-4 py-1.5 rounded-full backdrop-blur-xl shadow-lg border border-light-border dark:border-dark-border hidden lg:flex items-center gap-2.5 transition-all duration-instant"
                            style={{ backgroundColor: getTranslucentBg(readerBackground, "E6") }}
                        >
                            <Suspense fallback={null}>
                                <ReaderSessionTimer />
                            </Suspense>
                            <div className="w-px h-5 bg-light-border dark:bg-dark-border" />
                            <div className="flex flex-col items-start justify-center min-w-0">
                                <h1
                                    className="font-medium text-xs sm:text-sm truncate max-w-[240px]"
                                    style={{ color: readerForeground }}
                                >
                                    {chapterLabel || book.title}
                                </h1>
                                {(chapterEstimatedMinutesRemaining !== undefined && chapterEstimatedMinutesRemaining !== null) ? (
                                    <span
                                        className="text-[10px] tracking-wide opacity-60 font-medium truncate max-w-[240px]"
                                        style={{ color: readerForeground }}
                                    >
                                        {chapterEstimatedMinutesRemaining < 1
                                            ? "< 1 min in chapter"
                                            : `${Math.round(chapterEstimatedMinutesRemaining)} min in chapter`}
                                        {readingSpeedWpm ? ` · ${readingSpeedWpm} wpm` : ""}
                                        {currentStreak > 0 ? ` · 🔥 ${currentStreak}d` : ""}
                                    </span>
                                ) : currentStreak > 0 ? (
                                    <span
                                        className="text-[10px] tracking-wide opacity-60 font-medium truncate max-w-[240px]"
                                        style={{ color: readerForeground }}
                                    >
                                        🔥 {currentStreak} day streak
                                    </span>
                                ) : null}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Actions (Floating Group) */}
                <div 
                    className="pointer-events-auto flex flex-nowrap items-center gap-1 p-1.5 rounded-full backdrop-blur-xl shadow-lg border border-light-border dark:border-dark-border transition-all duration-instant shrink-0 max-w-[calc(100vw-5.5rem)] overflow-x-auto scrollbar-none"
                    style={{ backgroundColor: getTranslucentBg(readerBackground, "E6") }}
                >
                    <ActionBtn 
                        icon={isBookmarked ? BookmarkCheck : Bookmark} 
                        label="Bookmark" 
                        onClick={onToggleBookmark} 
                        active={isBookmarked} 
                    />
                    <div className="w-px h-4 bg-light-border dark:bg-dark-border mx-1" />
                    <ActionBtn icon={List} label="Contents" onClick={onToggleTOC} />
                    <ActionBtn icon={Search} label="Search" onClick={onToggleSearch} />
                    <ActionBtn icon={Highlighter} label="Annotations" onClick={onToggleAnnotations} />

                    {/* Reading Tools Dropdown */}
                    <div className="relative" ref={toolsRef}>
                        <ActionBtn 
                            icon={SlidersHorizontal} 
                            label="Reading Tools" 
                            onClick={() => setShowToolsMenu((prev) => !prev)} 
                            active={showToolsMenu || hasActiveTool} 
                        />
                        {hasActiveTool && !showToolsMenu && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-light-accent dark:bg-dark-accent ring-2 ring-light-primary dark:ring-dark-primary pointer-events-none" />
                        )}

                        {showToolsMenu && (
                            <div
                                className="absolute right-0 top-full mt-2 w-52 p-1.5 rounded-2xl backdrop-blur-2xl shadow-2xl border border-light-border dark:border-dark-border animate-slideDown flex flex-col gap-0.5 z-50"
                                style={{ backgroundColor: getTranslucentBg(readerBackground, "F5") }}
                            >
                                {onToggleTTS && (
                                    <ToolItem
                                        active={isTTSActive}
                                        icon={Headphones}
                                        label="Read Aloud"
                                        onClick={onToggleTTS}
                                    />
                                )}
                                {onToggleAutoScroll && (
                                    <ToolItem
                                        active={isAutoScrollActive}
                                        icon={ChevronsDown}
                                        label="Auto-Scroll"
                                        onClick={onToggleAutoScroll}
                                        shortcut="A"
                                    />
                                )}
                                {onToggleSpeedReader && (
                                    <ToolItem
                                        icon={Zap}
                                        label="Speed Reader"
                                        onClick={onToggleSpeedReader}
                                    />
                                )}
                                {onToggleXRay && (
                                    <ToolItem
                                        active={isXRayActive}
                                        icon={Users}
                                        label="X-Ray"
                                        onClick={onToggleXRay}
                                        shortcut="X"
                                    />
                                )}
                                {onToggleReadability && (
                                    <ToolItem
                                        active={isReadabilityActive}
                                        icon={BarChart2}
                                        label="Readability"
                                        onClick={onToggleReadability}
                                        shortcut="M"
                                    />
                                )}
                                {onToggleZenMode && (
                                    <ToolItem
                                        active={isZenModeActive}
                                        icon={Moon}
                                        label="Zen Focus"
                                        onClick={onToggleZenMode}
                                        shortcut="Z"
                                    />
                                )}
                                {onToggleAmbient && (
                                    <ToolItem
                                        active={isAmbientActive}
                                        icon={Waves}
                                        label="Ambient Sound"
                                        onClick={onToggleAmbient}
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    <ActionBtn icon={Settings} label="Appearance" onClick={onToggleSettings} />

                    <div className="hidden sm:block w-px h-4 bg-light-border dark:bg-dark-border mx-1" />
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
