import {
  BookOpen,
  Keyboard,
  List,
  Sparkles,
  X,
} from "lucide-react";
import React, { useEffect } from "react";
import { createPortal } from "react-dom";

export interface ReaderShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  description: string;
  keys: string[];
}

interface ShortcutCategory {
  icon: React.ComponentType<{ className?: string }>;
  items: ShortcutItem[];
  title: string;
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    icon: BookOpen,
    title: "Navigation & Page Turns",
    items: [
      { keys: ["→", "Space"], description: "Next page" },
      { keys: ["←"], description: "Previous page" },
      { keys: ["Home"], description: "Jump to start of book" },
      { keys: ["End"], description: "Jump to end of book" },
      { keys: ["F11"], description: "Toggle fullscreen" },
      { keys: ["Esc"], description: "Close active drawer or exit" },
    ],
  },
  {
    icon: List,
    title: "Drawers & Overlays",
    items: [
      { keys: ["T"], description: "Table of Contents & Bookmarks" },
      { keys: ["S"], description: "Reader Settings & Typography" },
      { keys: ["F"], description: "In-book concordance search" },
      { keys: ["B"], description: "Bookmark current location" },
      { keys: ["?"], description: "Toggle this shortcut guide" },
    ],
  },
  {
    icon: Sparkles,
    title: "Focus & Reading Intelligence",
    items: [
      { keys: ["Z"], description: "Zen Focus ambient reading mode" },
      { keys: ["A"], description: "Auto-scroll continuous reading" },
      { keys: ["X"], description: "X-Ray character & location dossier" },
      { keys: ["M"], description: "Readability & cognitive complexity" },
    ],
  },
];

export function ReaderShortcutsHelpModal({
  isOpen,
  onClose,
}: ReaderShortcutsHelpModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "?") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-labelledby="shortcuts-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn pointer-events-auto select-none"
      role="dialog"
    >
      {/* Backdrop dismiss target */}
      <button
        aria-label="Close shortcuts guide"
        className="fixed inset-0 bg-transparent cursor-default border-none"
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-2xl bg-light-primary dark:bg-dark-primary text-light-text dark:text-dark-text border border-light-border dark:border-dark-border rounded-3xl shadow-2xl overflow-hidden flex flex-col p-6 sm:p-7 gap-6 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-light-border dark:border-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-light-accent/15 dark:bg-dark-accent/15 text-light-accent dark:text-dark-accent flex items-center justify-center shadow-xs">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2
                className="text-lg font-semibold tracking-tight leading-tight"
                id="shortcuts-modal-title"
              >
                Keyboard Shortcuts
              </h2>
              <p className="text-xs text-light-text-muted dark:text-dark-text-muted">
                Navigate, focus, and read at the speed of thought
              </p>
            </div>
          </div>

          <button
            aria-label="Close keyboard shortcuts modal"
            className="p-2 rounded-full text-light-text-muted hover:text-light-text dark:text-dark-text-muted dark:hover:text-dark-text hover:bg-light-border/40 dark:hover:bg-dark-border/40 transition-colors cursor-pointer"
            onClick={onClose}
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categories Grid */}
        <div className="grid sm:grid-cols-3 gap-5">
          {SHORTCUT_CATEGORIES.map((category) => {
            const Icon = category.icon;
            return (
              <div
                key={category.title}
                className="p-4 rounded-2xl bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-light-accent dark:text-dark-accent">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{category.title}</span>
                </div>

                <div className="space-y-2.5">
                  {category.items.map((item) => (
                    <div
                      key={item.description}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="text-light-text-muted dark:text-dark-text-muted leading-tight">
                        {item.description}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {item.keys.map((k) => (
                          <kbd
                            key={k}
                            className="px-1.5 py-0.5 min-w-[20px] text-center text-[11px] font-mono font-medium rounded-md bg-light-surface/60 dark:bg-dark-surface/60 text-light-text dark:text-dark-text border border-light-border dark:border-dark-border shadow-xs"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Hint */}
        <div className="flex items-center justify-between pt-3 border-t border-light-border/60 dark:border-dark-border/60 text-[11px] text-light-text-muted dark:text-dark-text-muted">
          <span>Tip: Key bindings can also be customized in Reader Settings.</span>
          <button
            onClick={onClose}
            type="button"
            className="px-3.5 py-1.5 rounded-xl font-semibold text-xs bg-light-accent text-white dark:bg-dark-accent dark:text-black hover:opacity-90 transition-opacity shadow-xs"
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
