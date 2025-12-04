import React, { useState, useEffect, useCallback, useMemo } from "react";
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

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isActive) return;
      setSession(nextSession);
      setIsGuest(false);
      setIsAuthLoading(false);
    });

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
      document.body.style.backgroundColor = "#1c1815";
    } else {
      root.classList.remove("dark");
      document.body.style.backgroundColor = "#f9f7f0";
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
      <div className="min-h-screen flex items-center justify-center bg-light-primary dark:bg-dark-primary">
        <p className="text-light-text dark:text-dark-text">Loading...</p>
      </div>
    );
  }

  if (!session && !isGuest) {
    return <Auth onContinueAsGuest={handleToggleGuestMode} />;
  }

  return (
    <div className="min-h-screen font-sans bg-light-primary dark:bg-dark-primary text-light-text dark:text-dark-text transition-colors duration-500">
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        searchTerm={searchTerm}
        onSearch={setSearchTerm}
        isGuest={isGuest}
        onShowLogin={isGuest ? handleShowLogin : undefined}
        onSignOut={session ? handleSignOut : undefined}
      />

      <main className="px-4 md:px-8 pt-28 pb-24 relative space-y-4">
        {isGuest && (
          <div className="rounded-lg border border-amber-300/60 dark:border-amber-200/30 bg-amber-50 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100 px-4 py-3 text-sm">
            You&apos;re browsing as a guest. Books and reading progress stay on
            this device only. Sign in any time to sync across devices.
          </div>
        )}

        <div
          className={`transition-opacity duration-300 ${
            isLibraryVisible ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <LibraryGrid
            books={filteredBooks}
            onSelectBook={handleSelectBook}
            addBook={addBook}
            isLoading={isLibraryLoading}
          />
        </div>

        <div
          className={`absolute top-28 left-0 right-0 px-4 md:px-8 transition-opacity duration-300 ${
            !isLibraryVisible ? "opacity-100" : "opacity-0 pointer-events-none"
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
