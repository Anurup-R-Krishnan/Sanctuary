import React from "react";
import { Library, BookOpen, Settings, BarChart2 } from "lucide-react";
import { View } from "@/types";
import { motion } from "framer-motion";

interface NavigationProps {
  activeView: View;
  onNavigate: (view: View) => void;
  isReaderActive: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ activeView, onNavigate, isReaderActive }) => {
  const navItems = [
    { id: View.LIBRARY, label: "Library", icon: Library },
    { id: View.READER, label: "Reader", icon: BookOpen, disabled: !isReaderActive },
    { id: View.STATS, label: "Journal", icon: BarChart2 },
    { id: View.SETTINGS, label: "Settings", icon: Settings },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
      <div className="flex items-end gap-2 p-2 rounded-2xl bg-[rgb(var(--paper-cream))] border-2 border-[rgb(var(--ink-navy))] shadow-deep">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => !item.disabled && onNavigate(item.id)}
            disabled={item.disabled}
            className={`group relative flex flex-col items-center justify-end w-16 transition-all duration-300 ${
              item.disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            {/* String/Chain holding the sign */}
            <div className={`absolute -top-4 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-[rgb(var(--ink-navy))] origin-top transition-all duration-500 ${activeView === item.id ? "h-6" : "group-hover:h-5"}`} />

            {/* The "Sign" */}
            <div
                className={`relative z-10 w-full h-14 rounded-lg border-2 border-[rgb(var(--ink-navy))] flex items-center justify-center transition-all duration-300 origin-top
                ${activeView === item.id
                    ? "bg-[rgb(var(--woodstock-gold))] -translate-y-2 shadow-pixel-sm rotate-0"
                    : "bg-white hover:bg-[rgb(var(--aged-paper))] hover:rotate-2 hover:-translate-y-1 shadow-sm"
                }`}
            >
                <item.icon className={`w-6 h-6 ${activeView === item.id ? "text-[rgb(var(--ink-navy))]" : "text-[rgb(var(--sepia-brown))]"}`} />
            </div>

            {/* Label (Tooltip style on hover) */}
            <span className={`absolute -bottom-6 text-[10px] font-pixel font-bold tracking-wider text-[rgb(var(--ink-navy))] transition-opacity duration-200 ${activeView === item.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Navigation;
