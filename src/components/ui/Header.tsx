import React, { useState, useRef, useEffect } from "react";
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
  const [searchFocused, setSearchFocused] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && searchFocused) {
        inputRef.current?.blur();
        onSearch("");
      }
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("keydown", onKey);
    };
  }, [searchFocused, onSearch]);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'py-2' : 'py-3'}`}>
      <div className={`absolute inset-0 transition-all duration-300 ${isScrolled
        ? 'bg-light-primary/96 dark:bg-dark-primary/96 backdrop-blur-xl'
        : 'bg-light-primary/92 dark:bg-dark-primary/92 backdrop-blur-md'
        }`} />

      <div className="absolute bottom-0 left-0 right-0 h-px bg-black/[0.06] dark:bg-white/[0.08]" />

      <div className="relative container-wide">
        <div className="flex items-center justify-between gap-6">

          {/* Logo Section */}
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-2xl bg-light-surface dark:bg-dark-surface border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-center shadow-sm">
              <BookOpen className="w-5 h-5 text-light-accent dark:text-dark-accent" strokeWidth={2} />
              </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-light-text dark:text-dark-text">Sanctuary</h1>
              <p className="text-xs text-light-text-muted dark:text-dark-text-muted -mt-0.5">Your Reading Haven</p>
            </div>
          </div>

          {/* Search Section */}
          <div className="flex-1 max-w-md mx-4">
            <div className="relative group">
              <div className="relative flex items-center">
                <Search className={`absolute left-4 w-4 h-4 transition-colors duration-200 ${searchFocused
                  ? 'text-light-accent dark:text-dark-accent'
                  : 'text-light-text-muted dark:text-dark-text-muted'
                  }`} strokeWidth={2} />

                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search books, authors..."
                  value={searchTerm}
                  onChange={(e) => onSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="w-full pl-11 pr-12 py-3 bg-light-surface dark:bg-dark-surface border border-black/[0.08] dark:border-white/[0.08] rounded-2xl text-light-text dark:text-dark-text placeholder:text-light-text-muted/60 dark:placeholder:text-dark-text-muted/60 focus:outline-none focus:border-light-accent/40 dark:focus:border-dark-accent/40 transition-all duration-200"
                />

                {searchTerm && (
                  <button
                    onClick={() => onSearch("")}
                    className="absolute right-4 p-1 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors duration-150"
                  >
                    <X className="w-3 h-3 text-light-text-muted dark:text-dark-text-muted" strokeWidth={2} />
                  </button>
                )}

                {!searchTerm && (
                  <div className="absolute right-4 flex items-center gap-1 text-xs text-light-text-muted/50 dark:text-dark-text-muted/50">
                    <kbd className="px-1.5 py-0.5 bg-black/[0.05] dark:bg-white/[0.05] rounded border border-black/[0.1] dark:border-white/[0.1] font-mono text-[10px]">⌘</kbd>
                    <kbd className="px-1.5 py-0.5 bg-black/[0.05] dark:bg-white/[0.05] rounded border border-black/[0.1] dark:border-white/[0.1] font-mono text-[10px]">K</kbd>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions Section */}
          <div className="flex items-center gap-2">

            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              className="relative p-3 rounded-2xl bg-light-surface dark:bg-dark-surface border border-black/[0.08] dark:border-white/[0.08] hover:border-black/[0.12] dark:hover:border-white/[0.12] transition-all duration-200"
              aria-label="Toggle theme"
            >
              <div className="relative w-5 h-5">
                <Sun className={`absolute inset-0 w-5 h-5 text-amber-500 transition-all duration-300 ${theme === Theme.LIGHT
                  ? 'opacity-100 rotate-0 scale-100'
                  : 'opacity-0 rotate-180 scale-75'
                  }`} strokeWidth={2} />
                <Moon className={`absolute inset-0 w-5 h-5 text-blue-400 transition-all duration-300 ${theme === Theme.DARK
                  ? 'opacity-100 rotate-0 scale-100'
                  : 'opacity-0 -rotate-180 scale-75'
                  }`} strokeWidth={2} />
              </div>

            </button>

            {/* Auth Actions */}
            {isGuest ? (
              <button
                onClick={onShowLogin}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-light-accent dark:bg-dark-accent text-white font-semibold hover:opacity-90 transition-all duration-200"
              >
                <LogIn className="w-4 h-4" strokeWidth={2} />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            ) : onSignOut ? (
              <div className="flex items-center gap-3">
                {userImage && (
                  <img src={userImage} alt="Profile" className="w-8 h-8 rounded-full border border-black/[0.1] dark:border-white/[0.1]" />
                )}
                {userEmail && (
                  <span className="hidden md:inline text-xs text-light-text-muted dark:text-dark-text-muted max-w-[180px] truncate">
                    {userEmail}
                  </span>
                )}
                <button
                  onClick={onSignOut}
                  className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-light-surface dark:bg-dark-surface border border-black/[0.08] dark:border-white/[0.08] text-light-text dark:text-dark-text hover:border-red-200 dark:hover:border-red-800 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200"
                >
                  <LogOut className="w-4 h-4" strokeWidth={2} />
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
