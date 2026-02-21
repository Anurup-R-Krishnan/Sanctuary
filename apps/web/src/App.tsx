import React, { useEffect, useCallback, useMemo } from "react";
import { useUser, useAuth } from "@/hooks/useAuth";
import { useBookLibrary } from "./hooks/useBookLibrary";
import { useReadingStats } from "./hooks/useReadingStats";
import { useSettings } from "@/context/SettingsContext";
import { useSessionStore } from "@/store/useSessionStore";
import { useUIStore } from "@/store/useUIStore";
import type { Book } from "@/types";
import { Theme, View } from "@/types";
import { BookOpen } from "lucide-react";

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
  const { theme, view, selectedBook, searchTerm, setView, setSelectedBook, setSearchTerm, toggleTheme } = useUIStore();

  // Clerk Hooks
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useAuth();

  // Settings Context
  const {
    dailyGoal,
    weeklyGoal,
    setDailyGoal,
    setWeeklyGoal,
    reduceMotion
  } = useSettings();

  // Library & Stats Hooks
  // When auth is disabled, always treat as persistent (local storage mode)
  const persistent = DISABLE_AUTH ? true : (isSignedIn && !isGuest);

  const {
    books, sortedBooks, recentBooks, favoriteBooks, seriesGroups,
    addBook, updateBookProgress, toggleFavorite, addBookmark, removeBookmark,
    sortBy, setSortBy, filterBy, setFilterBy, isLoading: libLoading,
    reloadBooks
  } = useBookLibrary({ persistent });

  const { stats, startSession, endSession } = useReadingStats(books);

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
    setSelectedBook(book);
    setView(View.READER);
    startSession(book.id);
  }, [setSelectedBook, setView, startSession]);

  const handleCloseReader = useCallback(() => {
    endSession(0);
    setView(View.LIBRARY);
    setSelectedBook(null);
    reloadBooks();
  }, [endSession, setView, setSelectedBook, reloadBooks]);

  const handleUpdateGoal = useCallback((d: number, w: number) => {
    setDailyGoal(d);
    setWeeklyGoal(w);
  }, [setDailyGoal, setWeeklyGoal]);

  const filteredBooks = useMemo(() => {
    if (!searchTerm) return books;
    const term = searchTerm.toLowerCase();
    return books.filter(b => b.title.toLowerCase().includes(term) || b.author.toLowerCase().includes(term));
  }, [books, searchTerm]);

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
              books={filteredBooks}
              sortedBooks={sortedBooks}
              recentBooks={recentBooks}
              favoriteBooks={favoriteBooks}
              seriesGroups={seriesGroups}
              onSelectBook={handleSelectBook}
              addBook={addBook}
              isLoading={libLoading}
              sortBy={sortBy}
              setSortBy={setSortBy}
              filterBy={filterBy}
              setFilterBy={setFilterBy}
              onToggleFavorite={toggleFavorite}
              searchTerm={searchTerm}
            />
          )}
          {view === View.SETTINGS && <SettingsView />}
          {view === View.STATS && (
            <StatsView
              stats={stats}
              dailyGoal={dailyGoal}
              weeklyGoal={weeklyGoal}
              onUpdateGoal={handleUpdateGoal}
            />
          )}
          {view === View.READER && selectedBook && (
            <ReaderView
              book={selectedBook}
              onClose={handleCloseReader}
              onUpdateProgress={updateBookProgress}
              onAddBookmark={addBookmark}
              onRemoveBookmark={removeBookmark}
            />
          )}
        </div>
      </main>

      {/* Navigation */}
      {!isReader && (
        <Navigation activeView={view} onNavigate={setView} isReaderActive={!!selectedBook} />
      )}
    </div>
  );
};

export default App;
