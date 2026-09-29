import {
  BookOpen,
  Check,
  Copy,
  Edit3,
  Highlighter,
  Underline,
  Volume2,
} from "lucide-react";
import React, { memo, useState } from "react";
import { createPortal } from "react-dom";

import type { ReaderSelection } from "@/types/reader";

import {
  ANNOTATION_COLORS,
  DEFAULT_ANNOTATION_COLOR,
} from "@/config/annotationConfig";
import { useSettings } from "@/store/useSettingsStore";

interface ReaderSelectionMenuProps {
  onAddNote: (color?: string) => void;
  onCopy: () => void;
  onDefine?: () => void;
  onHighlight: (color?: string) => void;
  onSpeak: () => void;
  onUnderline: () => void;
  selection: ReaderSelection | null;
}

function ReaderSelectionMenuImpl({
  onAddNote,
  onCopy,
  onDefine,
  onHighlight,
  onSpeak,
  onUnderline,
  selection,
}: ReaderSelectionMenuProps) {
  const colorAssist = useSettings((state) => state.colorVision !== "default");
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
      className="p-2 sm:p-2.5 md:p-3 flex flex-col items-center justify-center gap-1 shrink-0 min-w-[48px] sm:min-w-[54px] hover:bg-line/40 active:bg-line/60 active:scale-[0.95] transition-all duration-instant rounded-xl text-fg focus:outline-none focus:ring-2 focus:ring-accent"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      title={label}
      type="button"
    >
      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
      <span className="text-2xs font-medium leading-none whitespace-nowrap">{label}</span>
    </button>
  );

  const menu = (
    <div
      role="toolbar"
      aria-label="Text selection actions"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-page/95 shadow-2xl rounded-xl border border-line overflow-hidden flex flex-col animate-slideUp pointer-events-auto max-w-[calc(100vw-1.5rem)] sm:max-w-none"
    >
      {/* Top Color Palette Swatch Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface/60 border-b border-line gap-3">
        <span className="text-2xs font-medium text-fg-muted">
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
                    ? "ring-2 ring-offset-1 ring-accent scale-110"
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
                {isSelected ? (

                  <Check className="w-2.5 h-2.5 text-white drop-shadow-sm" strokeWidth={3} />

                ) : colorAssist ? (

                  <span aria-hidden="true" className="text-3xs font-bold leading-none text-white">{c.label.charAt(0)}</span>

                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Action Bar */}
      <div className="flex items-center overflow-x-auto no-scrollbar max-w-[calc(100vw-1.5rem)] sm:max-w-none px-1 sm:px-0">
        {onDefine && (
          <>
            <ActionBtn
              ariaLabel="Define word"
              icon={BookOpen}
              label="Define"
              onClick={onDefine}
            />
            <div className="w-px h-8 bg-line shrink-0" />
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
        <div className="w-px h-8 bg-line shrink-0" />
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
        <ActionBtn
          ariaLabel="Speak selection"
          icon={Volume2}
          label="Speak"
          onClick={onSpeak}
        />
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return menu;
  }
  return createPortal(menu, document.body);
}

export const ReaderSelectionMenu = memo(ReaderSelectionMenuImpl);
