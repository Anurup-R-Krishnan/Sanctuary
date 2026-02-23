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

  const ROTATIONS = ['-rotate-2', 'rotate-[3deg]', '-rotate-[1.5deg]', 'rotate-2'];

  return (
    <nav aria-label="Primary navigation" className="fixed top-24 left-4 z-50 flex flex-col gap-6 w-32 hidden md:flex">
      {navItems.map((item, idx) => {
        const isActive = activeView === item.view;
        const Icon = item.icon;

        return (
          <button
            type="button"
            key={item.view}
            onClick={() => !item.disabled && onNavigate(item.view)}
            disabled={item.disabled}
            className={`relative flex items-center justify-start gap-3 px-4 py-3 bg-[#fdfaf5] dark:bg-[#302b26] border-2 border-[#2c1e16] dark:border-[#453c34] transition-all duration-200 shadow-[4px_4px_0px_rgba(44,30,22,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.9)] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_rgba(44,30,22,1)] dark:hover:shadow-[6px_6px_0px_rgba(0,0,0,0.9)] ${ROTATIONS[idx]} ${isActive
              ? "bg-[#e8bc9e]/40 dark:bg-[#5a4238]/40 -translate-x-2"
              : item.disabled
                ? "opacity-50 cursor-not-allowed"
                : ""
              }`}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
          >
            {/* Washi Tape Strip indicator for active state */}
            {isActive && (
              <div className="absolute -top-3 left-4 w-12 h-4 bg-light-accent/[0.85] dark:bg-dark-accent/[0.85] rotate-[-5deg] mix-blend-multiply border border-black/10" />
            )}

            <Icon className={`w-5 h-5 ${isActive ? "text-light-accent dark:text-dark-accent" : "text-light-text-muted dark:text-dark-text-muted"}`} strokeWidth={2.5} />
            <span className={`font-serif text-sm tracking-wide mt-0.5 ${isActive ? "text-light-text dark:text-dark-text font-bold" : "text-light-text-muted dark:text-dark-text-muted font-medium"}`}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default Navigation;
