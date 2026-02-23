import React from "react";
import { BookOpen } from "lucide-react";

interface ReaderContentProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isLoading: boolean;
}

const READER_COPY = {
  openingBook: "Opening book...",
} as const;

const ReaderContent: React.FC<ReaderContentProps> = ({ containerRef, isLoading }) => {
  return (
    <>
      <div ref={containerRef} className="absolute inset-0 overflow-auto" />
      {isLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#faf6f0]/90 backdrop-blur-sm">
          <div className="flex items-center gap-3 p-4 bg-[#fdfaf5] border-[3px] border-[#2c1e16] shadow-[6px_6px_0px_rgba(44,30,22,1)] rotate-[-1deg]">
            <BookOpen className="h-6 w-6 text-[#b85e42] animate-pulse" strokeWidth={2.5} />
            <span className="text-sm font-black uppercase tracking-widest text-[#2c1e16]">{READER_COPY.openingBook}</span>
          </div>
        </div>
      )}
    </>
  );
};

export default ReaderContent;
