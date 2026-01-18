import React, { useState, useMemo } from "react";
import { ReadingStats, Badge } from "@/types";
import { Flame, Trophy, BookOpen, Clock, Target, TrendingUp, BarChart3, PieChart, Zap, Calendar, Award, Star, Users, ArrowLeft } from "lucide-react";

interface StatsViewProps {
  stats: ReadingStats;
  dailyGoal: number;
  onUpdateGoal?: (daily: number, weekly: number) => void;
  onBack?: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  flame: Flame,
  trophy: Trophy,
  book: BookOpen,
  star: Star,
  award: Award,
  zap: Zap,
  target: Target,
};

const StatsView: React.FC<StatsViewProps> = ({ stats, dailyGoal, onBack }) => {
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
      className={`p-4 rounded-xl border transition-colors ${accent
        ? "bg-light-accent/10 dark:bg-dark-accent/15 border-light-accent/20 dark:border-dark-accent/20"
        : "bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.04] dark:border-white/[0.04]"
        }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`p-2 rounded-lg ${accent ? "bg-light-accent/12 dark:bg-dark-accent/12" : "bg-black/[0.04] dark:bg-white/[0.04]"
            }`}
        >
          <Icon
            className={`w-4 h-4 ${accent ? "text-light-accent dark:text-dark-accent" : "text-light-text-muted dark:text-dark-text-muted"
              }`}
            strokeWidth={1.75}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-light-text-muted dark:text-dark-text-muted uppercase tracking-wide font-medium">
            {label}
          </p>
          <p className="text-xl font-bold text-light-text dark:text-dark-text tabular-nums mt-0.5">{value}</p>
          {subtext && (
            <p className="text-[11px] text-light-text-muted/60 dark:text-dark-text-muted/60 mt-0.5">{subtext}</p>
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
          className="text-black/[0.04] dark:text-white/[0.04]"
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
            <stop offset="0%" stopColor="#b8956c" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
      </svg>
    );
  };

  const HeatmapCell = ({ level }: { level: number }) => {
    const colors = [
      "bg-black/[0.03] dark:bg-white/[0.03]",
      "bg-light-accent/20 dark:bg-dark-accent/20",
      "bg-light-accent/45 dark:bg-dark-accent/45",
      "bg-light-accent dark:bg-dark-accent",
    ];
    return <div className={`w-2.5 h-2.5 rounded-sm ${colors[level]} transition-colors`} />;
  };

  const BadgeCard = ({ badge }: { badge: Badge }) => {
    const IconComponent = ICON_MAP[badge.icon.toLowerCase()] || Award;
    return (
      <div
        className={`p-4 rounded-xl border text-center transition-all ${badge.unlocked
          ? "bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.04] dark:border-white/[0.04]"
          : "opacity-35 bg-black/[0.01] dark:bg-white/[0.01] border-black/[0.03] dark:border-white/[0.03]"
          }`}
      >
        <div
          className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-2.5 ${badge.unlocked
            ? "bg-light-accent/15 dark:bg-dark-accent/20"
            : "bg-black/[0.04] dark:bg-white/[0.04]"
            }`}
        >
          <IconComponent
            className={`w-5 h-5 ${badge.unlocked ? "text-light-accent dark:text-dark-accent" : "text-light-text-muted/40 dark:text-dark-text-muted/40"
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

  const BarChart = ({ data, maxValue }: { data: { label: string; value: number }[]; maxValue: number }) => (
    <div className="flex items-end gap-1.5 h-28">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full bg-black/[0.03] dark:bg-white/[0.03] rounded-t flex-1 flex items-end min-h-0">
            <div
              className="w-full bg-light-accent dark:bg-dark-accent rounded-t transition-all duration-500"
              style={{ height: `${maxValue > 0 ? (d.value / maxValue) * 100 : 0}%` }}
            />
          </div>
          <span className="text-[9px] text-light-text-muted dark:text-dark-text-muted font-medium">{d.label}</span>
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
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-5 h-5 text-light-text dark:text-dark-text" />
            </button>
          )}
          <div>
            <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">Stats</h2>
            <p className="text-light-text-muted dark:text-dark-text-muted mt-1 text-sm">Track your reading</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-orange-500/10 dark:bg-orange-500/15 border border-orange-500/15 dark:border-orange-500/10">
          <Flame className="w-4 h-4 text-orange-500" strokeWidth={2} />
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-light-text dark:text-dark-text tabular-nums">{stats.currentStreak}</span>
            <span className="text-xs text-light-text-muted dark:text-dark-text-muted">day streak</span>
          </div>
        </div>
      </div>

      <div className="flex gap-0.5 p-0.5 bg-black/[0.03] dark:bg-white/[0.03] rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-md text-sm font-medium transition-all duration-150 ${activeTab === tab.id
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
                <ProgressRing progress={(stats.dailyProgress / dailyGoal) * 100} size={80} stroke={6} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-light-text dark:text-dark-text tabular-nums">
                    {Math.round((stats.dailyProgress / dailyGoal) * 100)}%
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
          </div>

          <div className="p-5 rounded-xl bg-light-surface dark:bg-dark-surface border border-light-accent/10 dark:border-dark-accent/10">
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
                <div key={wi} className="flex flex-col gap-0.5">
                  {week.map((level, di) => (
                    <HeatmapCell key={di} level={level} />
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
                {stats.genreDistribution.map((g, i) => (
                  <div key={i} className="flex items-center gap-2.5">
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
                {stats.authorNetwork.map((a, i) => (
                  <div key={i} className="flex items-center gap-2.5">
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
              {[
                {
                  icon: BookOpen,
                  title: "Completion Rate",
                  value: stats.totalBooksRead > 0 ? `${Math.round((stats.totalBooksRead / Math.max(stats.totalBooksRead + 2, 1)) * 100)}%` : "N/A",
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
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-black/[0.04] dark:bg-white/[0.04] flex-shrink-0">
                    <item.icon className="w-4 h-4 text-light-text-muted dark:text-dark-text-muted" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-light-text dark:text-dark-text">{item.title}</p>
                    <p className="text-[11px] text-light-text-muted dark:text-dark-text-muted">{item.desc}</p>
                  </div>
                  <span className="text-base font-bold text-light-text dark:text-dark-text tabular-nums">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04]">
            <h3 className="text-sm font-semibold text-light-text dark:text-dark-text mb-4">Milestones</h3>
            <div className="space-y-3">
              {[
                { icon: BookOpen, title: "5 Books", progress: stats.totalBooksRead, target: 5, show: stats.totalBooksRead < 5 },
                { icon: Flame, title: "7 Day Streak", progress: stats.currentStreak, target: 7, show: stats.currentStreak < 7 },
                { icon: Calendar, title: "100 Pages", progress: stats.totalPagesRead, target: 100, show: stats.totalPagesRead < 100 },
                { icon: Clock, title: "10 Hours", progress: stats.totalReadingTime, target: 600, show: stats.totalReadingTime < 600 },
              ]
                .filter((m) => m.show)
                .map((m, i) => (
                  <div key={i} className="flex items-center gap-3">
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
                          className="h-full bg-light-accent dark:bg-dark-accent rounded-full transition-all"
                          style={{ width: `${Math.min(100, (m.progress / m.target) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Tips section removed */}
        </div>
      )}
    </div>
  );
};

export default StatsView;
