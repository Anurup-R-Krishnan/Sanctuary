import { ExternalLink, X } from "lucide-react";
import React, { useEffect, useRef } from "react";

import type { ResolvedFootnote } from "@/utils/footnoteResolver";

import { IconButton } from "@/components/ui/IconButton";

export interface ReaderFootnotePopoverProps {
  anchorRect: {
    bottom: number;
    height: number;
    left: number;
    right: number;
    top: number;
    width: number;
  } | null;
  footnote: ResolvedFootnote | null;
  onClose: () => void;
  onNavigate?: (href: string) => void;
}

export const ReaderFootnotePopover: React.FC<ReaderFootnotePopoverProps> = ({
  anchorRect,
  footnote,
  onClose,
  onNavigate,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!footnote) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const timer = setTimeout(() => {
      window.addEventListener("mousedown", handleClickOutside);
    }, 50);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleClickOutside);
      clearTimeout(timer);
    };
  }, [footnote, onClose]);

  if (!footnote) return null;

  // Calculate positioning relative to viewport
  const popoverWidth = typeof window !== "undefined" ? Math.min(340, window.innerWidth - 32) : 340;
  let left = typeof window !== "undefined" ? window.innerWidth / 2 - popoverWidth / 2 : 16;
  let top = typeof window !== "undefined" ? window.innerHeight / 2 - 100 : 100;

  if (anchorRect && typeof window !== "undefined") {
    const center = anchorRect.left + anchorRect.width / 2;
    left = Math.max(16, Math.min(window.innerWidth - popoverWidth - 16, center - popoverWidth / 2));

    if (anchorRect.top > 240) {
      top = Math.max(16, anchorRect.top - 180);
    } else {
      top = Math.min(window.innerHeight - 200, anchorRect.bottom + 8);
    }
  }

  return (
    <div
      aria-label={footnote.title}
      className="fixed z-50 animate-in fade-in zoom-in-95 duration-150"
      ref={popoverRef}
      role="dialog"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${popoverWidth}px`,
      }}
    >
      <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl shadow-xl border border-black/10 dark:border-white/10 overflow-hidden flex flex-col backdrop-blur-md">
        {/* Header */}
        <div className="px-4 py-2.5 bg-black/[0.03] dark:bg-white/[0.03] border-b border-black/5 dark:border-white/5 flex items-center justify-between">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-light-accent/15 dark:bg-dark-accent/15 text-light-accent dark:text-dark-accent tracking-wide">
            {footnote.title}
          </span>
          <IconButton
            className="w-7 h-7 text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text !rounded-full"
            icon={<X className="w-3.5 h-3.5" />}
            label="Close footnote preview"
            onClick={onClose}
            size="sm"
            variant="ghost"
          />
        </div>

        {/* Content */}
        <div
          className="px-4 py-3 max-h-56 overflow-y-auto text-sm leading-relaxed text-light-text dark:text-dark-text prose prose-sm dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: footnote.contentHtml }}
        />

        {/* Action Footer */}
        {onNavigate && footnote.href && (
          <div className="px-4 py-2 bg-black/[0.02] dark:bg-white/[0.02] border-t border-black/5 dark:border-white/5 flex justify-end">
            <button
              className="inline-flex items-center gap-1.5 text-xs font-medium text-light-accent dark:text-dark-accent hover:underline active:opacity-80"
              onClick={() => {
                onClose();
                onNavigate(footnote.href);
              }}
              type="button"
            >
              <span>Go to note in book</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
