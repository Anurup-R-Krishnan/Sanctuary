import React from "react";

interface SectionProps {
    title: string;
    icon?: React.ElementType;
    children: React.ReactNode;
}

export const Section = ({ title, icon: Icon, children }: SectionProps) => (
    <div className="rounded-3xl border border-black/[0.05] dark:border-white/[0.06] bg-light-surface/80 dark:bg-dark-surface/80">
        <div className="relative p-6">
            <div className="flex items-center gap-3 mb-5">
                {Icon && (
                    <div className="p-2.5 rounded-xl bg-light-accent/10 dark:bg-dark-accent/15">
                        <Icon className="w-5 h-5 text-light-accent dark:text-dark-accent" strokeWidth={1.75} />
                    </div>
                )}
                <h3 className="text-base font-semibold text-light-text dark:text-dark-text">{title}</h3>
            </div>
            <div className="space-y-3">{children}</div>
        </div>
    </div>
);
