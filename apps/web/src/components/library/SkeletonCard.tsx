import React from "react";

export function SkeletonCard() {
  return (
    <div className="w-full h-[260px] sm:h-[300px] rounded-xl bg-light-surface dark:bg-dark-surface border border-black/[0.08] dark:border-white/[0.08] overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 dark:via-white/5 to-transparent animate-shimmer" />
    </div>
  );
}
