export type AppPlatform = "desktop" | "web";

export interface AppRuntime {
  canUseNativeFilePicker: boolean;
  canUseNativeMenus: boolean;
  isOfflineFirst: boolean;
  platform: AppPlatform;
}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export const appRuntime: AppRuntime = Object.freeze({
  canUseNativeFilePicker: isTauriRuntime(),
  canUseNativeMenus: isTauriRuntime(),
  isOfflineFirst: isTauriRuntime(),
  platform: isTauriRuntime() ? "desktop" : "web",
});
