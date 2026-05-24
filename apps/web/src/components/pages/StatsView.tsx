import { Flame, Trophy, BookOpen, Clock, Target, TrendingUp, BarChart3, PieChart, Zap, Calendar, Star, Users } from "lucide-react";
import React, { useState, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { BadgeCard } from "@/components/stats/BadgeCard";
import { BarChart } from "@/components/stats/BarChart";
import { HeatmapCell } from "@/components/stats/HeatmapCell";
import { ProgressRing } from "@/components/stats/ProgressRing";
import { StatCard } from "@/components/stats/StatCard";
import { useSettingsShallow } from "@/store/useSettingsStore";
import { useStatsStore } from "@/store/useStatsStore";
import { clampPercent } from "@/utils/number";

type StatsTab = "overview" | "charts" | "badges" | "insights";

const TABS = [
  { id: "overview" as StatsTab, label: "Overview", icon: BarChart3 },
  { id: "charts" as StatsTab, label: "Charts", icon: PieChart },
  { id: "badges" as StatsTab, label: "Badges", icon: Trophy },
  { id: "insights" as StatsTab, label: "Insights", icon: Zap },
] as const;

function GoalProgress({
  colorClassName,
  label,
  targetMinutes,
  totalMinutes,
}: {
  colorClassName: string;
  label: string;
  targetMinutes: number;
  totalMinutes: number;
}) {
  const progress = targetMinutes > 0 ? clampPercent((totalMinutes / targetMinutes) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-light-text-muted dark:text-dark-text-muted font-medium">{label}</span>
        <span className="text-xs font-bold text-light-text dark:text-dark-text">{totalMinutes} / {targetMinutes}m</span>
      </div>
      <div className="h-2 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClassName}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function StatsView() {
  const { stats, goals, goalsStale } = useStatsStore(useShallow((state) => ({
    stats: state.stats,
    goals: state.goals,
    goalsStale: state.goalsStale,
  })));
  const { dailyGoal, weeklyGoal, setDailyGoal, setWeeklyGoal } = useSettingsShallow((state) => ({
    dailyGoal: state.dailyGoal,
    weeklyGoal: state.weeklyGoal,
    setDailyGoal: state.setDailyGoal,
    setWeeklyGoal: state.setWeeklyGoal,
  }));
  
  const onUpdateGoal = (daily: number, weekly: number) => {
    setDailyGoal(daily);
    setWeeklyGoal(weekly);
  };
  
  const [activeTab, setActiveTab] = useState<StatsTab>("overview");
  const weeklyTotal = useMemo(() => stats.weeklyData.reduce((a, d) => a + d.minutes, 0), [stats.weeklyData]);
  const dailyAvg = useMemo(() => Math.round(weeklyTotal / 7), [weeklyTotal]);
  const dailyProgressPercent = dailyGoal > 0 ? clampPercent((stats.dailyProgress / dailyGoal) * 100) : 0;
  const activeReadingDays = stats.weeklyData.filter((d) => d.minutes > 0).length;
  const averageSessionMinutes = stats.totalReadingTime > 0
    ? Math.round(stats.totalReadingTime / Math.max(activeReadingDays * 4, 1))
    : 0;
  const completionRate = stats.totalBooksInLibrary > 0
    ? `${clampPercent((stats.totalBooksRead / stats.totalBooksInLibrary) * 100)}%`
    : "N/A";
  const insights = [
    { icon: BookOpen, title: "Completion Rate", value: completionRate, desc: "Books finished" },
    { icon: Clock, title: "Avg Session", value: `${averageSessionMinutes} min`, desc: "Per sitting" },
    { icon: TrendingUp, title: "Pages/Session", value: `${stats.averageReadingSpeed > 0 ? Math.round(stats.averageReadingSpeed / 2) : 0}`, desc: "Average" },
    { icon: Target, title: "Today's Goal", value: `${dailyProgressPercent}%`, desc: "Progress" },
  ];
  const milestones = [
    { icon: BookOpen, title: "5 Books", progress: stats.totalBooksRead, target: 5, show: stats.totalBooksRead < 5 },
    { icon: Flame, title: "7 Day Streak", progress: stats.currentStreak, target: 7, show: stats.currentStreak < 7 },
    { icon: Calendar, title: "100 Pages", progress: stats.totalPagesRead, target: 100, show: stats.totalPagesRead < 100 },
    { icon: Clock, title: "10 Hours", progress: stats.totalReadingTime, target: 600, show: stats.totalReadingTime < 600 },
  ].filter((milestone) => milestone.show);

  return (
    <div className="page-narrow page-stack">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">Stats</h2>
          <p className="text-light-text-muted dark:text-dark-text-muted mt-1 text-sm">Track your reading</p>
        </div>
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gradient-to-r from-orange-500/8 to-amber-500/8 dark:from-orange-500/10 dark:to-amber-500/10 border border-orange-500/15 dark:border-orange-500/10">
          <Flame className="w-4 h-4 text-orange-500" strokeWidth={2} />
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-light-text dark:text-dark-text tabular-nums">{stats.currentStreak}</span>
            <span className="text-xs text-light-text-muted dark:text-dark-text-muted">day streak</span>
          </div>
        </div>
      </div>

      <div className="flex gap-0.5 p-0.5 bg-black/[0.03] dark:bg-white/[0.03] rounded-lg">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-md text-sm font-medium transition-all duration-150 ${
              activeTab === tab.id
                ? "bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text shadow-sm"
                : "text-light-text-muted/60 dark:text-dark-text-muted/60 hover:text-light-text dark:hover:text-dark-text"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-5">
          <div className="p-5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-light-text dark:text-dark-text">Today</h3>
            </div>
            <div className="flex items-center gap-5">
              <div className="relative">
                <ProgressRing progress={dailyProgressPercent} size={80} stroke={6} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-light-text dark:text-dark-text tabular-nums">
                    {dailyProgressPercent}%
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold text-light-text dark:text-dark-text tabular-nums">
                  {stats.dailyProgress}{" "}
                  <span className="text-sm font-normal text-light-text-muted dark:text-dark-text-muted">/ {dailyGoal} pages</span>
                </p>
                <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-0.5">
                  {stats.dailyProgress >= dailyGoal ? "Goal achieved" : `${dailyGoal - stats.dailyProgress} pages to go`}
                </p>
              </div>
            </div>
          </div>

          {goals && (
            <div className="p-5 rounded-xl bg-gradient-to-br from-light-accent/5 to-amber-500/5 dark:from-dark-accent/10 dark:to-amber-500/10 border border-light-accent/10 dark:border-dark-accent/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-light-text dark:text-dark-text flex items-center gap-2">
                  <Target className="w-4 h-4 text-light-accent dark:text-dark-accent" />
                  Time-based Goals
                </h3>
                {goalsStale && <span className="text-[10px] text-light-text-muted/60 px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 uppercase font-bold tracking-wider">Offline</span>}
              </div>
              <div className="grid grid-cols-2 gap-6">
                <GoalProgress
                  label="Daily"
                  totalMinutes={goals.day.totalMinutes}
                  targetMinutes={goals.day.targetMinutes}
                  colorClassName="bg-light-accent dark:bg-dark-accent"
                />
                <GoalProgress
                  label="Weekly"
                  totalMinutes={goals.week.totalMinutes}
                  targetMinutes={goals.week.targetMinutes}
                  colorClassName="bg-amber-500"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={Flame} label="Streak" value={`${stats.currentStreak}d`} subtext={`Best: ${stats.longestStreak}d`} accent />
            <StatCard icon={BookOpen} label="Books" value={stats.totalBooksRead} subtext={`${stats.booksCompletedThisMonth} this month`} />
            <StatCard icon={Clock} label="Time" value={`${Math.round(stats.totalReadingTime / 60)}h`} subtext={`${dailyAvg} min/day`} />
            <StatCard icon={TrendingUp} label="Speed" value={`${stats.averageReadingSpeed}`} subtext="pages/hr" />
          </div>

          <div className="p-5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-light-text dark:text-dark-text">This Week</h3>
              <span className="text-xs text-light-text-muted dark:text-dark-text-muted tabular-nums">{weeklyTotal} min</span>
            </div>
            <BarChart
              data={stats.weeklyData.map((d) => ({ label: d.day, value: d.minutes }))}
              maxValue={Math.max(...stats.weeklyData.map((d) => d.minutes), 1)}
            />
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-light-text-muted dark:text-dark-text-muted">
                Weekly goal: <span className="font-semibold tabular-nums">{weeklyGoal} pages</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateGoal(Math.max(5, dailyGoal - 5), Math.max(20, weeklyGoal - 20))}
                  className="px-2.5 py-1 rounded-lg text-xs border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                >
                  Easier
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateGoal(dailyGoal + 5, weeklyGoal + 20)}
                  className="px-2.5 py-1 rounded-lg text-xs border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                >
                  Harder
                </button>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-gradient-to-br from-light-accent/4 to-amber-500/4 dark:from-dark-accent/6 dark:to-amber-400/6 border border-light-accent/10 dark:border-dark-accent/10">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-light-accent/12 dark:bg-dark-accent/12">
                <Star className="w-5 h-5 text-light-accent dark:text-dark-accent" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-[10px] text-light-text-muted dark:text-dark-text-muted uppercase tracking-wide font-medium">
                  Reading Style
                </p>
                <h3 className="text-xl font-bold text-light-text dark:text-dark-text mt-0.5">{stats.readingPersonality}</h3>
                <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-1 leading-relaxed">
                  {stats.personalityDescription}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "charts" && (
        <div className="space-y-5">
          <div className="p-5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04]">
            <h3 className="text-sm font-semibold text-light-text dark:text-dark-text mb-4">Activity (14 weeks)</h3>
            <div className="flex gap-0.5 overflow-x-auto pb-2">
              {stats.heatmapData.map((week, wi) => (
                <div key={`week-${wi}`} className="flex flex-col gap-0.5">
                  {week.map((level, di) => (
                    <HeatmapCell key={`w${wi}-d${di}`} level={level} />
                  ))}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1 mt-3 text-[10px] text-light-text-muted dark:text-dark-text-muted">
              <span>Less</span>
              {[0, 1, 2, 3].map((l) => (
                <HeatmapCell key={l} level={l} />
              ))}
              <span>More</span>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04]">
            <h3 className="text-sm font-semibold text-light-text dark:text-dark-text mb-4">Monthly Hours</h3>
            <BarChart
              data={stats.monthlyData.map((d) => ({ label: d.month, value: d.hours }))}
              maxValue={Math.max(...stats.monthlyData.map((d) => d.hours), 1)}
            />
          </div>

          <div className="p-5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04]">
            <h3 className="text-sm font-semibold text-light-text dark:text-dark-text mb-4">Genres</h3>
            {stats.genreDistribution.length > 0 ? (
              <div className="space-y-2.5">
                {stats.genreDistribution.map((g) => (
                  <div key={g.genre} className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
                    <span className="flex-1 text-sm text-light-text dark:text-dark-text">{g.genre}</span>
                    <span className="text-xs font-medium text-light-text-muted dark:text-dark-text-muted tabular-nums">
                      {g.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-light-text-muted dark:text-dark-text-muted">Add genres to see distribution</p>
            )}
          </div>

          <div className="p-5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04]">
            <h3 className="text-sm font-semibold text-light-text dark:text-dark-text mb-4">Top Authors</h3>
            {stats.authorNetwork.length > 0 ? (
              <div className="space-y-2.5">
                {stats.authorNetwork.map((a) => (
                  <div key={a.author} className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-light-accent/8 dark:bg-dark-accent/8 flex items-center justify-center flex-shrink-0">
                      <Users className="w-3.5 h-3.5 text-light-accent dark:text-dark-accent" strokeWidth={1.75} />
                    </div>
                    <span className="flex-1 text-sm text-light-text dark:text-dark-text">{a.author}</span>
                    <span className="text-xs font-medium text-light-text-muted dark:text-dark-text-muted tabular-nums">
                      {a.books}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-light-text-muted dark:text-dark-text-muted">Start reading to see favorites</p>
            )}
          </div>
        </div>
      )}

      {activeTab === "badges" && (
        <div className="space-y-5">
          <p className="text-sm text-light-text-muted dark:text-dark-text-muted">
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
          <div className="p-5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04]">
            <h3 className="text-sm font-semibold text-light-text dark:text-dark-text mb-4">Insights</h3>
            <div className="space-y-3">
              {insights.map((item) => (
                <div key={item.title} className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-black/[0.04] dark:bg-white/[0.04] flex-shrink-0">
                    <item.icon className="w-4 h-4 text-light-text-muted dark:text-dark-text-muted" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-light-text dark:text-dark-text">{item.title}</p>
                    <p className="text-[11px] text-light-text-muted dark:text-dark-text-muted">{item.desc}</p>
                  </div>
                  <span className="text-base font-bold text-light-accent dark:text-dark-accent tabular-nums">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04]">
            <h3 className="text-sm font-semibold text-light-text dark:text-dark-text mb-4">Milestones</h3>
            <div className="space-y-3">
              {milestones.map((m) => (
                  <div key={m.title} className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-black/[0.04] dark:bg-white/[0.04] flex-shrink-0">
                      <m.icon className="w-4 h-4 text-light-text-muted dark:text-dark-text-muted" strokeWidth={1.75} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-light-text dark:text-dark-text">{m.title}</span>
                        <span className="text-[10px] text-light-text-muted dark:text-dark-text-muted tabular-nums">
                          {m.progress}/{m.target}
                        </span>
                      </div>
                      <div className="h-1 bg-black/[0.04] dark:bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-light-accent to-amber-500 dark:from-dark-accent dark:to-amber-400 rounded-full transition-all"
                          style={{ width: `${clampPercent((m.progress / m.target) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-gradient-to-br from-blue-500/4 to-violet-500/4 dark:from-blue-500/6 dark:to-violet-500/6 border border-blue-500/8 dark:border-blue-500/10">
            <h3 className="text-sm font-semibold text-light-text dark:text-dark-text mb-3">Tips</h3>
            <ul className="space-y-2 text-xs text-light-text-muted dark:text-dark-text-muted">
              <li className="flex items-start gap-2">
                <span className="text-light-accent dark:text-dark-accent mt-px">-</span>
                Set a consistent reading time daily
              </li>
              <li className="flex items-start gap-2">
                <span className="text-light-accent dark:text-dark-accent mt-px">-</span>
                Start with shorter sessions
              </li>
              <li className="flex items-start gap-2">
                <span className="text-light-accent dark:text-dark-accent mt-px">-</span>
                Use immersive mode for focus
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsView;
