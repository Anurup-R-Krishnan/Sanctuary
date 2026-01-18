import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { Session } from "@supabase/supabase-js";
import { ClerkProvider } from "@clerk/clerk-react";
import { View, Book } from "@/types";
import { useBookLibrary } from "./hooks/useBookLibrary";
import { useReadingStats } from "./hooks/useReadingStats";
import { useCloudSync } from "./hooks/useCloudSync";
import { useSettings } from "@/context/SettingsContext";
import { ToastProvider } from "@/context/ToastContext";
import Header from "./components/ui/Header";
import Navigation from "./components/ui/Navigation";
import LibraryGrid from "./components/pages/LibraryGrid";
import ReaderView from "./components/pages/ReaderView";
import SettingsView from "./components/pages/SettingsView";
import StatsView from "./components/pages/StatsView";
import Auth from "./components/pages/Auth";
import ScreenReaderAnnouncer from "./components/ui/ScreenReaderAnnouncer";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { supabase } from "./lib/supabase";
import { BookOpen } from "lucide-react";

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const {
    dailyGoal,
    setDailyGoal,
    setWeeklyGoal,
    reduceMotion,
    computedTheme,
  } = useSettings();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", computedTheme === "dark");
  }, [computedTheme]);

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!active) return;
        if (s) { setSession(s); setIsGuest(false); }
      } catch (e) {
        console.error("Session init failed:", e);
      } finally {
        if (active) setIsAuthLoading(false);
      }
    };
    init();
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!active) return;
      setSession(s);
      setIsGuest(false);
      setIsAuthLoading(false);
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  const [view, setView] = useState<View>(View.LIBRARY);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const persistent = !isGuest && Boolean(session);
  const {
    books, sortedBooks, recentBooks, favoriteBooks, seriesGroups,
    addBook, updateBookProgress, toggleFavorite, addBookmark, removeBookmark,
    deleteBook, sortBy, setSortBy, filterBy, setFilterBy, isLoading: libLoading,
    syncBookFromCloud
  } = useBookLibrary({ persistent });
  const { stats, startSession, endSession } = useReadingStats(books, dailyGoal);
  const { syncProgress } = useCloudSync(syncBookFromCloud, session);

  // Session tracking to calculate pages read
  const sessionStartPage = React.useRef<number>(0);
  const currentSessionPage = React.useRef<number>(0);

  const handleUpdateProgress = useCallback((id: string, progress: number, location: string) => {
    currentSessionPage.current = progress;
    updateBookProgress(id, progress, location);
    // Sync to cloud
    const book = books.find(b => b.id === id);
    if (book) {
      syncProgress(id, progress, location, book);
    }
  }, [updateBookProgress, syncProgress, books]);

  const handleGuestMode = useCallback(() => {
    setIsGuest(true);
    setSession(null);
    setIsAuthLoading(false);
  }, []);

  const handleShowLogin = useCallback(() => {
    setIsGuest(false);
    setSession(null);
  }, []);

  const handleSignOut = useCallback(async () => {
    setIsAuthLoading(true);
    try { await supabase.auth.signOut(); }
    catch (e) { console.error("Sign out error:", e); }
    finally { setSession(null); setIsGuest(false); setIsAuthLoading(false); }
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("reduce-motion", reduceMotion);

    const bgColor = computedTheme === 'dark' ? "#0f0e0d" : "#fefcf8";
    document.body.style.backgroundColor = bgColor;
    document.body.style.transition = reduceMotion ? "none" : "background-color 0.3s ease";
  }, [computedTheme, reduceMotion]);

  const handleSelectBook = useCallback((book: Book) => {
    setSelectedBook(book);
    setView(View.READER);

    // Initialize session tracking
    // Note: book.progress might be a percentage or page number depending on context,
    // but here we assume it maps to the location mechanism used in ReaderView.
    // If it's pure percentage (0-100), we might need to rely on what ReaderView reports back.
    // However, ReaderView initializes with book.progress.
    // Let's assume it's the "current page" or "percentage location".
    // We will update it as soon as the reader reports the first location.
    sessionStartPage.current = book.progress || 0;
    currentSessionPage.current = book.progress || 0;

    startSession(book.id);
  }, [startSession]);

  const handleCloseReader = useCallback(() => {
    // Calculate pages read this session
    // Only count positive progress (reading forward)
    const pagesRead = Math.max(0, currentSessionPage.current - sessionStartPage.current);

    endSession(pagesRead);
    setView(View.LIBRARY);
    setSelectedBook(null);
  }, [endSession]);

  const filteredBooks = useMemo(() => {
    if (!searchTerm) return books;
    const term = searchTerm.toLowerCase();
    return books.filter(b => b.title.toLowerCase().includes(term) || b.author.toLowerCase().includes(term));
  }, [books, searchTerm]);

  const handleUpdateGoal = useCallback((d: number, w: number) => {
    setDailyGoal(d);
    setWeeklyGoal(w);
  }, [setDailyGoal, setWeeklyGoal]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-light-primary dark:bg-dark-primary">
        <div className="relative mb-8">
          {/* Subtle pulse ring */}
          <div className="absolute inset-0 -m-3 rounded-2xl bg-light-accent/5 dark:bg-dark-accent/5 animate-pulse" />
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-light-surface to-light-secondary dark:from-dark-surface dark:to-dark-secondary border border-light-accent/10 dark:border-dark-accent/10 flex items-center justify-center shadow-lg shadow-light-accent/5 dark:shadow-dark-accent/5">
            <BookOpen className="w-9 h-9 text-light-accent dark:text-dark-accent" strokeWidth={1.5} />
          </div>
        </div>
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-serif font-semibold text-light-text dark:text-dark-text">Sanctuary</h2>
          <p className="text-sm text-light-text-muted dark:text-dark-text-muted">Preparing your reading space...</p>
        </div>
      </div>
    );
  }

  if (!session && !isGuest) return <Auth onContinueAsGuest={handleGuestMode} />;

  const isReader = view === View.READER;
  const layoutClasses = isReader ? "immersive-layout" : "standard-layout";

  return (
    <div className={`min-h-screen font-sans bg-light-primary dark:bg-dark-primary text-light-text dark:text-dark-text transition-colors duration-300 ${layoutClasses}`}>
      {/* Background Decorations REMOVED */}

      {/* Accessibility Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-[60] px-4 py-2 bg-white dark:bg-black text-light-text dark:text-dark-text rounded-lg border border-black/10 dark:border-white/10 shadow-lg focus-ring font-medium"
      >
        Skip to content
      </a>

      <ScreenReaderAnnouncer view={view} />

      {/* Header */}
      {view !== View.READER && (
        <Header
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
          isGuest={isGuest}
          onShowLogin={handleShowLogin}
          onSignOut={persistent ? handleSignOut : undefined}
        />
      )}

      {/* Main Content Container */}
      <main id="main-content" className={`relative ${isReader ? 'reader-main' : 'standard-main pt-20 pb-32 px-4 sm:px-6 lg:px-8'}`}>
        <div className={`${isReader ? '' : 'max-w-7xl mx-auto animate-fadeIn'}`}>
          {view === View.LIBRARY && (
            <LibraryGrid
              books={filteredBooks}
              sortedBooks={sortedBooks}
              recentBooks={recentBooks}
              favoriteBooks={favoriteBooks}
              seriesGroups={seriesGroups}
              onSelectBook={handleSelectBook}
              addBook={addBook}
              onDeleteBook={deleteBook}
              isLoading={libLoading}
              sortBy={sortBy}
              setSortBy={setSortBy}
              filterBy={filterBy}
              setFilterBy={setFilterBy}
              onToggleFavorite={toggleFavorite}
              searchTerm={searchTerm}
            />
          )}
          {view === View.SETTINGS && <SettingsView onBack={() => setView(View.LIBRARY)} />}
          {view === View.STATS && (
            <StatsView
              stats={stats}
              dailyGoal={dailyGoal}
              onUpdateGoal={handleUpdateGoal}
              onBack={() => setView(View.LIBRARY)}
            />
          )}
          {view === View.READER && selectedBook && (
            <ReaderView
              book={selectedBook}
              onClose={handleCloseReader}
              onUpdateProgress={handleUpdateProgress}
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

const AppWithProviders: React.FC = () => {
  const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  const isValidClerkKey = clerkPubKey && !clerkPubKey.includes("placeholder");

  return (
    <ToastProvider>
      {isValidClerkKey ? (
        <ErrorBoundary>
          <ClerkProvider publishableKey={clerkPubKey}>
            <App />
          </ClerkProvider>
        </ErrorBoundary>
      ) : (
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      )}
    </ToastProvider>
  );
};

export default AppWithProviders;
