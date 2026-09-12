import { FileJson, FileText, MessageSquare, Pencil, Trash2 } from "lucide-react";
import React, { useCallback, useState } from "react";

import type { ReaderAnnotation } from "@/types/reader";

import {
  exportAnnotationsAsJson,
  exportAnnotationsAsMarkdown,
  triggerDownload,
} from "@/utils/annotationExport";

interface ReaderAnnotationsPanelProps {
  annotations: ReaderAnnotation[];
  bookAuthor?: string;
  bookTitle?: string;
  onDeleteAnnotation: (id: string) => void;
  onGoToAnnotation: (cfi: string) => void;
  onUpdateAnnotation?: (id: string, note: string, color?: string) => void;
}

export function ReaderAnnotationsPanel({
  annotations,
  bookTitle = "Untitled Book",
  bookAuthor = "Unknown Author",
  onGoToAnnotation,
  onDeleteAnnotation,
  onUpdateAnnotation,
}: ReaderAnnotationsPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState("");

  // Sort newest first
  const sorted = [...annotations].sort((a, b) => b.createdAt - a.createdAt);

  const handleStartEdit = useCallback((item: ReaderAnnotation) => {
    setEditingId(item.id);
    setEditingNote(item.note || "");
  }, []);

  const handleSaveEdit = useCallback(
    (id: string) => {
      if (onUpdateAnnotation) {
        onUpdateAnnotation(id, editingNote.trim());
      }
      setEditingId(null);
    },
    [editingNote, onUpdateAnnotation]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const handleExportMarkdown = useCallback(() => {
    const md = exportAnnotationsAsMarkdown(bookTitle, bookAuthor, sorted);
    const safeTitle = (bookTitle || "book").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    triggerDownload(md, `${safeTitle}_annotations.md`, "text/markdown");
  }, [bookTitle, bookAuthor, sorted]);

  const handleExportJson = useCallback(() => {
    const jsonStr = exportAnnotationsAsJson(bookTitle, bookAuthor, sorted);
    const safeTitle = (bookTitle || "book").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    triggerDownload(jsonStr, `${safeTitle}_annotations.json`, "application/json");
  }, [bookTitle, bookAuthor, sorted]);

  return (
    <div className="flex flex-col h-full select-text">
      {/* Header */}
      <div className="p-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-light-text dark:text-dark-text">Annotations</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-black/[0.05] dark:bg-white/[0.08] text-light-text-muted dark:text-dark-text-muted font-mono">
            {annotations.length}
          </span>
        </div>

        {annotations.length > 0 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleExportMarkdown}
              title="Export as Markdown"
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>MD</span>
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              title="Export as JSON"
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
            >
              <FileJson className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-fadeIn">
            <div className="w-14 h-14 mb-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] flex items-center justify-center border border-black/[0.06] dark:border-white/[0.06]">
              <MessageSquare
                className="w-6 h-6 text-light-text-muted dark:text-dark-text-muted"
                strokeWidth={1.5}
              />
            </div>
            <p className="text-light-text dark:text-dark-text font-medium">No highlights yet</p>
            <p className="mt-1 text-sm text-light-text-muted dark:text-dark-text-muted">
              Select text while reading to create highlights and notes.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {sorted.map((item) => (
              <div
                key={item.id}
                className="group relative border-b border-black/5 dark:border-white/5 p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onGoToAnnotation(item.cfiRange)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onGoToAnnotation(item.cfiRange);
                    }
                  }}
                  className="w-full text-left pr-8 cursor-pointer focus:outline-none focus:bg-black/[0.03] dark:focus:bg-white/[0.03] rounded-lg"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full shadow-sm shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs font-medium text-light-accent dark:text-dark-accent truncate">
                      {item.chapterLabel || "Chapter"}
                    </span>
                    <span className="text-[11px] text-light-text-muted/60 dark:text-dark-text-muted/60 ml-auto">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-sm text-light-text dark:text-dark-text leading-relaxed line-clamp-3 pl-4 border-l-2 border-black/15 dark:border-white/15">
                    {item.text}
                  </p>
                </div>

                {editingId === item.id ? (
                  <div className="mt-3 p-3 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 space-y-2">
                    <textarea
                      value={editingNote}
                      onChange={(e) => setEditingNote(e.target.value)}
                      placeholder="Edit note..."
                      rows={3}
                      className="w-full resize-none text-xs rounded-lg border border-black/10 dark:border-white/10 p-2 bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text focus:outline-none focus:ring-1 focus:ring-light-accent dark:focus:ring-dark-accent"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg text-light-text-muted hover:text-light-text dark:hover:text-dark-text transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(item.id)}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg bg-light-accent dark:bg-dark-accent text-white hover:opacity-90 transition-opacity"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : item.note ? (
                  <div className="flex items-start justify-between gap-2 mt-2 bg-black/[0.03] dark:bg-white/[0.04] p-2.5 rounded-lg">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <MessageSquare className="w-3.5 h-3.5 text-light-accent dark:text-dark-accent shrink-0 mt-0.5" />
                      <p className="text-xs text-light-text dark:text-dark-text leading-normal break-words">
                        {item.note}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(item)}
                      className="p-1 text-light-text-muted hover:text-light-text dark:hover:text-dark-text rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Edit note"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(item)}
                      className="text-[11px] text-light-text-muted/70 hover:text-light-accent dark:hover:text-dark-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Add note</span>
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => onDeleteAnnotation(item.id)}
                  className="absolute right-3 top-3.5 p-1.5 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                  aria-label="Delete annotation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
