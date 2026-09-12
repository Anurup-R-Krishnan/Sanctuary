import { BarChart3, BookOpen, Calendar, Clock, Flame, PieChart, Star, Target, TrendingUp, Trophy, Users, Zap } from "lucide-react";
import React, { lazy, Suspense, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { BadgeCard } from "@/components/stats/BadgeCard";
import { BarChart } from "@/components/stats/BarChart";
import { HeatmapCell } from "@/components/stats/HeatmapCell";
import { ProgressRing } from "@/components/stats/ProgressRing";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useBookStore } from "@/store/useBookStore";
import { useSettingsShallow } from "@/store/useSettingsStore";
import { useStatsStore } from "@/store/useStatsStore";
import { calculateAnnualChallenge } from "@/utils/challenge";
import { clampPercent } from "@/utils/number";

const VocabularyReviewCard = lazy(() =>
  import("@/components/vocabulary/VocabularyReviewCard").then((m) => ({
    default: m.VocabularyReviewCard,
  }))
);

type StatsTab = "badges" | "charts" | "insights" | "overview" | "vocabulary";

const TABS = [
  { icon: BarChart3, id: "overview" as StatsTab, label: "Overview" },
  { icon: PieChart, id: "charts" as StatsTab, label: "Charts" },
  { icon: Trophy, id: "badges" as StatsTab, label: "Badges" },
  { icon: Zap, id: "insights" as StatsTab, label: "Insights" },
  { icon: BookOpen, id: "vocabulary" as StatsTab, label: "Vocabulary" },
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
  const books = useBookStore((state) => state.books);
  const {
    annualBookGoal,
    annualGoalYear,
    dailyGoal,
    setAnnualBookGoal,
    setDailyGoal,
    setWeeklyGoal,
    weeklyGoal,
  } = useSettingsShallow((state) => ({
    annualBookGoal: state.annualBookGoal,
    annualGoalYear: state.annualGoalYear,
    dailyGoal: state.dailyGoal,
    setAnnualBookGoal: state.setAnnualBookGoal,
    setDailyGoal: state.setDailyGoal,
    setWeeklyGoal: state.setWeeklyGoal,
    weeklyGoal: state.weeklyGoal,
  }));

  const activeAnnualChallenge = useMemo(() => {
    return calculateAnnualChallenge(books, annualBookGoal, new Date(), annualGoalYear);
  }, [books, annualBookGoal, annualGoalYear]);
  
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
      <div>
        <h2 className="text-3xl font-sans font-bold tracking-tight text-light-text dark:text-dark-text">Stats</h2>
        <p className="text-light-text-muted dark:text-dark-text-muted text-sm font-sans">Your reading journey and milestones</p>
      </div>

      <div className="flex gap-1 p-1 bg-black/[0.04] dark:bg-white/[0.04] rounded-xl">
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            variant="nav"
            className={`relative flex-1 gap-1.5 py-2 px-2.5 !rounded-lg text-sm font-medium transition-all duration-instant ${
              activeTab === tab.id
                ? "text-light-accent dark:text-dark-accent"
                : "text-light-text-muted/60 dark:text-dark-text-muted/60 hover:text-light-text dark:hover:text-dark-text"
            }`}
          >
            {activeTab === tab.id && (
              <div className="absolute inset-0 bg-light-surface dark:bg-white/10 rounded-lg shadow-sm" />
            )}
            <tab.icon className="w-3.5 h-3.5 relative" strokeWidth={1.75} />
            <span className="hidden sm:inline relative">{tab.label}</span>
          </Button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-10">
          {/* Hero: the one thing that matters today */}
          <div className="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-light-accent/8 via-amber-500/5 to-transparent dark:from-dark-accent/12 dark:via-amber-500/8 dark:to-transparent border border-light-accent/15 dark:border-dark-accent/15">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
              <div className="relative flex-shrink-0 mx-auto sm:mx-0">
                <ProgressRing progress={dailyProgressPercent} size={128} stroke={8} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-light-text dark:text-dark-text tabular-nums leading-none">
                    {dailyProgressPercent}%
                  </span>
                  <span className="text-[10px] text-light-text-muted dark:text-dark-text-muted mt-1">today</span>
                </div>
              </div>

              <div className="flex-1 text-center sm:text-left">
                <p className="text-3xl font-bold text-light-text dark:text-dark-text tabular-nums">
                  {stats.dailyProgress}{" "}
                  <span className="text-base font-normal text-light-text-muted dark:text-dark-text-muted">/ {dailyGoal} pages</span>
                </p>
                <p className="text-sm text-light-text-muted dark:text-dark-text-muted mt-1">
                  {stats.dailyProgress >= dailyGoal ? "Goal achieved for today" : `${dailyGoal - stats.dailyProgress} pages to your goal`}
                </p>

                <div className="flex items-center justify-center sm:justify-start gap-2 mt-4">
                  <Flame className="w-4 h-4 text-orange-500" strokeWidth={2} />
                  <span className="text-sm font-semibold text-light-text dark:text-dark-text tabular-nums">{stats.currentStreak}</span>
                  <span className="text-xs text-light-text-muted dark:text-dark-text-muted">day streak</span>
                  <span className="text-light-text-muted/30 dark:text-dark-text-muted/30">·</span>
                  <span className="text-xs text-light-text-muted dark:text-dark-text-muted">best {stats.longestStreak}d</span>
                </div>
              </div>
            </div>

            {goals && (
              <div className="mt-6 pt-6 border-t border-light-accent/10 dark:border-dark-accent/10 grid grid-cols-2 gap-6">
                <GoalProgress
                  label="Daily time goal"
                  totalMinutes={goals.day.totalMinutes}
                  targetMinutes={goals.day.targetMinutes}
                  colorClassName="bg-light-accent dark:bg-dark-accent"
                />
                <GoalProgress
                  label="Weekly time goal"
                  totalMinutes={goals.week.totalMinutes}
                  targetMinutes={goals.week.targetMinutes}
                  colorClassName="bg-amber-500"
                />
              </div>
            )}
            {goals && goalsStale && (
              <span className="absolute top-4 right-4 text-[10px] text-light-text-muted/60 px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 font-medium">Offline</span>
            )}
          </div>

          {/* Quiet detail: supporting numbers, no card chrome */}
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-black/[0.06] dark:divide-white/[0.06]">
              <div className="text-center px-2">
                <p className="text-2xl font-bold text-light-text dark:text-dark-text tabular-nums">{stats.totalBooksRead}</p>
                <p className="text-[11px] text-light-text-muted dark:text-dark-text-muted mt-0.5">Books read</p>
              </div>
              <div className="text-center px-2">
                <p className="text-2xl font-bold text-light-text dark:text-dark-text tabular-nums">{Math.round(stats.totalReadingTime / 60)}h</p>
                <p className="text-[11px] text-light-text-muted dark:text-dark-text-muted mt-0.5">{dailyAvg} min/day</p>
              </div>
              <div className="text-center px-2">
                <p className="text-2xl font-bold text-light-text dark:text-dark-text tabular-nums">{stats.averageReadingSpeed}</p>
                <p className="text-[11px] text-light-text-muted dark:text-dark-text-muted mt-0.5">Pages/hr</p>
              </div>
              <div className="text-center px-2">
                <p className="text-2xl font-bold text-light-text dark:text-dark-text tabular-nums">{stats.booksCompletedThisMonth}</p>
                <p className="text-[11px] text-light-text-muted dark:text-dark-text-muted mt-0.5">This month</p>
              </div>
            </div>
          </div>

          {/* Annual Reading Challenge Card */}
          <div className="p-6 rounded-3xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-black/[0.04] dark:border-white/[0.04]">
              <div>
                <span className="text-[11px] font-semibold text-light-text-muted dark:text-dark-text-muted uppercase [letter-spacing:0.05em]">
                  Annual Challenge · {activeAnnualChallenge.year}
                </span>
                <h3 className="text-lg font-bold text-light-text dark:text-dark-text mt-0.5">
                  {activeAnnualChallenge.goal} Books Challenge
                </h3>
              </div>

              {/* Goal Presets & Stepper */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[12, 24, 52].map((preset) => (
                  <Button
                    key={preset}
                    onClick={() => setAnnualBookGoal(preset)}
                    variant={annualBookGoal === preset ? "primary" : "secondary"}
                    size="sm"
                    className="!text-xs !py-1 !px-2.5 !h-auto"
                  >
                    {preset} books
                  </Button>
                ))}
                <div className="flex items-center gap-1 ml-1 pl-2 border-l border-black/10 dark:border-white/10">
                  <Button
                    onClick={() => setAnnualBookGoal(Math.max(1, annualBookGoal - 1))}
                    variant="secondary"
                    size="sm"
                    className="!text-xs !p-1 !h-7 !w-7"
                    aria-label="Decrease annual goal"
                  >
                    -
                  </Button>
                  <Button
                    onClick={() => setAnnualBookGoal(annualBookGoal + 1)}
                    variant="secondary"
                    size="sm"
                    className="!text-xs !p-1 !h-7 !w-7"
                    aria-label="Increase annual goal"
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="relative flex-shrink-0 mx-auto sm:mx-0">
                <ProgressRing progress={activeAnnualChallenge.percentComplete} size={96} stroke={7} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-light-text dark:text-dark-text tabular-nums leading-none">
                    {activeAnnualChallenge.percentComplete}%
                  </span>
                </div>
              </div>

              <div className="flex-1 text-center sm:text-left space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
                  <p className="text-2xl font-bold text-light-text dark:text-dark-text tabular-nums">
                    {activeAnnualChallenge.completedBooks}{" "}
                    <span className="text-sm font-normal text-light-text-muted dark:text-dark-text-muted">
                      of {activeAnnualChallenge.goal} books completed
                    </span>
                  </p>
                </div>

                {/* Pace status badge */}
                <div className="flex items-center justify-center sm:justify-start gap-2 pt-0.5">
                  {activeAnnualChallenge.paceStatus === "ahead" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <TrendingUp className="w-3.5 h-3.5" />
                      +{activeAnnualChallenge.aheadBehindCount} {activeAnnualChallenge.aheadBehindCount === 1 ? "book" : "books"} ahead of schedule
                    </span>
                  )}
                  {activeAnnualChallenge.paceStatus === "behind" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <Clock className="w-3.5 h-3.5" />
                      -{activeAnnualChallenge.aheadBehindCount} {activeAnnualChallenge.aheadBehindCount === 1 ? "book" : "books"} behind schedule
                    </span>
                  )}
                  {activeAnnualChallenge.paceStatus === "on-pace" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      <Target className="w-3.5 h-3.5" />
                      On schedule for {activeAnnualChallenge.year}
                    </span>
                  )}
                  <span className="text-xs text-light-text-muted dark:text-dark-text-muted">
                    · {activeAnnualChallenge.daysRemaining} days left
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wide">This Week</h3>
              <span className="text-xs text-light-text-muted dark:text-dark-text-muted tabular-nums">{weeklyTotal} min</span>
            </div>
            <BarChart
              data={stats.weeklyData.map((d) => ({ label: d.day, value: d.minutes }))}
              maxValue={Math.max(...stats.weeklyData.map((d) => d.minutes), 1)}
            />
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-light-text-muted dark:text-dark-text-muted">
                Weekly goal: <span className="font-semibold tabular-nums text-light-text dark:text-dark-text">{weeklyGoal} pages</span>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => onUpdateGoal(Math.max(5, dailyGoal - 5), Math.max(20, weeklyGoal - 20))}
                  variant="secondary"
                  size="sm"
                >
                  Easier
                </Button>
                <Button
                  onClick={() => onUpdateGoal(dailyGoal + 5, weeklyGoal + 20)}
                  variant="secondary"
                  size="sm"
                >
                  Harder
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 text-left">
            <div className="p-2 rounded-lg bg-light-accent/10 dark:bg-dark-accent/10 flex-shrink-0">
              <Star className="w-4 h-4 text-light-accent dark:text-dark-accent" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[11px] text-light-text-muted dark:text-dark-text-muted font-medium uppercase tracking-wide">
                Reading Style
              </p>
              <h3 className="text-base font-semibold text-light-text dark:text-dark-text mt-0.5">{stats.readingPersonality}</h3>
              <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-1 leading-relaxed max-w-md">
                {stats.personalityDescription}
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "charts" && (
        <div className="space-y-8">
          <div className="p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04]">
            <h3 className="text-sm font-semibold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wide mb-4">Activity (14 weeks)</h3>
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

          <div className="p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04]">
            <h3 className="text-sm font-semibold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wide mb-4">Monthly Hours</h3>
            <BarChart
              data={stats.monthlyData.map((d) => ({ label: d.month, value: d.hours }))}
              maxValue={Math.max(...stats.monthlyData.map((d) => d.hours), 1)}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wide mb-3">Genres</h3>
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

            <div>
              <h3 className="text-sm font-semibold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wide mb-3">Top Authors</h3>
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
        <div className="space-y-8">
          <div>
            <h3 className="text-sm font-semibold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wide mb-3">Insights</h3>
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

          <div>
            <h3 className="text-sm font-semibold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wide mb-3">Milestones</h3>
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

          <div className="p-5 rounded-xl bg-gradient-to-br from-amber-500/5 to-yellow-500/5 dark:from-amber-500/8 dark:to-yellow-500/8 border border-amber-500/10 dark:border-amber-500/15">
            <h3 className="text-sm font-semibold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wide mb-3">Tips</h3>
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

      {activeTab === "vocabulary" && (
        <Suspense fallback={<div className="flex justify-center p-8"><LoadingSpinner className="w-6 h-6" /></div>}>
          <VocabularyReviewCard />
        </Suspense>
      )}
    </div>
  );
};

export default StatsView;
