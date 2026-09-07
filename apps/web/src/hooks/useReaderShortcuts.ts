import { useEffect, useRef } from "react";

export interface ReaderKeybinds {
  close: string[];
  nextPage: string[];
  prevPage: string[];
  toggleBookmark: string[];
  toggleFullscreen: string[];
  toggleUI: string[];
}

interface UseReaderShortcutsOptions {
  clearSelection: () => void;
  goToEnd: () => void;
  goToStart: () => void;
  hasSelection: boolean;
  isEnabled?: boolean;
  keybinds: ReaderKeybinds;
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
        keybinds,
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

      const key = event.key;

      // User-configurable actions (bound via Settings > Keyboard Shortcuts).
      if (keybinds.nextPage.includes(key)) {
        event.preventDefault();
        if (key === " " && event.shiftKey && keybinds.prevPage.includes(" ")) {
          prevPage();
        } else {
          nextPage();
        }
        return;
      }
      if (keybinds.prevPage.includes(key)) {
        event.preventDefault();
        prevPage();
        return;
      }
      if (keybinds.toggleBookmark.includes(key)) {
        event.preventDefault();
        toggleBookmark();
        return;
      }
      if (keybinds.toggleFullscreen.includes(key)) {
        event.preventDefault();
        toggleFullscreen();
        return;
      }
      if (keybinds.toggleUI.includes(key)) {
        event.preventDefault();
        toggleUI();
        return;
      }
      if (keybinds.close.includes(key) && key !== "Escape") {
        // Escape has layered close-panel-first behavior handled below;
        // any other user-bound "close" key exits immediately.
        event.preventDefault();
        onClose();
        return;
      }

      // Fixed navigation/UI shortcuts not exposed for rebinding.
      switch (key) {
        case "Home":
          event.preventDefault();
          goToStart();
          return;
        case "End":
          event.preventDefault();
          goToEnd();
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
