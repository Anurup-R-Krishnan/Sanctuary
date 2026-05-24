import { BookOpen } from "lucide-react";
import { useEffect, useCallback } from "react";

import { useUser, useAuth } from "@/hooks/useAuth";
import { libraryService } from "@/services/LibraryService";
import { statsService } from "@/services/StatsService";
import { useBookStore } from "@/store/useBookStore";
import { useSessionStore } from "@/store/useSessionStore";
import { useUIStore } from "@/store/useUIStore";
import { View } from "@/types";

import ClerkAuth from "./components/pages/Auth";
import LibraryGrid from "./components/pages/LibraryGrid";
import ReaderView from "./components/pages/ReaderView";
import SettingsView from "./components/pages/SettingsView";
import StatsView from "./components/pages/StatsView";
import Header from "./components/ui/Header";
import Navigation from "./components/ui/Navigation";
import { useAppTheme } from "./hooks/useAppTheme";
import { useProgressSync } from "./hooks/useProgressSync";
import { useReadingSession } from "./hooks/useReadingSession";

const DISABLE_AUTH = import.meta.env.VITE_DISABLE_AUTH === "true";

function App() {
  // Auth & Session
  const { isGuest, setIsGuest, reset: resetSession } = useSessionStore();
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut, getToken } = useAuth();
  const isPersistent = DISABLE_AUTH ? true : !!(isSignedIn && !isGuest);

  // Global UI State
  const { theme, view, selectedBookId, searchTerm, setView, setSearchTerm, toggleTheme } = useUIStore();
  const selectedBook = useBookStore((state) => state.getBookById(selectedBookId));

  // Custom Hooks (Encapsulated Logic)
  useAppTheme();
  const { handleReaderProgress, flushPendingProgress } = useProgressSync(getToken, isPersistent);
  const { startSession, endSession, addBookmark, removeBookmark } = useReadingSession(getToken, isPersistent, flushPendingProgress);

  // Initial Data Load
  useEffect(() => {
    libraryService.loadBooks(getToken, isPersistent);
    statsService.loadSessions(getToken, isPersistent);
    statsService.fetchGoals(getToken);
    return () => libraryService.cleanupAllObjectUrls();
  }, [getToken, isPersistent]);

  // Handlers
  const handleShowLogin = useCallback(() => {
    setIsGuest(false);
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

  // Render Helpers
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

  if (!DISABLE_AUTH && !isSignedIn && !isGuest) {
    return <ClerkAuth onContinueAsGuest={() => setIsGuest(true)} />;
  }

  const isReader = view === View.READER;

  return (
    <div className={`min-h-screen font-sans bg-light-primary dark:bg-dark-primary text-light-text dark:text-dark-text transition-colors duration-300 ${isReader ? "immersive-layout" : "standard-layout"}`}>
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

      <main className={`relative ${isReader ? "reader-main" : "standard-main"}`}>
        <div className={`${isReader ? "" : "page-shell animate-fadeIn"}`}>
          {view === View.LIBRARY && (
            <LibraryGrid
              onSelectBook={startSession}
              addBook={(file) => libraryService.addBook(file, getToken, isPersistent)}
              toggleFavorite={(id) => libraryService.toggleFavorite(id, getToken, isPersistent)}
            />
          )}
          {view === View.SETTINGS && <SettingsView />}
          {view === View.STATS && <StatsView />}
          {view === View.READER && selectedBook && (
            <ReaderView
              book={selectedBook}
              onClose={endSession}
              onUpdateProgress={handleReaderProgress}
              onAddBookmark={addBookmark}
              onRemoveBookmark={removeBookmark}
              getBookContent={(id) => libraryService.getBookContent(id, getToken, isPersistent)}
            />
          )}
        </div>
      </main>

      {!isReader && (
        <Navigation activeView={view} onNavigate={setView} isReaderActive={!!selectedBookId} />
      )}
    </div>
  );
}

export default App;
