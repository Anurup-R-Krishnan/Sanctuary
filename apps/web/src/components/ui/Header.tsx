import { Search, LogOut, LogIn, X, BookOpen, Moon, Sun } from "lucide-react";
import { useRef } from "react";

import { Theme } from "@/types";

import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { Input } from "./Input";

interface HeaderProps {
  isGuest?: boolean;
  onSearch: (term: string) => void;
  onShowLogin?: (() => void) | undefined;
  onSignOut?: (() => void) | undefined;
  onToggleTheme: () => void;
  searchTerm: string;
  theme: Theme;
  userEmail?: string;
  userImage?: string;
}

function Header({
  theme,
  onToggleTheme,
  searchTerm,
  onSearch,
  isGuest = false,
  onShowLogin,
  onSignOut,
  userEmail,
  userImage,
}: HeaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 w-full border-b border-black/[0.08] dark:border-white/[0.08] bg-light-primary/95 dark:bg-dark-primary/95 backdrop-blur-md">
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
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search books and authors"
              value={searchTerm}
              onChange={(e) => onSearch(e.target.value)}
              icon={<Search className="w-4 h-4" />}
              rightIcon={
                searchTerm && (
                  <IconButton
                    onClick={() => onSearch("")}
                    label="Clear search"
                    icon={<X className="w-4 h-4" />}
                    variant="ghost"
                    className="h-8 w-8 !p-0"
                  />
                )
              }
            />
          </div>

          <div className="flex items-center gap-2">
            <IconButton
              onClick={onToggleTheme}
              label="Toggle theme"
              icon={theme === Theme.DARK ? <Moon className="w-4 h-4 text-blue-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              variant="secondary"
            />

            {isGuest ? (
              <Button
                onClick={onShowLogin}
                variant="primary"
                className="gap-1.5"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Sign In</span>
              </Button>
            ) : onSignOut ? (
              <div className="flex items-center gap-2">
                {userImage && <img src={userImage} alt="Profile" className="w-8 h-8 rounded-full" />}
                {userEmail && (
                  <span className="hidden lg:inline max-w-[180px] truncate text-xs text-light-text-muted dark:text-dark-text-muted">
                    {userEmail}
                  </span>
                )}
                <Button
                  onClick={onSignOut}
                  variant="secondary"
                  className="gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
