import React, { useState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

interface ReaderNoteDialogProps {
  initialNote?: string;
  isOpen: boolean;
  onCancel: () => void;
  onSave: (note: string) => void;
  selectedText?: string;
  title?: string;
}

export function ReaderNoteDialog({
  isOpen,
  selectedText,
  initialNote = "",
  title = "Add Note",
  onSave,
  onCancel,
}: ReaderNoteDialogProps) {
  const [note, setNote] = useState(initialNote);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setNote(initialNote);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isOpen, initialNote]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onSave(note.trim());
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      description={selectedText ? `Attach a note to the selected passage` : undefined}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => onSave(note.trim())}
            disabled={!note.trim()}
          >
            Save Note
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {selectedText && (
          <blockquote className="text-xs text-light-text-muted dark:text-dark-text-muted italic border-l-2 border-light-accent dark:border-dark-accent pl-3 py-1 line-clamp-3 bg-black/[0.02] dark:bg-white/[0.02] rounded-r">
            "{selectedText}"
          </blockquote>
        )}
        <textarea
          ref={textareaRef}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write your note here... (Cmd+Enter to save)"
          rows={4}
          className="w-full resize-none rounded-xl border border-black/10 dark:border-white/10 bg-light-surface dark:bg-dark-surface p-3 text-sm text-light-text dark:text-dark-text focus:border-light-accent dark:focus:border-dark-accent focus:outline-none focus:ring-1 focus:ring-light-accent dark:focus:ring-dark-accent placeholder:text-light-text-muted/60 dark:placeholder:text-dark-text-muted/60"
        />
      </div>
    </Dialog>
  );
}
