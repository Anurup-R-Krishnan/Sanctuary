import { BookOpen, Database, HardDrive, Image, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { StorageBreakdown } from "@/services/storageService";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { estimateStorageUsage, pruneUnopenedBookBlobs } from "@/services/storageService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface BreakdownBadgeProps {
  bytes: number;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

function BreakdownBadge({ bytes, icon: Icon, label }: BreakdownBadgeProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.05]">
      <Icon className="w-4 h-4 text-light-text-muted dark:text-dark-text-muted shrink-0" />
      <div>
        <p className="text-xs font-semibold text-light-text dark:text-dark-text">{formatBytes(bytes)}</p>
        <p className="text-[11px] text-light-text-muted dark:text-dark-text-muted">{label}</p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

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
      // Keep blobs for the 10 most recently opened books
      const result = await pruneUnopenedBookBlobs(10);
      const message =
        result.removed === 0
          ? "Nothing to clean — all cached books are within the keep window."
          : `Freed ${formatBytes(result.freedBytes)} by removing ${result.removed} cached book${result.removed > 1 ? "s" : ""}.`;
      setLastCleanResult(message);
      await refresh();
    } finally {
      setIsCleaning(false);
    }
  };

  // ─── Usage bar colour ───────────────────────────────────────────────────────

  const barColor =
    !breakdown || breakdown.usageFraction < 0.6
      ? "bg-emerald-500"
      : breakdown.usageFraction < 0.85
      ? "bg-amber-500"
      : "bg-red-500";

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-light-text-muted dark:text-dark-text-muted" />
            <h4 className="text-sm font-semibold text-light-text dark:text-dark-text">Device Storage</h4>
          </div>
          <button
            aria-label="Refresh storage estimate"
            className="rounded-lg p-1.5 text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors disabled:opacity-40"
            disabled={isLoading || isCleaning}
            onClick={refresh}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3 animate-pulse-soft">
            <div className="h-2.5 w-full rounded-full bg-black/[0.06] dark:bg-white/[0.08]" />
            <div className="h-4 w-40 rounded bg-black/[0.05] dark:bg-white/[0.06]" />
            <div className="flex gap-2">
              <div className="h-12 w-28 rounded-xl bg-black/[0.04] dark:bg-white/[0.05]" />
              <div className="h-12 w-28 rounded-xl bg-black/[0.04] dark:bg-white/[0.05]" />
            </div>
          </div>
        ) : breakdown ? (
          <>
            {/* Usage bar */}
            <div className="space-y-1.5">
              <div className="h-2.5 w-full rounded-full bg-black/[0.06] dark:bg-white/[0.10] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                  style={{ width: `${(breakdown.usageFraction * 100).toFixed(1)}%` }}
                />
              </div>
              <p className="text-xs text-light-text-muted dark:text-dark-text-muted">
                {breakdown.quotaBytes > 0 ? (
                  <>
                    <span className="font-semibold text-light-text dark:text-dark-text">{breakdown.usageLabel}</span>
                    {" used of "}
                    <span className="font-semibold text-light-text dark:text-dark-text">{breakdown.quotaLabel}</span>
                    {" quota"}
                    {breakdown.usageFraction >= 0.85 && (
                      <span className="ml-2 text-red-600 dark:text-red-400 font-medium">
                        (storage almost full)
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-light-text dark:text-dark-text">{breakdown.usageLabel}</span>
                    {" used (quota not reported by this browser)"}
                  </>
                )}
              </p>
            </div>

            {/* Breakdown badges */}
            <div className="flex flex-wrap gap-2">
              <BreakdownBadge bytes={breakdown.bookBlobBytes} icon={BookOpen} label="Book files" />
              <BreakdownBadge bytes={breakdown.coverArtBytes} icon={Image} label="Cover art" />
              <BreakdownBadge
                bytes={Math.max(0, breakdown.usageBytes - breakdown.bookBlobBytes - breakdown.coverArtBytes)}
                icon={Database}
                label="Sessions & sync"
              />
            </div>

            {/* Clean result feedback */}
            {lastCleanResult && (
              <p className="text-xs text-light-text-muted dark:text-dark-text-muted">{lastCleanResult}</p>
            )}

            {/* Action */}
            <Button
              className="gap-2"
              isLoading={isCleaning}
              variant="secondary"
              onClick={() => setShowConfirm(true)}
            >
              <Trash2 className="w-4 h-4" />
              Free Up Space
            </Button>
          </>
        ) : (
          <p className="text-sm text-light-text-muted dark:text-dark-text-muted">
            Storage information unavailable in this environment.
          </p>
        )}
      </div>

      <ConfirmDialog
        confirmLabel="Free Up Space"
        description="This will remove cached book files for the 10 oldest-opened books. Your reading progress, highlights, and bookmarks are never affected."
        isDestructive={false}
        isOpen={showConfirm}
        title="Free Up Storage Space"
        onClose={() => setShowConfirm(false)}
        onConfirm={handleCleanup}
      />
    </>
  );
}
