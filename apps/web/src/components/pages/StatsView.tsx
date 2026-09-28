import { BarChart3, BookOpen, Clock, Flame, PieChart, Target, TrendingUp, Users, Zap } from "lucide-react";
import React, { lazy, Suspense, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { BarChart } from "@/components/stats/BarChart";
import { ProgressRing } from "@/components/stats/ProgressRing";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { useBookStore } from "@/store/useBookStore";
import { useSettingsShallow } from "@/store/useSettingsStore";
import { useStatsStore } from "@/store/useStatsStore";
import { calculateAnnualChallenge } from "@/utils/challenge";
import { clampPercent } from "@/utils/number";

const ReadingActivityHeatmap = lazy(() =>
  import("@/components/stats/ReadingActivityHeatmap").then((m) => ({
    default: m.ReadingActivityHeatmap,
  }))
);

const VocabularyReviewCard = lazy(() =>
  import("@/components/vocabulary/VocabularyReviewCard").then((m) => ({
    default: m.VocabularyReviewCard,
  }))
);

type StatsTab = "charts" | "insights" | "overview" | "vocabulary";

const TABS = [
  { icon: BarChart3, id: "overview" as StatsTab, label: "Overview" },
  { icon: PieChart, id: "charts" as StatsTab, label: "Charts" },
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
        <span className="text-xs text-fg-muted font-medium">{label}</span>
        <span className="text-xs font-bold text-fg">{totalMinutes} / {targetMinutes}m</span>
      </div>
      <div className="h-2 bg-line/60 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClassName}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function StatsView() {
  const { goals, goalsStale, sessions, stats } = useStatsStore(useShallow((state) => ({
    goals: state.goals,
    goalsStale: state.goalsStale,
    sessions: state.sessions,
    stats: state.stats,
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
  const completionRate = stats.totalBooksInLibrary > 0
    ? `${clampPercent((stats.totalBooksRead / stats.totalBooksInLibrary) * 100)}%`
    : "N/A";
  const averageSessionMinutes = sessions.length > 0 ? Math.round(stats.totalReadingTime / sessions.length) : 0;

  // Only show reading speed when based on books with real page counts
  const booksWithPageCounts = books.filter((b) => b.totalPages && b.totalPages > 0).length;
  const shouldShowReadingSpeed = booksWithPageCounts > 0;

  const insights = [
    { icon: BookOpen, title: "Completion Rate", value: completionRate, desc: "Books finished" },
    { icon: Clock, title: "Avg Session", value: `${averageSessionMinutes} min`, desc: "Per sitting" },
    ...(shouldShowReadingSpeed
      ? [{ icon: TrendingUp, title: "Reading Speed", value: `${stats.averageReadingSpeed}`, desc: "Pages/hour" }]
      : []),
    { icon: Target, title: "Today's Goal", value: `${dailyProgressPercent}%`, desc: "Progress" },
  ];


  return (
    <div className="page-narrow page-stack">
      <PageHeader eyebrow="Your reading" title="Stats" />

      <div className="flex gap-1 p-1 bg-surface/60 border border-line rounded-xl">
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            variant="nav"
            className={`relative flex-1 gap-1.5 py-2 px-2.5 !rounded-lg text-sm font-medium transition-all duration-instant ${
              activeTab === tab.id
                ? "text-accent"
                : "text-fg-muted/60 hover:text-fg"
            }`}
          >
            {activeTab === tab.id && (
              <div className="absolute inset-0 bg-surface rounded-lg shadow-sm" />
            )}
            <tab.icon className="w-3.5 h-3.5 relative" strokeWidth={1.75} />
            <span className="hidden sm:inline relative">{tab.label}</span>
          </Button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-10">
          {/* Hero: the one thing that matters today */}
          <div className="relative overflow-hidden p-6 sm:p-8 paper-card">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
              <div className="relative flex-shrink-0 mx-auto sm:mx-0">
                <ProgressRing progress={dailyProgressPercent} size={128} stroke={8} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-3xl font-medium text-fg tabular-nums leading-none">
                    {dailyProgressPercent}%
                  </span>
                  <span className="text-2xs text-fg-muted mt-1">today</span>
                </div>
              </div>

              <div className="flex-1 text-center sm:text-left">
                <p className="font-display text-3xl font-medium text-fg tabular-nums">
                  {stats.dailyProgress}{" "}
                  <span className="text-base font-normal text-fg-muted">/ {dailyGoal} min</span>
                </p>
                <p className="text-sm text-fg-muted mt-1">
                  {stats.dailyProgress >= dailyGoal ? "Goal achieved for today" : `${dailyGoal - stats.dailyProgress} min to your goal`}
                </p>

                <div className="flex items-center justify-center sm:justify-start gap-2 mt-4">
                  <Flame className="w-4 h-4 text-accent" strokeWidth={1.75} />
                  <span className="text-sm font-semibold text-fg tabular-nums">{stats.currentStreak}</span>
                  <span className="text-xs text-fg-muted">day streak</span>
                  <span className="text-fg-muted/30">·</span>
                  <span className="text-xs text-fg-muted">best {stats.longestStreak}d</span>
                </div>
              </div>
            </div>

            {goals && (
              <div className="mt-6 pt-6 border-t border-line grid grid-cols-2 gap-6">
                <GoalProgress
                  label="Daily time goal"
                  totalMinutes={goals.day.totalMinutes}
                  targetMinutes={goals.day.targetMinutes}
                  colorClassName="bg-accent"
                />
                <GoalProgress
                  label="Weekly time goal"
                  totalMinutes={goals.week.totalMinutes}
                  targetMinutes={goals.week.targetMinutes}
                  colorClassName="bg-accent/60"
                />
              </div>
            )}
            {goals && goalsStale && (
              <span className="absolute top-4 right-4 text-2xs text-fg-muted/60 px-2 py-0.5 rounded-full bg-line/60 border border-line font-medium">Offline</span>
            )}
          </div>

          {/* Quiet detail: supporting numbers, no card chrome */}
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-line">
              <div className="text-center px-2">
                <p className="font-display text-2xl font-medium text-fg tabular-nums">{stats.totalBooksRead}</p>
                <p className="text-xs text-fg-muted mt-0.5">Books read</p>
              </div>
              <div className="text-center px-2">
                <p className="font-display text-2xl font-medium text-fg tabular-nums">{Math.round(stats.totalReadingTime / 60)}h</p>
                <p className="text-xs text-fg-muted mt-0.5">{dailyAvg} min/day</p>
              </div>
              <div className="text-center px-2">
                <p className="font-display text-2xl font-medium text-fg tabular-nums">{stats.averageReadingSpeed}</p>
                <p className="text-xs text-fg-muted mt-0.5">Pages/hr</p>
              </div>
              <div className="text-center px-2">
                <p className="font-display text-2xl font-medium text-fg tabular-nums">{stats.booksCompletedThisMonth}</p>
                <p className="text-xs text-fg-muted mt-0.5">This month</p>
              </div>
            </div>
          </div>

          {/* Annual Reading Challenge Card */}
          <div className="p-6 rounded-xl bg-surface/40 border border-line">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-line/60">
              <div>
                <span className="text-xs font-semibold text-fg-muted uppercase [letter-spacing:0.05em]">
                  Reading goal · {activeAnnualChallenge.year}
                </span>
                <h3 className="font-display font-medium text-lg text-fg mt-0.5">
                  {activeAnnualChallenge.goal} books this year
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
                <div className="flex items-center gap-1 ml-1 pl-2 border-l border-line">
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
                  <span className="text-xl font-bold text-fg tabular-nums leading-none">
                    {activeAnnualChallenge.percentComplete}%
                  </span>
                </div>
              </div>

              <div className="flex-1 text-center sm:text-left space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
                  <p className="font-display text-2xl font-medium text-fg tabular-nums">
                    {activeAnnualChallenge.completedBooks}{" "}
                    <span className="text-sm font-normal text-fg-muted">
                      of {activeAnnualChallenge.goal} books completed
                    </span>
                  </p>
                </div>

                {/* Pace status badge */}
                <div className="flex items-center justify-center sm:justify-start gap-2 pt-0.5">
                  {activeAnnualChallenge.paceStatus === "ahead" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-accent/10 text-accent border border-accent/20">
                      <TrendingUp className="w-3.5 h-3.5" />
                      {activeAnnualChallenge.aheadBehindCount} {activeAnnualChallenge.aheadBehindCount === 1 ? "book" : "books"} ahead of schedule
                    </span>
                  )}
                  {activeAnnualChallenge.paceStatus === "behind" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-line/50 text-fg-muted border border-line">
                      <Clock className="w-3.5 h-3.5" />
                      {activeAnnualChallenge.aheadBehindCount} {activeAnnualChallenge.aheadBehindCount === 1 ? "book" : "books"} behind schedule
                    </span>
                  )}
                  {activeAnnualChallenge.paceStatus === "on-pace" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-accent/10 text-accent border border-accent/20">
                      <Target className="w-3.5 h-3.5" />
                      On schedule for {activeAnnualChallenge.year}
                    </span>
                  )}
                  <span className="text-xs text-fg-muted">
                    · {activeAnnualChallenge.daysRemaining} days left
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="label-caps">This Week</h3>
              <span className="text-xs text-fg-muted tabular-nums">{weeklyTotal} min</span>
            </div>
            <BarChart
              data={stats.weeklyData.map((d) => ({ label: d.day, value: d.minutes }))}
              maxValue={Math.max(...stats.weeklyData.map((d) => d.minutes), 1)}
              unit="min"
            />
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-fg-muted">
                Weekly goal: <span className="font-semibold tabular-nums text-fg">{weeklyGoal} min</span>
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

        </div>
      )}

      {activeTab === "charts" && (
        <div className="space-y-8">
          <Suspense fallback={null}>
            <ReadingActivityHeatmap
              dailyTargetMinutes={dailyGoal}
              sessions={sessions}
            />
          </Suspense>

          <div className="p-5 rounded-xl bg-surface/40 border border-line">
            <h3 className="label-caps mb-4">Monthly Hours</h3>
            <BarChart
              data={stats.monthlyData.map((d) => ({ label: d.month, value: d.hours }))}
              maxValue={Math.max(...stats.monthlyData.map((d) => d.hours), 1)}
              unit="hours"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-8">
            <div>
              <h3 className="label-caps mb-3">Genres</h3>
              {stats.genreDistribution.length > 0 ? (
                <div className="space-y-2.5">
                  {stats.genreDistribution.map((g) => (
                    <div key={g.genre} className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
                      <span className="flex-1 text-sm text-fg">{g.genre}</span>
                      <span className="text-xs font-medium text-fg-muted tabular-nums">
                        {g.count}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-fg-muted">Add genres to see distribution</p>
              )}
            </div>

            <div>
              <h3 className="label-caps mb-3">Top Authors</h3>
              {stats.authorNetwork.length > 0 ? (
                <div className="space-y-2.5">
                  {stats.authorNetwork.map((a) => (
                    <div key={a.author} className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-accent/8 flex items-center justify-center flex-shrink-0">
                        <Users className="w-3.5 h-3.5 text-accent" strokeWidth={1.75} />
                      </div>
                      <span className="flex-1 text-sm text-fg">{a.author}</span>
                      <span className="text-xs font-medium text-fg-muted tabular-nums">
                        {a.books}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-fg-muted">Start reading to see favorites</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "insights" && (
        <div className="space-y-8">
          <div>
            <h3 className="label-caps mb-3">Insights</h3>
            <div className="space-y-3">
              {insights.map((item) => (
                <div key={item.title} className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-surface/80 border border-line/60 flex-shrink-0">
                    <item.icon className="w-4 h-4 text-fg-muted" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-fg">{item.title}</p>
                    <p className="text-xs text-fg-muted">{item.desc}</p>
                  </div>
                  <span className="text-base font-bold text-accent tabular-nums">{item.value}</span>
                </div>
              ))}
            </div>
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
