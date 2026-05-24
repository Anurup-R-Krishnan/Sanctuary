import { Flame, Trophy, BookOpen, Target, Zap, Award, Star } from "lucide-react";
import React from "react";

import type { Badge } from "@/types";

const ICON_MAP: Record<string, React.ElementType> = {
  flame: Flame,
  trophy: Trophy,
  book: BookOpen,
  star: Star,
  award: Award,
  zap: Zap,
  target: Target,
};

interface BadgeCardProps {
  badge: Badge;
}

export const BadgeCard = ({ badge }: BadgeCardProps) => {
  const IconComponent = ICON_MAP[badge.icon.toLowerCase()] || Award;
  return (
    <div
      className={`p-4 rounded-xl border text-center transition-all ${
        badge.unlocked
          ? "bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.04] dark:border-white/[0.04]"
          : "opacity-35 bg-black/[0.01] dark:bg-white/[0.01] border-black/[0.03] dark:border-white/[0.03]"
      }`}
    >
      <div
        className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-2.5 ${
          badge.unlocked
            ? "bg-gradient-to-br from-light-accent/15 to-amber-500/15 dark:from-dark-accent/15 dark:to-amber-400/15"
            : "bg-black/[0.04] dark:bg-white/[0.04]"
        }`}
      >
        <IconComponent
          className={`w-5 h-5 ${
            badge.unlocked ? "text-light-accent dark:text-dark-accent" : "text-light-text-muted/40 dark:text-dark-text-muted/40"
          }`}
          strokeWidth={1.75}
        />
      </div>
      <p className="font-semibold text-sm text-light-text dark:text-dark-text">{badge.name}</p>
      <p className="text-[11px] text-light-text-muted dark:text-dark-text-muted mt-0.5 leading-relaxed">{badge.description}</p>
      {badge.target && !badge.unlocked && (
        <div className="mt-2.5">
          <div className="h-1 bg-black/[0.04] dark:bg-white/[0.04] rounded-full overflow-hidden">
            <div
              className="h-full bg-light-accent dark:bg-dark-accent rounded-full transition-all"
              style={{ width: `${Math.min(100, ((badge.progress || 0) / badge.target) * 100)}%` }}
            />
          </div>
          <p className="text-[9px] text-light-text-muted dark:text-dark-text-muted mt-1 tabular-nums">
            {badge.progress}/{badge.target}
          </p>
        </div>
      )}
      {badge.unlocked && (
        <span className="inline-block mt-2 text-[10px] text-light-accent dark:text-dark-accent font-medium">Unlocked</span>
      )}
    </div>
  );
};
