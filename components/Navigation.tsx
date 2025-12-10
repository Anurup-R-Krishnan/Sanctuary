import React, { useState, useRef, useEffect } from "react";
import { View } from "../types";
import { Library, BookOpen, BarChart3, Settings } from "lucide-react";

interface NavigationProps {
  activeView: View;
  onNavigate: (view: View) => void;
  isReaderActive: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ activeView, onNavigate, isReaderActive }) => {
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({});
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const navItems = [
    { view: View.LIBRARY, label: "Library", icon: Library },
    { view: View.READER, label: "Reading", icon: BookOpen, disabled: !isReaderActive },
    { view: View.STATS, label: "Stats", icon: BarChart3 },
    { view: View.SETTINGS, label: "Settings", icon: Settings },
  ];

  useEffect(() => {
    const activeItemIndex = navItems.findIndex((item) => item.view === activeView);
    const activeItem = itemRefs.current[activeItemIndex];

    if (activeItem && navRef.current) {
      const navRect = navRef.current.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();
      setIndicatorStyle({
        width: itemRect.width,
        transform: `translateX(${itemRect.left - navRect.left}px)`,
        opacity: 1,
      });
    }
  }, [activeView, isReaderActive]);

  return (
    <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50" role="navigation" aria-label="Main navigation">
      <div
        ref={navRef}
        className="relative flex items-center gap-0.5 p-1 rounded-2xl glass-strong shadow-lg"
      >
        <div
          className="absolute top-1 left-0 h-[calc(100%-8px)] rounded-xl bg-gradient-to-b from-light-accent/12 to-light-accent/6 dark:from-dark-accent/15 dark:to-dark-accent/8 transition-all duration-300 ease-smooth"
          style={indicatorStyle}
        />

        {navItems.map((item, index) => {
          const isActive = activeView === item.view;
          const Icon = item.icon;
          return (
            <button
              key={item.view}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              onClick={() => !item.disabled && onNavigate(item.view)}
              disabled={item.disabled}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={`relative z-10 flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 focus:outline-none ${
                isActive
                  ? "text-light-accent dark:text-dark-accent"
                  : item.disabled
                    ? "text-light-text-muted/25 dark:text-dark-text-muted/25 cursor-not-allowed"
                    : "text-light-text-muted/60 dark:text-dark-text-muted/60 hover:text-light-text dark:hover:text-dark-text"
              }`}
            >
              <Icon
                className={`h-[18px] w-[18px] transition-transform duration-200 ${isActive ? "scale-105" : ""}`}
                strokeWidth={isActive ? 2.25 : 1.75}
              />
              <span
                className={`text-sm font-medium overflow-hidden transition-all duration-300 ${
                  isActive ? "w-auto opacity-100" : "w-0 opacity-0"
                }`}
              >
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
