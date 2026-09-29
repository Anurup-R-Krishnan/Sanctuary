import { BookOpen } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";

import { useSanctuaryApi } from "@/api/useSanctuaryApi";
import { AuthScreen } from "@/auth/AuthScreen";
import { useSanctuaryAuth } from "@/auth/useSanctuaryAuth";
import HomeView from "@/components/pages/HomeView";
import { AccessibilitySetup } from "@/components/ui/AccessibilitySetup";
import { MigrationDialog } from "@/components/ui/MigrationDialog";
import { UploadErrorToast } from "@/components/ui/UploadErrorToast";
import { forgetBookExcerpt } from "@/hooks/useBookExcerpt";
import { useNativeBookEvents } from "@/hooks/useNativeBookEvents";
import { appRuntime } from "@/platform/runtime";
import { safeStorageGet } from "@/reader/persistence/storage";
import { getVerifiedBookContent } from "@/services/bookContentRepository";
import { libraryIndexManager } from "@/services/librarySearchIndex";
import { libraryService } from "@/services/LibraryService";
import { statsService } from "@/services/StatsService";
import { syncQueue } from "@/services/SyncQueue";
import { useBookStore } from "@/store/useBookStore";
import { ACTIVE_BOOK_STORAGE_KEY, useReaderProgressStore } from "@/store/useReaderProgressStore";
import { useSessionStore } from "@/store/useSessionStore";
import { useStatsStore } from "@/store/useStatsStore";
import { useUIStore } from "@/store/useUIStore";
import { View } from "@/types";

const GlobalSearchModal = lazy(() =>
  import("@/components/library/GlobalSearchModal").then((m) => ({
    default: m.GlobalSearchModal,
  }))
);

const SettingsView = lazy(() => import("./components/pages/SettingsView"));
const FoliateTestHarness = import.meta.env.DEV
  ? lazy(() => import("@/components/dev/FoliateTestHarness").then((m) => ({ default: m.FoliateTestHarness })))
  : null;
const StatsView = lazy(() => import("./components/pages/StatsView"));

import LibraryGrid from "./components/pages/LibraryGrid";
import ReaderView from "./components/pages/ReaderView";
import Header from "./components/ui/Header";
import Navigation from "./components/ui/Navigation";
import { useAppTheme } from "./hooks/useAppTheme";
import { useProgressSync } from "./hooks/useProgressSync";
import { useReadingSession } from "./hooks/useReadingSession";

const DISABLE_AUTH = import.meta.env.VITE_DISABLE_AUTH === "true";

const readLocalBookBlob = (id: string) => getVerifiedBookContent(id).then((content) => content?.blob ?? null).catch(() => null);

function App() {
  // Auth & Session
  const { mode, reset: resetSession, setSession } = useSessionStore();
  const { isLoaded, isSignedIn, user, signOut } = useSanctuaryAuth();
  const api = useSanctuaryApi();
  
  // An account is optional: everyone starts in the local (guest) library, and
  // the sign-in screen only appears when asked for via the header.
  const [isAuthScreenOpen, setIsAuthScreenOpen] = useState(false);

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
    } else if (mode === "initializing") {
      setSession("guest", null);
    }
  }, [isLoaded, isSignedIn, user, mode, setSession]);

  useEffect(() => {
    if (isSignedIn) setIsAuthScreenOpen(false);
  }, [isSignedIn]);

  // Global UI State
  const { theme, view, searchTerm, setView, setSearchTerm, toggleTheme } = useUIStore();
  const books = useBookStore((state) => state.books);
  const isBookStoreLoading = useBookStore((state) => state.isLoading);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const selectedBookId = useReaderProgressStore((state) => state.active?.bookId ?? null);
  const hasRestoredActiveBookRef = useRef(false);
  // Only true when there's actually a remembered book to restore, so users
  // with no prior reading session (or who closed the reader deliberately)
  // never wait on this at all.
  const [isRestoringSession, setIsRestoringSession] = useState(
    () => !!safeStorageGet(ACTIVE_BOOK_STORAGE_KEY)
  );

  // Custom Hooks (Encapsulated Logic)
  useAppTheme();
  const { handleReaderProgress, flushPendingProgress } = useProgressSync(api, isPersistent);
  const { startSession, endSession, addBookmark, removeBookmark } = useReadingSession(api, isPersistent, flushPendingProgress);

  // Stable API calls for children to prevent N+1 re-renders
  const handleGetBookContent = useCallback((id: string) => libraryService.getBookContent(id, api, isPersistent), [api, isPersistent]);
  const handleAddBook = useCallback((file: File) => libraryService.addBook(file, api, isPersistent), [api, isPersistent]);
  const [nativeImportError, setNativeImportError] = useState<string | null>(null);
  useNativeBookEvents(handleAddBook, setNativeImportError, mode !== "initializing");
  const handleToggleFavorite = useCallback((id: string) => libraryService.toggleFavorite(id, api, isPersistent), [api, isPersistent]);
  const handleDeleteBook = useCallback((id: string) => {
    void libraryIndexManager.removeBook(id);
    forgetBookExcerpt(id);
    return libraryService.deleteBook(id, api, isPersistent);
  }, [api, isPersistent]);
  const handleUpdateBook = useCallback((id: string, updates: Parameters<typeof libraryService.updateBook>[1]) => libraryService.updateBook(id, updates, api, isPersistent), [api, isPersistent]);
  const handleBatchDelete = useCallback(async (ids: string[]) => {
    await Promise.allSettled(ids.map(async (id) => {
      void libraryIndexManager.removeBook(id);
      forgetBookExcerpt(id);
      await libraryService.deleteBook(id, api, isPersistent);
    }));
  }, [api, isPersistent]);
  const handleReplaceBookContent = useCallback((id: string, file: File) => libraryService.replaceBookContent(id, file, api, isPersistent), [api, isPersistent]);

  // Background Full-Text Indexing Queue
  useEffect(() => {
    if (books.length === 0) return;
    for (const b of books) {
      libraryIndexManager.queueBook(b.id, readLocalBookBlob);
    }
  }, [books]);

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

  // Resume the book that was open before a reload — the reader itself has no
  // URL/route of its own, so without this a refresh always lands back on the
  // library even mid-chapter. Runs once, after the library's initial load
  // settles, so it can confirm the remembered book still exists. Held behind
  // isRestoringSession so the library never gets a chance to render (and
  // flash) before the reader does.
  useEffect(() => {
    if (hasRestoredActiveBookRef.current || isBookStoreLoading) return;
    hasRestoredActiveBookRef.current = true;
    const lastActiveBookId = safeStorageGet(ACTIVE_BOOK_STORAGE_KEY);
    if (lastActiveBookId) {
      const book = books.find((b) => b.id === lastActiveBookId);
      if (book) {
        startSession(book);
      } else {
        useReaderProgressStore.getState().clearActiveBook();
      }
    }
    setIsRestoringSession(false);
  }, [books, isBookStoreLoading, startSession]);

  // Handlers
  const handleBrowseCatalog = useCallback(() => {
    setView(View.LIBRARY);
    useUIStore.getState().setCatalogOpen(true);
  }, [setView]);

  const handleShowLogin = useCallback(() => {
    setIsAuthScreenOpen(true);
  }, []);

  const handleSignOut = useCallback(async () => {
    if (isSignedIn) {
      await signOut();
    }
    try {
      await libraryService.clearAccountData();
    } catch (error) {
      console.error("Failed to clear account data on sign-out:", error);
    }
    useStatsStore.getState().setSessions([]);
    resetSession();
  }, [isSignedIn, signOut, resetSession]);

  // Dev harness
  if (FoliateTestHarness && window.location.search.includes("dev=foliate")) {
    return (
      <Suspense fallback={null}>
        <FoliateTestHarness />
      </Suspense>
    );
  }

  // Render Helpers
  if (!DISABLE_AUTH && !isLoaded) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-page">
        <div className="relative mb-6">
          <div className="relative w-20 h-20 rounded-xl bg-accent flex items-center justify-center shadow-2xl">
            <BookOpen className="w-9 h-9 text-white animate-pulse-soft" strokeWidth={1.5} />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h2 className="font-display font-medium text-xl text-fg">Sanctuary</h2>
          <p className="text-sm text-fg-muted">Loading…</p>
        </div>
      </div>
    );
  }

  if (!DISABLE_AUTH && !isSignedIn && isAuthScreenOpen) {
    return <AuthScreen onCancel={() => setIsAuthScreenOpen(false)} />;
  }

  if (isRestoringSession) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-page">
        <div className="relative mb-6">
          <div className="relative w-20 h-20 rounded-xl bg-accent flex items-center justify-center shadow-2xl">
            <BookOpen className="w-9 h-9 text-white animate-pulse-soft" strokeWidth={1.5} />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h2 className="font-display font-medium text-xl text-fg">Sanctuary</h2>
          <p className="text-sm text-fg-muted">Opening book…</p>
        </div>
      </div>
    );
  }

  const isReader = view === View.READER;


  return (
    <div className={`h-screen w-screen overflow-hidden select-none flex flex-col font-sans bg-page text-fg transition-colors duration-300 ${isReader ? "immersive-layout" : "standard-layout app-ambient-bg"}`}>
      <MigrationDialog />
      <AccessibilitySetup />
      {nativeImportError && (
        <UploadErrorToast
          className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2"
          message={nativeImportError}
          onDismiss={() => setNativeImportError(null)}
        />
      )}
      {!isReader && (
        <Header
          isGuest={isGuest}
          onAddBook={view === View.HOME ? undefined : handleAddBook}
          onGoHome={() => setView(View.HOME)}
          onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
          onSearch={setSearchTerm}
          onShowLogin={isGuest && appRuntime.hasRemoteApi ? handleShowLogin : undefined}
          onSignOut={isSignedIn ? handleSignOut : undefined}
          onToggleTheme={toggleTheme}
          searchTerm={searchTerm}
          theme={theme}
          userEmail={user?.email || undefined}
          userImage={user?.imageUrl || undefined}
        />
      )}

      <main className={`relative ${isReader ? "reader-main" : "standard-main"}`}>
        {([View.HOME, View.LIBRARY, View.SETTINGS, View.STATS] as View[]).map((v) => (
          <div
            key={v}
            className={`${isReader ? "" : "page-shell"} ${view === v ? "animate-fadeInUp" : "hidden"}`}
          >
            {v === View.HOME && (
              <HomeView
                onAddBook={handleAddBook}
                onBrowseCatalog={appRuntime.hasRemoteApi ? handleBrowseCatalog : undefined}
                onOpenBook={startSession}
                onOpenLibrary={() => setView(View.LIBRARY)}
              />
            )}
            {v === View.LIBRARY && (
              <LibraryGrid
                addBook={handleAddBook}
                api={api}
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
            {v === View.STATS && (
              <Suspense fallback={null}>
                <StatsView />
              </Suspense>
            )}
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
