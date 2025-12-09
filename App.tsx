import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { Theme, View, Book } from "./types";
import { useBookLibrary } from "./hooks/useBookLibrary";
import Header from "./components/Header";
import Navigation from "./components/Navigation";
import LibraryGrid from "./components/LibraryGrid";
import ReaderView from "./components/ReaderView";
import SettingsView from "./components/SettingsView";
import Auth from "./components/Auth";
import { supabase } from "./lib/supabase";

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    let isActive = true;

    const bootstrapSession = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (!isActive) return;

        if (initialSession) {
          setSession(initialSession);
          setIsGuest(false);
        }
      } catch (error) {
        console.error("Failed to initialize session:", error);
      } finally {
        if (isActive) {
          setIsAuthLoading(false);
        }
      }
    };

    bootstrapSession();

    const { data } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!isActive) return;
        setSession(nextSession);
        setIsGuest(false);
        setIsAuthLoading(false);
      },
    );

    return () => {
      isActive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const [theme, setTheme] = useState<Theme>(() =>
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? Theme.DARK
      : Theme.LIGHT,
  );
  const [view, setView] = useState<View>(View.LIBRARY);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isLibraryVisible, setIsLibraryVisible] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const libraryPersistenceEnabled = !isGuest && Boolean(session);
  const {
    books,
    addBook,
    updateBookProgress,
    isLoading: isLibraryLoading,
  } = useBookLibrary({ persistent: libraryPersistenceEnabled });

  const handleToggleGuestMode = useCallback(() => {
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
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error during sign out:", error);
    } finally {
      setSession(null);
      setIsGuest(false);
      setIsAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;

    if (theme === Theme.DARK) {
      root.classList.add("dark");
      document.body.style.backgroundColor = "#141210";
    } else {
      root.classList.remove("dark");
      document.body.style.backgroundColor = "#faf8f3";
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) =>
      prevTheme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT,
    );
  }, []);

  const handleSelectBook = (book: Book) => {
    setSelectedBook(book);
    setView(View.READER);
  };

  const handleCloseReader = () => {
    setView(View.LIBRARY);
    setSelectedBook(null);
  };

  useEffect(() => {
    if (view === View.LIBRARY) {
      const timer = setTimeout(() => setIsLibraryVisible(true), 300);
      return () => clearTimeout(timer);
    }

    setIsLibraryVisible(false);
    return undefined;
  }, [view]);

  const filteredBooks = useMemo(() => {
    if (!searchTerm) return books;

    const lowerTerm = searchTerm.toLowerCase();
    return books.filter(
      (book) =>
        book.title.toLowerCase().includes(lowerTerm) ||
        book.author.toLowerCase().includes(lowerTerm),
    );
  }, [books, searchTerm]);

  const renderView = () => {
    switch (view) {
      case View.READER:
        return (
          selectedBook && (
            <ReaderView
              book={selectedBook}
              onClose={handleCloseReader}
              onUpdateProgress={updateBookProgress}
            />
          )
        );
      case View.SETTINGS:
        return <SettingsView />;
      case View.LIBRARY:
      default:
        return null;
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-light-primary dark:bg-dark-primary gap-4">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-light-accent to-amber-500 dark:from-dark-accent dark:to-amber-400 rounded-2xl blur-xl opacity-30 animate-pulse" />
          <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-light-accent to-amber-600 dark:from-dark-accent dark:to-amber-500 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        </div>
        <p className="text-sm text-light-text-muted dark:text-dark-text-muted animate-pulse">
          Loading Sanctuary...
        </p>
      </div>
    );
  }

  if (!session && !isGuest) {
    return <Auth onContinueAsGuest={handleToggleGuestMode} />;
  }

  return (
    <div className="min-h-screen font-sans bg-light-primary dark:bg-dark-primary text-light-text dark:text-dark-text transition-colors duration-500">
      {/* Subtle background texture */}
      <div className="fixed inset-0 bg-noise opacity-[0.015] dark:opacity-[0.03] pointer-events-none" />
      
      {/* Gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-light-accent/10 dark:bg-dark-accent/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        searchTerm={searchTerm}
        onSearch={setSearchTerm}
        isGuest={isGuest}
        onShowLogin={isGuest ? handleShowLogin : undefined}
        onSignOut={session ? handleSignOut : undefined}
      />

      <main className="relative px-4 md:px-6 lg:px-8 pt-24 pb-32 max-w-7xl mx-auto">
        {/* Library View */}
        <div
          className={`transition-all duration-500 ease-out ${
            isLibraryVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4 pointer-events-none absolute inset-x-0"
          }`}
        >
          <LibraryGrid
            books={filteredBooks}
            onSelectBook={handleSelectBook}
            addBook={addBook}
            isLoading={isLibraryLoading}
          />
        </div>

        {/* Other Views */}
        <div
          className={`transition-all duration-500 ease-out ${
            !isLibraryVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-4 pointer-events-none absolute inset-x-0"
          }`}
        >
          {renderView()}
        </div>
      </main>

      <Navigation
        activeView={view}
        onNavigate={setView}
        isReaderActive={!!selectedBook}
      />
    </div>
  );
};

export default App;
