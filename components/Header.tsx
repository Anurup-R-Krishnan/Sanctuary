import React from "react";
import { Search, LogOut, LogIn, User } from "lucide-react";

import { Theme } from "../types";
import ThemeToggle from "./ThemeToggle";

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
  searchTerm: string;
  onSearch: (term: string) => void;
  isGuest?: boolean;
  onShowLogin?: () => void;
  onSignOut?: () => void;
  onContinueAsGuest?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  searchTerm,
  onSearch,
  isGuest = false,
  onShowLogin,
  onSignOut,
  onContinueAsGuest,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-light-secondary dark:bg-dark-secondary shadow-md px-4 md:px-8 py-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-light-text dark:text-dark-text">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Sanctuary
            </h1>
            {isGuest && (
              <span
                className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-100/80 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200 px-3 py-1 text-xs font-medium"
                title="Guest mode stores books locally only and resets when you sign in."
              >
                <User className="h-3.5 w-3.5" />
                Guest mode
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 flex justify-center px-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search library..."
              value={searchTerm}
              onChange={(event) => onSearch(event.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full bg-light-primary dark:bg-dark-primary border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-light-text dark:text-dark-text placeholder:text-light-text-muted dark:placeholder:text-dark-text-muted transition-shadow"
            />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />

          {!isGuest && onContinueAsGuest && (
            <button
              type="button"
              onClick={onContinueAsGuest}
              className="hidden sm:inline-flex items-center gap-2 rounded-full border border-indigo-200/60 dark:border-indigo-400/30 bg-transparent px-3.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 dark:text-indigo-200 dark:hover:bg-indigo-800/40 transition-colors"
            >
              Continue as guest
            </button>
          )}

          {isGuest ? (
            <button
              type="button"
              onClick={onShowLogin}
              disabled={!onShowLogin}
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </button>
          ) : (
            onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-2 rounded-full bg-light-primary dark:bg-dark-primary px-3.5 py-2 text-sm font-medium text-light-text dark:text-dark-text hover:bg-light-card dark:hover:bg-dark-card focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
