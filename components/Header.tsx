import React from "react";
import { Search, LogOut, LogIn, User, BookOpen } from "lucide-react";
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

const Header: React.FC<HeaderProps> = ({ theme, onToggleTheme, searchTerm, onSearch, isGuest = false, onShowLogin, onSignOut }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50" role="banner">
      <div className="absolute inset-0 bg-gradient-to-b from-light-secondary/95 via-light-secondary/90 to-light-secondary/80 dark:from-dark-secondary/95 dark:via-dark-secondary/90 dark:to-dark-secondary/80 backdrop-blur-xl" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-light-accent/20 dark:via-dark-accent/20 to-transparent" />

      <div className="relative px-6 md:px-8 lg:px-12 py-5">
        <div className="flex items-center justify-between max-w-7xl mx-auto gap-6">
          {/* Logo */}
          <div className="flex items-center gap-4 min-w-fit">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-light-accent to-amber-600 dark:from-dark-accent dark:to-amber-500 rounded-xl blur-lg opacity-30" />
              <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-light-accent to-amber-600 dark:from-dark-accent dark:to-amber-500 shadow-lg">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold tracking-tight text-light-text dark:text-dark-text">Sanctuary</h1>
              {isGuest && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                  <User className="h-2.5 w-2.5" />Guest mode
                </span>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-xl mx-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-light-accent/20 to-amber-500/20 dark:from-dark-accent/20 dark:to-amber-400/20 rounded-xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-light-text-muted dark:text-dark-text-muted transition-colors group-focus-within:text-light-accent dark:group-focus-within:text-dark-accent" />
                <input
                  type="text"
                  placeholder="Search your library..."
                  value={searchTerm}
                  onChange={(event) => onSearch(event.target.value)}
                  aria-label="Search library"
                  className="w-full pl-12 pr-5 py-3 rounded-xl bg-light-card/50 dark:bg-dark-card/50 border border-light-card dark:border-dark-card text-sm text-light-text dark:text-dark-text placeholder:text-light-text-muted/60 dark:placeholder:text-dark-text-muted/60 focus:outline-none focus:bg-light-surface dark:focus:bg-dark-surface focus:border-light-accent/50 dark:focus:border-dark-accent/50 focus:ring-2 focus:ring-light-accent/20 dark:focus:ring-dark-accent/20 transition-all duration-200"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            {isGuest ? (
              <button type="button" onClick={onShowLogin} disabled={!onShowLogin} className="btn-primary text-sm px-5 py-2.5">
                <LogIn className="h-4 w-4" /><span className="hidden sm:inline">Sign in</span>
              </button>
            ) : (
              onSignOut && (
                <button type="button" onClick={onSignOut} className="btn-ghost text-sm">
                  <LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sign out</span>
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
