import React, { useEffect, useCallback, useRef } from "react";
import { useUser, useAuth } from "@/hooks/useAuth";
import { useBookStoreController } from "./hooks/useBookStoreController";
import { useStatsStoreController } from "./hooks/useStatsStoreController";
import { useSettingsShallow } from "@/context/SettingsContext";
import { useSessionStore } from "@/store/useSessionStore";
import { useUIStore } from "@/store/useUIStore";
import { useBookStore } from "@/store/useBookStore";
import { useReaderProgressStore } from "@/store/useReaderProgressStore";
import type { Book, Bookmark } from "@/types";
import { Theme, View } from "@/types";
import { BookOpen } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import Header from "./components/ui/Header";
import Navigation from "./components/ui/Navigation";
import LibraryGrid from "./components/pages/LibraryGrid";
import ReaderView from "./components/pages/ReaderView";
import SettingsView from "./components/pages/SettingsView";
import StatsView from "./components/pages/StatsView";
import ClerkAuth from "./components/pages/Auth";

const DISABLE_AUTH = import.meta.env.VITE_DISABLE_AUTH === "true";

const App: React.FC = () => {
  // Global Stores
  const { isGuest, setIsGuest, reset: resetSession } = useSessionStore();
  const { theme, view, selectedBookId, searchTerm, setView, setSelectedBookId, setSearchTerm, toggleTheme } = useUIStore();
  const {
    selectedBook,
    updateBookProgress,
    addBookmark,
    removeBookmark,
    getBookContent,
    reloadBooks,
  } = useBookStore(useShallow((state) => ({
    selectedBook: state.getBookById(selectedBookId),
    updateBookProgress: state.updateBookProgress,
    addBookmark: state.addBookmark,
    removeBookmark: state.removeBookmark,
    getBookContent: state.getBookContent,
    reloadBooks: state.reloadBooks,
  })));

  // Clerk Hooks
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useAuth();

  // Settings Context
  const { reduceMotion } = useSettingsShallow((state) => ({
    reduceMotion: state.reduceMotion
  }));

  // Library & Stats Hooks
  // When auth is disabled, always treat as persistent (local storage mode)
  const persistent = DISABLE_AUTH ? true : (isSignedIn && !isGuest);

  useBookStoreController({ persistent });
  const { startSession, endSession } = useStatsStoreController({
    persistent,
    compute: view === View.STATS,
  });
  const pendingProgressRef = useRef<{ id: string; progress: number; location: string } | null>(null);
  const progressTimerRef = useRef<number | null>(null);

  const flushPendingProgress = useCallback(async () => {
    const pending = pendingProgressRef.current;
    pendingProgressRef.current = null;
    if (!pending) return;
    await updateBookProgress(pending.id, pending.progress, pending.location);
  }, [updateBookProgress]);

  // Handlers
  const handleShowLogin = useCallback(() => {
    setIsGuest(false);
    // Clerk handles the rest (redirects to sign in if we render logic correctly)
  }, [setIsGuest]);

  const handleSignOut = useCallback(async () => {
    if (isGuest) {
      setIsGuest(false);
      resetSession();
    } else {
      await signOut();
      resetSession();
    }
  }, [isGuest, setIsGuest, resetSession, signOut]);

  const handleSelectBook = useCallback((book: Book) => {
    useReaderProgressStore.getState().setActiveBook(book.id, book.progress, book.lastLocation);
    setSelectedBookId(book.id);
    setView(View.READER);
    startSession(book.id, book.progress);
  }, [setSelectedBookId, setView, startSession]);

  const handleCloseReader = useCallback(async () => {
    const activeProgress = useReaderProgressStore.getState().active;
    if (progressTimerRef.current !== null) {
      window.clearTimeout(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    await flushPendingProgress();
    endSession(activeProgress?.progress);
    useReaderProgressStore.getState().clearActiveBook();
    setView(View.LIBRARY);
    setSelectedBookId(null);
    await reloadBooks();
  }, [setView, setSelectedBookId, reloadBooks, flushPendingProgress, endSession]);

  const handleAddBookmark = useCallback((bookId: string, bookmark: Omit<Bookmark, "id" | "createdAt">) => {
    const next: Bookmark = {
      ...bookmark,
      id: `${bookId}:${encodeURIComponent(bookmark.cfi)}`,
      createdAt: new Date().toISOString(),
    };
    addBookmark(bookId, next);
  }, [addBookmark]);

  const handleReaderProgress = useCallback((id: string, progress: number, location: string) => {
    useReaderProgressStore.getState().updateActiveProgress(id, progress, location);
    pendingProgressRef.current = { id, progress, location };
    if (progressTimerRef.current !== null) {
      window.clearTimeout(progressTimerRef.current);
    }
    progressTimerRef.current = window.setTimeout(() => {
      progressTimerRef.current = null;
      void flushPendingProgress();
    }, 350);
  }, [flushPendingProgress]);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current !== null) {
        window.clearTimeout(progressTimerRef.current);
      }
      void flushPendingProgress();
      useReaderProgressStore.getState().clearActiveBook();
    };
  }, [flushPendingProgress]);

  // Theme Effect
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === Theme.DARK);
    root.classList.toggle("reduce-motion", reduceMotion);

    const bgColor = theme === Theme.DARK ? "#0f0e0d" : "#fefcf8";
    document.body.style.backgroundColor = bgColor;
    document.body.style.transition = reduceMotion ? "none" : "background-color 0.3s ease";
  }, [theme, reduceMotion]);

  // Render - Loading State (Clerk)
  if (!DISABLE_AUTH && !isLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-light-primary dark:bg-dark-primary">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-light-accent/20 to-amber-500/20 dark:from-dark-accent/20 dark:to-amber-400/20 rounded-3xl blur-3xl scale-150" />
          <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-light-accent to-amber-600 dark:from-dark-accent dark:to-amber-500 flex items-center justify-center shadow-2xl">
            <BookOpen className="w-9 h-9 text-white animate-pulse-soft" strokeWidth={1.5} />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">Sanctuary</h2>
          <p className="text-sm text-light-text-muted dark:text-dark-text-muted">Preparing your reading sanctuary...</p>
        </div>
      </div>
    );
  }

  // Render - Auth (skip entirely when auth is disabled)
  if (!DISABLE_AUTH && !isSignedIn && !isGuest) {
    return <ClerkAuth onContinueAsGuest={() => setIsGuest(true)} />;
  }

  const isReader = view === View.READER;

  // Render - App
  return (
    <div className={`min-h-screen font-sans bg-light-primary dark:bg-dark-primary text-light-text dark:text-dark-text transition-colors duration-300 ${isReader ? "immersive-layout" : "standard-layout"}`}>
      {/* Header */}
      {!isReader && (
        <Header
          theme={theme}
          onToggleTheme={toggleTheme}
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
          isGuest={isGuest}
          onShowLogin={isGuest ? handleShowLogin : undefined}
          onSignOut={isSignedIn ? handleSignOut : undefined}
          userEmail={user?.primaryEmailAddress?.emailAddress}
          userImage={user?.imageUrl}
        />
      )}

      {/* Main Content */}
      <main className={`relative ${isReader ? "reader-main" : "standard-main"}`}>
        <div className={`${isReader ? "" : "page-shell animate-fadeIn"}`}>
          {view === View.LIBRARY && (
            <LibraryGrid
              onSelectBook={handleSelectBook}
            />
          )}
          {view === View.SETTINGS && <SettingsView />}
          {view === View.STATS && <StatsView />}
          {view === View.READER && selectedBook && (
            <ReaderView
              book={selectedBook}
              onClose={handleCloseReader}
              onUpdateProgress={handleReaderProgress}
              onAddBookmark={handleAddBookmark}
              onRemoveBookmark={removeBookmark}
              getBookContent={getBookContent}
            />
          )}
        </div>
      </main>

      {/* Navigation */}
      {!isReader && (
        <Navigation activeView={view} onNavigate={setView} isReaderActive={!!selectedBookId} />
      )}
    </div>
  );
};

export default App;
