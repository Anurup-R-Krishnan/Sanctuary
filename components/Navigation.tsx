import React, { useState, useRef, useEffect } from "react";
import { View } from "../types";
import { Library, BookOpen, BarChart3, Settings } from "lucide-react";

interface NavigationProps {
  activeView: View;
  onNavigate: (view: View) => void;
  isReaderActive: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ activeView, onNavigate, isReaderActive }) => {
  const [indicatorStyle, setIndicatorStyle] = useState({});
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
      setIndicatorStyle({ width: itemRect.width - 8, left: itemRect.left - navRect.left + 4, opacity: 1 });
    } else if (activeView === View.READER) {
      const readerItemIndex = navItems.findIndex((item) => item.view === View.READER);
      const readerItem = itemRefs.current[readerItemIndex];
      if (readerItem && navRef.current) {
        const navRect = navRef.current.getBoundingClientRect();
        const itemRect = readerItem.getBoundingClientRect();
        setIndicatorStyle({ width: itemRect.width - 8, left: itemRect.left - navRect.left + 4, opacity: 1 });
      }
    }
  }, [activeView, isReaderActive]);

  return (
    <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50" role="navigation" aria-label="Main navigation">
      <div className="absolute inset-0 bg-gradient-to-r from-light-accent/20 via-amber-500/20 to-light-accent/20 dark:from-dark-accent/15 dark:via-amber-400/15 dark:to-dark-accent/15 rounded-2xl blur-2xl scale-110" />
      
      <div ref={navRef} className="relative flex items-center gap-1 p-2 rounded-2xl bg-light-surface/90 dark:bg-dark-surface/90 backdrop-blur-xl border border-light-card/80 dark:border-dark-card/80 shadow-soft-xl dark:shadow-dark-soft-xl">
        <div className="absolute top-2 h-[calc(100%-16px)] rounded-xl bg-gradient-to-b from-light-accent/10 to-light-accent/5 dark:from-dark-accent/15 dark:to-dark-accent/10 border border-light-accent/20 dark:border-dark-accent/20 transition-all duration-500 ease-spring" style={indicatorStyle} />

        {navItems.map((item, index) => {
          const isActive = activeView === item.view;
          return (
            <button
              key={item.view}
              ref={(el) => { itemRefs.current[index] = el; }}
              onClick={() => !item.disabled && onNavigate(item.view)}
              disabled={item.disabled}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={`relative z-10 flex items-center gap-2.5 px-5 py-3 rounded-xl transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-light-accent/50 dark:focus-visible:ring-dark-accent/50 ${isActive ? "text-light-accent dark:text-dark-accent" : "text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text"} ${item.disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <item.icon className={`h-5 w-5 transition-transform duration-300 ${isActive ? "scale-110" : ""}`} />
              <span className={`text-sm font-medium transition-all duration-300 ${isActive ? "opacity-100" : "opacity-70"}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;
