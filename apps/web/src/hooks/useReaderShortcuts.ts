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
  const {
    nextPage,
    prevPage,
    onClose,
    toggleBookmark,
    toggleFullscreen,
    toggleUI,
    showSettings,
    showControls,
    setShowSettings,
    setShowControls,
  } = options;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isTyping) return;

      switch (event.key) {
        case "ArrowRight":
        case "PageDown":
          event.preventDefault();
          nextPage();
          return;
        case "ArrowLeft":
        case "PageUp":
          event.preventDefault();
          prevPage();
          return;
        case "b":
        case "B":
          event.preventDefault();
          toggleBookmark();
          return;
        case "f":
        case "F":
          event.preventDefault();
          toggleFullscreen();
          return;
        case " ":
          event.preventDefault();
          toggleUI();
          return;
        case "t":
        case "T":
          event.preventDefault();
          setShowControls(!showControls);
          return;
        case "s":
        case "S":
          event.preventDefault();
          setShowSettings(!showSettings);
          return;
        case "Escape":
          if (showSettings) {
            setShowSettings(false);
            return;
          }
          if (showControls) {
            setShowControls(false);
            return;
          }
          onClose();
          return;
        default:
          return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    nextPage,
    prevPage,
    onClose,
    toggleBookmark,
    toggleFullscreen,
    toggleUI,
    showSettings,
    showControls,
    setShowSettings,
    setShowControls,
  ]);
}
