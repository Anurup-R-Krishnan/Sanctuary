import { useEffect } from "react";
import { useSettingsShallow } from "@/store/useSettingsStore";
import { useUIStore } from "@/store/useUIStore";
import { Theme } from "@/types";

export function useAppTheme() {
  const theme = useUIStore((state) => state.theme);
  const { reduceMotion } = useSettingsShallow((state) => ({
    reduceMotion: state.reduceMotion
  }));

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === Theme.DARK);
    root.classList.toggle("reduce-motion", reduceMotion);

    const bgColor = theme === Theme.DARK ? "#0f0e0d" : "#fefcf8";
    document.body.style.backgroundColor = bgColor;
    document.body.style.transition = reduceMotion ? "none" : "background-color 0.3s ease";
  }, [theme, reduceMotion]);

  return { theme, reduceMotion };
}
