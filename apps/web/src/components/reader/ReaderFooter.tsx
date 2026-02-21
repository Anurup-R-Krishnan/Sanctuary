import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
    const { readerForeground, readerBackground, readerAccent, continuous } = useSettings();

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
                <button
                    type="button"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 dark:bg-white/10 cursor-pointer pointer-events-auto group"
                    onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const percent = x / rect.width;
                        onPageChange(Math.ceil(percent * totalPages));
                    }}
                    aria-label="Jump to reading progress position"
                >
                    <div
                        className="h-full transition-all duration-150"
                        style={{ width: `${progressPercent}%`, backgroundColor: readerAccent }}
                    />
                </button>

                {/* Centered Bottom Bar */}
                <div className={`fixed left-1/2 -translate-x-1/2 bottom-6 z-50 pointer-events-auto transition-opacity duration-300 ${showUI ? "opacity-100" : "opacity-0"}`}>
                    <div className="w-[min(880px,92vw)] px-4 py-3 rounded-full backdrop-blur-xl shadow-lg border border-black/5 dark:border-white/5 flex items-center gap-4" style={{ backgroundColor: `${readerBackground}E8` }}>
                        <div className="flex items-center gap-2">
                            <button onClick={(e) => { e.stopPropagation(); onPrevPage(); }} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1">
                            <div className="relative">
                                <input
                                    type="range"
                                    min={1}
                                    max={totalPages || 1}
                                    value={currentPage}
                                    onChange={(e) => onPageChange(Number(e.target.value))}
                                    className="w-full h-2 appearance-none bg-transparent"
                                    aria-label="Page slider"
                                />
                                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                                    <div style={{ width: `${progressPercent}%`, backgroundColor: readerAccent }} className="h-full transition-all" />
                                </div>
                            </div>
                            <div className="flex justify-center text-xs mt-1 text-light-text-muted dark:text-dark-text-muted gap-3">
                                <span className="tabular-nums">{currentPage}</span>
                                <span>/</span>
                                <span className="tabular-nums">{totalPages}</span>
                                <span>•</span>
                                <span>{readingTime}m</span>
                                <span>•</span>
                                <span>{Math.max(0, totalPages - currentPage)} left</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button onClick={(e) => { e.stopPropagation(); onNextPage(); }} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </footer>
        </>
    );
};

export default ReaderFooter;
