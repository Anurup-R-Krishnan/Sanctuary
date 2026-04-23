import { useCallback, useRef, useEffect } from "react";
import { useReaderProgressStore } from "@/store/useReaderProgressStore";
import { libraryService } from "@/services/LibraryService";

export function useProgressSync(getToken: () => Promise<string | null>, isPersistent: boolean) {
  const pendingProgressRef = useRef<{ id: string; progress: number; location: string } | null>(null);
  const progressTimerRef = useRef<number | null>(null);

  const flushPendingProgress = useCallback(async () => {
    const pending = pendingProgressRef.current;
    pendingProgressRef.current = null;
    if (!pending) return;
    await libraryService.updateBookProgress(pending.id, pending.progress, pending.location, getToken, isPersistent);
  }, [getToken, isPersistent]);

  const handleReaderProgress = useCallback((id: string, progress: number, location: string) => {
    useReaderProgressStore.getState().updateActiveProgress(id, progress, location);
    pendingProgressRef.current = { id, progress, location };
    
    if (progressTimerRef.current !== null) {
      window.clearTimeout(progressTimerRef.current);
    }
    
    progressTimerRef.current = window.setTimeout(() => {
      progressTimerRef.current = null;
      void flushPendingProgress();
    }, 350);
  }, [flushPendingProgress]);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current !== null) {
        window.clearTimeout(progressTimerRef.current);
      }
      void flushPendingProgress();
    };
  }, [flushPendingProgress]);

  return { handleReaderProgress, flushPendingProgress };
}
