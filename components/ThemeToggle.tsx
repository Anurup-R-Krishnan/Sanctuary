import React from "react";
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
      className="relative w-10 h-10 rounded-full flex items-center justify-center overflow-hidden bg-light-surface dark:bg-dark-surface focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent transition-colors duration-300"
      aria-label="Toggle theme"
    >
      {/* Sun Icon */}
      <div
        className={`absolute transition-all duration-500 ease-spring ${isDark ? "transform -rotate-90 opacity-0" : "transform rotate-0 opacity-100"}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-yellow-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      </div>
      {/* Moon Icon */}
      <div
        className={`absolute transition-all duration-500 ease-spring ${isDark ? "transform rotate-0 opacity-100" : "transform rotate-90 opacity-0"}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-dark-accent"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      </div>
    </button>
  );
};

export default ThemeToggle;
