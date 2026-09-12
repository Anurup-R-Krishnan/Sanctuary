import { BookMarked, CheckCircle, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface BatchActionBarProps {
  onAssignCollection: (bookIds: string[], collection: string) => void;
  onClearSelection: () => void;
  onDelete: (bookIds: string[]) => void;
  onMarkFinished: (bookIds: string[]) => void;
  selectedBookIds: string[];
}

export function BatchActionBar({
  onAssignCollection,
  onClearSelection,
  onDelete,
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
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClearSelection();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClearSelection]);

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

  return (
    <div
      aria-live="polite"
      className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transition-transform duration-300 ease-out ${
        visible ? "translate-y-0" : "translate-y-28 pointer-events-none"
      }`}
    >
      <div className="flex items-center gap-2 rounded-2xl bg-light-surface dark:bg-dark-surface border border-black/[0.08] dark:border-white/[0.08] shadow-xl px-4 py-3">
        {/* Selection badge */}
        <span className="min-w-[2rem] rounded-full bg-black/[0.08] dark:bg-white/[0.12] px-2.5 py-1 text-center text-xs font-semibold text-light-text dark:text-dark-text">
          {selectedBookIds.length}
        </span>

        <div className="h-5 w-px bg-black/[0.10] dark:bg-white/[0.12]" />

        {/* Assign Collection */}
        {collectionInputVisible ? (
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              className="w-36 rounded-lg border border-black/[0.12] dark:border-white/[0.12] bg-transparent px-2 py-1 text-sm text-light-text dark:text-dark-text outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20"
              placeholder="Collection name…"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAssign();
                if (e.key === "Escape") setCollectionInputVisible(false);
              }}
            />
            <button
              className="rounded-lg px-2 py-1 text-xs font-medium bg-black/[0.08] dark:bg-white/[0.08] text-light-text dark:text-dark-text hover:bg-black/[0.14] dark:hover:bg-white/[0.14] transition-colors"
              disabled={!collectionName.trim()}
              onClick={handleAssign}
            >
              Add
            </button>
            <button
              aria-label="Cancel collection assignment"
              className="rounded-lg p-1 text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text transition-colors"
              onClick={() => setCollectionInputVisible(false)}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-light-text dark:text-dark-text hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors"
            onClick={() => setCollectionInputVisible(true)}
          >
            <BookMarked className="h-4 w-4" />
            Assign
          </button>
        )}

        {/* Mark Finished */}
        <button
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-light-text dark:text-dark-text hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors"
          onClick={() => onMarkFinished(selectedBookIds)}
        >
          <CheckCircle className="h-4 w-4" />
          Finished
        </button>

        {/* Delete */}
        <button
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>

        <div className="h-5 w-px bg-black/[0.10] dark:bg-white/[0.12]" />

        {/* Clear */}
        <button
          aria-label="Clear selection"
          className="rounded-lg p-1.5 text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors"
          onClick={onClearSelection}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
