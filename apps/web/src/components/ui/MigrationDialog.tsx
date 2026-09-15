import { BookOpen, RefreshCw } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useSanctuaryApi } from "@/api/useSanctuaryApi";
import { useSanctuaryAuth } from "@/auth/useSanctuaryAuth";
import { getVerifiedBookContent } from "@/services/bookContentRepository";
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
        const pending = books.filter(b => b.syncStatus === "pending" || b.syncStatus === "local-only");
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

  const handleDiscard = useCallback(() => {
    setShow(false);
    setSession("authenticated", "auto");
  }, [setSession]);

  useEffect(() => {
    if (!show || isMigrating) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleDiscard();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [show, isMigrating, handleDiscard]);

  const handleMigrate = async () => {
    setIsMigrating(true);
    try {
      const books = await getAllBooks();
      const pending = books.filter(b => b.syncStatus === "pending" || b.syncStatus === "local-only");
      
      for (const book of pending) {
        const content = await getVerifiedBookContent(book.id);
        if (!content) {
          console.warn(`Skipping migration for ${book.id}: local EPUB content is missing.`);
          continue;
        }
        const file = new File([content.blob], `${book.title}.epub`, { type: "application/epub+zip" });
        await libraryService._migrateBook(file, { ...book, epubBlob: content.blob }, api);
      }
      
      setShow(false);
      setSession("authenticated", "auto");
    } catch (error) {
      console.error("Migration failed:", error);
    } finally {
      setIsMigrating(false);
    }
  };

  if (!show) return null;

  const dialog = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="migration-dialog-title"
      aria-describedby="migration-dialog-desc"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn p-4"
    >
      <div className="bg-light-primary dark:bg-dark-primary rounded-2xl p-6 w-full max-w-md shadow-2xl border border-light-border dark:border-dark-border">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-light-accent/15 dark:bg-dark-accent/15 text-light-accent dark:text-dark-accent flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 id="migration-dialog-title" className="text-xl font-bold text-light-text dark:text-dark-text">
              Sync Library
            </h3>
            <p id="migration-dialog-desc" className="text-sm text-light-text-muted dark:text-dark-text-muted">
              You have {pendingBooksCount} {pendingBooksCount === 1 ? "book" : "books"} from offline mode.
            </p>
          </div>
        </div>
        
        <p className="text-sm text-light-text dark:text-dark-text mb-6 leading-relaxed">
          Would you like to sync your offline books to your account so they are available across all your devices?
        </p>
        
        <div className="flex gap-3 justify-end items-center">
          <button
            onClick={handleDiscard}
            disabled={isMigrating}
            type="button"
            className="px-4 py-2 text-sm font-medium text-light-text-muted hover:text-light-text dark:text-dark-text-muted dark:hover:text-dark-text rounded-xl hover:bg-light-border/40 dark:hover:bg-dark-border/40 transition-colors focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent disabled:opacity-50"
          >
            Discard
          </button>
          <button
            onClick={handleMigrate}
            disabled={isMigrating}
            type="button"
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white dark:text-black bg-light-accent hover:bg-light-accent/90 dark:bg-dark-accent dark:hover:bg-dark-accent/90 rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent disabled:opacity-60"
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

  if (typeof document === "undefined") {
    return dialog;
  }
  return createPortal(dialog, document.body);
}
