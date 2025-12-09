import React, { useState, useMemo } from "react";
import { ReadingStats, Badge } from "../types";
import {
  Flame, Trophy, BookOpen, Clock, Target, TrendingUp,
  Calendar, BarChart3, PieChart, Users, Sparkles, ChevronRight
} from "lucide-react";

interface StatsViewProps {
  stats: ReadingStats;
  dailyGoal: number;
  weeklyGoal: number;
  onUpdateGoal: (daily: number, weekly: number) => void;
}

const StatsView: React.FC<StatsViewProps> = ({ stats, dailyGoal, weeklyGoal, onUpdateGoal }) => {
  const [activeTab, setActiveTab] = useState<"overview" | "charts" | "badges" | "insights">("overview");

  const weeklyTotal = useMemo(() => stats.weeklyData.reduce((a, d) => a + d.minutes, 0), [stats.weeklyData]);
  const dailyAvg = useMemo(() => Math.round(weeklyTotal / 7), [weeklyTotal]);

  const StatCard = ({ icon: Icon, label, value, subtext, accent = false }: { icon: React.ElementType; label: string; value: string | number; subtext?: string; accent?: boolean }) => (
    <div className={`card p-4 ${accent ? "bg-gradient-to-br from-light-accent/10 to-amber-500/10 dark:from-dark-accent/15 dark:to-amber-400/15" : ""}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-xl ${accent ? "bg-light-accent/20 dark:bg-dark-accent/20" : "bg-light-card dark:bg-dark-card"}`}>
          <Icon className={`w-5 h-5 ${accent ? "text-light-accent dark:text-dark-accent" : "text-light-text-muted dark:text-dark-text-muted"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-light-text-muted dark:text-dark-text-muted uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-light-text dark:text-dark-text tabular-nums">{value}</p>
          {subtext && <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-0.5">{subtext}</p>}
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
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-light-card dark:text-dark-card" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="url(#gradient)" strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#c7a77b" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
      </svg>
    );
  };

  const HeatmapCell = ({ level }: { level: number }) => {
    const colors = ["bg-light-card dark:bg-dark-card", "bg-light-accent/30 dark:bg-dark-accent/30", "bg-light-accent/60 dark:bg-dark-accent/60", "bg-light-accent dark:bg-dark-accent"];
    return <div className={`w-3 h-3 rounded-sm ${colors[level]} transition-colors`} />;
  };

  const BadgeCard = ({ badge }: { badge: Badge }) => (
    <div className={`card p-4 text-center transition-all ${badge.unlocked ? "opacity-100" : "opacity-50 grayscale"}`}>
      <div className="text-3xl mb-2">{badge.icon}</div>
      <p className="font-semibold text-sm text-light-text dark:text-dark-text">{badge.name}</p>
      <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-1">{badge.description}</p>
      {badge.target && !badge.unlocked && (
        <div className="mt-2">
          <div className="h-1 bg-light-card dark:bg-dark-card rounded-full overflow-hidden">
            <div className="h-full bg-light-accent dark:bg-dark-accent rounded-full transition-all" style={{ width: `${Math.min(100, ((badge.progress || 0) / badge.target) * 100)}%` }} />
          </div>
          <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-1">{badge.progress}/{badge.target}</p>
        </div>
      )}
      {badge.unlocked && <span className="inline-block mt-2 text-xs text-light-accent dark:text-dark-accent font-medium">✓ Unlocked</span>}
    </div>
  );

  const BarChart = ({ data, maxValue }: { data: { label: string; value: number }[]; maxValue: number }) => (
    <div className="flex items-end gap-2 h-32">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full bg-light-card dark:bg-dark-card rounded-t-md overflow-hidden flex-1 flex items-end">
            <div className="w-full bg-gradient-to-t from-light-accent to-amber-500 dark:from-dark-accent dark:to-amber-400 rounded-t-md transition-all duration-500" style={{ height: `${maxValue > 0 ? (d.value / maxValue) * 100 : 0}%` }} />
          </div>
          <span className="text-xs text-light-text-muted dark:text-dark-text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "charts", label: "Charts", icon: PieChart },
    { id: "badges", label: "Badges", icon: Trophy },
    { id: "insights", label: "Insights", icon: Sparkles },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeInUp pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold text-light-text dark:text-dark-text">Reading Stats</h2>
          <p className="text-light-text-muted dark:text-dark-text-muted mt-1">Track your reading journey</p>
        </div>
        <div className="flex items-center gap-2">
          <Flame className="w-6 h-6 text-orange-500" />
          <span className="text-2xl font-bold text-light-text dark:text-dark-text">{stats.currentStreak}</span>
          <span className="text-sm text-light-text-muted dark:text-dark-text-muted">day streak</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-light-card/50 dark:bg-dark-card/50 rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-white dark:bg-dark-surface text-light-text dark:text-dark-text shadow-sm"
                : "text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Daily Goal Progress */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-light-text dark:text-dark-text">Today's Progress</h3>
              <button className="text-xs text-light-accent dark:text-dark-accent hover:underline">Edit Goal</button>
            </div>
            <div className="flex items-center gap-6">
              <div className="relative">
                <ProgressRing progress={(stats.dailyProgress / dailyGoal) * 100} size={100} stroke={8} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-light-text dark:text-dark-text">{Math.round((stats.dailyProgress / dailyGoal) * 100)}%</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-3xl font-bold text-light-text dark:text-dark-text">{stats.dailyProgress} <span className="text-lg font-normal text-light-text-muted dark:text-dark-text-muted">/ {dailyGoal} pages</span></p>
                <p className="text-sm text-light-text-muted dark:text-dark-text-muted mt-1">
                  {stats.dailyProgress >= dailyGoal ? "🎉 Goal achieved!" : `${dailyGoal - stats.dailyProgress} pages to go`}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Flame} label="Current Streak" value={`${stats.currentStreak} days`} subtext={`Best: ${stats.longestStreak} days`} accent />
            <StatCard icon={BookOpen} label="Books Read" value={stats.totalBooksRead} subtext={`${stats.booksCompletedThisMonth} this month`} />
            <StatCard icon={Clock} label="Total Time" value={`${Math.round(stats.totalReadingTime / 60)}h`} subtext={`${dailyAvg} min/day avg`} />
            <StatCard icon={TrendingUp} label="Reading Speed" value={`${stats.averageReadingSpeed}`} subtext="pages/hour" />
          </div>

          {/* Weekly Activity */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-light-text dark:text-dark-text">This Week</h3>
              <span className="text-sm text-light-text-muted dark:text-dark-text-muted">{weeklyTotal} min total</span>
            </div>
            <BarChart
              data={stats.weeklyData.map((d) => ({ label: d.day, value: d.minutes }))}
              maxValue={Math.max(...stats.weeklyData.map((d) => d.minutes), 1)}
            />
          </div>

          {/* Reading Personality */}
          <div className="card p-6 bg-gradient-to-br from-light-accent/5 to-amber-500/5 dark:from-dark-accent/10 dark:to-amber-400/10">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-light-accent/20 dark:bg-dark-accent/20">
                <Sparkles className="w-8 h-8 text-light-accent dark:text-dark-accent" />
              </div>
              <div>
                <p className="text-xs text-light-text-muted dark:text-dark-text-muted uppercase tracking-wide">Your Reading Style</p>
                <h3 className="text-2xl font-bold text-light-text dark:text-dark-text mt-1">{stats.readingPersonality}</h3>
                <p className="text-sm text-light-text-muted dark:text-dark-text-muted mt-2">{stats.personalityDescription}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Tab */}
      {activeTab === "charts" && (
        <div className="space-y-6">
          {/* Heatmap */}
          <div className="card p-6">
            <h3 className="font-semibold text-light-text dark:text-dark-text mb-4">Reading Activity (14 weeks)</h3>
            <div className="flex gap-1 overflow-x-auto pb-2">
              {stats.heatmapData.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((level, di) => (
                    <HeatmapCell key={di} level={level} />
                  ))}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-4 text-xs text-light-text-muted dark:text-dark-text-muted">
              <span>Less</span>
              {[0, 1, 2, 3].map((l) => <HeatmapCell key={l} level={l} />)}
              <span>More</span>
            </div>
          </div>

          {/* Monthly Trend */}
          <div className="card p-6">
            <h3 className="font-semibold text-light-text dark:text-dark-text mb-4">Monthly Reading Hours</h3>
            <BarChart
              data={stats.monthlyData.map((d) => ({ label: d.month, value: d.hours }))}
              maxValue={Math.max(...stats.monthlyData.map((d) => d.hours), 1)}
            />
          </div>

          {/* Genre Distribution */}
          <div className="card p-6">
            <h3 className="font-semibold text-light-text dark:text-dark-text mb-4">Genre Distribution</h3>
            {stats.genreDistribution.length > 0 ? (
              <div className="space-y-3">
                {stats.genreDistribution.map((g, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                    <span className="flex-1 text-sm text-light-text dark:text-dark-text">{g.genre}</span>
                    <span className="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">{g.count} books</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-light-text-muted dark:text-dark-text-muted">Add genres to your books to see distribution</p>
            )}
          </div>

          {/* Author Network */}
          <div className="card p-6">
            <h3 className="font-semibold text-light-text dark:text-dark-text mb-4">Top Authors</h3>
            {stats.authorNetwork.length > 0 ? (
              <div className="space-y-3">
                {stats.authorNetwork.map((a, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-light-accent/20 dark:bg-dark-accent/20 flex items-center justify-center">
                      <Users className="w-4 h-4 text-light-accent dark:text-dark-accent" />
                    </div>
                    <span className="flex-1 text-sm text-light-text dark:text-dark-text">{a.author}</span>
                    <span className="text-sm font-medium text-light-text-muted dark:text-dark-text-muted">{a.books} books</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-light-text-muted dark:text-dark-text-muted">Start reading to see your favorite authors</p>
            )}
          </div>
        </div>
      )}

      {/* Badges Tab */}
      {activeTab === "badges" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-light-text-muted dark:text-dark-text-muted">
              {stats.badges.filter((b) => b.unlocked).length} of {stats.badges.length} badges unlocked
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {stats.badges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </div>
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === "insights" && (
        <div className="space-y-6">
          {/* Key Insights */}
          <div className="card p-6">
            <h3 className="font-semibold text-light-text dark:text-dark-text mb-4">Key Insights</h3>
            <div className="space-y-4">
              <InsightRow
                icon="📚"
                title="Book Completion Rate"
                value={stats.totalBooksRead > 0 ? `${Math.round((stats.totalBooksRead / Math.max(stats.totalBooksRead + 2, 1)) * 100)}%` : "N/A"}
                description="Percentage of started books you've finished"
              />
              <InsightRow
                icon="⏱️"
                title="Average Session"
                value={`${stats.totalReadingTime > 0 ? Math.round(stats.totalReadingTime / Math.max(stats.weeklyData.filter(d => d.minutes > 0).length * 4, 1)) : 0} min`}
                description="Your typical reading session length"
              />
              <InsightRow
                icon="📖"
                title="Pages Per Session"
                value={`${stats.averageReadingSpeed > 0 ? Math.round(stats.averageReadingSpeed / 2) : 0}`}
                description="Average pages read per sitting"
              />
              <InsightRow
                icon="🎯"
                title="Goal Achievement"
                value={`${Math.round((stats.dailyProgress / dailyGoal) * 100)}%`}
                description="Today's progress toward your daily goal"
              />
            </div>
          </div>

          {/* Milestones */}
          <div className="card p-6">
            <h3 className="font-semibold text-light-text dark:text-dark-text mb-4">Upcoming Milestones</h3>
            <div className="space-y-3">
              {stats.totalBooksRead < 5 && (
                <MilestoneRow icon="📚" title="Read 5 Books" progress={stats.totalBooksRead} target={5} />
              )}
              {stats.currentStreak < 7 && (
                <MilestoneRow icon="🔥" title="7 Day Streak" progress={stats.currentStreak} target={7} />
              )}
              {stats.totalPagesRead < 100 && (
                <MilestoneRow icon="📄" title="Read 100 Pages" progress={stats.totalPagesRead} target={100} />
              )}
              {stats.totalReadingTime < 600 && (
                <MilestoneRow icon="⏱️" title="10 Hours Reading" progress={stats.totalReadingTime} target={600} />
              )}
            </div>
          </div>

          {/* Tips */}
          <div className="card p-6 bg-gradient-to-br from-blue-500/5 to-purple-500/5 dark:from-blue-500/10 dark:to-purple-500/10">
            <h3 className="font-semibold text-light-text dark:text-dark-text mb-3">💡 Reading Tips</h3>
            <ul className="space-y-2 text-sm text-light-text-muted dark:text-dark-text-muted">
              <li>• Set a consistent reading time each day to build habits</li>
              <li>• Start with shorter sessions and gradually increase</li>
              <li>• Use the immersive mode for distraction-free reading</li>
              <li>• Track your progress to stay motivated</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

const InsightRow = ({ icon, title, value, description }: { icon: string; title: string; value: string; description: string }) => (
  <div className="flex items-center gap-4">
    <span className="text-2xl">{icon}</span>
    <div className="flex-1">
      <p className="text-sm font-medium text-light-text dark:text-dark-text">{title}</p>
      <p className="text-xs text-light-text-muted dark:text-dark-text-muted">{description}</p>
    </div>
    <span className="text-lg font-bold text-light-accent dark:text-dark-accent">{value}</span>
  </div>
);

const MilestoneRow = ({ icon, title, progress, target }: { icon: string; title: string; progress: number; target: number }) => (
  <div className="flex items-center gap-3">
    <span className="text-xl">{icon}</span>
    <div className="flex-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-light-text dark:text-dark-text">{title}</span>
        <span className="text-xs text-light-text-muted dark:text-dark-text-muted">{progress}/{target}</span>
      </div>
      <div className="h-1.5 bg-light-card dark:bg-dark-card rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-light-accent to-amber-500 dark:from-dark-accent dark:to-amber-400 rounded-full transition-all" style={{ width: `${Math.min(100, (progress / target) * 100)}%` }} />
      </div>
    </div>
  </div>
);

export default StatsView;
