import { Search, LogOut, LogIn, X, BookOpen, Moon, Sun } from "lucide-react";
import { useRef } from "react";

import { Theme } from "@/types";

import AddBookButton from "./AddBookButton";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { Input } from "./Input";

interface HeaderProps {
  isGuest?: boolean;
  onAddBook?: (file: File) => Promise<void>;
  onSearch: (term: string) => void;
  onShowLogin?: (() => void) | undefined;
  onSignOut?: (() => void) | undefined;
  onToggleTheme: () => void;
  searchTerm: string;
  theme: Theme;
  userEmail?: string;
  userImage?: string;
}

/** Brand mark + wordmark. */
function BrandMark() {
  return (
    <div className="flex items-center gap-2.5 shrink-0">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 dark:from-dark-accent dark:to-gold-700 shadow-sm shadow-gold-900/20 flex items-center justify-center">
        <BookOpen className="w-4 h-4 text-white dark:text-dark-primary" strokeWidth={2} />
      </div>
      <div className="hidden sm:block leading-tight">
        <p className="text-sm font-semibold text-light-text dark:text-dark-text">Sanctuary</p>
        <p className="text-[11px] text-light-text-muted dark:text-dark-text-muted">Book Reader</p>
      </div>
    </div>
  );
}

/** Signed-in identity chip + sign out, or the guest sign-in CTA. */
function AccountControls({
  isGuest,
  onShowLogin,
  onSignOut,
  userEmail,
  userImage,
}: Pick<HeaderProps, "isGuest" | "onShowLogin" | "onSignOut" | "userEmail" | "userImage">) {
  if (isGuest) {
    return (
      <Button onClick={onShowLogin} variant="secondary" className="gap-2">
        <LogIn className="w-4 h-4" />
        <span className="hidden sm:inline">Sign In</span>
      </Button>
    );
  }

  if (!onSignOut) return null;

  return (
    <div className="flex items-center gap-2">
      {(userImage || userEmail) && (
        <div className="hidden lg:flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08]">
          {userImage ? (
            <img src={userImage} alt="" className="w-7 h-7 rounded-full" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-light-accent/20 dark:bg-dark-accent/20 flex items-center justify-center text-[11px] font-semibold text-light-accent dark:text-dark-accent">
              {userEmail?.[0]?.toUpperCase()}
            </div>
          )}
          {userEmail && (
            <span className="max-w-[160px] truncate text-xs text-light-text-muted dark:text-dark-text-muted">
              {userEmail}
            </span>
          )}
        </div>
      )}
      <IconButton
        onClick={onSignOut}
        label="Sign out"
        icon={<LogOut className="w-4 h-4" />}
        variant="secondary"
      />
    </div>
  );
}

function Header({
  theme,
  onToggleTheme,
  searchTerm,
  onSearch,
  onAddBook,
  isGuest = false,
  onShowLogin,
  onSignOut,
  userEmail,
  userImage,
}: HeaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isDark = theme === Theme.DARK;

  return (
    <header className="fixed top-0 left-0 right-0 z-40 w-full border-b border-black/[0.06] dark:border-white/[0.06] bg-light-primary/85 dark:bg-dark-primary/85 backdrop-blur-xl">
      <div className="container-wide h-[4.5rem] flex items-center gap-4 lg:gap-8">
        <BrandMark />

        {/* Search grows to fill, but stays readable rather than stretching edge to edge. */}
        <div className="flex-1 min-w-0 max-w-xl">
          <Input
            ref={inputRef}
            type="search"
            aria-label="Search library"
            placeholder="Search books and authors"
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
            rightIcon={
              searchTerm ? (
                <IconButton
                  onClick={() => onSearch("")}
                  label="Clear search"
                  icon={<X className="w-4 h-4" />}
                  variant="ghost"
                  className="h-7 w-7 !p-0"
                />
              ) : undefined
            }
          />
        </div>

        <div className="flex items-center gap-3 ml-auto shrink-0">
          {onAddBook && <AddBookButton onAddBook={onAddBook} variant="header" />}

          <IconButton
            onClick={onToggleTheme}
            label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            icon={
              isDark ? (
                <Moon className="w-4 h-4 text-amber-300" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )
            }
            variant="ghost"
          />

          <AccountControls
            isGuest={isGuest}
            onShowLogin={onShowLogin}
            onSignOut={onSignOut}
            userEmail={userEmail}
            userImage={userImage}
          />
        </div>
      </div>
    </header>
  );
}

export default Header;
