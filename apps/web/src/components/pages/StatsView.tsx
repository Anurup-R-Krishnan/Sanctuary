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
            <div className="text-center mb-10 space-y-2 relative">
                <motion.div
                    initial={{ rotate: -5 }}
                    animate={{ rotate: 5 }}
                    transition={{ duration: 4, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
                    className="inline-block p-4 rounded-full bg-[rgb(var(--aged-paper))] border-2 border-[rgb(var(--ink-navy))] shadow-deep mb-4"
                >
                    <Book className="w-8 h-8 text-[rgb(var(--ink-navy))]" />
                </motion.div>
                <h1 className="text-5xl font-serif font-bold text-[rgb(var(--ink-navy))] tracking-tight">Reading Journal</h1>
                <p className="text-[rgb(var(--sepia-brown))] font-hand text-xl italic opacity-80 rotate-1">"A room without books is like a body without a soul."</p>

                {/* Coffee Stain Decoration */}
                <div className="absolute top-0 right-10 w-32 h-32 bg-[rgb(var(--woodstock-gold))] opacity-10 rounded-full blur-2xl pointer-events-none mix-blend-multiply" />
            </div>

            {/* Letter from the Librarian */}
            <motion.div
                initial={{ opacity: 0, y: 10, rotate: -1 }}
                animate={{ opacity: 1, y: 0, rotate: -1 }}
                whileHover={{ rotate: 0, scale: 1.01 }}
                className="mb-10 bg-[rgb(var(--paper-cream))] p-6 sm:p-10 rounded-xl border border-[rgb(var(--aged-paper))] shadow-deep relative overflow-visible transform transition-transform"
            >
                {/* Tape */}
                <div className="tape-strip -top-4 left-1/2 -translate-x-1/2 w-40 opacity-80" />

                <div className="flex gap-6 items-start">
                    <div className="shrink-0 pt-2 p-2 bg-[rgb(var(--ink-navy))] rounded-full shadow-md">
                        <Feather className="w-6 h-6 text-[rgb(var(--paper-cream))]" />
                    </div>
                    <div>
                        <h3 className="font-serif font-bold text-2xl text-[rgb(var(--ink-navy))] mb-3 border-b-2 border-[rgb(var(--ink-navy))]/10 pb-2">
                            Weekly Correspondence
                        </h3>
                        <p className="font-serif text-[rgb(var(--ink-navy))] leading-relaxed text-lg italic">
                            "Dearest Reader, <br/><br/>
                            {stats.totalPagesRead > 0
                                ? `It seems you've been quite busy! Turning ${stats.totalPagesRead} pages is a wonderful achievement. Your consistency is admirable.`
                                : "The library is quiet, waiting for you to open a new chapter. There is no time like the present to begin an adventure."
                            }
                            <br/><br/>
                            Keep the kettle on."
                        </p>
                        <p className="font-hand font-bold text-[rgb(var(--sepia-brown))] mt-6 text-right text-xl -rotate-2">- The Librarian</p>
                    </div>
                </div>
            </motion.div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                {/* Current Streak (Ticket Style) */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileHover={{ y: -5 }}
                    className="relative bg-[rgb(var(--woodstock-gold))] p-6 rounded-xl border-2 border-[rgb(var(--ink-navy))] shadow-pixel flex items-center justify-between overflow-hidden group"
                >
                    <div className="relative z-10">
                        <h3 className="text-xs font-pixel uppercase tracking-widest text-[rgb(var(--ink-navy))] opacity-80 mb-1">Current Streak</h3>
                        <div className="flex items-baseline gap-2">
                            <span className="text-6xl font-pixel text-[rgb(var(--ink-navy))] drop-shadow-sm">{stats.currentStreak}</span>
                            <span className="text-lg font-bold text-[rgb(var(--ink-navy))]">days</span>
                        </div>
                    </div>
                    <Flame className="w-24 h-24 text-[rgb(var(--ink-navy))] opacity-10 absolute -right-4 -bottom-4 rotate-12 group-hover:scale-110 transition-transform duration-500" />

                    {/* Ticket Cutouts */}
                    <div className="absolute left-0 top-1/2 -translate-x-1/2 w-4 h-8 bg-[rgb(var(--paper-cream))] rounded-r-full border-y-2 border-r-2 border-[rgb(var(--ink-navy))]" />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-[rgb(var(--paper-cream))] rounded-l-full border-y-2 border-l-2 border-[rgb(var(--ink-navy))]" />
                </motion.div>

                {/* Level / XP (Pixel Progress) */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-[rgb(var(--aged-paper))] p-6 rounded-xl border-2 border-[rgb(var(--ink-navy))] shadow-pixel flex flex-col justify-center relative overflow-hidden"
                >
                    {/* Background Grid Pattern */}
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, rgb(var(--ink-navy)) 1px, transparent 1px)", backgroundSize: "10px 10px" }} />

                    <div className="flex justify-between items-center mb-4 relative z-10">
                        <span className="font-pixel text-sm text-[rgb(var(--ink-navy))] bg-white px-2 py-1 border border-[rgb(var(--ink-navy))] shadow-pixel-sm">
                            LEVEL {Math.floor(stats.totalPagesRead / 100) + 1} BOOKWORM
                        </span>
                        <div className="flex items-center gap-1 font-pixel text-xs text-[rgb(var(--ink-navy))]">
                            <Award className="w-3 h-3" />
                            <span>{stats.totalPagesRead % 100}/100 XP</span>
                        </div>
                    </div>
                    <div className="h-6 w-full bg-white border-2 border-[rgb(var(--ink-navy))] rounded-full p-1 relative z-10">
                        <div
                            className="h-full bg-[rgb(var(--clay-red))] rounded-full border border-[rgb(var(--ink-navy))] shadow-inner"
                            style={{ width: `${Math.min(100, stats.totalPagesRead % 100)}%` }}
                        />
                    </div>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Reading Memories (Timeline) */}
                <div className="bg-white p-6 rounded-xl border-2 border-[rgb(var(--ink-navy))] shadow-pixel flex flex-col relative rotate-1">
                    {/* Tape holding it */}
                    <div className="tape-strip -top-3 left-10 w-24 opacity-60 rotate-2" />

                    <div className="flex items-center gap-2 mb-6 border-b-2 border-[rgb(var(--ink-navy))]/10 pb-4 border-dashed">
                        <Scroll className="w-5 h-5 text-[rgb(var(--ink-navy))]" />
                        <h3 className="font-serif font-bold text-xl text-[rgb(var(--ink-navy))]">Recent Memories</h3>
                    </div>
                    <div className="space-y-8 relative pl-2">
                        {/* Timeline Line (Hand drawn style) */}
                        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-[rgb(var(--ink-navy))] opacity-20" />

                        {readingMemories.map((memory) => (
                            <div key={memory.id} className="relative pl-8 group">
                                <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-[rgb(var(--paper-cream))] border-2 border-[rgb(var(--ink-navy))] flex items-center justify-center z-10 group-hover:scale-110 transition-transform">
                                    <div className="w-2 h-2 rounded-full bg-[rgb(var(--ink-navy))]" />
                                </div>
                                <span className="text-xs font-pixel text-[rgb(var(--sepia-brown))] bg-[rgb(var(--aged-paper))] px-2 py-0.5 rounded border border-[rgb(var(--ink-navy))]/20">{memory.date}</span>
                                <p className="text-base font-serif font-bold text-[rgb(var(--ink-navy))] mt-1 leading-tight">
                                    {memory.action} <span className="italic text-[rgb(var(--clay-red))] decoration-wavy underline decoration-[rgb(var(--woodstock-gold))]">{memory.book}</span>
                                </p>
                                <span className="text-[10px] font-pixel text-[rgb(var(--sage-green))] uppercase tracking-widest mt-1 block">Mood: {memory.mood}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Calendar & Mood */}
                <div className="md:col-span-2 space-y-8">
                     {/* Calendar */}
                    <div className="bg-white p-8 rounded-xl border-2 border-[rgb(var(--ink-navy))] shadow-pixel relative overflow-hidden -rotate-1">
                        <div className="absolute right-0 top-0 p-4 opacity-5">
                            <Calendar className="w-32 h-32" />
                        </div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-[rgb(var(--sage-green))] border-2 border-[rgb(var(--ink-navy))] rounded-lg shadow-pixel-sm">
                                <Calendar className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="font-serif font-bold text-xl text-[rgb(var(--ink-navy))]">Consistency Calendar</h3>
                        </div>
                        <div className="flex justify-center py-6 bg-[rgb(var(--paper-cream))] rounded-lg border border-[rgb(var(--aged-paper))] border-dashed">
                             {renderContributionGrid()}
                        </div>
                        <p className="text-center text-sm text-[rgb(var(--sepia-brown))] mt-4 font-hand font-bold tracking-wide">"KEEP THE FIRE BURNING!"</p>
                    </div>

                    {/* Mood Palette */}
                    <div className="bg-white p-8 rounded-xl border-2 border-[rgb(var(--ink-navy))] shadow-pixel relative rotate-1">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-[rgb(var(--woodstock-gold))] border-2 border-[rgb(var(--ink-navy))] rounded-lg shadow-pixel-sm">
                                <Sparkles className="w-5 h-5 text-[rgb(var(--ink-navy))]" />
                            </div>
                            <h3 className="font-serif font-bold text-xl text-[rgb(var(--ink-navy))]">Reading Mood</h3>
                        </div>
                        <div className="space-y-5">
                            {moodData.map((mood) => (
                                <div key={mood.genre}>
                                    <div className="flex justify-between text-xs font-bold text-[rgb(var(--sepia-brown))] mb-1 font-pixel uppercase tracking-widest">
                                        <span>{mood.genre}</span>
                                        <span>{mood.count}</span>
                                    </div>
                                    <div className="h-3 w-full bg-[rgb(var(--aged-paper))] rounded-full overflow-hidden border border-[rgb(var(--ink-navy))]/20">
                                        <div className={`h-full ${mood.color}`} style={{ width: `${(mood.count / Math.max(1, stats.totalBooksRead)) * 100}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

             {/* Badges Section */}
             <div className="mt-16 relative">
                <div className="absolute top-1/2 left-0 right-0 h-px bg-[rgb(var(--ink-navy))] opacity-20" />
                <h3 className="font-pixel text-xl text-[rgb(var(--ink-navy))] mb-8 text-center bg-[rgb(var(--paper-cream))] inline-block px-4 relative z-10 mx-auto w-fit border-2 border-[rgb(var(--ink-navy))] shadow-pixel-sm py-1">
                    UNLOCKED BADGES
                </h3>

                <div className="flex flex-wrap justify-center gap-6">
                    {stats.badges.filter(b => b.unlocked).length > 0 ? stats.badges.filter(b => b.unlocked).map((badge) => (
                        <div key={badge.id} className="group relative w-28 h-28 bg-white rounded-xl border-2 border-[rgb(var(--ink-navy))] flex flex-col items-center justify-center hover:scale-110 transition-transform cursor-help shadow-pixel hover:shadow-deep hover:-rotate-3">
                            <Award className="w-10 h-10 text-[rgb(var(--woodstock-gold))] mb-2" />
                            <span className="text-[10px] font-pixel text-center px-1 leading-tight">{badge.name}</span>

                            {/* Tooltip */}
                            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-[rgb(var(--ink-navy))] text-white text-[10px] px-3 py-1.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap font-pixel pointer-events-none transition-opacity z-20 shadow-lg">
                                Unlocked!
                            </div>
                        </div>
                    )) : (
                        <div className="w-28 h-28 bg-[rgb(var(--aged-paper))] rounded-xl border-2 border-dashed border-[rgb(var(--ink-navy))] flex items-center justify-center opacity-50">
                            <span className="text-4xl font-hand text-[rgb(var(--ink-navy))]">?</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StatsView;
