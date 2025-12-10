import React, { useState, useRef, useEffect } from "react";
import { Search, LogOut, LogIn, X, BookOpen } from "lucide-react";
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
}

const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  searchTerm,
  onSearch,
  isGuest = false,
  onShowLogin,
  onSignOut,
}) => {
  const [searchFocused, setSearchFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && searchFocused) {
        inputRef.current?.blur();
        onSearch("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchFocused, onSearch]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50" role="banner">
      <div className="absolute inset-0 bg-light-primary/70 dark:bg-dark-primary/70 backdrop-blur-2xl" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-black/[0.06] dark:via-white/[0.06] to-transparent" />

      <div className="relative px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto gap-4">
          <div className="flex items-center gap-2.5 min-w-fit">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-light-accent to-amber-600 dark:from-dark-accent dark:to-amber-500 glow-sm">
              <BookOpen className="w-4.5 h-4.5 text-white" strokeWidth={1.5} />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base font-semibold text-light-text dark:text-dark-text tracking-tight">
                Sanctuary
              </h1>
              {isGuest && (
                <span className="text-[10px] font-medium text-light-accent dark:text-dark-accent uppercase tracking-wider">
                  Guest
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 max-w-md">
            <div
              className={`relative transition-all duration-200 ${
                searchFocused ? "scale-[1.01]" : ""
              }`}
            >
              <Search
                className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-150 ${
                  searchFocused
                    ? "text-light-accent dark:text-dark-accent"
                    : "text-light-text-muted/40 dark:text-dark-text-muted/40"
                }`}
              />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search library..."
                value={searchTerm}
                onChange={(event) => onSearch(event.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                aria-label="Search library"
                className="w-full pl-9 pr-9 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-transparent text-sm text-light-text dark:text-dark-text placeholder:text-light-text-muted/40 dark:placeholder:text-dark-text-muted/40 focus:outline-none focus:bg-light-surface dark:focus:bg-dark-surface focus:border-black/[0.06] dark:focus:border-white/[0.06] transition-all duration-200"
              />
              {searchTerm ? (
                <button
                  onClick={() => onSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
                >
                  <X className="h-3.5 w-3.5 text-light-text-muted dark:text-dark-text-muted" />
                </button>
              ) : (
                <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.04] text-[10px] font-medium text-light-text-muted/50 dark:text-dark-text-muted/50">
                  <span className="text-xs">⌘</span>K
                </kbd>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            {isGuest ? (
              <button
                type="button"
                onClick={onShowLogin}
                disabled={!onShowLogin}
                className="btn-primary py-2 px-3.5"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Sign in</span>
              </button>
            ) : (
              onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="btn-ghost"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
