import { BookMarked, CheckCircle, FileDown, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface BatchActionBarProps {
  onAssignCollection: (bookIds: string[], collection: string) => void;
  onClearSelection: () => void;
  onDelete: (bookIds: string[]) => void;
  onExportAnnotations?: (bookIds: string[]) => void;
  onMarkFinished: (bookIds: string[]) => void;
  selectedBookIds: string[];
}

export function BatchActionBar({
  onAssignCollection,
  onClearSelection,
  onDelete,
  onExportAnnotations,
  onMarkFinished,
  selectedBookIds,
}: BatchActionBarProps) {
  const [collectionInputVisible, setCollectionInputVisible] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const visible = selectedBookIds.length > 0;

  useEffect(() => {
    if (collectionInputVisible) {
      inputRef.current?.focus();
    }
  }, [collectionInputVisible]);

  useEffect(() => {
    if (!visible) {
      setCollectionInputVisible(false);
      setCollectionName("");
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (collectionInputVisible) {
          setCollectionInputVisible(false);
        } else {
          onClearSelection();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [visible, collectionInputVisible, onClearSelection]);

  const handleAssign = () => {
    const trimmed = collectionName.trim();
    if (trimmed) {
      onAssignCollection(selectedBookIds, trimmed);
      setCollectionName("");
      setCollectionInputVisible(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Delete ${selectedBookIds.length} book${selectedBookIds.length > 1 ? "s" : ""}? This cannot be undone.`)) {
      onDelete(selectedBookIds);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-live="polite"
      className={`fixed bottom-20 left-1/2 z-[100] -translate-x-1/2 transition-transform duration-300 ease-out ${
        visible ? "translate-y-0" : "translate-y-36 pointer-events-none"
      }`}
    >
      <div className="flex items-center gap-2 rounded-2xl bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border shadow-xl px-4 py-3">
        {/* Selection badge */}
        <span className="min-w-[2rem] rounded-full bg-light-accent/15 dark:bg-dark-accent/20 px-2.5 py-1 text-center text-xs font-semibold text-light-accent dark:text-dark-accent">
          {selectedBookIds.length}
        </span>

        <div className="h-5 w-px bg-light-border dark:bg-dark-border" />

        {/* Assign Collection */}
        {collectionInputVisible ? (
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              className="w-36 rounded-lg border border-light-border dark:border-dark-border bg-light-primary dark:bg-dark-primary px-2.5 py-1 text-sm text-light-text dark:text-dark-text outline-none focus:ring-1 focus:ring-light-accent dark:focus:ring-dark-accent"
              placeholder="Collection name…"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAssign();
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setCollectionInputVisible(false);
                }
              }}
            />
            <button
              className="rounded-lg px-2.5 py-1 text-xs font-medium bg-light-accent text-white dark:bg-dark-accent dark:text-black hover:opacity-90 disabled:opacity-40 transition-opacity"
              disabled={!collectionName.trim()}
              onClick={handleAssign}
             type="button"

             >              Add
            </button>
            <button
              aria-label="Cancel collection assignment"
              className="rounded-lg p-1 text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text transition-colors"
              onClick={() => setCollectionInputVisible(false)}
              type="button"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-light-text dark:text-dark-text hover:bg-light-border/40 dark:hover:bg-dark-border/40 transition-colors"
            onClick={() => setCollectionInputVisible(true)}
            type="button"
          >
            <BookMarked className="h-4 w-4" />
            Assign
          </button>
        )}

        {/* Mark Finished */}
        <button
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-light-text dark:text-dark-text hover:bg-light-border/40 dark:hover:bg-dark-border/40 transition-colors"
          onClick={() => onMarkFinished(selectedBookIds)}
          type="button"
        >
          <CheckCircle className="h-4 w-4" />
          Finished
        </button>

        {/* Export Annotations */}
        {onExportAnnotations && (
          <button
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-light-text dark:text-dark-text hover:bg-light-border/40 dark:hover:bg-dark-border/40 transition-colors"
            onClick={() => onExportAnnotations(selectedBookIds)}
            type="button"
          >
            <FileDown className="h-4 w-4" />
            Export Notes
          </button>
        )}

        {/* Delete */}
        <button
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          onClick={handleDelete}
         type="button"

         >          <Trash2 className="h-4 w-4" />
          Delete
        </button>

        <div className="h-5 w-px bg-light-border dark:bg-dark-border" />

        {/* Clear */}
        <button
          aria-label="Clear selection"
          className="rounded-lg p-1.5 text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text hover:bg-light-border/40 dark:hover:bg-dark-border/40 transition-colors"
          onClick={onClearSelection}
         type="button"

         >          <X className="h-4 w-4" />
        </button>
      </div>
    </div>,
    document.body
  );
}
