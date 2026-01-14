import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Book } from '@/types';
import type { Session } from '@supabase/supabase-js';

export function useCloudSync(
  books: Book[],
  syncBookFromCloud: (book: Partial<Book>) => void,
  session: Session | null
) {
  const lastSyncRef = useRef<Record<string, number>>({});

  // Pull from cloud on login
  useEffect(() => {
    if (!session?.user?.id) return;

    const syncDown = async () => {
      try {
        const { data, error } = await supabase
          .from('book_progress')
          .select('*')
          .eq('user_id', session.user.id);

        if (error) throw error;

        data?.forEach((row: any) => {
          syncBookFromCloud({
            id: row.book_id,
            progress: row.progress,
            lastLocation: row.last_location,
            isFavorite: row.is_favorite,
            readingList: row.reading_list,
            lastOpenedAt: row.last_synced_at
          });
        });
      } catch (e) {
        console.error("Cloud sync down failed:", e);
      }
    };

    syncDown();
  }, [session?.user?.id, syncBookFromCloud]);

  // Sync progress to cloud (debounced)
  const syncProgress = useCallback(async (
    bookId: string,
    progress: number,
    location: string,
    book: Book
  ) => {
    if (!session?.user?.id) return;

    // Debounce: only sync if 5s passed since last sync for this book
    const now = Date.now();
    if (lastSyncRef.current[bookId] && now - lastSyncRef.current[bookId] < 5000) return;
    lastSyncRef.current[bookId] = now;

    try {
      await supabase.from('book_progress').upsert({
        user_id: session.user.id,
        book_id: bookId,
        title: book.title,
        author: book.author,
        progress,
        last_location: location,
        is_favorite: book.isFavorite || false,
        reading_list: book.readingList,
        last_synced_at: new Date().toISOString()
      }, { onConflict: 'user_id,book_id' });
    } catch (e) {
      console.error("Cloud sync failed:", e);
    }
  }, [session?.user?.id]);

  return { syncProgress };
}
