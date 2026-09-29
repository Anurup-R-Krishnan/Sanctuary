import { useEffect } from "react";

import { useSettingsShallow } from "@/store/useSettingsStore";
import { useUIStore } from "@/store/useUIStore";
import { Theme } from "@/types";
import { colorVisionFilter } from "@/utils/accessibility";

export function useAppTheme() {
  const theme = useUIStore((state) => state.theme);
  const a11y = useSettingsShallow((state) => ({
    colorVision: state.colorVision,
    dyslexicUiFont: state.dyslexicUiFont,
    highContrast: state.highContrast,
    largeTargets: state.largeTargets,
    reduceMotion: state.reduceMotion,
    strongFocus: state.strongFocus,
    uiTextScale: state.uiTextScale,
    underlineLinks: state.underlineLinks,
  }));

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === Theme.DARK);
    root.classList.toggle("reduce-motion", a11y.reduceMotion);
    root.classList.toggle("a11y-high-contrast", a11y.highContrast);
    root.classList.toggle("a11y-dyslexic", a11y.dyslexicUiFont);
    root.classList.toggle("a11y-underline-links", a11y.underlineLinks);
    root.classList.toggle("a11y-strong-focus", a11y.strongFocus);
    root.classList.toggle("a11y-large-targets", a11y.largeTargets);
    root.style.fontSize = a11y.uiTextScale === 100 ? "" : `${a11y.uiTextScale}%`;
    root.style.filter = colorVisionFilter(a11y.colorVision);
    root.dataset.colorVision = a11y.colorVision;

    document.body.style.backgroundColor = "rgb(var(--color-page))";
    document.body.style.transition = a11y.reduceMotion ? "none" : "background-color 0.3s ease";
  }, [theme, a11y]);

  return { reduceMotion: a11y.reduceMotion, theme };
}
