import { Minus, Plus } from "lucide-react";
import { lazy, type ReactNode, Suspense, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { BarChart } from "@/components/stats/BarChart";
import { ProgressRing } from "@/components/stats/ProgressRing";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { useBookStore } from "@/store/useBookStore";
import { useSettingsShallow } from "@/store/useSettingsStore";
import { useStatsStore } from "@/store/useStatsStore";
import { calculateAnnualChallenge } from "@/utils/challenge";
import { clampPercent } from "@/utils/number";

const ReadingActivityHeatmap = lazy(() =>
  import("@/components/stats/ReadingActivityHeatmap").then((m) => ({ default: m.ReadingActivityHeatmap }))
);

const VocabularyReviewCard = lazy(() =>
  import("@/components/vocabulary/VocabularyReviewCard").then((m) => ({ default: m.VocabularyReviewCard }))
);

type StatsTab = "activity" | "overview" | "vocabulary";

const TABS: { id: StatsTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "activity", label: "Activity" },
  { id: "vocabulary", label: "Vocabulary" },
];

const MAX_SPINES = 60;

function formatDuration(totalMinutes: number): { unit: string; value: string } {
  const minutes = Math.round(totalMinutes);
  if (minutes < 60) return { unit: "min", value: `${minutes}` };
  const hours = minutes / 60;
  return { unit: hours === 1 ? "hour" : "hours", value: hours >= 10 ? `${Math.round(hours)}` : hours.toFixed(1).replace(/\.0$/, "") };
}

function Figure({ label, note, unit, value }: { label: string; note?: string; unit?: string; value: ReactNode }) {
  return (
    <div className="bg-surface-raised px-5 py-5 sm:px-6">
      <dt className="label-caps">{label}</dt>
      <dd className="mt-2 flex items-baseline gap-1.5">
        <span className="font-display text-4xl font-medium leading-none tabular-nums text-fg">{value}</span>
        {unit && <span className="text-sm text-fg-muted">{unit}</span>}
      </dd>
      {note && <p className="mt-1.5 text-xs text-fg-muted">{note}</p>}
    </div>
  );
}

function StepButton({ children, label, onClick }: { children: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-surface-raised text-fg-muted transition-colors hover:border-accent/50 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function SectionTitle({ aside, children }: { aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
      <h2 className="font-display text-2xl font-medium tracking-tight text-fg">{children}</h2>
      {aside && <div className="text-sm text-fg-muted">{aside}</div>}
    </div>
  );
}

function RankedList({ empty, items, title }: { empty: string; items: { count: number; label: string }[]; title: string }) {
  const max = Math.max(1, ...items.map((item) => item.count));
  return (
    <section className="paper-card p-5 sm:p-6">
      <h3 className="label-caps">{title}</h3>
      {items.length > 0 ? (
        <ol className="mt-4 space-y-3.5">
          {items.map((item, index) => (
            <li key={item.label}>
              <div className="flex items-baseline gap-3">
                <span className="folio w-5 text-xs text-accent">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-fg">{item.label}</span>
                <span className="text-xs tabular-nums text-fg-muted">
                  {item.count} {item.count === 1 ? "book" : "books"}
                </span>
              </div>
              <div className="ml-8 mt-1.5 h-[3px] overflow-hidden rounded-full bg-line/70">
                <div className="h-full rounded-full bg-accent/70" style={{ width: `${(item.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-fg-muted">{empty}</p>
      )}
    </section>
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
  const { annualBookGoal, annualGoalYear, dailyGoal, setAnnualBookGoal, setWeeklyGoal, weeklyGoal } = useSettingsShallow((state) => ({
    annualBookGoal: state.annualBookGoal,
    annualGoalYear: state.annualGoalYear,
    dailyGoal: state.dailyGoal,
    setAnnualBookGoal: state.setAnnualBookGoal,
    setWeeklyGoal: state.setWeeklyGoal,
    weeklyGoal: state.weeklyGoal,
  }));
  const [activeTab, setActiveTab] = useState<StatsTab>("overview");

  const challenge = useMemo(
    () => calculateAnnualChallenge(books, annualBookGoal, new Date(), annualGoalYear),
    [books, annualBookGoal, annualGoalYear]
  );
  const weeklyTotal = useMemo(() => Math.round(stats.weeklyData.reduce((sum, d) => sum + d.minutes, 0)), [stats.weeklyData]);
  const todayIndex = (new Date().getDay() + 6) % 7;
  const dailyPercent = dailyGoal > 0 ? Math.round(clampPercent((stats.dailyProgress / dailyGoal) * 100)) : 0;
  const weeklyPercent = weeklyGoal > 0 ? Math.round(clampPercent((weeklyTotal / weeklyGoal) * 100)) : 0;
  const minutesLeft = Math.max(0, dailyGoal - stats.dailyProgress);
  const totalTime = formatDuration(stats.totalReadingTime);
  const averageSession = sessions.length > 0 ? Math.round(stats.totalReadingTime / sessions.length) : 0;
  const hasPageCounts = books.some((b) => (b.totalPages ?? 0) > 0) && stats.averageReadingSpeed > 0;
  const completionRate = stats.totalBooksInLibrary > 0 ? Math.round((stats.totalBooksRead / stats.totalBooksInLibrary) * 100) : null;
  const spineCount = Math.min(challenge.goal, MAX_SPINES);
  const filledSpines = challenge.goal > MAX_SPINES
    ? Math.round((challenge.completedBooks / challenge.goal) * MAX_SPINES)
    : challenge.completedBooks;
  const paceText = challenge.paceStatus === "ahead"
    ? `${challenge.aheadBehindCount} ${challenge.aheadBehindCount === 1 ? "book" : "books"} ahead of pace`
    : challenge.paceStatus === "behind"
      ? `${challenge.aheadBehindCount} ${challenge.aheadBehindCount === 1 ? "book" : "books"} behind pace`
      : "On pace";

  return (
    <div className="page-narrow page-stack">
      <PageHeader
        actions={goals && goalsStale ? <span className="rounded-full border border-line bg-subtle px-2.5 py-1 text-xs text-fg-muted">Offline figures</span> : undefined}
        eyebrow="Your reading"
        title="Stats"
      />

      <div aria-label="Stats sections" className="-mt-4 flex gap-6 border-b border-line" role="tablist">
        {TABS.map((tab) => (
          <button
            aria-selected={activeTab === tab.id}
            className={`-mb-px border-b-2 pb-3 pt-1 text-sm font-medium transition-colors ${
              activeTab === tab.id ? "border-accent text-fg" : "border-transparent text-fg-muted hover:text-fg"
            }`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-12 animate-fadeIn">
          <section className="paper-card grid divide-y divide-line/70 md:grid-cols-[1.25fr_1fr_1fr] md:divide-x md:divide-y-0">
            <div className="flex items-center gap-6 p-6 sm:p-7">
              <div className="relative shrink-0">
                <ProgressRing progress={dailyPercent} size={112} stroke={6} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-3xl font-medium leading-none tabular-nums text-fg">{dailyPercent}%</span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="label-caps">Today</p>
                <p className="mt-2 font-display text-4xl font-medium leading-none tabular-nums text-fg">
                  {Math.round(stats.dailyProgress)}
                  <span className="ml-1.5 font-sans text-sm font-normal text-fg-muted">of {dailyGoal} min</span>
                </p>
                <p className="mt-2.5 text-sm text-fg-muted">
                  {minutesLeft === 0 ? "Daily goal reached." : `${Math.round(minutesLeft)} min to the daily goal.`}
                </p>
              </div>
            </div>

            <div className="p-6 sm:p-7">
              <p className="label-caps">Streak</p>
              <p className="mt-2 font-display text-5xl font-medium leading-none tabular-nums text-fg">
                {stats.currentStreak}
                <span className="ml-1.5 font-sans text-sm font-normal text-fg-muted">{stats.currentStreak === 1 ? "day" : "days"}</span>
              </p>
              <div aria-label="Days read this week" className="mt-4 flex gap-1.5">
                {stats.weeklyData.map((day, index) => (
                  <div className="flex flex-col items-center gap-1" key={day.day}>
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        day.minutes > 0 ? "bg-accent" : index > todayIndex ? "border border-dashed border-line" : "bg-line"
                      } ${index === todayIndex ? "ring-2 ring-accent/30 ring-offset-1 ring-offset-surface-raised" : ""}`}
                      title={`${day.day}: ${Math.round(day.minutes)} min`}
                    />
                    <span className="text-3xs text-fg-muted">{day.day.charAt(0)}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-fg-muted">Longest: {stats.longestStreak} {stats.longestStreak === 1 ? "day" : "days"}</p>
            </div>

            <div className="p-6 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <p className="label-caps">This week</p>
                <div className="flex items-center gap-1">
                  <StepButton label="Lower weekly goal" onClick={() => setWeeklyGoal(Math.max(20, weeklyGoal - 10))}>
                    <Minus className="h-3 w-3" />
                  </StepButton>
                  <StepButton label="Raise weekly goal" onClick={() => setWeeklyGoal(Math.min(500, weeklyGoal + 10))}>
                    <Plus className="h-3 w-3" />
                  </StepButton>
                </div>
              </div>
              <p className="mt-2 font-display text-5xl font-medium leading-none tabular-nums text-fg">
                {weeklyTotal}
                <span className="ml-1.5 font-sans text-sm font-normal text-fg-muted">of {weeklyGoal} min</span>
              </p>
              <div className="mt-4 h-1 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${weeklyPercent}%` }} />
              </div>
              <p className="mt-3 text-xs text-fg-muted">{weeklyPercent}% of the weekly goal</p>
            </div>
          </section>

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line/80 shadow-paper lg:grid-cols-4">
            <Figure label="Books finished" note={completionRate === null ? undefined : `${completionRate}% of your library`} value={stats.totalBooksRead} />
            <Figure label="Time read" note={`${sessions.length} ${sessions.length === 1 ? "session" : "sessions"}`} unit={totalTime.unit} value={totalTime.value} />
            <Figure label="Average session" unit="min" value={averageSession} />
            {hasPageCounts ? (
              <Figure label="Reading speed" unit="pages/hr" value={stats.averageReadingSpeed} />
            ) : (
              <Figure label="Finished this month" value={stats.booksCompletedThisMonth} />
            )}
          </dl>

          <section>
            <SectionTitle aside={`${weeklyTotal} min`}>This week</SectionTitle>
            <div className="mt-6">
              <BarChart
                data={stats.weeklyData.map((d) => ({ label: d.day, value: Math.round(d.minutes) }))}
                highlightIndex={todayIndex}
                maxValue={Math.max(...stats.weeklyData.map((d) => d.minutes), 1)}
                target={dailyGoal}
                unit="min"
              />
            </div>
          </section>

          <section className="paper-card p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <p className="label-caps">Reading goal · {challenge.year}</p>
                <p className="mt-2 font-display text-4xl font-medium leading-tight tracking-tight text-fg">
                  {challenge.completedBooks} of {challenge.goal} books
                </p>
                <p className="mt-1.5 text-sm text-fg-muted">
                  {paceText} · {challenge.daysRemaining} {challenge.daysRemaining === 1 ? "day" : "days"} left
                </p>
              </div>
              <div className="flex items-center gap-2">
                {[12, 24, 52].map((preset) => (
                  <button
                    aria-pressed={annualBookGoal === preset}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium tabular-nums transition-colors ${
                      annualBookGoal === preset
                        ? "border-accent bg-accent text-accent-fg"
                        : "border-line bg-surface-raised text-fg-muted hover:border-accent/50 hover:text-fg"
                    }`}
                    key={preset}
                    onClick={() => setAnnualBookGoal(preset)}
                    type="button"
                  >
                    {preset}
                  </button>
                ))}
                <span className="mx-1 h-5 w-px bg-line" />
                <StepButton label="Lower yearly goal" onClick={() => setAnnualBookGoal(Math.max(1, annualBookGoal - 1))}>
                  <Minus className="h-3 w-3" />
                </StepButton>
                <StepButton label="Raise yearly goal" onClick={() => setAnnualBookGoal(annualBookGoal + 1)}>
                  <Plus className="h-3 w-3" />
                </StepButton>
              </div>
            </div>
            <div
              aria-label={`${challenge.completedBooks} of ${challenge.goal} books finished`}
              className="mt-7 flex flex-wrap items-end gap-[3px] border-b-2 border-fg/70 pb-px"
              role="img"
            >
              {Array.from({ length: spineCount }, (_, index) => {
                const filled = index < filledSpines;
                const height = 30 + ((index * 7) % 4) * 4;
                return (
                  <span
                    className={`w-[9px] rounded-t-[1px] ${filled ? "bg-accent" : "border border-b-0 border-line bg-subtle"}`}
                    key={index}
                    style={{ height, opacity: filled ? 0.7 + ((index * 13) % 4) * 0.1 : 1 }}
                  />
                );
              })}
            </div>
            {challenge.goal > MAX_SPINES && <p className="mt-2 text-xs text-fg-muted">Each spine is about {Math.round(challenge.goal / MAX_SPINES * 10) / 10} books.</p>}
          </section>
        </div>
      )}

      {activeTab === "activity" && (
        <div className="space-y-12 animate-fadeIn">
          <Suspense fallback={<div className="flex justify-center p-8"><LoadingSpinner className="h-6 w-6" /></div>}>
            <ReadingActivityHeatmap dailyTargetMinutes={dailyGoal} sessions={sessions} />
          </Suspense>

          <section>
            <SectionTitle aside="last six months">Hours by month</SectionTitle>
            <div className="mt-6">
              <BarChart
                data={stats.monthlyData.map((d) => ({ label: d.month, value: d.hours }))}
                highlightIndex={stats.monthlyData.length - 1}
                maxValue={Math.max(...stats.monthlyData.map((d) => d.hours), 1)}
                unit="h"
              />
            </div>
          </section>

          <div className="grid gap-6 sm:grid-cols-2">
            <RankedList
              empty="No genres recorded. Genres come from book details."
              items={stats.genreDistribution.map((g) => ({ count: g.count, label: g.genre })).sort((a, b) => b.count - a.count).slice(0, 6)}
              title="Genres"
            />
            <RankedList
              empty="Authors appear here once books are in your library."
              items={stats.authorNetwork.map((a) => ({ count: a.books, label: a.author }))}
              title="Authors"
            />
          </div>
        </div>
      )}

      {activeTab === "vocabulary" && (
        <Suspense fallback={<div className="flex justify-center p-8"><LoadingSpinner className="h-6 w-6" /></div>}>
          <VocabularyReviewCard />
        </Suspense>
      )}
    </div>
  );
}

export default StatsView;
