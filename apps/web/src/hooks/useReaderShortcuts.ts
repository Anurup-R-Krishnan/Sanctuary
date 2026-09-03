import { useEffect, useRef } from "react";

interface UseReaderShortcutsOptions {
  clearSelection: () => void;
  goToEnd: () => void;
  goToStart: () => void;
  hasSelection: boolean;
  isEnabled?: boolean;
  nextPage: () => void;
  onClose: () => void;
  prevPage: () => void;
  setShowControls: (value: boolean) => void;
  setShowSearch: (value: boolean) => void;
  setShowSettings: (value: boolean) => void;
  showControls: boolean;
  showSearch: boolean;
  showSettings: boolean;
  toggleBookmark: () => void;
  toggleFullscreen: () => void;
  toggleUI: () => void;
}

export function useReaderShortcuts(options: UseReaderShortcutsOptions) {
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const {
        nextPage,
        prevPage,
        goToStart,
        goToEnd,
        onClose,
        toggleBookmark,
        toggleFullscreen,
        toggleUI,
        showSettings,
        showControls,
        showSearch,
        setShowSettings,
        setShowControls,
        setShowSearch,
        clearSelection,
        hasSelection,
        isEnabled,
      } = optionsRef.current;

      if (isEnabled === false) return;

      const target = event.target as HTMLElement | null;
      const isTyping = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isTyping) return;

      // Handle modifiers for search
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setShowSearch(true);
        return;
      }

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
        case "j":
        case "J":
        case "l":
        case "L":
          event.preventDefault();
          nextPage();
          return;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
        case "k":
        case "K":
        case "h":
        case "H":
          event.preventDefault();
          prevPage();
          return;
        case "Home":
          event.preventDefault();
          goToStart();
          return;
        case "End":
          event.preventDefault();
          goToEnd();
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
          if (event.shiftKey) {
            prevPage();
          } else {
            nextPage();
          }
          return;
        case "m":
        case "M":
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
          if (hasSelection) {
              clearSelection();
              return;
          }
          if (showSearch) {
              setShowSearch(false);
              return;
          }
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

    // Capture phase improves reliability when other listeners stop propagation.
    window.addEventListener("keydown", onKeyDown, { capture: true });
    document.addEventListener("keydown", onKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
      document.removeEventListener("keydown", onKeyDown, { capture: true });
    };
  }, []);
}
