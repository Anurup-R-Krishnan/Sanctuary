import React, { useEffect, useCallback, useRef, useState } from "react";
import { useUser, useAuth } from "@/hooks/useAuth";
import { useBookStoreController } from "./hooks/useBookStoreController";
import { useStatsStoreController } from "./hooks/useStatsStoreController";
import { useDebouncedTask } from "./hooks/useDebouncedTask";
import { useSettingsShallow } from "@/context/SettingsContext";
import { useSessionStore } from "@/store/useSessionStore";
import { useUIStore } from "@/store/useUIStore";
import { useBookStore } from "@/store/useBookStore";
import { useReaderProgressStore } from "@/store/useReaderProgressStore";
import type { Book, Bookmark } from "@/types";
import { Theme, View } from "@/types";
import { BookOpen } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import MorphCanvas from "./components/ui/MorphCanvas";
import Header from "./components/ui/Header";
import Navigation from "./components/ui/Navigation";
import LibraryGrid from "./components/pages/LibraryGrid";
import ReaderView from "./components/pages/ReaderView";
import SettingsView from "./components/pages/SettingsView";
import StatsView from "./components/pages/StatsView";
import ClerkAuth from "./components/pages/Auth";
import { ReaderErrorBoundary } from "./components/ui/ReaderErrorBoundary";
import ScrapbookBackground from "./components/layout/ScrapbookBackground";

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

  // Clerk Authentication
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useAuth();
  const [showAuthScreen, setShowAuthScreen] = useState(false);
  const [transitioningBook, setTransitioningBook] = useState<Book | null>(null);

  // Global State (shallow selects to prevent over-renders)
  const { reduceMotion } = useSettingsShallow((state) => ({
    reduceMotion: state.reduceMotion
  }));

  // Library & Stats Hooks
  // Guest and Clerk users both persist through the API with scoped identities.
  const persistent = true;

  useBookStoreController({ persistent });
  const { endSession } = useStatsStoreController({
    persistent,
    compute: view === View.STATS,
  });
  const pendingProgressRef = useRef<{ id: string; progress: number; location: string } | null>(null);

  const flushPendingProgress = useCallback(async () => {
    const pending = pendingProgressRef.current;
    pendingProgressRef.current = null;
    if (!pending) return;
    await updateBookProgress(pending.id, pending.progress, pending.location);
  }, [updateBookProgress]);
  const { schedule: scheduleProgressSync, cancel: cancelProgressSync, flush: flushProgressSync } = useDebouncedTask(flushPendingProgress, 350);

  // Handlers
  const handleShowLogin = useCallback(() => {
    setIsGuest(false);
    setShowAuthScreen(true);
  }, [setIsGuest]);

  const handleSignOut = useCallback(async () => {
    if (isGuest) {
      setIsGuest(true);
      resetSession();
    } else {
      await signOut();
      resetSession();
    }
  }, [isGuest, setIsGuest, resetSession, signOut]);

  const handleCloseReader = useCallback(async () => {
    const activeProgress = useReaderProgressStore.getState().active;
    cancelProgressSync();
    await flushProgressSync();
    endSession(activeProgress?.progress);
    useReaderProgressStore.getState().clearActiveBook();
    setView(View.LIBRARY);
    setSelectedBookId(null);
    await reloadBooks();
  }, [setView, setSelectedBookId, reloadBooks, cancelProgressSync, flushProgressSync, endSession]);

  const handleAddBookmark = useCallback(async (bookId: string, bookmark: Omit<Bookmark, "id" | "createdAt">): Promise<void> => {
    const next: Bookmark = {
      ...bookmark,
      id: `${bookId}:${encodeURIComponent(bookmark.cfi)}`,
      createdAt: new Date().toISOString(),
    };
    await addBookmark(bookId, next);
  }, [addBookmark]);

  const handleRemoveBookmark = useCallback(async (bookId: string, bookmarkId: string): Promise<void> => {
    await removeBookmark(bookId, bookmarkId);
  }, [removeBookmark]);

  const handleReaderProgress = useCallback((id: string, progress: number, location: string) => {
    useReaderProgressStore.getState().updateActiveProgress(id, progress, location);
    pendingProgressRef.current = { id, progress, location };
    scheduleProgressSync();
  }, [scheduleProgressSync]);

  useEffect(() => {
    if (isSignedIn && showAuthScreen) {
      setShowAuthScreen(false);
    }
  }, [isSignedIn, showAuthScreen]);

  useEffect(() => {
    return () => {
      cancelProgressSync();
      void flushProgressSync();
      useReaderProgressStore.getState().clearActiveBook();
    };
  }, [cancelProgressSync, flushProgressSync]);

  // Theme Effect
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === Theme.DARK);
    root.classList.toggle("reduce-motion", reduceMotion);
  }, [theme, reduceMotion]);

  // Render - Explicit Auth Screen (only when user asks to sign in)
  if (showAuthScreen && !isLoaded) {
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

  if (showAuthScreen) {
    return <ClerkAuth onContinueAsGuest={() => {
      setIsGuest(true);
      setShowAuthScreen(false);
    }} />;
  }

  const isReader = view === View.READER;

  // Render - App
  return (
    <ScrapbookBackground>
      <div className={`min-h-screen font-sans text-light-text dark:text-dark-text transition-colors duration-300 ${isReader ? "immersive-layout" : "standard-layout"}`}>
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
        <main className={`relative ${isReader ? "reader-main" : view === View.LIBRARY ? "" : "standard-main"}`}>
          <div className={`${(isReader || view === View.LIBRARY) ? "" : "page-shell animate-fadeIn"}`}>
            {view === View.LIBRARY && (
              <LibraryGrid
                onSelectBook={(book) => {
                  setTransitioningBook(book);
                }}
              />
            )}
            <div className={view === View.LIBRARY ? "" : "page-shell animate-fadeIn"}>
              {view === View.SETTINGS && <SettingsView />}
              {view === View.STATS && <StatsView />}
            </div>
            {view === View.READER && selectedBook && (
              <ReaderErrorBoundary onRecover={() => { void handleCloseReader(); }} resetKey={selectedBook.id}>
                <ReaderView
                  book={selectedBook}
                  onClose={handleCloseReader}
                  onUpdateProgress={handleReaderProgress}
                  onAddBookmark={handleAddBookmark}
                  onRemoveBookmark={handleRemoveBookmark}
                  getBookContent={getBookContent}
                />
              </ReaderErrorBoundary>
            )}
          </div>
        </main>

        {/* Reader View & Transitions */}
        <MorphCanvas
          book={transitioningBook}
          onAnimationComplete={() => {
            setTransitioningBook(null);
            setSelectedBookId(transitioningBook?.id ?? null); // Use existing setter
            setView(View.READER); // Use existing setter
          }}
        />

        {/* Navigation */}
        {!isReader && (
          <Navigation activeView={view} onNavigate={setView} isReaderActive={!!selectedBookId} />
        )}
      </div>
    </ScrapbookBackground>
  );
};

export default App;
