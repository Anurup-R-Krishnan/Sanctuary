import { BookOpen } from "lucide-react";
import { useEffect, useCallback, useState } from "react";

import { useSanctuaryApi } from "@/api/useSanctuaryApi";
import { AuthScreen } from "@/auth/AuthScreen";
import { useSanctuaryAuth } from "@/auth/useSanctuaryAuth";
import { MigrationDialog } from "@/components/ui/MigrationDialog";
import { libraryService } from "@/services/LibraryService";
import { statsService } from "@/services/StatsService";
import { syncQueue } from "@/services/SyncQueue";
import { useReaderProgressStore } from "@/store/useReaderProgressStore";
import { useSessionStore } from "@/store/useSessionStore";
import { useUIStore } from "@/store/useUIStore";
import { View } from "@/types";

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
  const { mode, reset: resetSession, setSession } = useSessionStore();
  const { isLoaded, isSignedIn, user, signOut } = useSanctuaryAuth();
  const api = useSanctuaryApi();
  
  const [explicitGuest, setExplicitGuest] = useState(DISABLE_AUTH);

  const isGuest = mode === "guest";
  const isPersistent = mode === "authenticated";

  // Session State Transitions
  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn && user) {
      if (mode === "initializing") {
        setSession("authenticated", user.id);
      }
      // If mode is "guest", MigrationDialog handles the transition!
    } else if (explicitGuest && mode === "initializing") {
      setSession("guest", null);
    }
  }, [isLoaded, isSignedIn, user, mode, explicitGuest, setSession]);

  // Global UI State
  const { theme, view, searchTerm, setView, setSearchTerm, toggleTheme } = useUIStore();
  const selectedBookId = useReaderProgressStore((state) => state.active?.bookId ?? null);

  // Custom Hooks (Encapsulated Logic)
  useAppTheme();
  const { handleReaderProgress, flushPendingProgress } = useProgressSync(api, isPersistent);
  const { startSession, endSession, addBookmark, removeBookmark } = useReadingSession(api, isPersistent, flushPendingProgress);

  // Stable API calls for children to prevent N+1 re-renders
  const handleGetBookContent = useCallback((id: string) => libraryService.getBookContent(id, api, isPersistent), [api, isPersistent]);
  const handleAddBook = useCallback((file: File) => libraryService.addBook(file, api, isPersistent), [api, isPersistent]);
  const handleToggleFavorite = useCallback((id: string) => libraryService.toggleFavorite(id, api, isPersistent), [api, isPersistent]);
  const handleDeleteBook = useCallback((id: string) => libraryService.deleteBook(id, api, isPersistent), [api, isPersistent]);

  useEffect(() => {
    if (mode === "initializing") return;
    syncQueue.init(api, isPersistent);
    libraryService.loadBooks(api, isPersistent);
    statsService.loadSessions(api, isPersistent);
    statsService.fetchGoals(api, isPersistent);
    return () => libraryService.cleanupAllObjectUrls();
  }, [api, isPersistent, mode]);

  // Handlers
  const handleShowLogin = useCallback(() => {
    setExplicitGuest(false);
  }, []);

  const handleSignOut = useCallback(async () => {
    if (isSignedIn) {
      await signOut();
    }
    setExplicitGuest(false);
    resetSession();
  }, [isSignedIn, signOut, resetSession]);

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

  if (!DISABLE_AUTH && !isSignedIn && !explicitGuest) {
    return <AuthScreen onContinueAsGuest={() => setExplicitGuest(true)} />;
  }

  const isReader = view === View.READER;


  return (
    <div className={`min-h-screen font-sans bg-light-primary dark:bg-dark-primary text-light-text dark:text-dark-text transition-colors duration-300 ${isReader ? "immersive-layout" : "standard-layout"}`}>
      <MigrationDialog />
      {!isReader && (
        <Header
          theme={theme}
          onToggleTheme={toggleTheme}
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
          isGuest={isGuest}
          onShowLogin={isGuest ? handleShowLogin : undefined}
          onSignOut={isSignedIn ? handleSignOut : undefined}
          userEmail={user?.email || undefined}
          userImage={user?.imageUrl || undefined}
        />
      )}

      <main className={`relative ${isReader ? "reader-main" : "standard-main"}`}>
        <div className={`${isReader ? "" : "page-shell animate-fadeIn"}`}>
          {view === View.LIBRARY && (
            <LibraryGrid
              onSelectBook={startSession}
              addBook={handleAddBook}
              toggleFavorite={handleToggleFavorite}
              deleteBook={handleDeleteBook}
            />
          )}
          {view === View.SETTINGS && <SettingsView />}
          {view === View.STATS && <StatsView />}
          {view === View.READER && selectedBookId && (
            <ReaderView
              bookId={selectedBookId}
              onClose={endSession}
              onUpdateProgress={handleReaderProgress}
              onAddBookmark={addBookmark}
              onRemoveBookmark={removeBookmark}
              getBookContent={handleGetBookContent}
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
