import React from "react";

interface ReaderContentProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

function ReaderContent({ containerRef }: ReaderContentProps) {
  return (
    <div ref={containerRef} className="absolute inset-0 overflow-auto" />
  );
}

export default ReaderContent;
