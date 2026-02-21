import React, { useMemo } from "react";
import { useStatsStore } from "@/store/useStatsStore";
import { Book, Award, Clock, Flame, Calendar, Sparkles, Scroll, Feather } from "lucide-react";
import { motion } from "framer-motion";

const StatsView: React.FC = () => {
    const stats = useStatsStore((state) => state.stats);

    // Dynamic Mood Data from Stats
    const moodData = useMemo(() => {
        if (!stats.genreDistribution || stats.genreDistribution.length === 0) {
            return [
                { genre: "Adventure", count: 0, color: "bg-[rgb(var(--sage-green))]" },
                { genre: "Mystery", count: 0, color: "bg-[rgb(var(--woodstock-gold))]" },
                { genre: "Classics", count: 0, color: "bg-[rgb(var(--ink-navy))]" },
            ];
        }
        return stats.genreDistribution.slice(0, 3).map((g, i) => ({
            genre: g.genre,
            count: g.count,
            color: i === 0 ? "bg-[rgb(var(--sage-green))]" : i === 1 ? "bg-[rgb(var(--woodstock-gold))]" : "bg-[rgb(var(--ink-navy))]"
        }));
    }, [stats.genreDistribution]);

    // Contribution Grid based on actual weekly activity (simplified visualization)
    const renderContributionGrid = () => {
        // Map weekly minutes to "intensity"
        const intensity = stats.weeklyData.map(d => {
            if (d.minutes > 60) return "bg-[rgb(var(--sage-green))]";
            if (d.minutes > 30) return "bg-[rgb(var(--woodstock-gold))]";
            if (d.minutes > 0) return "bg-[rgb(var(--ink-navy))] opacity-50";
            return "bg-[rgb(var(--aged-paper))]";
        });

        // Fill the rest with empty
        const grid = [...intensity, ...Array(28 - intensity.length).fill("bg-[rgb(var(--aged-paper))]")];

        return (
            <div className="flex gap-1 flex-wrap w-full max-w-xs justify-center">
                {grid.map((color, i) => (
                    <div
                        key={i}
                        className={`w-3 h-3 rounded-sm ${color}`}
                        title={i < 7 ? `${stats.weeklyData[i]?.day}: ${stats.weeklyData[i]?.minutes} min` : ""}
                    />
                ))}
            </div>
        );
    };

    // Derived "Reading Memories" from actual stats
    const readingMemories = useMemo(() => {
        const memories = [];
        if (stats.booksCompletedThisMonth > 0) {
            memories.push({ id: 1, date: "This Month", action: "Completed", book: `${stats.booksCompletedThisMonth} books`, mood: "Accomplished" });
        }
        if (stats.currentStreak > 3) {
            memories.push({ id: 2, date: "Streak", action: "Reached", book: `${stats.currentStreak} Days`, mood: "Determined" });
        }
        if (stats.totalReadingTime > 600) { // 10 hours
             memories.push({ id: 3, date: "Milestone", action: "Read for", book: "10+ Hours", mood: "Dedicated" });
        }

        if (memories.length === 0) {
             memories.push({ id: 0, date: "Today", action: "Started", book: "Your Journey", mood: "Hopeful" });
        }
        return memories;
    }, [stats]);

    return (
        <div className="page-stack max-w-4xl mx-auto pb-20">
            {/* Journal Header */}
            <div className="text-center mb-10 space-y-2">
                <div className="inline-block p-3 rounded-full bg-[rgb(var(--aged-paper))] border-2 border-[rgb(var(--ink-navy))] shadow-pixel mb-4">
                    <Book className="w-8 h-8 text-[rgb(var(--ink-navy))]" />
                </div>
                <h1 className="text-4xl font-serif font-bold text-[rgb(var(--ink-navy))]">Reading Journal</h1>
                <p className="text-[rgb(var(--sepia-brown))] font-serif italic">"A room without books is like a body without a soul."</p>
            </div>

            {/* Letter from the Librarian */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-10 bg-[rgb(var(--paper-cream))] p-6 sm:p-8 rounded-xl border border-[rgb(var(--aged-paper))] shadow-sm relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-full h-2 bg-[rgb(var(--ink-navy))]/10" />
                <div className="flex gap-4">
                    <div className="shrink-0 pt-1">
                        <Feather className="w-6 h-6 text-[rgb(var(--sage-green))]" />
                    </div>
                    <div>
                        <h3 className="font-serif font-bold text-lg text-[rgb(var(--ink-navy))] mb-2">Weekly Correspondence</h3>
                        <p className="font-serif text-[rgb(var(--ink-navy))] leading-relaxed text-lg">
                            "Dearest Reader, <br/><br/>
                            {stats.totalPagesRead > 0
                                ? `It seems you've been quite busy! Turning ${stats.totalPagesRead} pages is a wonderful achievement. Your consistency is admirable.`
                                : "The library is quiet, waiting for you to open a new chapter. There is no time like the present to begin an adventure."
                            }
                            <br/>
                            Keep the kettle on."
                        </p>
                        <p className="font-serif text-[rgb(var(--sepia-brown))] mt-4 text-right italic">- The Librarian</p>
                    </div>
                </div>
            </motion.div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                {/* Current Streak (Ticket Style) */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative bg-[rgb(var(--woodstock-gold))] p-6 rounded-xl border-2 border-[rgb(var(--ink-navy))] shadow-pixel flex items-center justify-between overflow-hidden"
                >
                    <div className="relative z-10">
                        <h3 className="text-xs font-pixel uppercase tracking-widest text-[rgb(var(--ink-navy))] opacity-80 mb-1">Current Streak</h3>
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-pixel text-[rgb(var(--ink-navy))]">{stats.currentStreak}</span>
                            <span className="text-sm font-bold text-[rgb(var(--ink-navy))]">days</span>
                        </div>
                    </div>
                    <Flame className="w-16 h-16 text-[rgb(var(--ink-navy))] opacity-20 absolute -right-2 -bottom-2 rotate-12" />
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-6 bg-[rgb(var(--paper-cream))] rounded-r-full border-y-2 border-r-2 border-[rgb(var(--ink-navy))]" />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-6 bg-[rgb(var(--paper-cream))] rounded-l-full border-y-2 border-l-2 border-[rgb(var(--ink-navy))]" />
                </motion.div>

                {/* Level / XP (Pixel Progress) */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-[rgb(var(--aged-paper))] p-6 rounded-xl border-2 border-[rgb(var(--ink-navy))] shadow-pixel flex flex-col justify-center"
                >
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-pixel text-xs text-[rgb(var(--ink-navy))]">
                            LEVEL {Math.floor(stats.totalPagesRead / 100) + 1} BOOKWORM
                        </span>
                        <span className="font-pixel text-xs text-[rgb(var(--ink-navy))]">
                            XP: {stats.totalPagesRead % 100}/100
                        </span>
                    </div>
                    <div className="h-4 w-full bg-white border-2 border-[rgb(var(--ink-navy))] rounded-full p-0.5">
                        <div
                            className="h-full bg-[rgb(var(--clay-red))] rounded-full border border-[rgb(var(--ink-navy))]"
                            style={{ width: `${Math.min(100, stats.totalPagesRead % 100)}%` }}
                        />
                    </div>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Reading Memories (Timeline) */}
                <div className="bg-white p-6 rounded-xl border-2 border-[rgb(var(--ink-navy))] shadow-pixel flex flex-col">
                    <div className="flex items-center gap-2 mb-6">
                        <Scroll className="w-5 h-5 text-[rgb(var(--ink-navy))]" />
                        <h3 className="font-serif font-bold text-lg text-[rgb(var(--ink-navy))]">Recent Memories</h3>
                    </div>
                    <div className="space-y-6 relative pl-2">
                        {/* Timeline Line */}
                        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-[rgb(var(--aged-paper))]" />

                        {readingMemories.map((memory) => (
                            <div key={memory.id} className="relative pl-6">
                                <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-[rgb(var(--paper-cream))] border-2 border-[rgb(var(--ink-navy))] flex items-center justify-center z-10">
                                    <div className="w-2 h-2 rounded-full bg-[rgb(var(--ink-navy))]" />
                                </div>
                                <span className="text-xs font-pixel text-[rgb(var(--sepia-brown))] bg-[rgb(var(--aged-paper))] px-1 rounded">{memory.date}</span>
                                <p className="text-sm font-bold text-[rgb(var(--ink-navy))] mt-1">
                                    {memory.action} <span className="italic">{memory.book}</span>
                                </p>
                                <span className="text-xs text-[rgb(var(--sage-green))] uppercase tracking-wide font-bold">Mood: {memory.mood}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Calendar & Mood */}
                <div className="md:col-span-2 space-y-6">
                     {/* Calendar */}
                    <div className="bg-white p-6 rounded-xl border-2 border-[rgb(var(--ink-navy))] shadow-pixel">
                        <div className="flex items-center gap-2 mb-6">
                            <Calendar className="w-5 h-5 text-[rgb(var(--sage-green))]" />
                            <h3 className="font-serif font-bold text-lg text-[rgb(var(--ink-navy))]">Consistency Calendar</h3>
                        </div>
                        <div className="flex justify-center py-4">
                             {renderContributionGrid()}
                        </div>
                        <p className="text-center text-xs text-[rgb(var(--sepia-brown))] mt-4 font-pixel">KEEP THE FIRE BURNING!</p>
                    </div>

                    {/* Mood Palette */}
                    <div className="bg-white p-6 rounded-xl border-2 border-[rgb(var(--ink-navy))] shadow-pixel">
                        <div className="flex items-center gap-2 mb-6">
                            <Sparkles className="w-5 h-5 text-[rgb(var(--woodstock-gold))]" />
                            <h3 className="font-serif font-bold text-lg text-[rgb(var(--ink-navy))]">Reading Mood</h3>
                        </div>
                        <div className="space-y-4">
                            {moodData.length > 0 ? moodData.map((mood) => (
                                <div key={mood.genre}>
                                    <div className="flex justify-between text-xs font-bold text-[rgb(var(--sepia-brown))] mb-1">
                                        <span>{mood.genre}</span>
                                        <span>{mood.count}</span>
                                    </div>
                                    <div className="h-2 w-full bg-[rgb(var(--aged-paper))] rounded-full overflow-hidden">
                                        <div className={`h-full ${mood.color}`} style={{ width: `${(mood.count / Math.max(1, stats.totalBooksRead)) * 100}%` }} />
                                    </div>
                                </div>
                            )) : (
                                <p className="text-sm text-[rgb(var(--sepia-brown))] italic">Read books with genre tags to see your mood palette.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

             {/* Badges Section - using real badges */}
             <div className="mt-10">
                <h3 className="font-pixel text-lg text-[rgb(var(--ink-navy))] mb-6 text-center">--- UNLOCKED BADGES ---</h3>
                <div className="flex flex-wrap justify-center gap-4">
                    {stats.badges.filter(b => b.unlocked).length > 0 ? stats.badges.filter(b => b.unlocked).map((badge) => (
                        <div key={badge.id} className="group relative w-24 h-24 bg-[rgb(var(--paper-cream))] rounded-xl border-2 border-[rgb(var(--ink-navy))] flex items-center justify-center hover:scale-110 transition-transform cursor-help">
                            <Award className="w-10 h-10 text-[rgb(var(--woodstock-gold))]" />
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[rgb(var(--ink-navy))] text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap font-pixel pointer-events-none transition-opacity z-20">
                                {badge.name}
                            </div>
                        </div>
                    )) : (
                        <div className="w-24 h-24 bg-[rgb(var(--aged-paper))] rounded-xl border-2 border-dashed border-[rgb(var(--ink-navy))] flex items-center justify-center opacity-50">
                            <span className="text-2xl">?</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StatsView;
