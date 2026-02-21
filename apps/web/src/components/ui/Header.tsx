import React, { useEffect, useRef, useState } from "react";
import { Search, LogOut, LogIn, X, BookOpen, Moon, Sun } from "lucide-react";
import { Theme } from "@/types";

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
  searchTerm: string;
  onSearch: (term: string) => void;
  isGuest?: boolean;
  onShowLogin?: () => void;
  onSignOut?: () => void;
  userEmail?: string | null;
  userImage?: string | null;
}

const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  searchTerm,
  onSearch,
  isGuest = false,
  onShowLogin,
  onSignOut,
  userEmail,
  userImage,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (localSearchTerm !== searchTerm) {
        onSearch(localSearchTerm);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [localSearchTerm, onSearch, searchTerm]);

  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.08] dark:border-white/[0.08] bg-light-primary/95 dark:bg-dark-primary/95 backdrop-blur-md">
      <div className="container-wide py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 min-w-[180px]">
            <div className="w-9 h-9 rounded-xl bg-light-surface dark:bg-dark-surface border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-light-accent dark:text-dark-accent" strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-semibold text-light-text dark:text-dark-text leading-none">Sanctuary</p>
              <p className="text-[11px] text-light-text-muted dark:text-dark-text-muted">Book Reader</p>
            </div>
          </div>

          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-text-muted dark:text-dark-text-muted" />
              <input
                ref={inputRef}
                type="text"
                aria-label="Search books and authors"
                placeholder="Search books and authors"
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-10 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-light-surface dark:bg-dark-surface text-sm text-light-text dark:text-dark-text placeholder:text-light-text-muted dark:placeholder:text-dark-text-muted focus:outline-none focus:ring-2 focus:ring-light-accent/30 dark:focus:ring-dark-accent/30"
              />
              {localSearchTerm && (
                <button
                  onClick={() => {
                    setLocalSearchTerm("");
                    onSearch("");
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5 text-light-text-muted dark:text-dark-text-muted" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleTheme}
              className="h-10 w-10 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-light-surface dark:bg-dark-surface flex items-center justify-center"
              aria-label="Toggle theme"
            >
              {theme === Theme.DARK ? <Moon className="w-4 h-4 text-blue-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
            </button>

            {isGuest ? (
              <button
                onClick={onShowLogin}
                className="h-10 px-3 rounded-xl bg-light-accent dark:bg-dark-accent text-white text-sm font-medium flex items-center gap-1.5"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            ) : onSignOut ? (
              <div className="flex items-center gap-2">
                {userImage && <img src={userImage} alt="Profile" className="w-8 h-8 rounded-full" />}
                {userEmail && (
                  <span className="hidden lg:inline max-w-[180px] truncate text-xs text-light-text-muted dark:text-dark-text-muted">
                    {userEmail}
                  </span>
                )}
                <button
                  onClick={onSignOut}
                  className="h-10 px-3 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-light-surface dark:bg-dark-surface text-sm flex items-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
