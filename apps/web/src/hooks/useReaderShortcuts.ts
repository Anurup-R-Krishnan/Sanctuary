import { useEffect, useRef } from "react";
import { useSettingsShallow } from "@/context/SettingsContext";

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
  const { keybinds } = useSettingsShallow((state) => ({ keybinds: state.keybinds }));

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
      const tag = target?.tagName || "";
      const role = target?.getAttribute("role") || "";
      const isTyping = !!target && (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable ||
        role === "textbox" ||
        role === "combobox" ||
        !!target.closest("[contenteditable='true']")
      );
      if (isTyping) return;

      const key = event.key;
      if (keybinds.nextPage.includes(key) || key === "PageDown") {
        event.preventDefault();
        nextPage();
        return;
      }
      if (keybinds.prevPage.includes(key) || key === "PageUp") {
        event.preventDefault();
        prevPage();
        return;
      }
      if (keybinds.toggleBookmark.includes(key)) {
        event.preventDefault();
        void toggleBookmark();
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
      if (key.toLowerCase() === "t") {
        event.preventDefault();
        setShowControls(!showControls);
        return;
      }
      if (key.toLowerCase() === "s") {
        event.preventDefault();
        setShowSettings(!showSettings);
        return;
      }
      if (keybinds.close.includes(key)) {
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
      }
    };

    // Capture phase improves reliability when other listeners stop propagation.
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
    };
  }, [keybinds]);
}
