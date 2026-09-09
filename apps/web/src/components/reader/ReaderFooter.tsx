import { ChevronLeft, ChevronRight } from "lucide-react";

import { IconButton } from "@/components/ui/IconButton";
import { useSettings } from "@/store/useSettingsStore";

interface ReaderFooterProps {
    currentPage: number;
    estimatedMinutesRemaining?: number | null;
    onNextPage: () => void;
    onPageChange: (page: number) => void;
    onPrevPage: () => void;
    showUI: boolean;
    totalPages: number;
}

function ReaderFooter({
    currentPage,
    totalPages,
    showUI,
    onNextPage,
    onPrevPage,
    onPageChange,
    estimatedMinutesRemaining,
}: ReaderFooterProps) {
    const readerBackground = useSettings((state) => state.readerBackground);
    const readerAccent = useSettings((state) => state.readerAccent);
    const showPageCounter = useSettings((state) => state.showPageCounter);
    const progressBarType = useSettings((state) => state.progressBarType);
    const barPosition = useSettings((state) => state.barPosition);

    const progressPercent = Math.round((currentPage / totalPages) * 100) || 0;

    const isTop = barPosition === "top";
    const thinBarClass = isTop ? "top-0" : "bottom-0";
    const pillPositionClass = isTop ? "top-16" : "bottom-5";

    // If progressBarType === "none", the thin line is hidden.
    // The pill remains accessible but positioned according to barPosition.

    return (
        <>
            {progressBarType !== "none" && (
                <button
                    type="button"
                    className={`fixed left-0 right-0 z-50 h-1 bg-black/10 dark:bg-white/10 cursor-pointer pointer-events-auto group transition-opacity duration-300 ${showUI ? "opacity-100" : "opacity-60"} ${thinBarClass}`}
                    onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const percent = x / Math.max(1, rect.width);
                        onPageChange(Math.max(1, Math.ceil(percent * totalPages)));
                    }}
                    aria-label="Jump to reading progress position"
                >
                    <div
                        className="h-full transition-all duration-150"
                        style={{ width: `${progressPercent}%`, backgroundColor: readerAccent }}
                    />
                </button>
            )}

            {/* Navigation Pill (Visible on tap) */}
            <footer
                className={`fixed left-0 right-0 z-50 pointer-events-none transition-all duration-300 ${showUI ? "opacity-100" : "opacity-0"} ${isTop ? "top-0" : "bottom-0"}`}
            >
                <div className={`absolute left-1/2 -translate-x-1/2 pointer-events-auto transition-all duration-300 ${pillPositionClass}`}>
                    <div className="w-[min(640px,94vw)] px-4 py-2.5 rounded-full backdrop-blur-xl shadow-lg border border-black/5 dark:border-white/5 flex items-center gap-3" style={{ backgroundColor: `${readerBackground}F0` }}>
                        <div className="flex items-center shrink-0">
                            <IconButton
                                onClick={(e) => { e.stopPropagation(); onPrevPage(); }}
                                label="Previous page"
                                icon={<ChevronLeft className="w-5 h-5" />}
                                variant="ghost"
                                size="sm"
                            />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="relative">
                                <input
                                    type="range"
                                    min={1}
                                    max={totalPages || 1}
                                    value={currentPage}
                                    onChange={(e) => onPageChange(Number(e.target.value))}
                                    className="w-full h-2 appearance-none bg-transparent cursor-pointer"
                                    aria-label="Page slider"
                                />
                                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden pointer-events-none">
                                    <div style={{ width: `${progressPercent}%`, backgroundColor: readerAccent }} className="h-full transition-all" />
                                </div>
                            </div>
                            {showPageCounter && (
                                <div className="flex justify-center items-center text-xs mt-0.5 text-light-text-muted dark:text-dark-text-muted gap-2 font-medium select-none truncate">
                                    <span className="tabular-nums">{currentPage}</span>
                                    <span className="opacity-60">/</span>
                                    <span className="tabular-nums">{totalPages}</span>
                                    <span className="opacity-60">{progressPercent}%</span>
                                    {estimatedMinutesRemaining !== undefined && estimatedMinutesRemaining !== null && (
                                        <span>
                                            {estimatedMinutesRemaining < 1 
                                                ? "less than 1m left" 
                                                : `${Math.round(estimatedMinutesRemaining)}m left`}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center shrink-0">
                            <IconButton
                                onClick={(e) => { e.stopPropagation(); onNextPage(); }}
                                label="Next page"
                                icon={<ChevronRight className="w-5 h-5" />}
                                variant="ghost"
                                size="sm"
                            />
                        </div>
                    </div>
                </div>
            </footer>
        </>
    );
};

export default ReaderFooter;
