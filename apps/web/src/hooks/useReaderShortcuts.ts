import { useEffect } from "react";

interface UseReaderShortcutsOptions {
  nextPage: () => void;
  prevPage: () => void;
  onClose: () => void;
  toggleBookmark: () => void;
  toggleFullscreen: () => void;
  toggleUI: () => void;
  showSettings: boolean;
  showControls: boolean;
  setShowSettings: (value: boolean) => void;
  setShowControls: (value: boolean) => void;
}

export function useReaderShortcuts(options: UseReaderShortcutsOptions) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isTyping) return;

      switch (event.key) {
        case "ArrowRight":
        case "PageDown":
          event.preventDefault();
          options.nextPage();
          return;
        case "ArrowLeft":
        case "PageUp":
          event.preventDefault();
          options.prevPage();
          return;
        case "b":
        case "B":
          event.preventDefault();
          options.toggleBookmark();
          return;
        case "f":
        case "F":
          event.preventDefault();
          options.toggleFullscreen();
          return;
        case " ":
          event.preventDefault();
          options.toggleUI();
          return;
        case "t":
        case "T":
          event.preventDefault();
          options.setShowControls(!options.showControls);
          return;
        case "s":
        case "S":
          event.preventDefault();
          options.setShowSettings(!options.showSettings);
          return;
        case "Escape":
          if (options.showSettings) {
            options.setShowSettings(false);
            return;
          }
          if (options.showControls) {
            options.setShowControls(false);
            return;
          }
          options.onClose();
          return;
        default:
          return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [options]);
}
