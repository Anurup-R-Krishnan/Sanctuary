
import { Library, BookOpen, BarChart3, Settings } from "lucide-react";

import { View } from "@/types";

import { Button } from "./Button";

interface NavigationProps {
  activeView: View;
  isReaderActive: boolean;
  onNavigate: (view: View) => void;
}

function Navigation({ activeView, onNavigate, isReaderActive }: NavigationProps) {
  const navItems = [
    { view: View.LIBRARY, label: "Library", icon: Library, disabled: false },
    { view: View.READER, label: "Reader", icon: BookOpen, disabled: !isReaderActive },
    { view: View.STATS, label: "Stats", icon: BarChart3, disabled: false },
    { view: View.SETTINGS, label: "Settings", icon: Settings, disabled: false },
  ];

  return (
    <nav aria-label="Primary navigation" className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-1 p-1.5 rounded-2xl border border-light-border dark:border-dark-border bg-light-surface/95 dark:bg-dark-surface/95 backdrop-blur-md shadow-lg">
        {navItems.map((item) => {
          const isActive = activeView === item.view;
          const Icon = item.icon;

          return (
            <Button
              key={item.view}
              variant="nav"
              onClick={() => !item.disabled && onNavigate(item.view)}
              disabled={item.disabled}
              className={`relative h-11 px-3 !rounded-xl gap-2 transition-all duration-instant ${isActive
                ? "text-light-accent dark:text-dark-accent font-medium"
                : item.disabled
                  ? "text-light-text-muted/40 dark:text-dark-text-muted/40"
                  : "text-light-text-muted dark:text-dark-text-muted hover:bg-light-border/40 dark:hover:bg-dark-border/40"
                }`}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && (
                <div className="absolute inset-0 bg-light-accent/10 dark:bg-dark-accent/15 rounded-xl shadow-xs" />
              )}
              <Icon className="w-5 h-5 relative" />
              <span className="hidden sm:inline relative">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;
