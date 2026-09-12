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
  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-light-primary/95 dark:bg-dark-primary/95 backdrop-blur-sm p-6 animate-fadeIn">
      <div className="max-w-sm w-full rounded-2xl bg-light-surface dark:bg-dark-surface border border-red-200/50 dark:border-red-800/30 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40">
          <svg
            className="w-7 h-7 text-red-500 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-2">
          Unable to Load Book
        </h3>
        <p className="text-sm text-light-text-muted dark:text-dark-text-muted mb-6 leading-relaxed">
          {contentError}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium bg-black/[0.04] dark:bg-white/[0.06] text-light-text dark:text-dark-text hover:bg-black/[0.08] dark:hover:bg-white/[0.1] transition-colors"
          >
            Back to Library
          </button>
          <button
            onClick={onRetry}
            className="px-4 py-2.5 rounded-xl text-sm font-medium bg-light-accent dark:bg-dark-accent text-white hover:opacity-90 transition-opacity shadow-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
