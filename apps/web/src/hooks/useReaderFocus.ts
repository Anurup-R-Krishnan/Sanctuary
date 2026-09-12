import { useEffect, type RefObject } from "react";

export function useReaderFocus(rootRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.focus({ preventScroll: true });
    const focusRoot = () => root.focus({ preventScroll: true });
    const handleWindowFocus = () => focusRoot();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        window.setTimeout(focusRoot, 0);
      }
    };
    root.addEventListener("pointerdown", focusRoot);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      root.removeEventListener("pointerdown", focusRoot);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [rootRef]);
}
