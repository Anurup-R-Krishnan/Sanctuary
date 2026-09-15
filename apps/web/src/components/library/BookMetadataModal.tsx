import { Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { Book } from "@/types";

interface BookMetadataModalProps {
  allCollections: string[];
  book: Book | null;
  onClose: () => void;
  onSave: (updates: Partial<Book>) => void;
}

type EditState = {
  author: string;
  collections: string[];
  readingList: "finished" | "reading" | "to-read" | undefined;
  tags: string[];
  title: string;
};

export function BookMetadataModal({ allCollections, book, onClose, onSave }: BookMetadataModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const [tagInput, setTagInput] = useState("");
  const [collectionInput, setCollectionInput] = useState("");
  const [edit, setEdit] = useState<EditState>({
    author: "",
    collections: [],
    readingList: undefined,
    tags: [],
    title: "",
  });

  // Reset state when book changes
  useEffect(() => {
    if (book) {
      setEdit({
        author: book.author,
        collections: book.collections ?? [],
        readingList: book.readingList,
        tags: book.tags ?? [],
        title: book.title,
      });
      setTagInput("");
      setCollectionInput("");
    }
  }, [book]);

  // Close on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onClose();
      }
    };
    if (book) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [book, onClose]);

  if (!book) return null;

  const addTag = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed && !edit.tags.includes(trimmed)) {
      setEdit((s) => ({ ...s, tags: [...s.tags, trimmed] }));
    }
    setTagInput("");
  };

  const removeTag = (tag: string) =>
    setEdit((s) => ({ ...s, tags: s.tags.filter((t) => t !== tag) }));

  const addCollection = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !edit.collections.includes(trimmed)) {
      setEdit((s) => ({ ...s, collections: [...s.collections, trimmed] }));
    }
    setCollectionInput("");
  };

  const removeCollection = (name: string) =>
    setEdit((s) => ({ ...s, collections: s.collections.filter((c) => c !== name) }));

  const handleSave = () => {
    onSave({
      author: edit.author.trim() || book.author,
      collections: edit.collections,
      readingList: edit.readingList,
      tags: edit.tags,
      title: edit.title.trim() || book.title,
    });
    onClose();
  };

  return createPortal(
    <div
      ref={backdropRef}
      aria-label="Edit book metadata"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-light-primary dark:bg-dark-primary border border-light-border dark:border-dark-border shadow-2xl p-6 mx-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-light-text dark:text-dark-text">Edit Book Info</h2>
            <p className="mt-0.5 text-xs text-light-text-muted dark:text-dark-text-muted truncate max-w-[18rem]">
              {book.title}
            </p>
          </div>
          <button
            aria-label="Close"
            className="rounded-lg p-1.5 text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text hover:bg-light-border/40 dark:hover:bg-dark-border/40 transition-colors"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <label className="block">
            <span className="text-xs font-medium text-light-text-muted dark:text-dark-text-muted mb-1 block">Title</span>
            <input
              className="w-full rounded-lg border border-light-border dark:border-dark-border bg-transparent px-3 py-2 text-sm text-light-text dark:text-dark-text outline-none focus:ring-1 focus:ring-light-accent dark:focus:ring-dark-accent"
              value={edit.title}
              onChange={(e) => setEdit((s) => ({ ...s, title: e.target.value }))}
            />
          </label>

          {/* Author */}
          <label className="block">
            <span className="text-xs font-medium text-light-text-muted dark:text-dark-text-muted mb-1 block">Author</span>
            <input
              className="w-full rounded-lg border border-light-border dark:border-dark-border bg-transparent px-3 py-2 text-sm text-light-text dark:text-dark-text outline-none focus:ring-1 focus:ring-light-accent dark:focus:ring-dark-accent"
              value={edit.author}
              onChange={(e) => setEdit((s) => ({ ...s, author: e.target.value }))}
            />
          </label>

          {/* Reading Status */}
          <label className="block">
            <span className="text-xs font-medium text-light-text-muted dark:text-dark-text-muted mb-1 block">Reading Status</span>
            <select
              className="w-full rounded-lg border border-light-border dark:border-dark-border bg-light-secondary dark:bg-dark-secondary px-3 py-2 text-sm text-light-text dark:text-dark-text outline-none focus:ring-1 focus:ring-light-accent dark:focus:ring-dark-accent"
              value={edit.readingList ?? ""}
              onChange={(e) =>
                setEdit((s) => ({
                  ...s,
                  readingList: (e.target.value as EditState["readingList"]) || undefined,
                }))
              }
            >
              <option value="">Not set</option>
              <option value="to-read">To Read</option>
              <option value="reading">Reading</option>
              <option value="finished">Finished</option>
            </select>
          </label>

          {/* Collections */}
          <div>
            <span className="text-xs font-medium text-light-text-muted dark:text-dark-text-muted mb-2 block">Collections</span>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {edit.collections.map((c) => (
                <span
                  key={c}
                  className="flex items-center gap-1 rounded-full bg-light-surface/60 dark:bg-dark-surface/60 border border-light-border dark:border-dark-border px-2.5 py-0.5 text-xs text-light-text dark:text-dark-text"
                >
                  {c}
                  <button aria-label={`Remove collection ${c}`} onClick={() => removeCollection(c)} type="button">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            {/* Existing collection suggestions */}
            {allCollections.filter((c) => !edit.collections.includes(c)).length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {allCollections
                  .filter((c) => !edit.collections.includes(c))
                  .slice(0, 6)
                  .map((c) => (
                    <button
                      key={c}
                      className="rounded-full border border-light-border dark:border-dark-border px-2.5 py-0.5 text-xs text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text hover:border-light-accent dark:hover:border-dark-accent transition-colors"
                      onClick={() => addCollection(c)}
                      type="button"
                    >
                      + {c}
                    </button>
                  ))}
              </div>
            )}
            <div className="flex gap-1">
              <input
                className="flex-1 rounded-lg border border-light-border dark:border-dark-border bg-transparent px-3 py-1.5 text-sm text-light-text dark:text-dark-text outline-none focus:ring-1 focus:ring-light-accent dark:focus:ring-dark-accent"
                placeholder="New collection…"
                value={collectionInput}
                onChange={(e) => setCollectionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addCollection(collectionInput); }
                }}
              />
              <button
                className="rounded-lg p-2 text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text hover:bg-light-border/40 dark:hover:bg-dark-border/40 transition-colors"
                onClick={() => addCollection(collectionInput)}
                type="button"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tags */}
          <div>
            <span className="text-xs font-medium text-light-text-muted dark:text-dark-text-muted mb-2 block">Tags</span>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {edit.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-full bg-light-surface/60 dark:bg-dark-surface/60 border border-light-border dark:border-dark-border px-2.5 py-0.5 text-xs text-light-text dark:text-dark-text"
                >
                  {tag}
                  <button aria-label={`Remove tag ${tag}`} onClick={() => removeTag(tag)} type="button">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <input
                className="flex-1 rounded-lg border border-light-border dark:border-dark-border bg-transparent px-3 py-1.5 text-sm text-light-text dark:text-dark-text outline-none focus:ring-1 focus:ring-light-accent dark:focus:ring-dark-accent"
                placeholder="Add tag…"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); }
                  if (e.key === ",") { e.preventDefault(); addTag(tagInput); }
                }}
              />
              <button
                className="rounded-lg p-2 text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text hover:bg-light-border/40 dark:hover:bg-dark-border/40 transition-colors"
                onClick={() => addTag(tagInput)}
                type="button"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            className="rounded-xl px-4 py-2 text-sm font-medium text-light-text-muted dark:text-dark-text-muted hover:bg-light-border/40 dark:hover:bg-dark-border/40 transition-colors"
            onClick={onClose}
           type="button"

           >            Cancel
          </button>
          <button
            className="rounded-xl bg-light-accent dark:bg-dark-accent px-4 py-2 text-sm font-semibold text-white dark:text-black hover:opacity-90 transition-opacity"
            onClick={handleSave}
           type="button"

           >            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
