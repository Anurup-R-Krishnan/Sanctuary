import React from "react";
import { Clock, Layers, Scroll, ChevronLeft, ChevronRight } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

interface ReaderFooterProps {
    currentPage: number;
    totalPages: number;
    readingTime: number;
    showUI: boolean;
    onNextPage: () => void;
    onPrevPage: () => void;
    onPageChange: (page: number) => void;
}

const ReaderFooter: React.FC<ReaderFooterProps> = ({
    currentPage,
    totalPages,
    readingTime,
    showUI,
    onNextPage,
    onPrevPage,
    onPageChange,
}) => {
    const { 
        readerForeground, 
        readerBackground, 
        readerAccent, 
        continuous, 
        showPageCounter,
        progressBarType,
        barPosition
    } = useSettings();

    const progressPercent = Math.round((currentPage / totalPages) * 100) || 0;

    return (
        <>
            {/* Floating Navigation Buttons (Desktop) */}
            {!continuous && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); onPrevPage(); }}
                        className={`fixed left-4 top-1/2 -translate-y-1/2 z-40 p-4 rounded-full shadow-xl transition-all duration-300 hover:scale-110 hidden md:flex items-center justify-center group ${showUI ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"}`}
                        style={{ backgroundColor: `${readerBackground}E6`, color: readerForeground }}
                        aria-label="Previous page"
                    >
                        <ChevronLeft className="w-6 h-6 opacity-70 group-hover:opacity-100" strokeWidth={2} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onNextPage(); }}
                        className={`fixed right-4 top-1/2 -translate-y-1/2 z-40 p-4 rounded-full shadow-xl transition-all duration-300 hover:scale-110 hidden md:flex items-center justify-center group ${showUI ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none"}`}
                        style={{ backgroundColor: `${readerBackground}E6`, color: readerForeground }}
                        aria-label="Next page"
                    >
                        <ChevronRight className="w-6 h-6 opacity-70 group-hover:opacity-100" strokeWidth={2} />
                    </button>
                </>
            )}

            {/* Bottom Bar (Minimal) */}
            <footer
                className={`fixed bottom-0 left-0 right-0 z-50 pointer-events-none transition-opacity duration-300 ${showUI ? "opacity-100" : "opacity-0"}`}
            >
                {/* Progress Line (Always visible if enabled, but we hide it with UI for now) */}
                {progressBarType === "bar" && (
                    <div 
                        className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 dark:bg-white/10 cursor-pointer pointer-events-auto group"
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const percent = x / rect.width;
                            onPageChange(Math.ceil(percent * totalPages));
                        }}
                    >
                        <div 
                            className="h-full transition-all duration-150"
                            style={{ width: `${progressPercent}%`, backgroundColor: readerAccent }}
                        />
                        {/* Hover Preview */}
                        <div 
                            className="absolute bottom-2 -translate-x-1/2 px-2 py-1 rounded bg-black/80 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                            style={{ left: `${progressPercent}%` }}
                        >
                            {Math.round(progressPercent)}%
                        </div>
                    </div>
                )}

                {/* Floating Page Info */}
                <div className="absolute bottom-6 right-6 pointer-events-auto">
                    <div 
                        className="flex items-center gap-3 px-4 py-2 rounded-full backdrop-blur-xl shadow-lg border border-black/5 dark:border-white/5 transition-colors duration-300"
                        style={{ backgroundColor: `${readerBackground}E6` }}
                    >
                        {showPageCounter && (
                            <span className="text-xs font-medium tabular-nums opacity-80" style={{ color: readerForeground }}>
                                {currentPage} <span className="opacity-40">/</span> {totalPages}
                            </span>
                        )}
                        
                        <div className="w-px h-3 bg-black/10 dark:bg-white/10" />
                        
                        <div className="flex items-center gap-1.5 text-[10px] font-medium opacity-60" style={{ color: readerForeground }}>
                            <Clock className="w-3 h-3" />
                            <span>{readingTime}m</span>
                        </div>
                    </div>
                </div>
            </footer>
        </>
    );
};

export default ReaderFooter;
