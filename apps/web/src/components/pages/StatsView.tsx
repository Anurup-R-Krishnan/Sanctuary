import React, { useState, useMemo } from "react";
import type { Badge } from "@/types";
import { Flame, Trophy, BookOpen, Clock, Target, TrendingUp, BarChart3, PieChart, Zap, Calendar, Award, Star, Users } from "lucide-react";
import { useSettingsShallow } from "@/context/SettingsContext";
import { useStatsStore } from "@/store/useStatsStore";
import { useShallow } from "zustand/react/shallow";
import { useUIStore } from "@/store/useUIStore";
import { View } from "@/types";

const ICON_MAP: Record<string, React.ElementType> = {
  flame: Flame,
  trophy: Trophy,
  book: BookOpen,
  star: Star,
  award: Award,
  zap: Zap,
  target: Target,
};

const StatsView: React.FC = () => {
  const { stats } = useStatsStore(useShallow((state) => ({
    stats: state.stats,
  })));
  const { dailyGoal, weeklyGoal, setReadingGoals } = useSettingsShallow((state) => ({
    dailyGoal: state.dailyGoal,
    weeklyGoal: state.weeklyGoal,
    setReadingGoals: state.setReadingGoals,
  }));
  const setView = useUIStore((state) => state.setView);
  const safeLabel = (value: string, max = 40) => value.length > max ? `${value.slice(0, max - 1)}...` : value;
  const onUpdateGoal = (daily: number, weekly: number) => {
    setReadingGoals(daily, weekly);
  };
  const [activeTab, setActiveTab] = useState<"overview" | "charts" | "badges" | "insights">("overview");
  const weeklyTotal = useMemo(() => stats.weeklyData.reduce((a, d) => a + d.minutes, 0), [stats.weeklyData]);
  const dailyAvg = useMemo(() => Math.round(weeklyTotal / 7), [weeklyTotal]);

  const StatCard = ({
    icon: Icon,
    label,
    value,
    subtext,
    accent = false,
  }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    subtext?: string;
    accent?: boolean;
  }) => (
    <div
      className={`relative p-4 border-[3px] shadow-[4px_4px_0px_rgba(44,30,22,1)] transform hover:-translate-y-1 transition-all ${accent
          ? "bg-[#faf6f0] border-[#b85e42]"
          : "bg-[#faf6f0] border-[#2c1e16]"
        }`}
    >
      {/* Decorative Corner Tape */}
      {accent && (
        <div className="absolute -top-2 -right-2 w-8 h-3 bg-[#e6d5b8] border border-[#2c1e16]/20 rotate-[15deg] shadow-sm z-10 mix-blend-multiply" />
      )}

      <div className="flex items-start gap-4">
        <div
          className={`p-3 border-2 ${accent
              ? "bg-[#e8bc9e]/30 border-[#b85e42]"
              : "bg-[#e6d5b8] border-[#2c1e16]"
            } shadow-[2px_2px_0px_rgba(44,30,22,1)] rotate-[-2deg]`}
        >
          <Icon
            className={`w-5 h-5 ${accent ? "text-[#b85e42]" : "text-[#2c1e16]"
              }`}
            strokeWidth={2}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#6a5a4e] uppercase tracking-widest font-bold">
            {label}
          </p>
          <p className="text-2xl font-black font-serif text-[#2c1e16] tabular-nums mt-1 leading-none">
            {value}
          </p>
          {subtext && (
            <p className="text-[10px] text-[#6a5a4e]/80 mt-1.5 uppercase font-bold tracking-wider">
              {subtext}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const ProgressRing = ({ progress, size = 80, stroke = 6 }: { progress: number; size?: number; stroke?: number }) => {
    const radius = (size - stroke) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (Math.min(progress, 100) / 100) * circumference;
    return (
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-black/[0.04]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d9b662" />
            <stop offset="100%" stopColor="#e8d9b8" />
          </linearGradient>
        </defs>
      </svg>
    );
  };

  const HeatmapCell = ({ level }: { level: number }) => {
    const colors = [
      "bg-black/[0.03]",
      "bg-light-accent/20",
      "bg-light-accent/45",
      "bg-light-accent",
    ];
    return <div className={`w-2.5 h-2.5 rounded-sm ${colors[level]} transition-colors`} />;
  };

  const BadgeCard = ({ badge }: { badge: Badge }) => {
    const IconComponent = ICON_MAP[badge.icon.toLowerCase()] || Award;
    return (
      <div
        className={`p-4 rounded-xl border text-center transition-all ${badge.unlocked
          ? "bg-black/[0.02] border-black/[0.04]"
          : "opacity-35 bg-black/[0.01] border-black/[0.03]"
          }`}
      >
        <div
          className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-2.5 ${badge.unlocked
            ? "bg-gradient-to-br from-light-accent/15 to-light-accent/30"
            : "bg-black/[0.04]"
            }`}
        >
          <IconComponent
            className={`w-5 h-5 ${badge.unlocked ? "text-light-accent" : "text-light-text-muted/40"
              }`}
            strokeWidth={1.75}
          />
        </div>
        <p className="font-semibold text-sm text-light-text">{badge.name}</p>
        <p className="text-[11px] text-light-text-muted mt-0.5 leading-relaxed">{badge.description}</p>
        {badge.target && !badge.unlocked && (
          <div className="mt-2.5">
            <div className="h-1 bg-black/[0.04] rounded-full overflow-hidden">
              <div
                className="h-full bg-light-accent rounded-full transition-all"
                style={{ width: `${Math.min(100, ((badge.progress || 0) / badge.target) * 100)}%` }}
              />
            </div>
            <p className="text-[9px] text-light-text-muted mt-1 tabular-nums">
              {badge.progress}/{badge.target}
            </p>
          </div>
        )}
        {badge.unlocked && (
          <span className="inline-block mt-2 text-[10px] text-light-accent font-medium">Unlocked</span>
        )}
      </div>
    );
  };

  const BarChart = ({ data, maxValue }: { data: { label: string; value: number }[]; maxValue: number }) => (
    <div className="flex items-end gap-1.5 h-28">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full bg-black/[0.03] rounded-t flex-1 flex items-end min-h-0">
            <div
              className="w-full bg-gradient-to-t from-light-accent to-light-accent/80 rounded-t transition-all duration-500"
              style={{ height: `${maxValue > 0 ? (d.value / maxValue) * 100 : 0}%` }}
            />
          </div>
          <span className="text-[9px] text-light-text-muted font-medium">{d.label}</span>
        </div>
      ))}
    </div>
  );

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "charts", label: "Charts", icon: PieChart },
    { id: "badges", label: "Badges", icon: Trophy },
    { id: "insights", label: "Insights", icon: Zap },
  ] as const;

  return (
    <div className="page-narrow page-stack mt-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="relative">
          <div className="absolute -left-4 -top-4 w-12 h-4 bg-[#e6d5b8] border border-[#2c1e16]/20 rotate-[-10deg] shadow-sm z-10 mix-blend-multiply" />
          <h2 className="text-4xl font-black font-serif text-[#2c1e16] tracking-tight">Stats & Insights</h2>
          <p className="text-[#6a5a4e] mt-1 text-sm font-bold uppercase tracking-widest">Track your reading journey</p>
        </div>

        <div className="flex items-center gap-3 px-4 py-3 bg-[#faf6f0] border-[3px] border-[#2c1e16] shadow-[4px_4px_0px_rgba(44,30,22,1)] rotate-1">
          <Flame className="w-5 h-5 text-[#b85e42]" strokeWidth={2.5} />
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-serif text-[#b85e42] tabular-nums">{stats.currentStreak}</span>
            <span className="text-xs font-bold uppercase tracking-widest text-[#b85e42]">day streak</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 p-3 bg-[#e6d5b8]/30 border-2 border-[#2c1e16]/20 border-dashed">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 py-2 px-6 border-2 border-[#2c1e16] font-bold uppercase tracking-wider text-xs transition-all duration-200 ${activeTab === tab.id
              ? "bg-[#faf6f0] text-[#2c1e16] shadow-[2px_2px_0px_rgba(44,30,22,1)] translate-y-[-2px]"
              : "bg-[#e6d5b8] text-[#6a5a4e] hover:bg-[#faf6f0] shadow-none opacity-80"
              }`}
          >
            <tab.icon className="w-4 h-4" strokeWidth={2} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="p-6 bg-[#faf6f0] border-[3px] border-[#2c1e16] shadow-[6px_6px_0px_rgba(44,30,22,1)] relative">
            <div className="absolute top-2 right-2 w-4 h-4 border-2 border-[#2c1e16] bg-[#b85e42] shadow-[2px_2px_0px_rgba(44,30,22,1)] rotate-12" />
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-[#2c1e16]">Today's Progress</h3>
            </div>
            <div className="flex items-center gap-6">
              <div className="relative p-2 bg-[#e6d5b8] border-2 border-[#2c1e16] shadow-[inset_2px_2px_0px_rgba(0,0,0,0.1)]">
                <ProgressRing progress={(stats.dailyProgress / dailyGoal) * 100} size={90} stroke={8} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-black font-serif text-[#2c1e16] tabular-nums">
                    {Math.round((stats.dailyProgress / dailyGoal) * 100)}%
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-4xl font-black font-serif text-[#2c1e16] tabular-nums">
                  {stats.dailyProgress}{" "}
                  <span className="text-lg font-bold font-sans text-[#6a5a4e] ml-1">/ {dailyGoal} pages</span>
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-[#6a5a4e]/10 border border-[#2c1e16]/20">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#6a5a4e]">
                    {stats.dailyProgress >= dailyGoal ? "Daily Goal Achieved! 🌟" : `${dailyGoal - stats.dailyProgress} pages to go`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            <StatCard icon={Flame} label="Streak" value={`${stats.currentStreak}d`} subtext={`Best: ${stats.longestStreak}d`} accent />
            <StatCard icon={BookOpen} label="Books" value={stats.totalBooksRead} subtext={`${stats.booksCompletedThisMonth} this month`} />
            <StatCard icon={Clock} label="Time" value={`${Math.round(stats.totalReadingTime / 60)}h`} subtext={`${dailyAvg} min/day`} />
            <StatCard icon={TrendingUp} label="Speed" value={`${stats.averageReadingSpeed}`} subtext="pages/hr" />
          </div>

          <div className="p-6 bg-[#faf6f0] border-[3px] border-[#2c1e16] shadow-[6px_6px_0px_rgba(44,30,22,1)] mt-8">
            <div className="flex items-center justify-between mb-6 border-b-2 border-dashed border-[#2c1e16]/20 pb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-[#2c1e16]">This Week</h3>
              <span className="text-xs font-bold uppercase tracking-widest text-[#b85e42] tabular-nums">{weeklyTotal} min</span>
            </div>
            <BarChart
              data={stats.weeklyData.map((d) => ({ label: d.day, value: d.minutes }))}
              maxValue={Math.max(...stats.weeklyData.map((d) => d.minutes), 1)}
            />
            <div className="mt-6 pt-4 border-t-2 border-dashed border-[#2c1e16]/20 flex items-center justify-between gap-3 bg-[#e6d5b8]/30 p-3">
              <p className="text-xs font-bold uppercase tracking-widest text-[#6a5a4e]">
                Weekly target: <span className="text-[#b85e42] tabular-nums">{weeklyGoal} pages</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateGoal(Math.max(5, dailyGoal - 5), Math.max(20, weeklyGoal - 20))}
                  className="px-3 py-1.5 border-2 border-[#2c1e16] bg-[#faf6f0] text-[#2c1e16] text-xs font-bold uppercase tracking-widest shadow-[2px_2px_0px_rgba(44,30,22,1)] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0px_rgba(44,30,22,1)] transition-all"
                >
                  Easier
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateGoal(dailyGoal + 5, weeklyGoal + 20)}
                  className="px-3 py-1.5 border-2 border-[#2c1e16] bg-[#b85e42] text-[#faf6f0] text-xs font-bold uppercase tracking-widest shadow-[2px_2px_0px_rgba(44,30,22,1)] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0px_rgba(44,30,22,1)] transition-all"
                >
                  Harder
                </button>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-gradient-to-br from-light-accent/4 to-light-accent/10 border border-light-accent/10">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-light-accent/12">
                <Star className="w-5 h-5 text-light-accent" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-[10px] text-light-text-muted uppercase tracking-wide font-medium">
                  Reading Style
                </p>
                <h3 className="text-xl font-bold text-light-text mt-0.5">{stats.readingPersonality}</h3>
                <p className="text-xs text-light-text-muted mt-1 leading-relaxed">
                  {stats.personalityDescription}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "charts" && (
        <div className="space-y-5">
          <div className="p-5 rounded-xl bg-black/[0.02] border border-black/[0.04]">
            <h3 className="text-sm font-semibold text-light-text mb-4">Activity ({stats.heatmapData.length} weeks)</h3>
            <div className="flex gap-0.5 overflow-x-auto pb-2">
              {stats.heatmapData.map((week, wi) => (
                <div key={`week-${wi}`} className="flex flex-col gap-0.5">
                  {week.map((level, di) => (
                    <HeatmapCell key={`w${wi}-d${di}`} level={level} />
                  ))}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1 mt-3 text-[10px] text-light-text-muted">
              <span>Less</span>
              {[0, 1, 2, 3].map((l) => (
                <HeatmapCell key={l} level={l} />
              ))}
              <span>More</span>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-black/[0.02] border border-black/[0.04]">
            <h3 className="text-sm font-semibold text-light-text mb-4">Monthly Hours</h3>
            <BarChart
              data={stats.monthlyData.map((d) => ({ label: d.month, value: d.hours }))}
              maxValue={Math.max(...stats.monthlyData.map((d) => d.hours), 1)}
            />
          </div>

          <div className="p-5 rounded-xl bg-black/[0.02] border border-black/[0.04]">
            <h3 className="text-sm font-semibold text-light-text mb-4">Genres</h3>
            {stats.genreDistribution.length > 0 ? (
              <div className="space-y-2.5">
                {stats.genreDistribution.map((g) => (
                  <div key={g.genre} className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
                    <span className="flex-1 text-sm text-light-text">{safeLabel(g.genre, 28)}</span>
                    <span className="text-xs font-medium text-light-text-muted tabular-nums">
                      {g.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-light-text-muted">Add genres to see distribution</p>
            )}
          </div>

          <div className="p-5 rounded-xl bg-black/[0.02] border border-black/[0.04]">
            <h3 className="text-sm font-semibold text-light-text mb-4">Top Authors</h3>
            {stats.authorNetwork.length > 0 ? (
              <div className="space-y-2.5">
                {stats.authorNetwork.map((a) => (
                  <div key={a.author} className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-light-accent/8 flex items-center justify-center flex-shrink-0">
                      <Users className="w-3.5 h-3.5 text-light-accent" strokeWidth={1.75} />
                    </div>
                    <span className="flex-1 text-sm text-light-text">{safeLabel(a.author, 28)}</span>
                    <span className="text-xs font-medium text-light-text-muted tabular-nums">
                      {a.books}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-light-text-muted">Start reading to see favorites</p>
            )}
          </div>
        </div>
      )}

      {activeTab === "badges" && (
        <div className="space-y-5">
          <p className="text-sm text-light-text-muted">
            {stats.badges.filter((b) => b.unlocked).length} of {stats.badges.length} unlocked
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {stats.badges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </div>
        </div>
      )}

      {activeTab === "insights" && (
        <div className="space-y-5">
          <div className="p-5 rounded-xl bg-black/[0.02] border border-black/[0.04]">
            <h3 className="text-sm font-semibold text-light-text mb-4">Insights</h3>
            <div className="space-y-3">
              {[
                {
                  icon: BookOpen,
                  title: "Completion Rate",
                  value: stats.totalBooksInLibrary > 0 ? `${Math.round((stats.totalBooksRead / stats.totalBooksInLibrary) * 100)}%` : "N/A",
                  desc: "Books finished",
                },
                {
                  icon: Clock,
                  title: "Avg Session",
                  value: `${stats.totalReadingTime > 0 ? Math.round(stats.totalReadingTime / Math.max(stats.weeklyData.filter((d) => d.minutes > 0).length * 4, 1)) : 0} min`,
                  desc: "Per sitting",
                },
                {
                  icon: TrendingUp,
                  title: "Pages/Session",
                  value: `${stats.averageReadingSpeed > 0 ? Math.round(stats.averageReadingSpeed / 2) : 0}`,
                  desc: "Average",
                },
                {
                  icon: Target,
                  title: "Today's Goal",
                  value: `${Math.round((stats.dailyProgress / dailyGoal) * 100)}%`,
                  desc: "Progress",
                },
              ].map((item) => (
                <div key={item.title} className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-black/[0.04] flex-shrink-0">
                    <item.icon className="w-4 h-4 text-light-text-muted" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-light-text">{item.title}</p>
                    <p className="text-[11px] text-light-text-muted">{item.desc}</p>
                  </div>
                  <span className="text-base font-bold text-light-accent tabular-nums">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-black/[0.02] border border-black/[0.04]">
            <h3 className="text-sm font-semibold text-light-text mb-4">Milestones</h3>
            <div className="space-y-3">
              {[
                { icon: BookOpen, title: "5 Books", progress: stats.totalBooksRead, target: 5, show: stats.totalBooksRead < 5 },
                { icon: Flame, title: "7 Day Streak", progress: stats.currentStreak, target: 7, show: stats.currentStreak < 7 },
                { icon: Calendar, title: "100 Pages", progress: stats.totalPagesRead, target: 100, show: stats.totalPagesRead < 100 },
                { icon: Clock, title: "10 Hours", progress: stats.totalReadingTime, target: 600, show: stats.totalReadingTime < 600 },
              ]
                .filter((m) => m.show)
                .map((m) => (
                  <div key={m.title} className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-black/[0.04] flex-shrink-0">
                      <m.icon className="w-4 h-4 text-light-text-muted" strokeWidth={1.75} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-light-text">{m.title}</span>
                        <span className="text-[10px] text-light-text-muted tabular-nums">
                          {m.progress}/{m.target}
                        </span>
                      </div>
                      <div className="h-1 bg-black/[0.04] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-light-accent to-light-accent/80 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (m.progress / m.target) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-gradient-to-br from-blue-500/4 to-violet-500/4 border border-blue-500/8">
            <h3 className="text-sm font-semibold text-light-text mb-3">Tips</h3>
            <ul className="space-y-2 text-xs text-light-text-muted">
              <li className="flex items-start gap-2">
                <span className="text-light-accent mt-px">-</span>
                Set a consistent reading time daily
              </li>
              <li className="flex items-start gap-2">
                <span className="text-light-accent mt-px">-</span>
                Start with shorter sessions
              </li>
              <li className="flex items-start gap-2">
                <span className="text-light-accent mt-px">-</span>
                Use immersive mode for focus
              </li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setView(View.LIBRARY)}
                className="px-3 py-1.5 rounded-lg text-xs border border-black/[0.08] hover:bg-black/[0.03]"
              >
                Open Library
              </button>
              <button
                type="button"
                onClick={() => setView(View.READER)}
                className="px-3 py-1.5 rounded-lg text-xs border border-black/[0.08] hover:bg-black/[0.03]"
              >
                Open Reader
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsView;
