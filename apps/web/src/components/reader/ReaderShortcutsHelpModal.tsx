import {
  BookOpen,
  Keyboard,
  List,
  SlidersHorizontal,
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
    icon: SlidersHorizontal,
    title: "Reading Tools",
    items: [
      { keys: ["Z"], description: "Zen Focus ambient reading mode" },
      { keys: ["A"], description: "Auto-scroll continuous reading" },
      { keys: ["M"], description: "Readability metrics" },
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
      <div className="relative z-10 w-full max-w-2xl bg-page text-fg border border-line rounded-3xl shadow-2xl overflow-hidden flex flex-col p-6 sm:p-7 gap-6 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-line">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent/15 text-accent flex items-center justify-center shadow-xs">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2
                className="text-lg font-semibold tracking-tight leading-tight"
                id="shortcuts-modal-title"
              >
                Keyboard Shortcuts
              </h2>
              <p className="text-xs text-fg-muted">
                Navigate, focus, and read at the speed of thought
              </p>
            </div>
          </div>

          <button
            aria-label="Close keyboard shortcuts modal"
            className="p-2 rounded-full text-fg-muted hover:text-fg hover:bg-line/40 transition-colors cursor-pointer"
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
                className="p-4 rounded-2xl bg-surface border border-line flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-accent">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{category.title}</span>
                </div>

                <div className="space-y-2.5">
                  {category.items.map((item) => (
                    <div
                      key={item.description}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="text-fg-muted leading-tight">
                        {item.description}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {item.keys.map((k) => (
                          <kbd
                            key={k}
                            className="px-1.5 py-0.5 min-w-[20px] text-center text-xs font-mono font-medium rounded-md bg-surface/60 text-fg border border-line shadow-xs"
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
        <div className="flex items-center justify-between pt-3 border-t border-line/60 text-xs text-fg-muted">
          <span>Tip: Key bindings can also be customized in Reader Settings.</span>
          <button
            onClick={onClose}
            type="button"
            className="px-3.5 py-1.5 rounded-xl font-semibold text-xs bg-accent text-white dark:text-black hover:opacity-90 transition-opacity shadow-xs"
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
