import { BookOpen, RefreshCw } from "lucide-react";
import React, { useCallback, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

import { useSanctuaryApi } from "@/api/useSanctuaryApi";
import { useSanctuaryAuth } from "@/auth/useSanctuaryAuth";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { libraryService } from "@/services/LibraryService";
import { useSessionStore } from "@/store/useSessionStore";
import { getAllBooks } from "@/utils/db";

export function MigrationDialog() {
  const { isLoaded, isSignedIn, user } = useSanctuaryAuth();
  const api = useSanctuaryApi();
  const { mode, setSession } = useSessionStore();
  
  const [pendingBooksCount, setPendingBooksCount] = useState(0);
  const [isMigrating, setIsMigrating] = useState(false);
  const [show, setShow] = useState(false);
  const focusTrapRef = useRef<HTMLDivElement>(null);
  useFocusTrap(focusTrapRef, show);

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
          setSession("authenticated", user?.id ?? null);
        }
      });
    }
  }, [isLoaded, isSignedIn, mode, setSession, user?.id]);

  const handleNotNow = useCallback(() => {
    setShow(false);
    setSession("authenticated", user?.id ?? null);
  }, [setSession, user?.id]);

  useEffect(() => {
    if (!show || isMigrating) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleNotNow();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [show, isMigrating, handleNotNow]);

  const handleMigrate = async () => {
    setIsMigrating(true);
    try {
      await libraryService.uploadStoredBooks(api, ["pending", "local-only"]);
      setShow(false);
      setSession("authenticated", user?.id ?? null);
    } catch (error) {
      console.error("Migration failed:", error);
    } finally {
      setIsMigrating(false);
    }
  };

  if (!show) return null;

  const dialog = (
    <div
      ref={focusTrapRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="migration-dialog-title"
      aria-describedby="migration-dialog-desc"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fadeIn p-4"
    >
      <div className="bg-page rounded-xl p-6 w-full max-w-md shadow-2xl border border-line">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 id="migration-dialog-title" className="font-display font-medium text-xl text-fg">
              Sync Library
            </h3>
            <p id="migration-dialog-desc" className="text-sm text-fg-muted">
              You have {pendingBooksCount} {pendingBooksCount === 1 ? "book" : "books"} from offline mode.
            </p>
          </div>
        </div>
        
        <p className="text-sm text-fg mb-6 leading-relaxed">
          Would you like to sync your offline books to your account so they are available across all your devices?
        </p>
        
        <div className="flex gap-3 justify-end items-center">
          <button
            onClick={handleNotNow}
            disabled={isMigrating}
            type="button"
            className="px-4 py-2 text-sm font-medium text-fg-muted hover:text-fg rounded-xl hover:bg-line/40 transition-colors focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
          >
            Not now
          </button>
          <button
            onClick={handleMigrate}
            disabled={isMigrating}
            type="button"
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white dark:text-black bg-accent hover:bg-accent/90 rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60"
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
