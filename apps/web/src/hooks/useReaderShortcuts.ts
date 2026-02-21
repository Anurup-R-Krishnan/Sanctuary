import { useEffect, useRef } from "react";

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
  isEnabled?: boolean;
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
        onClose,
        toggleBookmark,
        toggleFullscreen,
        toggleUI,
        showSettings,
        showControls,
        setShowSettings,
        setShowControls,
        isEnabled,
      } = optionsRef.current;

      if (isEnabled === false) return;

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
          nextPage();
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
