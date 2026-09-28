export type AppPlatform = "desktop" | "web";

export interface AppRuntime {
  canUseNativeFilePicker: boolean;
  canUseNativeMenus: boolean;
  /**
   * Whether an API backend is reachable. The web app is served by it; a
   * desktop build only has one if built with VITE_API_BASE_URL. Without it,
   * sign-in, sync and online catalogs are hidden.
   */
  hasRemoteApi: boolean;
  isOfflineFirst: boolean;
  platform: AppPlatform;
}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export const appRuntime: AppRuntime = Object.freeze({
  canUseNativeFilePicker: isTauriRuntime(),
  hasRemoteApi: !isTauriRuntime() || Boolean(import.meta.env.VITE_API_BASE_URL),
  canUseNativeMenus: isTauriRuntime(),
  isOfflineFirst: isTauriRuntime(),
  platform: isTauriRuntime() ? "desktop" : "web",
});
