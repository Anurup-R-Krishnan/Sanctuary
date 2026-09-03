import React, { useCallback, useEffect, useRef } from "react";

interface DropdownMenuProps {
  id: string;
  onClose: () => void;
  onSelect: (v: string) => void;
  options: { value: string; label: string }[];
  show: boolean;
  /** DOM id of the trigger button — focus returns here when the menu closes. */
  triggerId?: string;
  value: string;
}

export const DropdownMenu = ({
  id,
  show,
  options,
  value,
  onSelect,
  onClose,
  triggerId,
}: DropdownMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  // Stable ref array: never replaced mid-render, resized only when length changes.
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const focusedIndexRef = useRef<number>(-1);

  // Keep the stable array sized correctly without wiping collected refs.
  useEffect(() => {
    const prev = itemRefs.current.length;
    const next = options.length;
    if (next > prev) {
      itemRefs.current = [...itemRefs.current, ...Array(next - prev).fill(null)];
    } else if (next < prev) {
      itemRefs.current = itemRefs.current.slice(0, next);
    }
  }, [options.length]);

  const focusItem = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(options.length - 1, index));
    focusedIndexRef.current = clamped;
    itemRefs.current[clamped]?.focus();
  }, [options.length]);

  // Focus management: open → selected item (or first); close → trigger button.
  useEffect(() => {
    if (!show) {
      if (triggerId) {
        document.getElementById(triggerId)?.focus();
      }
      return;
    }

    const selectedIndex = options.findIndex((o) => o.value === value);
    const initialIndex = selectedIndex >= 0 ? selectedIndex : 0;
    // Defer one frame so the menu is in the DOM before we focus.
    const tid = window.setTimeout(() => focusItem(initialIndex), 16);
    return () => window.clearTimeout(tid);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]); // intentionally only on show toggle — focusItem/value/options are stable within an open session

  // Click-outside to close
  useEffect(() => {
    if (!show) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [show, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const current = focusedIndexRef.current;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          focusItem(current + 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          focusItem(current - 1);
          break;
        case "Home":
          e.preventDefault();
          focusItem(0);
          break;
        case "End":
          e.preventDefault();
          focusItem(options.length - 1);
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        case "Tab":
          // Close so focus doesn't leak behind the menu.
          onClose();
          break;
      }
    },
    [focusItem, onClose, options.length]
  );

  if (!show) return null;

  return (
    <div
      id={id}
      ref={menuRef}
      role="menu"
      aria-orientation="vertical"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="absolute right-0 top-full mt-1.5 w-44 py-1 rounded-xl bg-light-surface dark:bg-dark-surface shadow-lg border border-black/[0.08] dark:border-white/[0.08] z-50 animate-scaleIn origin-top-right"
    >
      {options.map((opt, index) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            type="button"
            role="menuitemradio"
            aria-checked={isSelected}
            tabIndex={-1}
            onClick={() => {
              onSelect(opt.value);
              onClose();
            }}
            onFocus={() => {
              focusedIndexRef.current = index;
            }}
            className={[
              "w-full text-left px-3 py-2 text-sm transition-colors outline-none",
              "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[rgb(var(--accent))] dark:focus-visible:ring-[rgb(var(--accent-dark))]",
              isSelected
                ? "text-light-accent dark:text-dark-accent font-medium bg-light-accent/5 dark:bg-dark-accent/5"
                : "text-light-text dark:text-dark-text hover:bg-black/[0.04] dark:hover:bg-white/[0.04]",
            ].join(" ")}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};
