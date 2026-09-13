import { Check } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import {
  ANNOTATION_COLORS,
  DEFAULT_ANNOTATION_COLOR,
  getAnnotationColor,
} from "@/config/annotationConfig";

interface ReaderNoteDialogProps {
  initialColor?: string;
  initialNote?: string;
  isOpen: boolean;
  onCancel: () => void;
  onSave: (note: string, color?: string) => void;
  selectedText?: string;
  title?: string;
}

export function ReaderNoteDialog({
  initialColor,
  initialNote = "",
  isOpen,
  onCancel,
  onSave,
  selectedText,
  title = "Add Note",
}: ReaderNoteDialogProps) {
  const [note, setNote] = useState(initialNote);
  const [selectedColor, setSelectedColor] = useState<string>(
    initialColor || DEFAULT_ANNOTATION_COLOR.value
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setNote(initialNote);
      setSelectedColor(initialColor || DEFAULT_ANNOTATION_COLOR.value);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isOpen, initialNote, initialColor]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (note.trim()) {
        onSave(note.trim(), selectedColor);
      }
    }
  };

  const currentColor = getAnnotationColor(selectedColor);

  return (
    <Dialog
      description={selectedText ? "Attach a note to the selected passage" : undefined}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onCancel} variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={!note.trim()}
            onClick={() => onSave(note.trim(), selectedColor)}
            variant="primary"
          >
            Save Note
          </Button>
        </div>
      }
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
    >
      <div className="space-y-3">
        {selectedText && (
          <blockquote
            className="text-xs text-light-text-muted dark:text-dark-text-muted italic border-l-2 pl-3 py-1.5 line-clamp-3 bg-black/[0.02] dark:bg-white/[0.02] rounded-r transition-colors"
            style={{ borderLeftColor: selectedColor }}
          >
            "{selectedText}"
          </blockquote>
        )}

        {/* Color Palette Picker */}
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-light-text dark:text-dark-text">
              {currentColor.name}
            </span>
            <span className="text-[10px] text-light-text-muted dark:text-dark-text-muted">
              • {currentColor.label}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {ANNOTATION_COLORS.map((c) => {
              const isSelected =
                selectedColor.toLowerCase() === c.value.toLowerCase();
              return (
                <button
                  aria-label={`Select ${c.label} color`}
                  className={`w-5 h-5 rounded-full transition-transform active:scale-90 flex items-center justify-center ${
                    isSelected
                      ? "ring-2 ring-offset-1 ring-light-accent dark:ring-dark-accent scale-110"
                      : "hover:scale-110 opacity-80 hover:opacity-100"
                  }`}
                  key={c.id}
                  onClick={() => setSelectedColor(c.value)}
                  style={{ backgroundColor: c.value }}
                  title={`${c.name} (${c.label})`}
                  type="button"
                >
                  {isSelected && (
                    <Check
                      className="w-3 h-3 text-white drop-shadow-sm"
                      strokeWidth={3}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <textarea
          className="w-full resize-none rounded-xl border border-black/10 dark:border-white/10 bg-light-surface dark:bg-dark-surface p-3 text-sm text-light-text dark:text-dark-text focus:border-light-accent dark:focus:border-dark-accent focus:outline-none focus:ring-1 focus:ring-light-accent dark:focus:ring-dark-accent placeholder:text-light-text-muted/60 dark:placeholder:text-dark-text-muted/60"
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write your note here... (Cmd+Enter to save)"
          ref={textareaRef}
          rows={4}
          value={note}
        />
      </div>
    </Dialog>
  );
}
