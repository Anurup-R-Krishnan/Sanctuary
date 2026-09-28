import { BookOpen, Database, Image, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { StorageBreakdown } from "@/services/storageService";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { estimateStorageUsage, pruneUnopenedBookBlobs } from "@/services/storageService";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function StorageManagerCard() {
  const [breakdown, setBreakdown] = useState<StorageBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCleaning, setIsCleaning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [lastCleanResult, setLastCleanResult] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setLastCleanResult(null);
    try {
      const data = await estimateStorageUsage();
      setBreakdown(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCleanup = async () => {
    setShowConfirm(false);
    setIsCleaning(true);
    try {
      const result = await pruneUnopenedBookBlobs(10);
      const message =
        result.removed === 0
          ? "Nothing to remove. Every cached book was opened recently."
          : `Freed ${formatBytes(result.freedBytes)} by removing ${result.removed} cached book${result.removed > 1 ? "s" : ""}.`;
      setLastCleanResult(message);
      await refresh();
    } finally {
      setIsCleaning(false);
    }
  };

  const isNearlyFull = !!breakdown && breakdown.usageFraction >= 0.85;
  const otherBytes = breakdown ? Math.max(0, breakdown.usageBytes - breakdown.bookBlobBytes - breakdown.coverArtBytes) : 0;

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-fg">Space used</p>
            {breakdown && !isLoading && (
              <p className="mt-1 font-display text-3xl font-medium tabular-nums text-fg">
                {breakdown.usageLabel}
                {breakdown.quotaBytes > 0 && (
                  <span className="ml-2 font-sans text-sm font-normal text-fg-muted">of {breakdown.quotaLabel} available</span>
                )}
              </p>
            )}
          </div>
          <button
            aria-label="Refresh storage estimate"
            className="rounded-md p-1.5 text-fg-muted transition-colors hover:bg-line/40 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
            disabled={isLoading || isCleaning}
            onClick={refresh}
            type="button"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3 animate-pulse-soft">
            <div className="h-9 w-40 rounded bg-line/60" />
            <div className="h-1.5 w-full rounded-full bg-line" />
          </div>
        ) : breakdown ? (
          <>
            {breakdown.quotaBytes > 0 && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-line/70">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${isNearlyFull ? "bg-danger" : "bg-accent"}`}
                  style={{ width: `${Math.max(0.5, breakdown.usageFraction * 100).toFixed(1)}%` }}
                />
              </div>
            )}
            {isNearlyFull && <p className="text-sm text-danger">Storage is almost full.</p>}

            <dl className="grid grid-cols-3 divide-x divide-line/70 border-y border-line/70">
              {[
                { bytes: breakdown.bookBlobBytes, icon: BookOpen, label: "Book files" },
                { bytes: breakdown.coverArtBytes, icon: Image, label: "Covers" },
                { bytes: otherBytes, icon: Database, label: "Other data" },
              ].map(({ bytes, icon: Icon, label }) => (
                <div className="px-3 py-3 first:pl-0" key={label}>
                  <dt className="flex items-center gap-1.5 text-xs text-fg-muted">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </dt>
                  <dd className="mt-1 font-display text-lg font-medium tabular-nums text-fg">{formatBytes(bytes)}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-fg-muted">{lastCleanResult ?? "Book files you have not opened recently can be removed and downloaded again later."}</p>
              <Button className="shrink-0" isLoading={isCleaning} onClick={() => setShowConfirm(true)} size="sm" variant="secondary">
                <Trash2 className="h-3.5 w-3.5" />
                Free up space
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-fg-muted">This browser does not report storage usage.</p>
        )}
      </div>

      <ConfirmDialog
        confirmLabel="Free up space"
        description="Cached files for books outside the 10 most recently opened are removed. Progress, highlights and bookmarks are kept."
        isDestructive={false}
        isOpen={showConfirm}
        title="Free up space"
        onClose={() => setShowConfirm(false)}
        onConfirm={handleCleanup}
      />
    </>
  );
}
