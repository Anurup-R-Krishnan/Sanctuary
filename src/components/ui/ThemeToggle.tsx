import React from "react";
import { Sun, Moon } from "lucide-react";
import { Theme } from "@/types";

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onToggle }) => {
  const isDark = theme === Theme.DARK;

  return (
    <button
      onClick={onToggle}
      className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-all duration-200"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Sun
        className={`absolute w-4 h-4 transition-all duration-300 ${
          isDark ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100 text-amber-500"
        }`}
        strokeWidth={1.75}
      />
      <Moon
        className={`absolute w-4 h-4 transition-all duration-300 ${
          isDark ? "opacity-100 rotate-0 scale-100 text-amber-400" : "opacity-0 -rotate-90 scale-0"
        }`}
        strokeWidth={1.75}
      />
    </button>
  );
};

export default ThemeToggle;
