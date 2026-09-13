import {
  BarChart2,
  BookOpen,
  Check,
  Copy,
  Edit3,
  Highlighter,
  Quote,
  Underline,
  Users,
  Volume2,
  Zap,
} from "lucide-react";
import React, { memo, useState } from "react";

import type { ReaderSelection } from "@/types/reader";

import {
  ANNOTATION_COLORS,
  DEFAULT_ANNOTATION_COLOR,
} from "@/config/annotationConfig";

interface ReaderSelectionMenuProps {
  onAddNote: (color?: string) => void;
  onAnalyzeReadability?: () => void;
  onCopy: () => void;
  onCreateQuoteCard?: () => void;
  onDefine?: () => void;
  onHighlight: (color?: string) => void;
  onSpeak: () => void;
  onSpeedRead?: () => void;
  onUnderline: () => void;
  onXRay?: () => void;
  selection: ReaderSelection | null;
}

function ReaderSelectionMenuImpl({
  onAddNote,
  onAnalyzeReadability,
  onCopy,
  onCreateQuoteCard,
  onDefine,
  onHighlight,
  onSpeak,
  onSpeedRead,
  onUnderline,
  onXRay,
  selection,
}: ReaderSelectionMenuProps) {
  const [activeColor, setActiveColor] = useState<string>(
    DEFAULT_ANNOTATION_COLOR.value
  );

  if (!selection) return null;

  const ActionBtn = ({
    ariaLabel,
    icon: Icon,
    label,
    onClick,
  }: {
    ariaLabel?: string;
    icon: React.ElementType;
    label: string;
    onClick: () => void;
  }) => (
    <button
      aria-label={ariaLabel || label}
      className="p-2.5 sm:p-3 flex flex-col items-center gap-1 hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 active:scale-[0.95] transition-all duration-instant rounded-xl text-light-text dark:text-dark-text"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      title={label}
      type="button"
    >
      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-light-primary dark:bg-dark-primary shadow-2xl rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden flex flex-col animate-slideUp pointer-events-auto">
      {/* Top Color Palette Swatch Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/[0.03] dark:bg-white/[0.04] border-b border-black/5 dark:border-white/5 gap-3">
        <span className="text-[10px] font-medium text-light-text-muted dark:text-dark-text-muted">
          Highlight Palette
        </span>
        <div className="flex items-center gap-1.5">
          {ANNOTATION_COLORS.map((c) => {
            const isSelected = activeColor === c.value;
            return (
              <button
                aria-label={`Highlight with ${c.label}`}
                className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full transition-transform active:scale-90 flex items-center justify-center ${
                  isSelected
                    ? "ring-2 ring-offset-1 ring-light-accent dark:ring-dark-accent scale-110"
                    : "hover:scale-110 opacity-85 hover:opacity-100"
                }`}
                key={c.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveColor(c.value);
                  onHighlight(c.value);
                }}
                style={{ backgroundColor: c.value }}
                title={`${c.name} (${c.label})`}
                type="button"
              >
                {isSelected && (
                  <Check
                    className="w-2.5 h-2.5 text-white drop-shadow-sm"
                    strokeWidth={3}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Action Bar */}
      <div className="flex items-center">
        {onDefine && (
          <>
            <ActionBtn
              ariaLabel="Define word"
              icon={BookOpen}
              label="Define"
              onClick={onDefine}
            />
            <div className="w-px h-8 bg-black/10 dark:bg-white/10" />
          </>
        )}
        <ActionBtn
          ariaLabel="Highlight text"
          icon={Highlighter}
          label="Highlight"
          onClick={() => onHighlight(activeColor)}
        />
        <ActionBtn
          ariaLabel="Underline text"
          icon={Underline}
          label="Underline"
          onClick={onUnderline}
        />
        <div className="w-px h-8 bg-black/10 dark:bg-white/10" />
        <ActionBtn
          ariaLabel="Add note"
          icon={Edit3}
          label="Note"
          onClick={() => onAddNote(activeColor)}
        />
        <ActionBtn
          ariaLabel="Copy selection"
          icon={Copy}
          label="Copy"
          onClick={onCopy}
        />
        {onCreateQuoteCard && (
          <ActionBtn
            ariaLabel="Create quote card"
            icon={Quote}
            label="Quote"
            onClick={onCreateQuoteCard}
          />
        )}
        <div className="w-px h-8 bg-black/10 dark:bg-white/10" />
        <ActionBtn
          ariaLabel="Speak selection"
          icon={Volume2}
          label="Speak"
          onClick={onSpeak}
        />
        {onSpeedRead && (
          <ActionBtn
            ariaLabel="Speed read selection"
            icon={Zap}
            label="Speed"
            onClick={onSpeedRead}
          />
        )}
        {onAnalyzeReadability && (
          <ActionBtn
            ariaLabel="Analyze readability and complexity"
            icon={BarChart2}
            label="Metrics"
            onClick={onAnalyzeReadability}
          />
        )}
        {onXRay && (
          <ActionBtn
            ariaLabel="Lookup character in X-Ray Dossier"
            icon={Users}
            label="X-Ray"
            onClick={onXRay}
          />
        )}
      </div>
    </div>
  );
}

export const ReaderSelectionMenu = memo(ReaderSelectionMenuImpl);
