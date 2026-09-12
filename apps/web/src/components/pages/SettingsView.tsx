import {
    Target, RotateCcw, HardDrive, Trash2, AlertTriangle, Settings2
} from "lucide-react";
import React, { useState } from "react";

import { Slider } from "@/components/settings/Slider";
import { StorageManagerCard } from "@/components/settings/StorageManagerCard";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Toggle } from "@/components/ui/Toggle";
import { useSettingsShallow } from "@/store/useSettingsStore";
import { clearBooks } from "@/utils/db";

function SettingsView() {
    const [isResetting, setIsResetting] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [resetError, setResetError] = useState<string | null>(null);
    const state = useSettingsShallow((s) => s);

    const handleFactoryResetClick = () => setShowResetConfirm(true);

    const executeFactoryReset = async () => {
        setShowResetConfirm(false);
        setIsResetting(true);
        setResetError(null);
        try {
            localStorage.clear();
            sessionStorage.clear();
            await clearBooks();
            if (navigator.serviceWorker) {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (const r of regs) await r.unregister();
            }
            window.location.reload();
        } catch (e) {
            console.error(e);
            setIsResetting(false);
            setResetError("Factory reset failed. Please try again.");
        }
    };

    const NavAnchor = ({ id, label, icon: Icon }: { id: string, label: string, icon: React.ComponentType<{ className?: string }> }) => (
        <a href={`#${id}`} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text hover:bg-black/[0.04] dark:hover:bg-white/[0.04] rounded-lg transition-colors">
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
        </a>
    );

    return (
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8 pb-32">
            <aside className="md:w-64 flex-shrink-0">
               <div className="sticky top-24 space-y-1">
                   <h2 className="px-3 mb-4 text-2xl font-sans font-bold tracking-tight text-light-text dark:text-dark-text">Settings</h2>
                   <NavAnchor id="behavior" label="Behavior" icon={Settings2} />
                   <NavAnchor id="goals" label="Reading Goals" icon={Target} />
                   <NavAnchor id="data" label="Data & Storage" icon={HardDrive} />
                   <div className="pt-6 px-3">
                       <Button onClick={state.resetToDefaults} variant="secondary" className="w-full gap-2 justify-center group shadow-sm hover:shadow-md">
                           <RotateCcw className="w-4 h-4 transition-transform duration-500 group-hover:-rotate-180" />
                           <span className="text-sm font-medium">Reset All</span>
                       </Button>
                   </div>
                   <p className="px-3 pt-2 text-[11px] text-light-text-muted/70 dark:text-dark-text-muted/70 leading-relaxed">
                       Looking for typography, theme, or layout options? Those live in the reader's own Settings panel (open a book, then tap the gear icon).
                   </p>
               </div>
            </aside>

            <div className="flex-1 space-y-12">
                <section id="behavior" className="space-y-6 scroll-mt-24">
                    <div>
                        <h3 className="text-xl font-semibold text-light-text dark:text-dark-text mb-1">Behavior</h3>
                        <p className="text-sm text-light-text-muted dark:text-dark-text-muted mb-6">App-wide interaction preferences.</p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                            <Toggle checked={state.reduceMotion} onChange={state.setReduceMotion} label="Reduce Motion" sublabel="Disable animations and transitions across the app" />
                        </div>
                    </div>
                </section>

                <hr className="border-black/5 dark:border-white/5" />

                <section id="goals" className="space-y-6 scroll-mt-24">
                    <div>
                        <h3 className="text-xl font-semibold text-light-text dark:text-dark-text mb-1">Reading Goals</h3>
                        <p className="text-sm text-light-text-muted dark:text-dark-text-muted mb-6">Track your reading habits and maintain streaks.</p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6 p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                        <Slider label="Daily Goal" value={state.dailyGoal} onChange={state.setDailyGoal} min={5} max={120} step={5} displayValue={`${state.dailyGoal} pages`} />
                        <Slider label="Weekly Goal" value={state.weeklyGoal} onChange={state.setWeeklyGoal} min={20} max={500} step={10} displayValue={`${state.weeklyGoal} pages`} />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                             <Toggle checked={state.trackingEnabled} onChange={state.setTrackingEnabled} label="Analytics" sublabel="Track reading time and progress" />
                        </div>
                        <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                             <Toggle checked={state.showStreakReminder} onChange={state.setShowStreakReminder} label="Streak Reminders" sublabel="Remind me to read daily" />
                        </div>
                    </div>
                </section>

                <hr className="border-black/5 dark:border-white/5" />

                <section id="data" className="space-y-6 scroll-mt-24">
                    <div>
                        <h3 className="text-xl font-semibold text-light-text dark:text-dark-text mb-1">Data & Storage</h3>
                        <p className="text-sm text-light-text-muted dark:text-dark-text-muted mb-6">Manage your local data.</p>
                    </div>
                    <StorageManagerCard />
                    <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20">
                        <div className="flex items-center gap-3 mb-3 text-red-600 dark:text-red-400">
                            <AlertTriangle className="w-5 h-5" />
                            <h4 className="font-semibold">Danger Zone</h4>
                        </div>
                        <p className="text-sm text-red-600/80 dark:text-red-400/80 mb-5">
                            This will permanently delete all locally cached books, reading progress, and settings from this browser. If you are offline, unsynced progress will be lost.
                        </p>
                        <Button onClick={handleFactoryResetClick} isLoading={isResetting} variant="destructive" className="gap-2 px-5 shadow-sm">
                            <Trash2 className="w-4 h-4" />
                            Factory Reset Cache
                        </Button>
                        {resetError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{resetError}</p>}
                    </div>
                </section>
            </div>
            
            <ConfirmDialog isOpen={showResetConfirm} onClose={() => setShowResetConfirm(false)} onConfirm={executeFactoryReset} title="Wipe Local Data" description="Are you sure you want to completely wipe all local data? This action cannot be undone." confirmLabel="Factory Reset" isDestructive />
        </div>
    );
}

export default SettingsView;
