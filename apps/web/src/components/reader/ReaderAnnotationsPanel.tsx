import {
  Check,
  FileJson,
  FileText,
  MessageSquare,
  Palette,
  Pencil,
  Quote,
  Trash2,
} from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";

import type { ReaderAnnotation } from "@/types/reader";

import {
  ANNOTATION_COLORS,
  DEFAULT_ANNOTATION_COLOR,
  getAnnotationColor,
  isColorMatchingFilter,
} from "@/config/annotationConfig";
import {
  exportAnnotationsAsJson,
  exportAnnotationsAsMarkdown,
  triggerDownload,
} from "@/utils/annotationExport";

interface ReaderAnnotationsPanelProps {
  annotations: ReaderAnnotation[];
  bookAuthor?: string;
  bookTitle?: string;
  onCreateQuoteCard?: (text: string, chapterLabel?: string) => void;
  onDeleteAnnotation: (id: string) => void;
  onGoToAnnotation: (cfi: string) => void;
  onUpdateAnnotation?: (id: string, note: string, color?: string) => void;
}

export function ReaderAnnotationsPanel({
  annotations,
  bookAuthor = "Unknown Author",
  bookTitle = "Untitled Book",
  onCreateQuoteCard,
  onDeleteAnnotation,
  onGoToAnnotation,
  onUpdateAnnotation,
}: ReaderAnnotationsPanelProps) {
  const [activeColorPickerId, setActiveColorPickerId] = useState<string | null>(
    null
  );
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [editingColor, setEditingColor] = useState<string>(
    DEFAULT_ANNOTATION_COLOR.value
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState("");

  // Sort newest first
  const sorted = useMemo(
    () => [...annotations].sort((a, b) => b.createdAt - a.createdAt),
    [annotations]
  );

  // Compute category counts
  const counts = useMemo(() => {
    const tally: Record<string, number> = {
      all: annotations.length,
      amber: 0,
      emerald: 0,
      indigo: 0,
      notes: 0,
      purple: 0,
      rose: 0,
    };
    annotations.forEach((a) => {
      if (a.note && a.note.trim().length > 0) {
        tally.notes++;
      }
      const col = getAnnotationColor(a.color);
      if (tally[col.id] !== undefined) {
        tally[col.id]++;
      }
    });
    return tally;
  }, [annotations]);

  // Filtered annotations
  const filteredAnnotations = useMemo(() => {
    if (activeFilter === "all") return sorted;
    if (activeFilter === "notes") {
      return sorted.filter((a) => Boolean(a.note && a.note.trim().length > 0));
    }
    return sorted.filter((a) => isColorMatchingFilter(a.color, activeFilter));
  }, [sorted, activeFilter]);

  const handleStartEdit = useCallback((item: ReaderAnnotation) => {
    setEditingId(item.id);
    setEditingNote(item.note || "");
    setEditingColor(item.color || DEFAULT_ANNOTATION_COLOR.value);
    setActiveColorPickerId(null);
  }, []);

  const handleSaveEdit = useCallback(
    (id: string) => {
      if (onUpdateAnnotation) {
        onUpdateAnnotation(id, editingNote.trim(), editingColor);
      }
      setEditingId(null);
    },
    [editingNote, editingColor, onUpdateAnnotation]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const handleExportMarkdown = useCallback(() => {
    const md = exportAnnotationsAsMarkdown(bookTitle, bookAuthor, sorted);
    const safeTitle = (bookTitle || "book")
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();
    triggerDownload(md, `${safeTitle}_annotations.md`, "text/markdown");
  }, [bookTitle, bookAuthor, sorted]);

  const handleExportJson = useCallback(() => {
    const jsonStr = exportAnnotationsAsJson(bookTitle, bookAuthor, sorted);
    const safeTitle = (bookTitle || "book")
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();
    triggerDownload(jsonStr, `${safeTitle}_annotations.json`, "application/json");
  }, [bookTitle, bookAuthor, sorted]);

  return (
    <div className="flex flex-col h-full select-text">
      {/* Header */}
      <div className="p-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-light-text dark:text-dark-text">
            Annotations
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-black/[0.05] dark:bg-white/[0.08] text-light-text-muted dark:text-dark-text-muted font-mono">
            {annotations.length}
          </span>
        </div>

        {annotations.length > 0 && (
          <div className="flex items-center gap-1">
            <button
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
              onClick={handleExportMarkdown}
              title="Export as Markdown"
              type="button"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>MD</span>
            </button>
            <button
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
              onClick={handleExportJson}
              title="Export as JSON"
              type="button"
            >
              <FileJson className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
          </div>
        )}
      </div>

      {/* Category / Color Filter Bar */}
      {annotations.length > 0 && (
        <div className="px-4 py-2 border-b border-black/5 dark:border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors shrink-0 ${
              activeFilter === "all"
                ? "bg-light-accent dark:bg-dark-accent text-white"
                : "bg-black/[0.04] dark:bg-white/[0.06] text-light-text-muted dark:text-dark-text-muted hover:bg-black/[0.08] dark:hover:bg-white/[0.1]"
            }`}
            onClick={() => setActiveFilter("all")}
            type="button"
          >
            All ({counts.all})
          </button>
          {ANNOTATION_COLORS.map((col) => {
            const count = counts[col.id] || 0;
            if (count === 0 && activeFilter !== col.id) return null;
            const isActive = activeFilter === col.id;
            return (
              <button
                className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
                  isActive
                    ? "bg-light-accent dark:bg-dark-accent text-white"
                    : "bg-black/[0.04] dark:bg-white/[0.06] text-light-text-muted dark:text-dark-text-muted hover:bg-black/[0.08] dark:hover:bg-white/[0.1]"
                }`}
                key={col.id}
                onClick={() => setActiveFilter(col.id)}
                type="button"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: col.value }}
                />
                <span>{col.label}</span>
                <span className="text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
          {counts.notes > 0 && (
            <button
              className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
                activeFilter === "notes"
                  ? "bg-light-accent dark:bg-dark-accent text-white"
                  : "bg-black/[0.04] dark:bg-white/[0.06] text-light-text-muted dark:text-dark-text-muted hover:bg-black/[0.08] dark:hover:bg-white/[0.1]"
              }`}
              onClick={() => setActiveFilter("notes")}
              type="button"
            >
              <MessageSquare className="w-3 h-3" />
              <span>Notes</span>
              <span className="text-[10px] opacity-75">({counts.notes})</span>
            </button>
          )}
        </div>
      )}

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
            <p className="text-light-text dark:text-dark-text font-medium">
              No highlights yet
            </p>
            <p className="mt-1 text-sm text-light-text-muted dark:text-dark-text-muted">
              Select text while reading to create highlights and notes.
            </p>
          </div>
        ) : filteredAnnotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-fadeIn">
            <p className="text-light-text dark:text-dark-text font-medium">
              No annotations match this filter
            </p>
            <button
              className="mt-2 text-xs text-light-accent dark:text-dark-accent underline"
              onClick={() => setActiveFilter("all")}
              type="button"
            >
              Show all annotations
            </button>
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredAnnotations.map((item) => {
              const colorObj = getAnnotationColor(item.color);
              return (
                <div
                  className="group relative border-b border-black/5 dark:border-white/5 p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                  key={item.id}
                >
                  {/* Top Action Bar */}
                  <div className="absolute right-3 top-3.5 flex items-center gap-0.5 z-10">
                    {onUpdateAnnotation && (
                      <div className="relative">
                        <button
                          aria-label="Change highlight color"
                          className="p-1.5 text-light-text-muted hover:text-light-accent dark:hover:text-dark-accent rounded hover:bg-black/5 dark:hover:bg-white/5 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveColorPickerId(
                              activeColorPickerId === item.id ? null : item.id
                            );
                          }}
                          title="Change color"
                          type="button"
                        >
                          <Palette className="w-3.5 h-3.5" />
                        </button>

                        {activeColorPickerId === item.id && (
                          <div className="absolute right-0 top-full mt-1 z-20 bg-light-primary dark:bg-dark-primary p-1.5 rounded-xl shadow-xl border border-black/10 dark:border-white/10 flex items-center gap-1.5 animate-fadeIn">
                            {ANNOTATION_COLORS.map((c) => {
                              const isSelected =
                                item.color?.toLowerCase() ===
                                c.value.toLowerCase();
                              return (
                                <button
                                  aria-label={`Change to ${c.label}`}
                                  className={`w-5 h-5 rounded-full transition-transform active:scale-90 flex items-center justify-center ${
                                    isSelected
                                      ? "ring-2 ring-offset-1 ring-light-accent dark:ring-dark-accent scale-110"
                                      : "hover:scale-110 opacity-80 hover:opacity-100"
                                  }`}
                                  key={c.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdateAnnotation(
                                      item.id,
                                      item.note || "",
                                      c.value
                                    );
                                    setActiveColorPickerId(null);
                                  }}
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
                        )}
                      </div>
                    )}

                    {onCreateQuoteCard && (
                      <button
                        aria-label="Generate quote card"
                        className="p-1.5 text-light-text-muted hover:text-light-accent dark:hover:text-dark-accent opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity rounded hover:bg-black/5 dark:hover:bg-white/5"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCreateQuoteCard(item.text, item.chapterLabel);
                        }}
                        title="Generate quote card"
                        type="button"
                      >
                        <Quote className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      aria-label="Delete annotation"
                      className="p-1.5 text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={() => onDeleteAnnotation(item.id)}
                      title="Delete annotation"
                      type="button"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Annotation Content */}
                  <div
                    className="w-full text-left pr-20 cursor-pointer focus:outline-none focus:bg-black/[0.03] dark:focus:bg-white/[0.03] rounded-lg"
                    onClick={() => onGoToAnnotation(item.cfiRange)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onGoToAnnotation(item.cfiRange);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shadow-sm shrink-0"
                        style={{ backgroundColor: colorObj.value }}
                      />
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colorObj.bgClass} ${colorObj.textClass}`}
                      >
                        {colorObj.name}
                      </span>
                      <span className="text-xs font-medium text-light-accent dark:text-dark-accent truncate max-w-[140px]">
                        {item.chapterLabel || "Chapter"}
                      </span>
                      <span className="text-[11px] text-light-text-muted/60 dark:text-dark-text-muted/60 ml-auto">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p
                      className="text-sm text-light-text dark:text-dark-text leading-relaxed line-clamp-3 pl-3.5 border-l-2"
                      style={{ borderLeftColor: colorObj.value }}
                    >
                      {item.text}
                    </p>
                  </div>

                  {/* Marginalia Note Area */}
                  {editingId === item.id ? (
                    <div className="mt-3 p-3 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 space-y-2.5">
                      {/* Color Palette Switcher in Edit Mode */}
                      <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
                        <span className="text-[11px] font-medium text-light-text dark:text-dark-text">
                          {getAnnotationColor(editingColor).name}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {ANNOTATION_COLORS.map((c) => {
                            const isSelected =
                              editingColor.toLowerCase() ===
                              c.value.toLowerCase();
                            return (
                              <button
                                aria-label={`Select ${c.label}`}
                                className={`w-4 h-4 rounded-full transition-transform active:scale-90 flex items-center justify-center ${
                                  isSelected
                                    ? "ring-2 ring-offset-1 ring-light-accent dark:ring-dark-accent scale-110"
                                    : "hover:scale-110 opacity-80 hover:opacity-100"
                                }`}
                                key={c.id}
                                onClick={() => setEditingColor(c.value)}
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

                      <textarea
                        className="w-full resize-none text-xs rounded-lg border border-black/10 dark:border-white/10 p-2 bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text focus:outline-none focus:ring-1 focus:ring-light-accent dark:focus:ring-dark-accent"
                        onChange={(e) => setEditingNote(e.target.value)}
                        placeholder="Edit note..."
                        rows={3}
                        value={editingNote}
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          className="px-2.5 py-1 text-xs font-medium rounded-lg text-light-text-muted hover:text-light-text dark:hover:text-dark-text transition-colors"
                          onClick={handleCancelEdit}
                          type="button"
                        >
                          Cancel
                        </button>
                        <button
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-light-accent dark:bg-dark-accent text-white hover:opacity-90 transition-opacity"
                          onClick={() => handleSaveEdit(item.id)}
                          type="button"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : item.note ? (
                    <div className="flex items-start justify-between gap-2 mt-2.5 bg-black/[0.03] dark:bg-white/[0.04] p-2.5 rounded-lg border border-black/5 dark:border-white/5">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <MessageSquare className="w-3.5 h-3.5 text-light-accent dark:text-dark-accent shrink-0 mt-0.5" />
                        <p className="text-xs text-light-text dark:text-dark-text leading-normal break-words">
                          {item.note}
                        </p>
                      </div>
                      <button
                        aria-label="Edit note"
                        className="p-1 text-light-text-muted hover:text-light-text dark:hover:text-dark-text rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                        onClick={() => handleStartEdit(item)}
                        title="Edit note"
                        type="button"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1 flex justify-end">
                      <button
                        className="text-[11px] text-light-text-muted/70 hover:text-light-accent dark:hover:text-dark-accent opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex items-center gap-1"
                        onClick={() => handleStartEdit(item)}
                        type="button"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Add note</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

