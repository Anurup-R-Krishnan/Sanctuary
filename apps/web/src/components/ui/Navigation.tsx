
import { Library, BookOpen, BarChart3, House, Settings } from "lucide-react";

import { View } from "@/types";

import { Button } from "./Button";

interface NavigationProps {
  activeView: View;
  isReaderActive: boolean;
  onNavigate: (view: View) => void;
}

function Navigation({ activeView, onNavigate, isReaderActive }: NavigationProps) {
  const navItems = [
    { view: View.HOME, label: "Home", icon: House, disabled: false },
    { view: View.LIBRARY, label: "Library", icon: Library, disabled: false },
    { view: View.READER, label: "Reader", icon: BookOpen, disabled: !isReaderActive },
    { view: View.STATS, label: "Stats", icon: BarChart3, disabled: false },
    { view: View.SETTINGS, label: "Settings", icon: Settings, disabled: false },
  ];

  return (
    <nav aria-label="Primary navigation" className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-0.5 p-1 rounded-xl border border-line bg-surface-raised shadow-xl">
        {navItems.map((item) => {
          const isActive = activeView === item.view;
          const Icon = item.icon;

          return (
            <Button
              key={item.view}
              variant="nav"
              onClick={() => !item.disabled && onNavigate(item.view)}
              disabled={item.disabled}
              className={`relative h-10 px-3.5 !rounded-lg gap-2 text-sm transition-all duration-instant ${isActive
                ? "text-accent font-medium"
                : item.disabled
                  ? "text-fg-muted/40"
                  : "text-fg-muted hover:bg-line/40"
                }`}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && (
                <div className="absolute inset-0 rounded-lg bg-accent/10" />
              )}
              <Icon className="w-[18px] h-[18px] relative" strokeWidth={1.75} />
              <span className="hidden sm:inline relative">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;
