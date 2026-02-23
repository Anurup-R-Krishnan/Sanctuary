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
    const readerForeground = useSettings((state) => state.readerForeground);
    const readerBackground = useSettings((state) => state.readerBackground);
    const readerAccent = useSettings((state) => state.readerAccent);
    const continuous = useSettings((state) => state.continuous);

    const progressPercent = Math.round((currentPage / totalPages) * 100) || 0;

    return (
        <>
            {/* Floating Navigation Buttons (Desktop) */}
            {!continuous && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); onPrevPage(); }}
                        className={`fixed left-4 top-1/2 -translate-y-1/2 z-40 p-4 bg-[#e6d5b8] border-[3px] border-[#2c1e16] shadow-[4px_4px_0px_rgba(44,30,22,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_rgba(44,30,22,1)] active:translate-y-px active:shadow-[2px_2px_0px_rgba(44,30,22,1)] transition-all duration-300 hidden md:flex items-center justify-center group rotate-[-2deg] ${showUI ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"}`}
                        aria-label="Previous page"
                    >
                        <ChevronLeft className="w-6 h-6 text-[#2c1e16] opacity-70 group-hover:opacity-100" strokeWidth={3} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onNextPage(); }}
                        className={`fixed right-4 top-1/2 -translate-y-1/2 z-40 p-4 bg-[#e6d5b8] border-[3px] border-[#2c1e16] shadow-[4px_4px_0px_rgba(44,30,22,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_rgba(44,30,22,1)] active:translate-y-px active:shadow-[2px_2px_0px_rgba(44,30,22,1)] transition-all duration-300 hidden md:flex items-center justify-center group rotate-[2deg] ${showUI ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none"}`}
                        aria-label="Next page"
                    >
                        <ChevronRight className="w-6 h-6 text-[#2c1e16] opacity-70 group-hover:opacity-100" strokeWidth={3} />
                    </button>
                </>
            )}

            {/* Bottom Bar (Minimal) */}
            <footer
                className={`fixed bottom-0 left-0 right-0 z-50 pointer-events-none transition-opacity duration-300 ${showUI ? "opacity-100" : "opacity-0"}`}
            >
                <button
                    type="button"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 cursor-pointer pointer-events-auto group"
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

                {/* Floating Bottom Bar (Scrap Style) */}
                <div className={`fixed left-1/2 -translate-x-1/2 bottom-8 z-50 pointer-events-auto transition-opacity duration-300 ${showUI ? "opacity-100" : "opacity-0"}`}>
                    <div className="w-[min(880px,92vw)] px-6 py-4 bg-[#fdfaf5] border-[3px] border-[#2c1e16] shadow-[8px_8px_0px_rgba(44,30,22,1)] flex items-center justify-between gap-6 rotate-[1deg]">

                        {/* Decorative Tape Left */}
                        <div className="absolute -left-4 top-2 w-10 h-4 bg-[#e6d5b8] border border-[#2c1e16]/20 rotate-[-15deg] shadow-sm z-10 mix-blend-multiply" />

                        {/* Decorative Tape Right */}
                        <div className="absolute -right-4 bottom-2 w-10 h-4 bg-[#e6d5b8] border border-[#2c1e16]/20 rotate-[15deg] shadow-sm z-10 mix-blend-multiply" />

                        <div className="flex items-center">
                            <button onClick={(e) => { e.stopPropagation(); onPrevPage(); }} className="p-2 border-2 border-transparent hover:border-[#2c1e16] bg-[#e6d5b8] text-[#2c1e16] shadow-[2px_2px_0px_rgba(44,30,22,1)] hover:-translate-y-px active:translate-y-px active:shadow-none transition-all rotate-[-3deg]">
                                <ChevronLeft className="w-5 h-5" strokeWidth={3} />
                            </button>
                        </div>

                        <div className="flex-1 relative group py-2">
                            <input
                                type="range"
                                min={1}
                                max={totalPages || 1}
                                value={currentPage}
                                onChange={(e) => onPageChange(Number(e.target.value))}
                                className="w-full h-8 opacity-0 cursor-pointer absolute inset-0 z-10"
                                aria-label="Page slider"
                            />
                            {/* Track */}
                            <div className="h-4 border-2 border-[#2c1e16] bg-white w-full absolute top-1/2 -translate-y-1/2">
                                <div style={{ width: `${progressPercent}%` }} className="h-full bg-[#b85e42] transition-all" />
                            </div>

                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-[#6a5a4e] mt-6 gap-2">
                                <span>{currentPage} / {totalPages}</span>
                                <span>{readingTime}m • {Math.max(0, totalPages - currentPage)} LEFT</span>
                                <span>{progressPercent}%</span>
                            </div>
                        </div>

                        <div className="flex items-center">
                            <button onClick={(e) => { e.stopPropagation(); onNextPage(); }} className="p-2 border-2 border-transparent hover:border-[#2c1e16] bg-[#e6d5b8] text-[#2c1e16] shadow-[2px_2px_0px_rgba(44,30,22,1)] hover:-translate-y-px active:translate-y-px active:shadow-none transition-all rotate-[3deg]">
                                <ChevronRight className="w-5 h-5" strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                </div>
            </footer>
        </>
    );
};

export default ReaderFooter;
