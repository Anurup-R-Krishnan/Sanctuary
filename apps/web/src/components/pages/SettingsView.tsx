import { RotateCcw, Trash2 } from "lucide-react";
import { type ReactNode, useState } from "react";

import { AccessibilityToggleList, ColorVisionPicker, TextSizePicker } from "@/components/settings/AccessibilityControls";
import { Slider } from "@/components/settings/Slider";
import { StorageManagerCard } from "@/components/settings/StorageManagerCard";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { Toggle } from "@/components/ui/Toggle";
import { useSettingsShallow } from "@/store/useSettingsStore";
import { NAVIGATION_OPTIONS, READING_SUPPORT_OPTIONS } from "@/utils/accessibility";
import { clearAllStores } from "@/utils/db";

const SECTIONS = [
    { id: "settings-accessibility", numeral: "I", title: "Accessibility" },
    { id: "settings-behavior", numeral: "II", title: "Behavior" },
    { id: "settings-goals", numeral: "III", title: "Reading goals" },
    { id: "settings-data", numeral: "IV", title: "Data & storage" },
] as const;

function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function SettingsSection({ children, description, id, numeral, title }: {
    children: ReactNode;
    description: string;
    id: string;
    numeral: string;
    title: string;
}) {
    return (
        <section aria-labelledby={`${id}-title`} className="scroll-mt-28" id={id}>
            <div className="flex items-baseline gap-3">
                <span className="folio text-sm text-accent">{numeral}</span>
                <h2 className="font-display text-2xl font-medium tracking-tight text-fg" id={`${id}-title`}>{title}</h2>
            </div>
            <p className="mt-1 pl-7 text-sm text-fg-muted">{description}</p>
            <div className="paper-card mt-5 divide-y divide-line/70 px-5 sm:px-6">{children}</div>
        </section>
    );
}

function SettingRow({ children, description, title }: { children: ReactNode; description: string; title: string }) {
    return (
        <div className="flex items-center justify-between gap-6 py-5">
            <div className="min-w-0">
                <p className="text-sm font-medium text-fg">{title}</p>
                <p className="mt-0.5 text-sm text-fg-muted">{description}</p>
            </div>
            {children}
        </div>
    );
}

async function wipeLocalData() {
    await clearAllStores();
    localStorage.clear();
    sessionStorage.clear();
    if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
    }
    if (navigator.serviceWorker) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
    }
}

function SettingsView() {
    const [isResetting, setIsResetting] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [showDefaultsConfirm, setShowDefaultsConfirm] = useState(false);
    const [resetError, setResetError] = useState<string | null>(null);
    const state = useSettingsShallow((s) => ({
        dailyGoal: s.dailyGoal,
        accessibilitySetupPending: s.accessibilitySetupPending,
        resetToDefaults: s.resetToDefaults,
        setDailyGoal: s.setDailyGoal,
        setAccessibilitySetupPending: s.setAccessibilitySetupPending,
        setTrackingEnabled: s.setTrackingEnabled,
        setWeeklyGoal: s.setWeeklyGoal,
        trackingEnabled: s.trackingEnabled,
        weeklyGoal: s.weeklyGoal,
    }));

    const executeFactoryReset = async () => {
        setShowResetConfirm(false);
        setIsResetting(true);
        setResetError(null);
        try {
            await wipeLocalData();
            window.location.reload();
        } catch (error) {
            console.error("Factory reset failed:", error);
            setIsResetting(false);
            setResetError("Factory reset failed. Please try again.");
        }
    };

    return (
        <div className="mx-auto max-w-5xl pb-40">
            <PageHeader eyebrow="Preferences" title="Settings" />

            <div className="mt-10 grid gap-10 md:grid-cols-[13rem_1fr] md:gap-14">
                <aside className="md:sticky md:top-28 md:self-start">
                    <p className="label-caps">Contents</p>
                    <nav aria-label="Settings sections" className="mt-3 flex gap-1 overflow-x-auto md:flex-col md:gap-0 md:border-l md:border-line">
                        {SECTIONS.map((section) => (
                            <button
                                className="group flex shrink-0 items-baseline gap-2.5 rounded-md px-3 py-2 text-left text-sm text-fg-muted transition-colors hover:text-fg md:-ml-px md:rounded-none md:border-l md:border-transparent md:hover:border-accent"
                                key={section.id}
                                onClick={() => scrollToSection(section.id)}
                                type="button"
                            >
                                <span className="folio w-6 text-xs text-accent/80">{section.numeral}</span>
                                {section.title}
                            </button>
                        ))}
                    </nav>
                    <p className="mt-6 hidden text-xs leading-relaxed text-fg-muted md:block">
                        Typography, themes and layout are set inside the reader. Open a book and use the settings button in its toolbar.
                    </p>
                </aside>

                <div className="space-y-14">
                    <SettingsSection description="Text size, colour vision, contrast and navigation." id="settings-accessibility" numeral="I" title="Accessibility">
                        <div className="py-5">
                            <p className="text-sm font-medium text-fg">Interface text size</p>
                            <div className="mt-3"><TextSizePicker /></div>
                        </div>
                        <div className="py-5">
                            <p className="text-sm font-medium text-fg">Colour vision</p>
                            <p className="mt-0.5 text-sm text-fg-muted">Adjusts colours across the app and inside books. Highlights also get line patterns.</p>
                            <div className="mt-3"><ColorVisionPicker /></div>
                        </div>
                        <AccessibilityToggleList options={[...READING_SUPPORT_OPTIONS, ...NAVIGATION_OPTIONS]} />
                        <SettingRow description="Walk through these options step by step. Turn on to open the setup now." title="Accessibility setup">
                            <div className="flex shrink-0 items-center gap-3">
                                <Toggle checked={state.accessibilitySetupPending} label="Show accessibility setup" onChange={state.setAccessibilitySetupPending} />
                            </div>
                        </SettingRow>
                    </SettingsSection>

                    <SettingsSection description="How the app behaves on this device." id="settings-behavior" numeral="II" title="Behavior">
                        <SettingRow description="Record time spent reading for the Stats page. Nothing is recorded while this is off." title="Track reading time">
                            <Toggle checked={state.trackingEnabled} label="Track reading time" onChange={state.setTrackingEnabled} />
                        </SettingRow>
                    </SettingsSection>

                    <SettingsSection description="Targets used by the Stats page." id="settings-goals" numeral="III" title="Reading goals">
                        <div className="grid gap-8 py-6 sm:grid-cols-2 sm:gap-10">
                            <Slider displayValue={`${state.dailyGoal} min`} label="Daily goal" max={120} min={5} onChange={state.setDailyGoal} step={5} value={state.dailyGoal} />
                            <Slider displayValue={`${state.weeklyGoal} min`} label="Weekly goal" max={500} min={20} onChange={state.setWeeklyGoal} step={10} value={state.weeklyGoal} />
                        </div>
                    </SettingsSection>

                    <SettingsSection description="What this browser keeps for offline reading." id="settings-data" numeral="IV" title="Data & storage">
                        <div className="py-6">
                            <StorageManagerCard />
                        </div>
                        <SettingRow description="Restore every app and reader preference to its default. Books and notes are kept." title="Reset preferences">
                            <Button className="shrink-0" onClick={() => setShowDefaultsConfirm(true)} size="sm" variant="secondary">
                                <RotateCcw className="h-3.5 w-3.5" />
                                Reset
                            </Button>
                        </SettingRow>
                        <SettingRow description="Delete every book, note, reading session and setting stored in this browser. Changes not yet synced are lost." title="Erase this device">
                            <Button className="shrink-0" isLoading={isResetting} onClick={() => setShowResetConfirm(true)} size="sm" variant="destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                                Erase
                            </Button>
                        </SettingRow>
                        {resetError && <p className="py-3 text-sm text-danger">{resetError}</p>}
                    </SettingsSection>
                </div>
            </div>

            <ConfirmDialog
                confirmLabel="Reset preferences"
                description="Every preference returns to its default value. Your books, notes and progress are not touched."
                isOpen={showDefaultsConfirm}
                onClose={() => setShowDefaultsConfirm(false)}
                onConfirm={() => {
                    setShowDefaultsConfirm(false);
                    state.resetToDefaults();
                }}
                title="Reset preferences"
            />
            <ConfirmDialog
                confirmLabel="Erase"
                description="This removes all books, notes, reading history and settings stored in this browser. It cannot be undone."
                isDestructive
                isOpen={showResetConfirm}
                onClose={() => setShowResetConfirm(false)}
                onConfirm={executeFactoryReset}
                title="Erase this device"
            />
        </div>
    );
}

export default SettingsView;
