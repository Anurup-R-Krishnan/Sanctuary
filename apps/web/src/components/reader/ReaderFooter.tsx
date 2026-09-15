import type { CSSProperties } from "react";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { IconButton } from "@/components/ui/IconButton";
import { useSettings } from "@/store/useSettingsStore";

interface ReaderFooterProps {
    chapterEstimatedMinutesRemaining?: number | null;
    currentPage: number;
    estimatedMinutesRemaining?: number | null;
    onNextPage: () => void;
    onPrevPage: () => void;
    onSeekFraction: (fraction: number) => void;
    progressFraction: number;
    showUI: boolean;
    totalPages: number;
}

function ReaderFooter({
    chapterEstimatedMinutesRemaining,
    currentPage,
    estimatedMinutesRemaining,
    onNextPage,
    onPrevPage,
    onSeekFraction,
    progressFraction,
    showUI,
    totalPages,
}: ReaderFooterProps) {
    const readerBackground = useSettings((state) => state.readerBackground);
    const readerAccent = useSettings((state) => state.readerAccent);
    const showPageCounter = useSettings((state) => state.showPageCounter);
    const progressBarType = useSettings((state) => state.progressBarType);
    const barPosition = useSettings((state) => state.barPosition);

    const safeCurrentPage = Number.isFinite(currentPage) && currentPage > 0 ? currentPage : 1;
    const safeTotalPages = Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1;
    const safeFraction = Number.isFinite(progressFraction) ? Math.min(1, Math.max(0, progressFraction)) : 0;
    const progressPercent = Math.round(safeFraction * 100);

    const isTop = barPosition === "top";
    const thinBarClass = isTop ? "top-0" : "bottom-0";
    const pillPositionClass = isTop ? "top-16" : "bottom-5";

    const getTranslucentBg = (bg: string, alphaHex: string = "F0"): string => {
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

    const lightenHex = (hex: string, amount: number): string => {
        if (!hex.startsWith("#")) return hex;
        const full = hex.length === 4
            ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
            : hex;
        if (full.length !== 7) return hex;
        const r = parseInt(full.slice(1, 3), 16);
        const g = parseInt(full.slice(3, 5), 16);
        const b = parseInt(full.slice(5, 7), 16);
        const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
        return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
    };

    const fillGradient = `linear-gradient(90deg, ${readerAccent}, ${lightenHex(readerAccent, 0.4)})`;
    const fillGlow = `0 0 10px ${getTranslucentBg(readerAccent, "AA")}`;

    return (
        <>
            {progressBarType !== "none" && (
                <button
                    type="button"
                    className={`fixed left-0 right-0 z-50 h-1.5 hover:h-2.5 bg-light-border/70 dark:bg-dark-border/70 cursor-pointer pointer-events-auto group transition-[opacity,height] duration-150 ${showUI ? "opacity-100" : "opacity-60"} ${thinBarClass}`}
                    onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const fraction = x / Math.max(1, rect.width);
                        onSeekFraction(Math.min(1, Math.max(0, fraction)));
                    }}
                    aria-label="Jump to reading progress position"
                >
                    <div
                        className="h-full transition-[width] duration-100 ease-out"
                        style={{ width: `${progressPercent}%`, background: fillGradient, boxShadow: fillGlow }}
                    />
                </button>
            )}

            {/* Navigation Pill (Visible on tap) */}
            <footer
                className={`fixed left-0 right-0 z-50 pointer-events-none transition-all duration-300 ${showUI ? "opacity-100" : "opacity-0"} ${isTop ? "top-0" : "bottom-0"}`}
            >
                <div className={`absolute left-1/2 -translate-x-1/2 pointer-events-auto transition-all duration-300 ${pillPositionClass}`}>
                    <div className="w-[min(640px,94vw)] px-4 py-2.5 rounded-full backdrop-blur-xl shadow-lg border border-light-border dark:border-dark-border flex items-center gap-3" style={{ backgroundColor: getTranslucentBg(readerBackground, "F0") }}>
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
                            <div className="relative flex items-center h-5">
                                <input
                                    type="range"
                                    min={0}
                                    max={1000}
                                    value={Math.round(safeFraction * 1000)}
                                    onChange={(e) => onSeekFraction(Number(e.target.value) / 1000)}
                                    className="reader-progress-range relative z-10 w-full h-5"
                                    style={{ "--reader-progress-color": readerAccent } as CSSProperties}
                                    aria-label="Reading position"
                                />
                                <div className="absolute left-0 right-0 h-1.5 rounded-full bg-light-border/60 dark:bg-dark-border/60 overflow-hidden pointer-events-none">
                                    <div
                                        style={{ width: `${progressPercent}%`, background: fillGradient, boxShadow: fillGlow }}
                                        className="h-full transition-[width] duration-100 ease-out"
                                    />
                                </div>
                            </div>
                            {showPageCounter && (
                                <div className="flex justify-center items-center text-xs mt-0.5 text-light-text-muted dark:text-dark-text-muted gap-2 font-medium select-none truncate">
                                    <span className="tabular-nums">{safeCurrentPage}</span>
                                    <span className="opacity-60">/</span>
                                    <span className="tabular-nums">{safeTotalPages}</span>
                                    <span className="opacity-60">{progressPercent}%</span>
                                    {chapterEstimatedMinutesRemaining !== undefined && chapterEstimatedMinutesRemaining !== null && (
                                        <>
                                            <span className="opacity-40">·</span>
                                            <span className="tabular-nums">
                                                {chapterEstimatedMinutesRemaining < 1
                                                    ? "< 1m in ch"
                                                    : `${Math.round(chapterEstimatedMinutesRemaining)}m in ch`}
                                            </span>
                                        </>
                                    )}
                                    {estimatedMinutesRemaining !== undefined && estimatedMinutesRemaining !== null && (
                                        <>
                                            <span className="opacity-40">·</span>
                                            <span className="tabular-nums">
                                                {estimatedMinutesRemaining < 1 
                                                    ? "< 1m left" 
                                                    : estimatedMinutesRemaining >= 60
                                                        ? `${Math.floor(estimatedMinutesRemaining / 60)}h ${Math.round(estimatedMinutesRemaining % 60)}m left`
                                                        : `${Math.round(estimatedMinutesRemaining)}m left`}
                                            </span>
                                        </>
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
