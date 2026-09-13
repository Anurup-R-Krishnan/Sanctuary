import { BookOpen } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";

import { useSanctuaryApi } from "@/api/useSanctuaryApi";
import { AuthScreen } from "@/auth/AuthScreen";
import { useSanctuaryAuth } from "@/auth/useSanctuaryAuth";
import { FoliateTestHarness } from "@/components/dev/FoliateTestHarness";
import { MigrationDialog } from "@/components/ui/MigrationDialog";
import { libraryIndexManager } from "@/services/librarySearchIndex";
import { libraryService } from "@/services/LibraryService";
import { statsService } from "@/services/StatsService";
import { syncQueue } from "@/services/SyncQueue";
import { useBookStore } from "@/store/useBookStore";
import { useReaderProgressStore } from "@/store/useReaderProgressStore";
import { useSessionStore } from "@/store/useSessionStore";
import { useUIStore } from "@/store/useUIStore";
import { View } from "@/types";

const GlobalSearchModal = lazy(() =>
  import("@/components/library/GlobalSearchModal").then((m) => ({
    default: m.GlobalSearchModal,
  }))
);

const SettingsView = lazy(() => import("./components/pages/SettingsView"));

import LibraryGrid from "./components/pages/LibraryGrid";
import ReaderView from "./components/pages/ReaderView";
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
  const books = useBookStore((state) => state.books);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const selectedBookId = useReaderProgressStore((state) => state.active?.bookId ?? null);

  // Custom Hooks (Encapsulated Logic)
  useAppTheme();
  const { handleReaderProgress, flushPendingProgress } = useProgressSync(api, isPersistent);
  const { startSession, endSession, addBookmark, removeBookmark } = useReadingSession(api, isPersistent, flushPendingProgress);

  // Stable API calls for children to prevent N+1 re-renders
  const handleGetBookContent = useCallback((id: string) => libraryService.getBookContent(id, api, isPersistent), [api, isPersistent]);
  const handleAddBook = useCallback((file: File) => libraryService.addBook(file, api, isPersistent), [api, isPersistent]);
  const handleToggleFavorite = useCallback((id: string) => libraryService.toggleFavorite(id, api, isPersistent), [api, isPersistent]);
  const handleDeleteBook = useCallback((id: string) => {
    void libraryIndexManager.removeBook(id);
    return libraryService.deleteBook(id, api, isPersistent);
  }, [api, isPersistent]);
  const handleUpdateBook = useCallback((id: string, updates: Parameters<typeof libraryService.updateBook>[1]) => libraryService.updateBook(id, updates, api, isPersistent), [api, isPersistent]);
  const handleBatchDelete = useCallback((ids: string[]) => {
    ids.forEach((id) => {
      void libraryIndexManager.removeBook(id);
      libraryService.deleteBook(id, api, isPersistent);
    });
  }, [api, isPersistent]);
  const handleReplaceBookContent = useCallback((id: string, file: File) => libraryService.replaceBookContent(id, file, api, isPersistent), [api, isPersistent]);

  // Background Full-Text Indexing Queue
  useEffect(() => {
    if (books.length === 0) return;
    for (const b of books) {
      libraryIndexManager.queueBook(b.id, (id) => handleGetBookContent(id));
    }
  }, [books, handleGetBookContent]);

  // Global Cmd+K / Ctrl+K Search Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsGlobalSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  // Dev harness
  if (typeof window !== "undefined" && window.location.search.includes("dev=foliate")) {
    return <FoliateTestHarness />;
  }

  // Render Helpers
  if (!DISABLE_AUTH && !isLoaded) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-light-primary dark:bg-dark-primary">
        <div className="relative mb-6">
          <div className="relative w-20 h-20 rounded-3xl bg-light-accent dark:bg-dark-accent flex items-center justify-center shadow-2xl">
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
    <div className={`h-screen w-screen overflow-hidden select-none flex flex-col font-sans bg-light-primary dark:bg-dark-primary text-light-text dark:text-dark-text transition-colors duration-300 ${isReader ? "immersive-layout" : "standard-layout app-ambient-bg"}`}>
      <MigrationDialog />
      {!isReader && (
        <Header
          isGuest={isGuest}
          onAddBook={handleAddBook}
          onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
          onSearch={setSearchTerm}
          onShowLogin={isGuest ? handleShowLogin : undefined}
          onSignOut={isSignedIn ? handleSignOut : undefined}
          onToggleTheme={toggleTheme}
          searchTerm={searchTerm}
          theme={theme}
          userEmail={user?.email || undefined}
          userImage={user?.imageUrl || undefined}
        />
      )}

      <main className={`relative ${isReader ? "reader-main" : "standard-main"}`}>
        {([View.LIBRARY, View.SETTINGS, View.STATS] as View[]).map((v) => (
          <div
            key={v}
            className={`${isReader ? "" : "page-shell"} ${view === v ? "animate-fadeInUp" : "hidden"}`}
          >
            {v === View.LIBRARY && (
              <LibraryGrid
                addBook={handleAddBook}
                deleteBook={handleDeleteBook}
                onBatchDelete={handleBatchDelete}
                onSelectBook={startSession}
                onUpdateBook={handleUpdateBook}
                toggleFavorite={handleToggleFavorite}
              />
            )}
            {v === View.SETTINGS && (
              <Suspense fallback={null}>
                <SettingsView />
              </Suspense>
            )}
            {v === View.STATS && <StatsView />}
          </div>
        ))}
        {view === View.READER && selectedBookId && (
          <ReaderView
            bookId={selectedBookId}
            getBookContent={handleGetBookContent}
            onAddBookmark={addBookmark}
            onClose={endSession}
            onOpenBook={startSession}
            onRemoveBookmark={removeBookmark}
            onReplaceContent={handleReplaceBookContent}
            onUpdateProgress={handleReaderProgress}
          />
        )}
      </main>

      {!isReader && (
        <Navigation activeView={view} isReaderActive={!!selectedBookId} onNavigate={setView} />
      )}

      {isGlobalSearchOpen && (
        <Suspense fallback={null}>
          <GlobalSearchModal
            books={books}
            isOpen={isGlobalSearchOpen}
            onClose={() => setIsGlobalSearchOpen(false)}
            onSelectBook={(book, cfi) => startSession(book, cfi)}
          />
        </Suspense>
      )}
    </div>
  );
}

export default App;
