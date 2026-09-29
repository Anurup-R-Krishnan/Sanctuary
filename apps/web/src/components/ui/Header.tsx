import { Search, LogOut, LogIn, X, BookOpen, Moon, Sun, Cloud, CloudOff, RefreshCw } from "lucide-react";
import { useRef } from "react";

import { useSyncStatus } from "@/services/SyncQueue";
import { Theme } from "@/types";

import AddBookButton from "./AddBookButton";
import { IconButton } from "./IconButton";
import { Input } from "./Input";

interface HeaderProps {
  isGuest?: boolean;
  onAddBook?: (file: File) => Promise<void>;
  onGoHome?: () => void;
  onOpenGlobalSearch?: () => void;
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
function BrandMark({ onClick }: { onClick?: () => void }) {
  return (
    <button
      aria-label="Sanctuary home"
      className="flex items-center gap-2.5 shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      onClick={onClick}
      type="button"
    >
      <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shadow-paper ring-1 ring-inset ring-black/10">
        <BookOpen className="w-4 h-4 text-accent-fg" strokeWidth={1.75} />
      </div>
      <span className="hidden sm:block font-display text-xl font-medium tracking-tight text-fg">Sanctuary</span>
    </button>
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
    // No sign-in entry when there is no backend (desktop build without an API URL).
    if (!onShowLogin) return null;
    return (
      <button
        className="group inline-flex h-10 items-center gap-2 rounded-lg border border-accent/45 bg-accent/[0.07] px-3 text-sm font-medium text-accent transition-colors duration-instant hover:border-accent hover:bg-accent hover:text-accent-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page sm:px-4"
        onClick={onShowLogin}
        type="button"
      >
        <LogIn className="h-4 w-4 transition-transform duration-instant group-hover:translate-x-0.5" strokeWidth={1.75} />
        <span className="hidden sm:inline">Sign in</span>
      </button>
    );
  }

  if (!onSignOut) return null;

  return (
    <div className="flex items-center gap-2">
      {(userImage || userEmail) && (
        <div className="hidden lg:flex items-center gap-2 rounded-full border border-line bg-surface-raised py-1 pl-1 pr-3">
          {userImage ? (
            <img src={userImage} alt="" className="w-7 h-7 rounded-full" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-xs font-semibold text-accent">
              {userEmail?.[0]?.toUpperCase()}
            </div>
          )}
          {userEmail && (
            <span className="max-w-[160px] truncate text-xs text-fg-muted">
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

/** Visual cloud sync indicator (Synced, Syncing, Offline, or Local-only) */
function SyncStatusIndicator({ isGuest }: { isGuest?: boolean }) {
  const status = useSyncStatus();

  if (isGuest || status === "local-only") {
    return null;
  }

  if (status === "syncing") {
    return (
      <div
        className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent"
        title="Syncing changes"
      >
        <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
        <span className="hidden sm:inline">Syncing</span>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-subtle px-2.5 py-1 text-xs font-medium text-fg-muted"
        title="Offline. Changes will sync when the connection returns."
      >
        <CloudOff className="w-3 h-3 shrink-0" />
        <span className="hidden sm:inline">Offline</span>
      </div>
    );
  }

  return (
    <div
      className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-raised px-2.5 py-1 text-xs font-medium text-fg-muted"
      title="All changes synced"
    >
      <Cloud className="w-3 h-3 shrink-0" />
      <span>Synced</span>
    </div>
  );
}

function Header({
  isGuest = false,
  onAddBook,
  onGoHome,
  onOpenGlobalSearch,
  onSearch,
  onShowLogin,
  onSignOut,
  onToggleTheme,
  searchTerm,
  theme,
  userEmail,
  userImage,
}: HeaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isDark = theme === Theme.DARK;

  return (
    <header className="fixed top-0 left-0 right-0 z-40 w-full border-b border-line bg-page/95">
      <div className="container-wide h-[4.5rem] flex items-center gap-4 lg:gap-8">
        <BrandMark onClick={onGoHome} />

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
              ) : onOpenGlobalSearch ? (
                <button
                  className="mr-1 hidden items-center rounded border border-line bg-surface-raised px-1.5 py-0.5 font-mono text-2xs text-fg-muted shadow-[0_1px_0_rgb(var(--color-line))] transition-colors hover:text-fg sm:flex"
                  onClick={onOpenGlobalSearch}
                  title="Full-text search (Cmd+K)"
                  type="button"
                >
                  ⌘K
                </button>
              ) : undefined
            }
          />
        </div>

        <div className="flex items-center gap-3 ml-auto shrink-0">
          {onAddBook && <AddBookButton onAddBook={onAddBook} variant="header" />}

          <SyncStatusIndicator isGuest={isGuest} />

          <IconButton
            onClick={onToggleTheme}
            label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            icon={
              isDark ? (
                <Moon className="w-4 h-4 text-fg-muted" strokeWidth={1.75} />
              ) : (
                <Sun className="w-4 h-4 text-fg-muted" strokeWidth={1.75} />
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
