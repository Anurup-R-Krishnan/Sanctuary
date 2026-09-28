import { SUPPORTED_EXTENSIONS } from "@/reader/formats/FormatDetector";

/** Desktop (Tauri) file access. Only call when `appRuntime.canUseNativeFilePicker`. */

const PICKER_EXTENSIONS = SUPPORTED_EXTENSIONS.map((ext) => ext.replace(/^\./, ""));

/** Opens the OS file dialog; the dialog plugin adds picked paths to the fs scope. */
export async function pickNativeBookPaths(): Promise<string[]> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const picked = await open({ filters: [{ extensions: PICKER_EXTENSIONS, name: "Books" }], multiple: true });
  if (picked === null) return [];
  return Array.isArray(picked) ? picked : [picked];
}

export async function readNativeBook(path: string): Promise<File> {
  const { readFile } = await import("@tauri-apps/plugin-fs");
  const bytes = await readFile(path);
  return new File([bytes], path.split(/[\\/]/).pop() || "book");
}
