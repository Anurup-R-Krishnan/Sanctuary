import { useEffect, useRef } from "react";

import { pickNativeBookPaths, readNativeBook } from "@/platform/nativeFiles";
import { appRuntime } from "@/platform/runtime";

/**
 * Desktop-only, mounted once in App so it works in every view (the header's
 * Add Book button is not rendered in the reader):
 * - File ▸ Add Book… menu → native picker
 * - books passed on launch ("Open with Sanctuary") → pulled once on mount
 * - books opened while the app is running → queued by the single-instance
 *   plugin in Rust; the `open-files` event tells us to drain the queue
 */
export function useNativeBookEvents(
  onAddBook: (file: File) => Promise<void>,
  onError: (message: string) => void,
  /** False until the session mode is known, so books land in the right library. */
  ready: boolean
) {
  const handlers = useRef({ onAddBook, onError });
  handlers.current = { onAddBook, onError };

  useEffect(() => {
    if (!appRuntime.canUseNativeFilePicker || !ready) return;
    let disposed = false;

    const importPaths = async (paths: string[]) => {
      for (const path of paths) {
        try {
          await handlers.current.onAddBook(await readNativeBook(path));
        } catch (error) {
          handlers.current.onError(error instanceof Error ? error.message : `Could not open ${path}`);
        }
      }
    };

    const onMenuAddBook = () => {
      void pickNativeBookPaths().then(importPaths, (error: unknown) =>
        handlers.current.onError(error instanceof Error ? error.message : "Could not open the file picker")
      );
    };
    window.addEventListener("sanctuary:add-book", onMenuAddBook);

    let unlisten: (() => void) | undefined;
    void (async () => {
      const [{ invoke }, { listen }] = await Promise.all([import("@tauri-apps/api/core"), import("@tauri-apps/api/event")]);
      const drain = async () => importPaths(await invoke<string[]>("take_launch_files"));
      const stop = await listen("open-files", () => void drain());
      if (disposed) {
        stop();
        return;
      }
      unlisten = stop;
      await drain();
    })().catch(() => undefined);

    return () => {
      disposed = true;
      window.removeEventListener("sanctuary:add-book", onMenuAddBook);
      unlisten?.();
    };
  }, [ready]);
}
