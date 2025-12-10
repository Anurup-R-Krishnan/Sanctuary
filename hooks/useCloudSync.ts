import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import type { Book } from "../types";

interface CloudBookData {
  id: string;
  user_id: string;
  book_id: string;
  title: string;
  author: string;
  progress: number;
  last_location: string;
  is_favorite: boolean;
  reading_list: string | null;
  last_synced_at: string;
}

const syncWithRetry = async <T,>(fn: () => Promise<T>, retries = 3): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error("Retry failed");
};

export function useCloudSync(userId: string | null) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncBookToCloud = useCallback(async (book: Book) => {
    if (!userId) return;
    try {
      const { error } = await supabase.from("book_progress").upsert({
        user_id: userId,
        book_id: book.id,
        title: book.title,
        author: book.author,
        progress: book.progress,
        last_location: book.lastLocation,
        is_favorite: book.isFavorite || false,
        reading_list: book.readingList || null,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: "user_id,book_id" });
      if (error) throw error;
    } catch (e) {
      console.error("Sync error:", e);
    }
  }, [userId]);

  const syncAllBooks = useCallback(async (books: Book[]) => {
    if (!userId || books.length === 0) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      const records = books.filter(b => !b.isIncognito).map(book => ({
        user_id: userId,
        book_id: book.id,
        title: book.title,
        author: book.author,
        progress: book.progress,
        last_location: book.lastLocation,
        is_favorite: book.isFavorite || false,
        reading_list: book.readingList || null,
        last_synced_at: new Date().toISOString(),
      }));
      if (records.length > 0) {
        await syncWithRetry(async () => {
          const { error } = await supabase.from("book_progress").upsert(records, { onConflict: "user_id,book_id" });
          if (error) throw error;
        });
      }
      setLastSyncedAt(new Date().toISOString());
    } catch (e: any) {
      setSyncError(e.message || "Sync failed");
      console.error("Sync all error:", e);
    } finally {
      setIsSyncing(false);
    }
  }, [userId]);

  const fetchCloudData = useCallback(async (): Promise<CloudBookData[]> => {
    if (!userId) return [];
    try {
      const { data, error } = await supabase.from("book_progress").select("*").eq("user_id", userId);
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error("Fetch cloud data error:", e);
      return [];
    }
  }, [userId]);

  const debouncedSync = useCallback((book: Book) => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => syncBookToCloud(book), 2000);
  }, [syncBookToCloud]);

  useEffect(() => {
    return () => { if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current); };
  }, []);

  return { isSyncing, lastSyncedAt, syncError, syncBookToCloud, syncAllBooks, fetchCloudData, debouncedSync };
}
