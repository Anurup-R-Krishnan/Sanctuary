import React from "react";
import { Sun, Moon } from "lucide-react";
import { Theme } from "../types";

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onToggle }) => {
  const isDark = theme === Theme.DARK;

  return (
    <button
      onClick={onToggle}
      className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-light-card/50 dark:bg-dark-card/50 border border-light-card dark:border-dark-card hover:bg-light-card dark:hover:bg-dark-card transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-light-accent/50 dark:focus-visible:ring-dark-accent/50 group"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {/* Sun icon */}
      <Sun
        className={`absolute h-5 w-5 text-amber-500 transition-all duration-500 ${
          isDark
            ? "opacity-0 rotate-90 scale-0"
            : "opacity-100 rotate-0 scale-100"
        }`}
      />
      
      {/* Moon icon */}
      <Moon
        className={`absolute h-5 w-5 text-light-accent dark:text-dark-accent transition-all duration-500 ${
          isDark
            ? "opacity-100 rotate-0 scale-100"
            : "opacity-0 -rotate-90 scale-0"
        }`}
      />

      {/* Hover glow */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-400/0 to-amber-500/0 group-hover:from-amber-400/10 group-hover:to-amber-500/10 dark:group-hover:from-dark-accent/10 dark:group-hover:to-amber-400/10 transition-all duration-300" />
    </button>
  );
};

export default ThemeToggle;
