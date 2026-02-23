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
    const readerForeground = useSettings((state) => state.readerForeground);
    const readerBackground = useSettings((state) => state.readerBackground);

    const ActionBtn = ({ icon: Icon, label, onClick, active }: {
        icon: React.ElementType;
        label: string;
        onClick: () => void;
        active?: boolean;
    }) => (
        <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`p-2 transition-all duration-200 border-2 border-transparent hover:border-[#2c1e16] ${active
                ? "bg-[#b85e42]/20 text-[#b85e42] shadow-[2px_2px_0px_#2c1e16] -translate-y-px"
                : "hover:bg-[#e6d5b8] text-[#6a5a4e] hover:text-[#2c1e16] hover:-translate-y-px hover:shadow-[2px_2px_0px_#2c1e16]"
                }`}
            title={label}
            aria-label={label}
        >
            <Icon className="w-5 h-5" strokeWidth={2.5} />
        </button>
    );

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 pointer-events-none transition-opacity duration-300 ${showUI ? "opacity-100" : "opacity-0"}`}
        >
            <div className="relative flex items-start justify-between p-6">
                {/* Left: Back Button (Floating Post-it style) */}
                <button
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="pointer-events-auto p-3 bg-[#e6d5b8] border-[3px] border-[#2c1e16] shadow-[4px_4px_0px_rgba(44,30,22,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_rgba(44,30,22,1)] active:translate-y-px active:shadow-[2px_2px_0px_rgba(44,30,22,1)] transition-all duration-200 group rotate-[-2deg]"
                    aria-label="Close reader"
                >
                    <ArrowLeft
                        className="w-5 h-5 text-[#2c1e16] transition-transform group-hover:-translate-x-1"
                        strokeWidth={2.5}
                    />
                </button>

                {/* Center: Title (Taped Note) */}
                <div
                    className="absolute left-1/2 -translate-x-1/2 top-4 pointer-events-auto max-w-md px-8 py-3 bg-[#fdfaf5] border-[3px] border-[#2c1e16] shadow-[6px_6px_0px_rgba(44,30,22,1)] flex flex-col items-center justify-center transition-all duration-200 rotate-[1deg]"
                >
                    {/* Decorative Tape */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-5 bg-[#e6d5b8] border border-[#2c1e16]/20 rotate-[-3deg] shadow-sm z-10 mix-blend-multiply" />

                    <h1
                        className="font-black font-serif uppercase tracking-widest text-[#2c1e16] text-sm truncate max-w-[200px] text-center"
                    >
                        {book.title}
                    </h1>
                </div>

                {/* Right: Actions (Floating Scrap) */}
                <div
                    className="pointer-events-auto flex items-center gap-2 p-2 bg-[#fdfaf5] border-[3px] border-[#2c1e16] shadow-[4px_4px_0px_rgba(44,30,22,1)] transition-all duration-200 rotate-[-1deg]"
                >
                    {/* Decorative Tape */}
                    <div className="absolute -right-3 top-[-10px] w-12 h-4 bg-[#e6d5b8] border border-[#2c1e16]/20 rotate-[45deg] shadow-sm z-10 mix-blend-multiply" />

                    <ActionBtn
                        icon={isBookmarked ? BookmarkCheck : Bookmark}
                        label="Bookmark"
                        onClick={onToggleBookmark}
                        active={isBookmarked}
                    />
                    <div className="w-0.5 h-6 bg-[#2c1e16]/20 mx-1 rotate-12" />
                    <ActionBtn icon={List} label="Contents" onClick={onToggleTOC} />
                    <ActionBtn icon={Settings} label="Appearance" onClick={onToggleSettings} />
                    <ActionBtn icon={MoreHorizontal} label="Utilities" onClick={onToggleControls} />
                    <div className="w-0.5 h-6 bg-[#2c1e16]/20 mx-1 border-dashed -rotate-12" />
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
