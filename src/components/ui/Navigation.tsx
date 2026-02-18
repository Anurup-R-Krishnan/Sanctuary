import React, { useState, useRef, useEffect, useMemo } from "react";
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
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const lastScrollYRef = useRef(0);
  const { reduceMotion } = useSettings();

  const navItems = useMemo(() => [
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
  ], [isReaderActive]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < lastScrollYRef.current || currentScrollY < 100) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollYRef.current && currentScrollY > 100) {
        setIsVisible(false);
      }
      
      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
  }, [activeView, isReaderActive, navItems]);

  return (
    <nav className={`fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
      isVisible ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'
    }`}>
      <div
        ref={navRef}
        className="relative flex items-center gap-1 p-2 rounded-3xl bg-light-surface/95 dark:bg-dark-surface/95 backdrop-blur-lg shadow-lg border border-black/[0.08] dark:border-white/[0.08]"
      >
        <div
          className="absolute top-2 left-0 h-[calc(100%-16px)] rounded-2xl bg-black/[0.05] dark:bg-white/[0.08] transition-all duration-300 ease-out"
          style={indicatorStyle}
        />

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
                }`}
                aria-label={item.description}
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 transition-all duration-200 ${
                      isActive ? "scale-110" : ""
                    }`}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  
                  {isActive && !reduceMotion && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-light-accent dark:bg-dark-accent rounded-full" />
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

              {!isActive && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-2 bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text text-xs font-medium rounded-xl border border-black/[0.08] dark:border-white/[0.08] opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap">
                  {item.description}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-light-surface dark:bg-dark-surface border-r border-b border-black/[0.08] dark:border-white/[0.08] rotate-45 -mt-1" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!reduceMotion && null}
    </nav>
  );
};

export default Navigation;
