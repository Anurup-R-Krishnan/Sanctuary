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

import Header from "./components/ui/Header";
import Navigation from "./components/ui/Navigation";
import LibraryGrid from "./components/pages/LibraryGrid";
import ReaderView from "./components/pages/ReaderView";
import SettingsView from "./components/pages/SettingsView";
import StatsView from "./components/pages/StatsView";
import ClerkAuth from "./components/pages/Auth";
import ScrapbookLayout from "./components/layout/ScrapbookLayout";
import { ReaderErrorBoundary } from "./components/ui/ReaderErrorBoundary";

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
  const [showAuthScreen, setShowAuthScreen] = useState(false);

  // Settings Context
  const { reduceMotion } = useSettingsShallow((state) => ({
    reduceMotion: state.reduceMotion
  }));

  // Library & Stats Hooks
  const persistent = true;

  useBookStoreController({ persistent });
  const { startSession, endSession } = useStatsStoreController({
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

  const handleSelectBook = useCallback((book: Book) => {
    useReaderProgressStore.getState().setActiveBook(book.id, book.progress, book.lastLocation);
    setSelectedBookId(book.id);
    setView(View.READER);
    startSession(book.id, book.progress);
  }, [setSelectedBookId, setView, startSession]);

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

  // Render - Explicit Auth Screen (Scrapbook Themed)
  if (showAuthScreen && !isLoaded) {
    return (
      <ScrapbookLayout>
        <div className="min-h-screen flex flex-col items-center justify-center pointer-events-none">
            <div className="bg-white p-8 rounded-full shadow-scrap-deep animate-pulse-soft border-4 border-scrap-navy pointer-events-auto">
                <BookOpen className="w-12 h-12 text-scrap-navy" strokeWidth={2} />
            </div>
            <p className="mt-6 text-scrap-navy font-head text-xl font-bold bg-scrap-cream px-4 py-1 rounded-lg border border-scrap-navy shadow-sm transform -rotate-2">
                Gathering supplies...
            </p>
        </div>
      </ScrapbookLayout>
    );
  }

  if (showAuthScreen) {
    return (
        <ScrapbookLayout>
             <ClerkAuth onContinueAsGuest={() => {
                setIsGuest(true);
                setShowAuthScreen(false);
             }} />
        </ScrapbookLayout>
    );
  }

  const isReader = view === View.READER;

  if (isReader && selectedBook) {
      return (
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
      );
  }

  // Render - Main App (Scrapbook Layout)
  return (
    <ScrapbookLayout view={view}>
      {/* Header */}
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

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 pb-32">
          {view === View.LIBRARY && (
            <LibraryGrid onSelectBook={handleSelectBook} />
          )}
          {/* We keep Stats and Settings as is for now, they will inherit global font/color styles but might need specific layout tweaks later if requested. The prompt focused on Library/Empty State. */}
          {view === View.SETTINGS && <SettingsView />}
          {view === View.STATS && <StatsView />}
      </main>

      {/* Navigation */}
      <Navigation activeView={view} onNavigate={setView} isReaderActive={!!selectedBookId} />
    </ScrapbookLayout>
  );
};

export default App;
