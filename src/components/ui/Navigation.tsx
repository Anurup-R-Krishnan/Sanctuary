import React, { useState, useEffect } from "react";
import { View } from "@/types";
import { Library, BookOpen, BarChart3, Settings } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

interface NavigationProps {
  activeView: View;
  onNavigate: (view: View) => void;
  isReaderActive: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ activeView, onNavigate, isReaderActive }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const navItems = [
    {
      view: View.LIBRARY,
      label: "Library",
      icon: Library,
      description: "Browse your collection"
    },
    {
      view: View.READER,
      label: "Reading",
      icon: BookOpen,
      disabled: !isReaderActive,
      description: "Continue reading"
    },
    {
      view: View.STATS,
      label: "Stats",
      icon: BarChart3,
      description: "Track your progress"
    },
    {
      view: View.SETTINGS,
      label: "Settings",
      icon: Settings,
      description: "Customize your experience"
    },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < lastScrollY || currentScrollY < 100) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <nav
      className={`fixed left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-out ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
        }`}
      style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center gap-0.5 p-1 rounded-2xl bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-xl shadow-lg shadow-black/[0.08] dark:shadow-black/[0.3] border border-black/[0.04] dark:border-white/[0.06]">
        {navItems.map((item) => {
          const isActive = activeView === item.view;
          const Icon = item.icon;

          return (
            <button
              key={item.view}
              onClick={() => !item.disabled && onNavigate(item.view)}
              disabled={item.disabled}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 ease-out ${isActive
                  ? "bg-light-accent/10 dark:bg-dark-accent/15 text-light-accent dark:text-dark-accent"
                  : item.disabled
                    ? "text-light-text-muted/30 dark:text-dark-text-muted/30 cursor-not-allowed"
                    : "text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                }`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={`w-[18px] h-[18px] transition-all duration-300 ${isActive ? "stroke-[2.25px]" : "stroke-[1.75px]"}`}
              />
              <span className={`text-[13px] font-medium overflow-hidden transition-all duration-300 ${isActive ? "w-auto opacity-100" : "w-0 opacity-0"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;
