import React from "react";
import { View } from "@/types";
import { Library, BookOpen, BarChart3, Settings } from "lucide-react";

interface NavigationProps {
  activeView: View;
  onNavigate: (view: View) => void;
  isReaderActive: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ activeView, onNavigate, isReaderActive }) => {
  const navItems = [
    { view: View.LIBRARY, label: "Library", icon: Library, disabled: false },
    { view: View.READER, label: "Reader", icon: BookOpen, disabled: !isReaderActive },
    { view: View.STATS, label: "Stats", icon: BarChart3, disabled: false },
    { view: View.SETTINGS, label: "Settings", icon: Settings, disabled: false },
  ];

  return (
    <nav aria-label="Primary navigation" className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-1 p-1.5 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-light-surface/95 dark:bg-dark-surface/95 backdrop-blur-md shadow-lg">
        {navItems.map((item) => {
          const isActive = activeView === item.view;
          const Icon = item.icon;

          return (
            <button
              type="button"
              key={item.view}
              onClick={() => !item.disabled && onNavigate(item.view)}
              disabled={item.disabled}
              className={`h-11 px-3 rounded-xl flex items-center gap-2 text-sm transition-colors ${isActive
                ? "bg-light-accent/12 dark:bg-dark-accent/18 text-light-accent dark:text-dark-accent"
                : item.disabled
                  ? "text-light-text-muted/40 dark:text-dark-text-muted/40 cursor-not-allowed"
                  : "text-light-text-muted dark:text-dark-text-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                }`}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;
