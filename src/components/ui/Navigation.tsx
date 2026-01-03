import React, { useState, useRef, useEffect } from "react";
import { View } from "@/types";
import { Library, BookOpen, BarChart3, Settings } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

interface NavigationProps {
  activeView: View;
  onNavigate: (view: View) => void;
  isReaderActive: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ activeView, onNavigate, isReaderActive }) => {
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({});
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { reduceMotion } = useSettings();

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

  useEffect(() => {
    const idx = navItems.findIndex((item) => item.view === activeView);
    const el = itemRefs.current[idx];
    
    if (el && navRef.current) {
      const navRect = navRef.current.getBoundingClientRect();
      const itemRect = el.getBoundingClientRect();
      
      setIndicatorStyle({
        width: itemRect.width,
        transform: `translateX(${itemRect.left - navRect.left}px)`,
        opacity: 1,
      });
    }
  }, [activeView, isReaderActive]);

  return (
    <nav className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
      isVisible ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'
    }`}>
      <div
        ref={navRef}
        className="relative flex items-center gap-1 p-2 rounded-3xl glass-ultra shadow-2xl shadow-black/[0.15] dark:shadow-black/[0.3] border border-black/[0.08] dark:border-white/[0.08]"
      >
        {/* Enhanced Active Indicator */}
        <div
          className="absolute top-2 left-0 h-[calc(100%-16px)] rounded-2xl bg-gradient-to-b from-light-accent/20 via-light-accent/15 to-light-accent/10 dark:from-dark-accent/25 dark:via-dark-accent/20 dark:to-dark-accent/15 transition-all duration-300 ease-out"
          style={indicatorStyle}
        />
        
        {/* Glow effect for active indicator */}
        {!reduceMotion && (
          <div
            className="absolute top-2 left-0 h-[calc(100%-16px)] rounded-2xl bg-gradient-to-b from-light-accent/10 to-transparent dark:from-dark-accent/15 dark:to-transparent blur-lg transition-all duration-300 ease-out"
            style={indicatorStyle}
          />
        )}

        {navItems.map((item, index) => {
          const isActive = activeView === item.view;
          const Icon = item.icon;
          
          return (
            <div key={item.view} className="relative group">
              <button
                ref={(el) => { itemRefs.current[index] = el; }}
                onClick={() => !item.disabled && onNavigate(item.view)}
                disabled={item.disabled}
                className={`relative z-10 flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all duration-200 ${
                  isActive
                    ? "text-light-accent dark:text-dark-accent"
                    : item.disabled
                      ? "text-light-text-muted/30 dark:text-dark-text-muted/30 cursor-not-allowed"
                      : "text-light-text-muted/70 dark:text-dark-text-muted/70 hover:text-light-text dark:hover:text-dark-text hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                } ${!item.disabled && !isActive ? 'hover:scale-105' : ''}`}
                aria-label={item.description}
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 transition-all duration-200 ${
                      isActive ? "scale-110" : ""
                    }`}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  
                  {/* Active indicator dot */}
                  {isActive && !reduceMotion && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-br from-light-accent to-amber-500 dark:from-dark-accent dark:to-amber-400 rounded-full animate-pulse-soft">
                      <div className="absolute inset-0 bg-gradient-to-br from-light-accent to-amber-500 dark:from-dark-accent dark:to-amber-400 rounded-full blur-sm opacity-60" />
                    </div>
                  )}
                </div>
                
                <span
                  className={`text-sm font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ease-out ${
                    isActive 
                      ? "w-auto max-w-[100px] opacity-100" 
                      : "w-0 max-w-0 opacity-0"
                  }`}
                >
                  {item.label}
                </span>
              </button>

              {/* Tooltip */}
              {!isActive && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-2 bg-dark-surface/95 dark:bg-light-surface/95 text-dark-text dark:text-light-text text-xs font-medium rounded-xl backdrop-blur-xl border border-white/[0.1] dark:border-black/[0.1] opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap">
                  {item.description}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-dark-surface/95 dark:bg-light-surface/95 border-r border-b border-white/[0.1] dark:border-black/[0.1] rotate-45 -mt-1" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating action hint */}
      {!reduceMotion && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-gradient-to-r from-light-accent to-amber-500 dark:from-dark-accent dark:to-amber-400 rounded-full opacity-60 animate-bounce-gentle" />
      )}
    </nav>
  );
};

export default Navigation;
