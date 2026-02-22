import React, { useMemo } from "react";
import { View } from "@/types";
import { Library, BookOpen, Settings, BarChart2 } from "lucide-react";

interface NavigationProps {
  activeView: View;
  onNavigate: (view: View) => void;
  isReaderActive: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ activeView, onNavigate, isReaderActive }) => {
  const navItems = useMemo(() => [
    { id: View.LIBRARY, label: "Library", icon: Library, rotation: -2, delay: 0 },
    { id: View.READER, label: "Reader", icon: BookOpen, rotation: 3, delay: 0.1, disabled: !isReaderActive },
    { id: View.STATS, label: "Journal", icon: BarChart2, rotation: -1, delay: 0.2 },
    { id: View.SETTINGS, label: "Settings", icon: Settings, rotation: 2, delay: 0.3 },
  ], [isReaderActive]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none pb-4 sm:pb-8 flex justify-center items-end">
      {/* Container is invisible, items are scattered */}
      <div className="flex gap-4 sm:gap-8 items-end justify-center pointer-events-auto max-w-lg mx-auto px-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => !item.disabled && onNavigate(item.id)}
            disabled={item.disabled}
            className={`
              relative group flex flex-col items-center justify-center
              w-16 h-20 sm:w-20 sm:h-24
              bg-white p-2 pb-6 sm:pb-8
              shadow-scrap-card transition-all duration-300 ease-out
              border border-gray-100
              ${item.disabled ? "opacity-50 grayscale cursor-not-allowed" : "hover:z-50 hover:scale-110 hover:-translate-y-2 hover:shadow-scrap-lift cursor-pointer"}
            `}
            style={{
              transform: `rotate(${item.rotation}deg)`,
              transitionDelay: `${item.delay}s`
            }}
          >
            {/* Polaroid Photo Area */}
            <div className={`w-full aspect-square bg-scrap-cream border border-gray-200 mb-2 flex items-center justify-center overflow-hidden
                ${activeView === item.id ? "bg-scrap-sage/20 border-scrap-sage" : "group-hover:bg-scrap-blue/10"}
            `}>
                <item.icon
                    className={`w-6 h-6 sm:w-8 sm:h-8 transition-colors ${
                        activeView === item.id ? "text-scrap-navy stroke-2" : "text-scrap-blue stroke-1 group-hover:text-scrap-navy"
                    }`}
                />
            </div>

            {/* Handwritten Label */}
            <span className={`font-head text-[10px] sm:text-xs text-scrap-navy font-bold tracking-tight absolute bottom-1.5 sm:bottom-2 transform -rotate-1`}>
                {item.label}
            </span>

            {/* Tape Strip (Top Center) - Only visible on active or hover */}
            <div
                className={`absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-4 bg-scrap-sage/60 rotate-[-2deg] backdrop-blur-[1px] shadow-sm transition-opacity duration-300
                ${activeView === item.id ? "opacity-100" : "opacity-0 group-hover:opacity-60"}
                `}
                style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)" }}
            />
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;
