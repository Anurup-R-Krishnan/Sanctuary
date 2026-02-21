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
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-light-primary/90 dark:bg-dark-primary/90 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-light-text dark:text-dark-text">
            <BookOpen className="h-5 w-5 animate-pulse" />
            <span className="text-sm font-medium">{READER_COPY.openingBook}</span>
          </div>
        </div>
      )}
    </>
  );
};

export default ReaderContent;
