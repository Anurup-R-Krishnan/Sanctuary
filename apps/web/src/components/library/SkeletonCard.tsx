import React from "react";

/**
 * Loading placeholder that mirrors the layout of a BookCard so the
 * transition to real content feels seamless. The block elements sit in a
 * single shimmering overlay so the sweep reads as one continuous gleam
 * across the whole card rather than a noisy all-over flash.
 */
export function SkeletonCard() {
  return (
    <div className="w-full rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-light-surface dark:bg-dark-surface overflow-hidden">
      {/* Cover placeholder (aspect ratio matches the real 2/3 cover) */}
      <div className="relative aspect-[2/3] w-full bg-black/[0.03] dark:bg-white/[0.04]">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent animate-shimmer" />
      </div>
      {/* Metadata placeholder below the cover */}
      <div className="p-3 sm:p-4 space-y-3">
        <div className="relative h-4 w-5/6 rounded bg-black/[0.05] dark:bg-white/[0.06] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent animate-shimmer" />
        </div>
        <div className="relative h-3 w-2/5 rounded bg-black/[0.04] dark:bg-white/[0.05] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent animate-shimmer" />
        </div>
      </div>
    </div>
  );
}
