import React from "react";

interface DropdownMenuProps {
  id: string;
  show: boolean;
  options: { value: string; label: string }[];
  value: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}

export const DropdownMenu = ({
  id,
  show,
  options,
  value,
  onSelect,
  onClose,
}: DropdownMenuProps) =>
  show ? (
    <div
      id={id}
      role="menu"
      aria-orientation="vertical"
      className="absolute right-0 top-full mt-1.5 w-40 py-1 rounded-xl bg-light-surface dark:bg-dark-surface shadow-lg border border-black/[0.08] dark:border-white/[0.08] z-20 animate-scaleIn origin-top-right"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          role="menuitemradio"
          aria-checked={value === opt.value}
          onClick={() => {
            onSelect(opt.value);
            onClose();
          }}
          className={`w-full text-left px-3 py-2 text-sm transition-colors ${value === opt.value
            ? "text-light-accent dark:text-dark-accent font-medium bg-light-accent/5 dark:bg-dark-accent/5"
            : "text-light-text dark:text-dark-text hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  ) : null;
