import {
  Check,
  ChevronDown,
  Download,
  FileJson,
  FileText,
  MessageSquare,
  Palette,
  Pencil,
  Quote,
  Search,
  Trash2,
  X,
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
  type ExportPreset,
  formatReaderAnnotationsAsMarkdown,
} from "@/services/annotationExportService";
import {
  exportAnnotationsAsJson,
  triggerDownload,
} from "@/utils/annotationExport";

interface ReaderAnnotationsPanelProps {
  annotations: ReaderAnnotation[];
  bookAuthor?: string;
  bookTitle?: string;
  onClose?: () => void;
  onCreateQuoteCard?: (text: string, chapterLabel?: string) => void;
  onDeleteAnnotation: (id: string) => void;
  onGoToAnnotation: (cfi: string) => void;
  onUpdateAnnotation?: (id: string, note: string, color?: string) => void;
}

export function ReaderAnnotationsPanel({
  annotations,
  bookAuthor = "Unknown Author",
  bookTitle = "Untitled Book",
  onClose,
  onCreateQuoteCard,
  onDeleteAnnotation,
  onGoToAnnotation,
  onUpdateAnnotation,
}: ReaderAnnotationsPanelProps) {
  const [activeColorPickerId, setActiveColorPickerId] = useState<string | null>(
    null
  );
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
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
    let result = sorted;
    if (activeFilter === "notes") {
      result = result.filter((a) => Boolean(a.note && a.note.trim().length > 0));
    } else if (activeFilter !== "all") {
      result = result.filter((a) => isColorMatchingFilter(a.color, activeFilter));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (a) =>
          a.text.toLowerCase().includes(q) ||
          (a.note && a.note.toLowerCase().includes(q)) ||
          (a.chapterLabel && a.chapterLabel.toLowerCase().includes(q))
      );
    }
    return result;
  }, [sorted, activeFilter, searchQuery]);

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

  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const handleExportPreset = useCallback(
    (preset: ExportPreset) => {
      const md = formatReaderAnnotationsAsMarkdown(bookTitle, bookAuthor, sorted, {
        preset,
      });
      const safeTitle = (bookTitle || "book")
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();
      triggerDownload(md, `${safeTitle}_annotations_${preset}.md`, "text/markdown");
      setIsExportMenuOpen(false);
    },
    [bookTitle, bookAuthor, sorted]
  );

  const handleExportJson = useCallback(() => {
    const jsonStr = exportAnnotationsAsJson(bookTitle, bookAuthor, sorted);
    const safeTitle = (bookTitle || "book")
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();
    triggerDownload(jsonStr, `${safeTitle}_annotations.json`, "application/json");
    setIsExportMenuOpen(false);
  }, [bookTitle, bookAuthor, sorted]);

  return (
    <div className="flex flex-col h-full select-text">
      {/* Header */}
      <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-light-text dark:text-dark-text">
            Annotations
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-light-surface/80 dark:bg-dark-surface/80 border border-light-border dark:border-dark-border text-light-text-muted dark:text-dark-text-muted font-mono">
            {annotations.length}
          </span>
        </div>

        <div className="flex items-center gap-1 relative">
          {annotations.length > 0 && (
            <div className="relative">
              <button
                aria-expanded={isExportMenuOpen}
                aria-haspopup="true"
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text hover:bg-light-border/40 dark:hover:bg-dark-border/40 transition-colors"
                onClick={() => setIsExportMenuOpen((prev) => !prev)}
                title="Export annotations"
                type="button"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {isExportMenuOpen && (
                <>
                  <button
                    aria-label="Dismiss export menu"
                    className="fixed inset-0 z-40 cursor-default bg-transparent border-none"
                    onClick={() => setIsExportMenuOpen(false)}
                    type="button"
                  />
                  <div className="absolute right-0 top-full mt-1 w-48 rounded-xl shadow-lg border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2 py-1 text-[10px] font-semibold tracking-wider text-light-text-muted dark:text-dark-text-muted uppercase">
                      Markdown Presets
                    </div>
                    <button
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left text-light-text dark:text-dark-text hover:bg-light-accent/10 dark:hover:bg-dark-accent/10 hover:text-light-accent dark:hover:text-dark-accent transition-colors"
                      onClick={() => handleExportPreset("obsidian")}
                      type="button"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Obsidian Callouts</span>
                    </button>
                    <button
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left text-light-text dark:text-dark-text hover:bg-light-accent/10 dark:hover:bg-dark-accent/10 hover:text-light-accent dark:hover:text-dark-accent transition-colors"
                      onClick={() => handleExportPreset("notion")}
                      type="button"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Notion Bullets</span>
                    </button>
                    <button
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left text-light-text dark:text-dark-text hover:bg-light-accent/10 dark:hover:bg-dark-accent/10 hover:text-light-accent dark:hover:text-dark-accent transition-colors"
                      onClick={() => handleExportPreset("standard")}
                      type="button"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Standard Markdown</span>
                    </button>
                    <div className="my-1 border-t border-light-border/60 dark:border-dark-border/60" />
                    <button
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left text-light-text dark:text-dark-text hover:bg-light-accent/10 dark:hover:bg-dark-accent/10 hover:text-light-accent dark:hover:text-dark-accent transition-colors"
                      onClick={handleExportJson}
                      type="button"
                    >
                      <FileJson className="w-3.5 h-3.5" />
                      <span>JSON Structure</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          {onClose && (
            <button
              aria-label="Close annotations panel"
              className="p-1.5 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text hover:bg-light-border/40 dark:hover:bg-dark-border/40 transition-colors"
              onClick={onClose}
              title="Close panel"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category / Color Filter Bar */}
      {annotations.length > 0 && (
        <div className="px-4 py-2 border-b border-light-border/60 dark:border-dark-border/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors shrink-0 ${
              activeFilter === "all"
                ? "bg-light-accent text-white dark:bg-dark-accent dark:text-black font-semibold shadow-xs"
                : "bg-light-surface dark:bg-dark-surface border border-light-border/60 dark:border-dark-border/60 text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text"
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
                    ? "bg-light-accent text-white dark:bg-dark-accent dark:text-black font-semibold shadow-xs"
                    : "bg-light-surface dark:bg-dark-surface border border-light-border/60 dark:border-dark-border/60 text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text"
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
                  ? "bg-light-accent text-white dark:bg-dark-accent dark:text-black font-semibold shadow-xs"
                  : "bg-light-surface dark:bg-dark-surface border border-light-border/60 dark:border-dark-border/60 text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text"
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

      {/* Search Bar */}
      {annotations.length > 0 && (
        <div className="px-4 py-2 border-b border-light-border/60 dark:border-dark-border/60 bg-light-surface/30 dark:bg-dark-surface/30">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-light-text-muted dark:text-dark-text-muted pointer-events-none" />
            <input
              type="search"
              aria-label="Search annotations"
              placeholder="Search highlights, notes, chapters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1 text-xs rounded-xl bg-light-primary dark:bg-dark-primary border border-light-border dark:border-dark-border text-light-text dark:text-dark-text placeholder:text-light-text-muted/60 dark:placeholder:text-dark-text-muted/60 outline-none focus:border-light-accent dark:focus:border-dark-accent focus:ring-1 focus:ring-light-accent dark:focus:ring-dark-accent transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2 text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="mt-1 flex items-center justify-between text-[11px] text-light-text-muted dark:text-dark-text-muted">
              <span>{filteredAnnotations.length} {filteredAnnotations.length === 1 ? "match" : "matches"}</span>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="hover:underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-fadeIn">
            <div className="w-14 h-14 mb-4 rounded-2xl bg-light-surface/60 dark:bg-dark-surface/60 flex items-center justify-center border border-light-border dark:border-dark-border">
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
              {searchQuery ? "No annotations match your search" : "No annotations match this filter"}
            </p>
            <p className="mt-1 text-xs text-light-text-muted dark:text-dark-text-muted">
              {searchQuery
                ? `No highlights or notes containing "${searchQuery}".`
                : "Try selecting a different color or category."}
            </p>
            {(searchQuery || activeFilter !== "all") && (
              <button
                className="mt-3 text-xs text-light-accent dark:text-dark-accent underline"
                onClick={() => {
                  setSearchQuery("");
                  setActiveFilter("all");
                }}
                type="button"
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredAnnotations.map((item) => {
              const colorObj = getAnnotationColor(item.color);
              return (
                <div
                  className="group relative border-b border-light-border/60 dark:border-dark-border/60 p-4 hover:bg-light-surface/60 dark:hover:bg-dark-surface/60 transition-colors"
                  key={item.id}
                >
                  {/* Top Action Bar */}
                  <div className="absolute right-3 top-3.5 flex items-center gap-0.5 z-10">
                    {onUpdateAnnotation && (
                      <div className="relative">
                        <button
                          aria-label="Change highlight color"
                          className="p-1.5 text-light-text-muted hover:text-light-accent dark:hover:text-dark-accent rounded hover:bg-light-border/40 dark:hover:bg-dark-border/40 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
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
                          <div className="absolute right-0 top-full mt-1 z-20 bg-light-primary dark:bg-dark-primary p-1.5 rounded-xl shadow-xl border border-light-border dark:border-dark-border flex items-center gap-1.5 animate-fadeIn">
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
                        className="p-1.5 text-light-text-muted hover:text-light-accent dark:hover:text-dark-accent opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity rounded hover:bg-light-border/40 dark:hover:bg-dark-border/40"
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
                      className="p-1.5 text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all rounded hover:bg-rose-500/10 dark:hover:bg-rose-500/20"
                      onClick={() => onDeleteAnnotation(item.id)}
                      title="Delete annotation"
                      type="button"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Annotation Content */}
                  <div
                    className="w-full text-left pr-20 cursor-pointer focus:outline-none focus:bg-light-surface/80 dark:focus:bg-dark-surface/80 rounded-lg"
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
                    <div className="mt-3 p-3 rounded-xl bg-light-surface/60 dark:bg-dark-surface/60 border border-light-border dark:border-dark-border space-y-2.5">
                      {/* Color Palette Switcher in Edit Mode */}
                      <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-light-surface/80 dark:bg-dark-surface/80 border border-light-border/60 dark:border-dark-border/60">
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
                        className="w-full resize-none text-xs rounded-lg border border-light-border dark:border-dark-border p-2 bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text focus:outline-none focus:ring-1 focus:ring-light-accent dark:focus:ring-dark-accent"
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
                    <div className="flex items-start justify-between gap-2 mt-2.5 bg-light-surface/50 dark:bg-dark-surface/50 p-2.5 rounded-lg border border-light-border dark:border-dark-border">
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

