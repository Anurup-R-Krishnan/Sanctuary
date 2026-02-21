import React from "react";
import { useStatsStore } from "@/store/useStatsStore";
import { Book, Award, Clock, Flame, Calendar, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const StatsView: React.FC = () => {
    const stats = useStatsStore((state) => state.stats);

    // Mock data for new visualization features
    const moodData = [
        { genre: "Fiction", count: 12, color: "bg-[rgb(var(--sage-green))]" },
        { genre: "History", count: 5, color: "bg-[rgb(var(--woodstock-gold))]" },
        { genre: "Sci-Fi", count: 8, color: "bg-[rgb(var(--ink-navy))]" },
    ];

    // Helper to generate a pixel-art contribution grid (mock)
    const renderContributionGrid = () => {
        return (
            <div className="flex gap-1 flex-wrap w-full max-w-xs justify-center">
                {[...Array(28)].map((_, i) => (
                    <div
                        key={i}
                        className={`w-3 h-3 rounded-sm ${Math.random() > 0.7
                                ? "bg-[rgb(var(--sage-green))]"
                                : Math.random() > 0.4
                                    ? "bg-[rgb(var(--woodstock-gold))]"
                                    : "bg-[rgb(var(--aged-paper))]"
                            }`}
                    />
                ))}
            </div>
        );
    };

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

                {/* Total Pages (Badge Style) */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white p-6 rounded-xl border-2 border-[rgb(var(--ink-navy))] shadow-pixel flex items-center gap-4"
                >
                    <div className="p-3 bg-[rgb(var(--sage-green))] rounded-lg border-2 border-[rgb(var(--ink-navy))] shadow-pixel-sm">
                        <Book className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-xs font-pixel uppercase text-[rgb(var(--sepia-brown))] mb-0.5">Pages Turned</h3>
                        <p className="text-2xl font-serif font-bold text-[rgb(var(--ink-navy))]">{stats.totalPagesRead.toLocaleString()}</p>
                    </div>
                </motion.div>

                {/* Time Reading (Badge Style) */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white p-6 rounded-xl border-2 border-[rgb(var(--ink-navy))] shadow-pixel flex items-center gap-4"
                >
                    <div className="p-3 bg-[rgb(var(--ink-navy))] rounded-lg border-2 border-[rgb(var(--ink-navy))] shadow-pixel-sm">
                        <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-xs font-pixel uppercase text-[rgb(var(--sepia-brown))] mb-0.5">Time Spent</h3>
                        <p className="text-2xl font-serif font-bold text-[rgb(var(--ink-navy))]">
                            {Math.round(stats.totalReadingTime / 60)} <span className="text-base font-normal">hours</span>
                        </p>
                    </div>
                </motion.div>

                {/* Level / XP (Pixel Progress) */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-[rgb(var(--aged-paper))] p-6 rounded-xl border-2 border-[rgb(var(--ink-navy))] shadow-pixel flex flex-col justify-center"
                >
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-pixel text-xs text-[rgb(var(--ink-navy))]">LEVEL 3 BOOKWORM</span>
                        <span className="font-pixel text-xs text-[rgb(var(--ink-navy))]">XP: 850/1000</span>
                    </div>
                    <div className="h-4 w-full bg-white border-2 border-[rgb(var(--ink-navy))] rounded-full p-0.5">
                        <div className="h-full bg-[rgb(var(--clay-red))] w-[85%] rounded-full border border-[rgb(var(--ink-navy))]" />
                    </div>
                </motion.div>
            </div>

            {/* Reading Mood & Calendar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Calendar */}
                <div className="md:col-span-2 bg-white p-6 rounded-xl border-2 border-[rgb(var(--ink-navy))] shadow-pixel">
                    <div className="flex items-center gap-2 mb-6">
                        <Calendar className="w-5 h-5 text-[rgb(var(--sage-green))]" />
                        <h3 className="font-serif font-bold text-lg text-[rgb(var(--ink-navy))]">Consistency Calendar</h3>
                    </div>
                    <div className="flex justify-center py-4">
                         {/* Replace with real calendar later */}
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
                        {moodData.map((mood) => (
                            <div key={mood.genre}>
                                <div className="flex justify-between text-xs font-bold text-[rgb(var(--sepia-brown))] mb-1">
                                    <span>{mood.genre}</span>
                                    <span>{mood.count}</span>
                                </div>
                                <div className="h-2 w-full bg-[rgb(var(--aged-paper))] rounded-full overflow-hidden">
                                    <div className={`h-full ${mood.color}`} style={{ width: `${(mood.count / 25) * 100}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

             {/* Recent Badges Section */}
             <div className="mt-10">
                <h3 className="font-pixel text-lg text-[rgb(var(--ink-navy))] mb-6 text-center">--- RECENTLY UNLOCKED ---</h3>
                <div className="flex flex-wrap justify-center gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="group relative w-24 h-24 bg-[rgb(var(--paper-cream))] rounded-xl border-2 border-[rgb(var(--ink-navy))] flex items-center justify-center hover:scale-110 transition-transform cursor-help">
                            <Award className={`w-10 h-10 ${i === 1 ? 'text-[rgb(var(--woodstock-gold))]' : 'text-[rgb(var(--sage-green))]'}`} />
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[rgb(var(--ink-navy))] text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap font-pixel pointer-events-none transition-opacity">
                                badge_name_0{i}
                            </div>
                        </div>
                    ))}
                    <div className="w-24 h-24 bg-[rgb(var(--aged-paper))] rounded-xl border-2 border-dashed border-[rgb(var(--ink-navy))] flex items-center justify-center opacity-50">
                        <span className="text-2xl">?</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatsView;
