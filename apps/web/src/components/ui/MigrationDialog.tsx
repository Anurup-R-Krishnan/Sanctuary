import { BookOpen, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { useSanctuaryApi } from "@/api/useSanctuaryApi";
import { useSanctuaryAuth } from "@/auth/useSanctuaryAuth";
import { libraryService } from "@/services/LibraryService";
import { useSessionStore } from "@/store/useSessionStore";
import { getAllBooks } from "@/utils/db";

export function MigrationDialog() {
  const { isLoaded, isSignedIn } = useSanctuaryAuth();
  const api = useSanctuaryApi();
  const { mode, setSession } = useSessionStore();
  
  const [pendingBooksCount, setPendingBooksCount] = useState(0);
  const [isMigrating, setIsMigrating] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn && mode === "guest") {
      // User signed in while in guest mode. 
      // Check if they have pending books in IndexedDB.
      getAllBooks().then(books => {
        const pending = books.filter(b => b.syncStatus === "pending");
        if (pending.length > 0) {
          setPendingBooksCount(pending.length);
          setShow(true);
        } else {
          // No pending books, just switch mode safely
          setSession("authenticated", "auto");
        }
      });
    }
  }, [isLoaded, isSignedIn, mode, setSession]);

  const handleMigrate = async () => {
    setIsMigrating(true);
    try {
      const books = await getAllBooks();
      const pending = books.filter(b => b.syncStatus === "pending");
      
      for (const book of pending) {
        if (!book.epubBlob) continue;
        const file = new File([book.epubBlob], `${book.title}.epub`, { type: "application/epub+zip" });
        await libraryService._migrateBook(file, book, api);
      }
      
      setShow(false);
      setSession("authenticated", "auto");
    } catch (error) {
      console.error("Migration failed:", error);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleDiscard = () => {
    setShow(false);
    setSession("authenticated", "auto");
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-light-secondary dark:bg-dark-secondary rounded-2xl p-6 w-full max-w-md shadow-2xl border border-light-border dark:border-dark-border">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-light-text dark:text-dark-text">Sync Library</h3>
            <p className="text-sm text-light-text-muted dark:text-dark-text-muted">
              You have {pendingBooksCount} {pendingBooksCount === 1 ? "book" : "books"} from offline mode.
            </p>
          </div>
        </div>
        
        <p className="text-sm text-light-text dark:text-dark-text mb-6">
          Would you like to sync your offline books to your account so they are available across all your devices?
        </p>
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={handleDiscard}
            disabled={isMigrating}
            className="px-4 py-2 text-sm font-medium text-light-text-muted hover:text-light-text dark:text-dark-text-muted dark:hover:text-dark-text disabled:opacity-50"
          >
            Discard
          </button>
          <button
            onClick={handleMigrate}
            disabled={isMigrating}
            className="flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-md transition-colors disabled:opacity-75"
          >
            {isMigrating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Syncing...
              </>
            ) : (
              "Sync Now"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
