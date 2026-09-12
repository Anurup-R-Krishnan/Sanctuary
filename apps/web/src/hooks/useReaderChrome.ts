import { useState, useEffect, useRef, useCallback } from "react";

interface UseReaderChromeProps {
  hasSelection: boolean;
}

export function useReaderChrome({ hasSelection }: UseReaderChromeProps) {
  const [showUI, setShowUI] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const uiStateRef = useRef({
    showUI,
    showSettings,
    showControls,
    showSearch,
    showAnnotations,
    selection: hasSelection,
  });

  useEffect(() => {
    uiStateRef.current = {
      showUI,
      showSettings,
      showControls,
      showSearch,
      showAnnotations,
      selection: hasSelection,
    };
  }, [showUI, showSettings, showControls, showSearch, showAnnotations, hasSelection]);

  useEffect(() => {
    let lastMove = Date.now();
    const handleMove = () => {
      const now = Date.now();
      if (now - lastMove < 200) return;
      lastMove = now;
      setShowUI((prev) => (prev ? prev : true));
    };

    const checkIdle = () => {
      const state = uiStateRef.current;
      if (
        state.showUI &&
        !state.showSettings &&
        !state.showControls &&
        !state.showSearch &&
        !state.showAnnotations &&
        !state.selection
      ) {
        if (Date.now() - lastMove > 3500) {
          setShowUI(false);
        }
      }
    };

    const interval = setInterval(checkIdle, 1000);
    document.addEventListener("mousemove", handleMove, { passive: true });
    document.addEventListener("touchstart", handleMove, { passive: true });
    return () => {
      clearInterval(interval);
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("touchstart", handleMove);
    };
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  }, []);

  const handleToggleTOC = useCallback(() => {
    setShowControls((p) => !p);
    setShowSearch(false);
    setShowAnnotations(false);
    setShowSettings(false);
  }, []);

  const handleToggleSettings = useCallback(() => {
    setShowSettings((p) => !p);
    setShowControls(false);
    setShowSearch(false);
    setShowAnnotations(false);
  }, []);

  const handleToggleSearch = useCallback(() => {
    setShowSearch((p) => !p);
    setShowControls(false);
    setShowSettings(false);
    setShowAnnotations(false);
  }, []);

  const handleToggleAnnotations = useCallback(() => {
    setShowAnnotations((p) => !p);
    setShowControls(false);
    setShowSettings(false);
    setShowSearch(false);
  }, []);

  const handleCloseSettings = useCallback(() => setShowSettings(false), []);
  const handleCloseControls = useCallback(() => setShowControls(false), []);
  const handleCloseSearch = useCallback(() => setShowSearch(false), []);
  const handleCloseAnnotations = useCallback(() => setShowAnnotations(false), []);

  const hasActiveDrawer = showControls || showSettings || showSearch || showAnnotations;

  return {
    showUI,
    setShowUI,
    showSettings,
    setShowSettings,
    showControls,
    setShowControls,
    showSearch,
    setShowSearch,
    showAnnotations,
    setShowAnnotations,
    isFullscreen,
    hasActiveDrawer,
    handleToggleFullscreen,
    handleToggleTOC,
    handleToggleSettings,
    handleToggleSearch,
    handleToggleAnnotations,
    handleCloseSettings,
    handleCloseControls,
    handleCloseSearch,
    handleCloseAnnotations,
  };
}
