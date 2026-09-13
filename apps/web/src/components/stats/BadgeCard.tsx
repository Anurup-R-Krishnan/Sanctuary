import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  Flame,
  Layers,
  Moon,
  Star,
  Sun,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import React from "react";

import type { Badge } from "@/types";

import { clampPercent } from "@/utils/number";

const ICON_MAP: Record<string, React.ElementType> = {
  award: Award,
  book: BookOpen,
  clock: Clock,
  compass: Compass,
  flame: Flame,
  layers: Layers,
  moon: Moon,
  star: Star,
  sun: Sun,
  target: Target,
  trophy: Trophy,
  zap: Zap,
};

const RARITY_STYLES: Record<string, { badge: string; border: string; glow: string }> = {
  common: {
    badge: "text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20",
    border: "border-slate-500/20",
    glow: "from-slate-500/10 to-slate-400/5",
  },
  epic: {
    badge: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
    border: "border-purple-500/30",
    glow: "from-purple-500/15 to-pink-500/10",
  },
  legendary: {
    badge: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
    border: "border-amber-500/40",
    glow: "from-amber-500/20 to-orange-500/15",
  },
  rare: {
    badge: "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20",
    border: "border-sky-500/20",
    glow: "from-sky-500/15 to-blue-500/10",
  },
};

interface BadgeCardProps {
  badge: Badge;
}

export const BadgeCard = ({ badge }: BadgeCardProps) => {
  const IconComponent = ICON_MAP[badge.icon.toLowerCase()] || Award;
  const progress = badge.target ? clampPercent(((badge.progress || 0) / badge.target) * 100) : 0;
  const rarity = badge.rarity || "common";
  const rarityStyle = RARITY_STYLES[rarity] || RARITY_STYLES.common!;

  return (
    <div
      className={`relative p-4 rounded-2xl border text-center transition-all flex flex-col justify-between overflow-hidden ${
        badge.unlocked
          ? `bg-black/[0.02] dark:bg-white/[0.02] ${rarityStyle.border} shadow-sm`
          : "opacity-45 bg-black/[0.01] dark:bg-white/[0.01] border-black/[0.05] dark:border-white/[0.05]"
      }`}
    >
      {/* Top Meta: Rarity Tag */}
      <div className="flex items-center justify-between w-full mb-1">
        <span
          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${rarityStyle.badge}`}
        >
          {rarity}
        </span>
        {badge.unlocked && (
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
            <CheckCircle2 className="w-3 h-3" />
            <span>Unlocked</span>
          </span>
        )}
      </div>

      {/* Center Icon & Name */}
      <div className="flex flex-col items-center my-2">
        <div
          className={`inline-flex items-center justify-center w-11 h-11 rounded-2xl mb-2.5 transition-transform ${
            badge.unlocked
              ? `bg-gradient-to-br ${rarityStyle.glow} shadow-inner`
              : "bg-black/[0.04] dark:bg-white/[0.04]"
          }`}
        >
          <IconComponent
            className={`w-5 h-5 ${
              badge.unlocked
                ? "text-light-accent dark:text-dark-accent"
                : "text-light-text-muted/40 dark:text-dark-text-muted/40"
            }`}
            strokeWidth={1.8}
          />
        </div>
        <p className="font-semibold text-sm text-light-text dark:text-dark-text">{badge.name}</p>
        <p className="text-[11px] text-light-text-muted dark:text-dark-text-muted mt-1 leading-relaxed">
          {badge.description}
        </p>
      </div>

      {/* Bottom Progress Bar or Target */}
      <div>
        {badge.target && !badge.unlocked && (
          <div className="mt-2">
            <div className="h-1.5 bg-black/[0.04] dark:bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className="h-full bg-light-accent dark:bg-dark-accent rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[9px] text-light-text-muted dark:text-dark-text-muted mt-1 tabular-nums">
              {badge.progress || 0} / {badge.target}
            </p>
          </div>
        )}
        {!badge.target && !badge.unlocked && (
          <p className="text-[9px] text-light-text-muted/60 dark:text-dark-text-muted/60 mt-1 italic">
            Habit challenge
          </p>
        )}
      </div>
    </div>
  );
};
