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
  onToggleAutoScroll?: () => void;
  onToggleReadability?: () => void;
  onToggleShortcutsHelp?: () => void;
  onToggleXRay?: () => void;
  onToggleZenMode?: () => void;
  prevPage: () => void;
  setShowAnnotations?: (value: boolean) => void;
  setShowControls: (value: boolean) => void;
  setShowSearch: (value: boolean) => void;
  setShowSettings: (value: boolean) => void;
  showAnnotations?: boolean;
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
    // Track which page-turn keys are currently held down.
    // Page turns fire on keyup so holding a key doesn't queue dozens of turns.
    const heldPageKeys = new Set<string>();

    const isTypingTarget = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const {
        clearSelection,
        goToEnd,
        goToStart,
        hasSelection,
        isEnabled,
        keybinds,
        onClose,
        onToggleAutoScroll,
        onToggleReadability,
        onToggleShortcutsHelp,
        onToggleXRay,
        onToggleZenMode,
        setShowAnnotations,
        setShowControls,
        setShowSearch,
        setShowSettings,
        showAnnotations,
        showControls,
        showSearch,
        showSettings,
        toggleBookmark,
        toggleFullscreen,
        toggleUI,
      } = optionsRef.current;

      if (isEnabled === false) return;
      if (isTypingTarget(event.target)) return;

      // Handle modifiers for search
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setShowSearch(true);
        return;
      }

      const key = event.key;

      // Page-turn keys: suppress keydown repeat, mark as held.
      // The actual page turn fires on keyup.
      if (keybinds.nextPage.includes(key) || keybinds.prevPage.includes(key)) {
        event.preventDefault();
        heldPageKeys.add(key);
        return;
      }

      // Non-page-turn actions still fire on keydown (single-fire actions).
      if (keybinds.toggleBookmark.includes(key)) {
        event.preventDefault();
        if (!event.repeat) toggleBookmark();
        return;
      }
      if (keybinds.toggleFullscreen.includes(key)) {
        event.preventDefault();
        if (!event.repeat) toggleFullscreen();
        return;
      }
      if (keybinds.toggleUI.includes(key)) {
        event.preventDefault();
        if (!event.repeat) toggleUI();
        return;
      }
      if (keybinds.close.includes(key) && key !== "Escape") {
        event.preventDefault();
        if (!event.repeat) onClose();
        return;
      }

      // Fixed navigation/UI shortcuts not exposed for rebinding.
      switch (key) {
        case "Home":
          event.preventDefault();
          if (!event.repeat) goToStart();
          return;
        case "End":
          event.preventDefault();
          if (!event.repeat) goToEnd();
          return;
        case "t":
        case "T":
          event.preventDefault();
          if (!event.repeat) setShowControls(!showControls);
          return;
        case "a":
        case "A":
          if (!event.metaKey && !event.ctrlKey && !event.altKey) {
            event.preventDefault();
            if (!event.repeat) onToggleAutoScroll?.();
            return;
          }
          break;
        case "s":
        case "S":
          event.preventDefault();
          if (!event.repeat) setShowSettings(!showSettings);
          return;
        case "m":
        case "M":
          if (!event.metaKey && !event.ctrlKey && !event.altKey) {
            event.preventDefault();
            if (!event.repeat) onToggleReadability?.();
            return;
          }
          break;
        case "x":
        case "X":
          if (!event.metaKey && !event.ctrlKey && !event.altKey) {
            event.preventDefault();
            if (!event.repeat) onToggleXRay?.();
            return;
          }
          break;
        case "z":
        case "Z":
          if (!event.metaKey && !event.ctrlKey && !event.altKey) {
            event.preventDefault();
            if (!event.repeat) onToggleZenMode?.();
            return;
          }
          break;
        case "?":
          if (!event.metaKey && !event.ctrlKey && !event.altKey) {
            event.preventDefault();
            if (!event.repeat) onToggleShortcutsHelp?.();
            return;
          }
          break;
        case "Escape":
          if (hasSelection) {
              clearSelection();
              return;
          }
          if (showSearch) {
              setShowSearch(false);
              return;
          }
          if (showAnnotations) {
            setShowAnnotations?.(false);
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
          // Guard: if any modal, popover, or controller overlay is active, do not close reader
          if (
            typeof document !== "undefined" &&
            document.querySelector(
              '[role="dialog"], [role="region"][aria-label="Text-to-speech controls"], [role="region"][aria-label="Auto-scroll controls"], [role="region"][aria-label="Next book in series banner"]'
            )
          ) {
            return;
          }
          onClose();
          return;
        default:
          return;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const { nextPage, prevPage, isEnabled, keybinds } = optionsRef.current;

      if (isEnabled === false) return;
      if (isTypingTarget(event.target)) return;

      const key = event.key;

      // Only fire page turn if this key was tracked as held.
      if (!heldPageKeys.has(key)) return;
      heldPageKeys.delete(key);

      // Determine direction: space+shift is special-cased for prevPage.
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
    };

    // Early event capturing ensures shortcuts trigger reliably even if inner handlers intercept events.
    window.addEventListener("keydown", onKeyDown, { capture: true });
    document.addEventListener("keydown", onKeyDown, { capture: true });
    window.addEventListener("keyup", onKeyUp, { capture: true });
    document.addEventListener("keyup", onKeyUp, { capture: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
      document.removeEventListener("keydown", onKeyDown, { capture: true });
      window.removeEventListener("keyup", onKeyUp, { capture: true });
      document.removeEventListener("keyup", onKeyUp, { capture: true });
    };
  }, []);
}
