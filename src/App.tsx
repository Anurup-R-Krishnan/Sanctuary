import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { Session } from "@supabase/supabase-js";
import { Theme, View, Book } from "@/types";
import { useBookLibrary } from "./hooks/useBookLibrary";
import { useReadingStats } from "./hooks/useReadingStats";
import { useSettings } from "@/context/SettingsContext";
import Header from "./components/ui/Header";
import Navigation from "./components/ui/Navigation";
import LibraryGrid from "./components/pages/LibraryGrid";
import ReaderView from "./components/pages/ReaderView";
import SettingsView from "./components/pages/SettingsView";
import StatsView from "./components/pages/StatsView";
import Auth from "./components/pages/Auth";
import { supabase } from "./lib/supabase";
import { BookOpen } from "lucide-react";

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const { 
    dailyGoal, 
    weeklyGoal, 
    setDailyGoal, 
    setWeeklyGoal,
    reduceMotion 
  } = useSettings();

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

  const [theme, setTheme] = useState<Theme>(Theme.LIGHT);
  const [view, setView] = useState<View>(View.LIBRARY);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const persistent = !isGuest && Boolean(session);
  const {
    books, sortedBooks, recentBooks, favoriteBooks, seriesGroups,
    addBook, updateBookProgress, toggleFavorite, addBookmark, removeBookmark,
    sortBy, setSortBy, filterBy, setFilterBy, isLoading: libLoading,
  } = useBookLibrary({ persistent });
  const { stats, startSession, endSession } = useReadingStats(books);

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
    root.classList.toggle("dark", theme === Theme.DARK);
    root.classList.toggle("reduce-motion", reduceMotion);
    
    const bgColor = theme === Theme.DARK ? "#0f0e0d" : "#fefcf8";
    document.body.style.backgroundColor = bgColor;
    document.body.style.transition = reduceMotion ? "none" : "background-color 0.3s ease";
  }, [theme, reduceMotion]);

  const toggleTheme = useCallback(() => setTheme(t => t === Theme.LIGHT ? Theme.DARK : Theme.LIGHT), []);

  const handleSelectBook = useCallback((book: Book) => {
    setSelectedBook(book);
    setView(View.READER);
    startSession(book.id);
  }, [startSession]);

  const handleCloseReader = useCallback(() => {
    endSession(0);
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

  if (!session && !isGuest) return <Auth onContinueAsGuest={handleGuestMode} />;

  const isReader = view === View.READER;
  const layoutClasses = isReader ? "immersive-layout" : "standard-layout";

  return (
    <div className={`min-h-screen font-sans bg-light-primary dark:bg-dark-primary text-light-text dark:text-dark-text transition-colors duration-300 ${layoutClasses}`}>
      {/* Enhanced Background Decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-64 -right-64 w-[500px] h-[500px] bg-gradient-radial from-light-accent/[0.06] via-light-accent/[0.02] to-transparent dark:from-dark-accent/[0.08] dark:via-dark-accent/[0.03] rounded-full blur-3xl" />
        <div className="absolute -bottom-64 -left-64 w-[600px] h-[600px] bg-gradient-radial from-amber-500/[0.04] via-amber-500/[0.01] to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-gradient-radial from-light-accent/[0.03] to-transparent dark:from-dark-accent/[0.04] rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] bg-gradient-radial from-amber-400/[0.02] to-transparent rounded-full blur-3xl" />
      </div>

      {/* Header */}
      {!isReader && (
        <Header
          theme={theme}
          onToggleTheme={toggleTheme}
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
          isGuest={isGuest}
          onShowLogin={isGuest ? handleShowLogin : undefined}
          onSignOut={session ? handleSignOut : undefined}
        />
      )}

      {/* Main Content Container */}
      <main className={`relative ${isReader ? 'reader-main' : 'standard-main pt-20 pb-32 px-4 sm:px-6 lg:px-8'}`}>
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
