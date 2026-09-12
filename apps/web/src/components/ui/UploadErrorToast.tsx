import { X } from "lucide-react";

import { cx } from "@/utils/cx";

interface UploadErrorToastProps {
  className?: string;
  message: string;
  onDismiss: () => void;
}

/** Small inline error surface shared by every Add Book entry point. */
export function UploadErrorToast({ message, onDismiss, className }: UploadErrorToastProps) {
  return (
    <div
      role="alert"
      className={cx(
        "flex items-center gap-2 px-3 py-2 rounded-xl animate-fadeIn",
        "bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40",
        className
      )}
    >
      <span className="text-sm text-red-600 dark:text-red-400">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss error"
        className="text-red-400 hover:text-red-600 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
