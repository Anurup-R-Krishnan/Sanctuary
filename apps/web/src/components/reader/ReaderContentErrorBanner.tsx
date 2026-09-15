import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ReaderContentErrorBannerProps {
  contentError: string;
  onClose: () => void;
  onRetry: () => void;
}

export function ReaderContentErrorBanner({
  contentError,
  onClose,
  onRetry,
}: ReaderContentErrorBannerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  const banner = (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="reader-content-error-title"
      aria-describedby="reader-content-error-desc"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm p-6 animate-fadeIn"
    >
      <div className="max-w-sm w-full rounded-2xl bg-light-primary dark:bg-dark-primary border border-red-200/60 dark:border-red-800/40 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40">
          <svg
            className="w-7 h-7 text-red-500 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h3
          id="reader-content-error-title"
          className="text-lg font-semibold text-light-text dark:text-dark-text mb-2"
        >
          Unable to Load Book
        </h3>
        <p
          id="reader-content-error-desc"
          className="text-sm text-light-text-muted dark:text-dark-text-muted mb-6 leading-relaxed"
        >
          {contentError}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2.5 rounded-xl text-sm font-medium bg-light-primary dark:bg-dark-primary border border-light-border dark:border-dark-border text-light-text dark:text-dark-text hover:bg-light-border/40 dark:hover:bg-dark-border/40 transition-colors focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
          >
            Back to Library
          </button>
          <button
            onClick={onRetry}
            type="button"
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-light-accent hover:bg-light-accent/90 dark:bg-dark-accent dark:hover:bg-dark-accent/90 text-white dark:text-black transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return banner;
  }
  return createPortal(banner, document.body);
}
