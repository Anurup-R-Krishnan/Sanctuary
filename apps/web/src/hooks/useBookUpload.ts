import { useCallback, useEffect, useRef, useState } from "react";

import { isSupportedExtension, SUPPORTED_FILE_ACCEPT } from "@/reader/formats/FormatDetector";

export interface UseBookUploadResult {
  clearError: () => void;
  /** Drag-and-drop handlers to spread onto a drop target. */
  dropHandlers: {
    onDragLeave: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
  /** Transient error message, auto-clears after a few seconds. */
  errorMessage: string | null;
  /** Props to spread onto the hidden file input. */
  inputProps: {
    accept: string;
    className: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type: "file";
  };
  /** Ref to attach to a hidden <input type="file" />. */
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** True while a valid drag is hovering the drop target. */
  isDragging: boolean;
  /** True while a file is being parsed/persisted. */
  isLoading: boolean;
  /** Opens the native file picker. */
  openPicker: () => void;
}

const ERROR_TIMEOUT_MS = 5000;

/**
 * Shared EPUB upload behaviour: validation, loading/error state, the hidden
 * file input wiring, and drag-and-drop. Previously this logic was duplicated
 * across every Add Book entry point.
 */
export function useBookUpload(onAddBook: (file: File) => Promise<void>): UseBookUploadResult {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => setErrorMessage(null), ERROR_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  const handleFile = useCallback(
    async (file: File) => {
      if (!isSupportedExtension(file.name)) {
        setErrorMessage("Unsupported format. Supported: EPUB, FB2, MOBI, AZW, AZW3, TXT, HTML, Markdown.");
        return;
      }
      setIsLoading(true);
      try {
        await onAddBook(file);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to add book.");
      } finally {
        setIsLoading(false);
      }
    },
    [onAddBook]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
      // Reset so selecting the same file twice still fires onChange.
      e.target.value = "";
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const openPicker = useCallback(() => inputRef.current?.click(), []);
  const clearError = useCallback(() => setErrorMessage(null), []);

  useEffect(() => {
    window.addEventListener("sanctuary:add-book", openPicker);
    return () => window.removeEventListener("sanctuary:add-book", openPicker);
  }, [openPicker]);

  return {
    inputRef,
    inputProps: {
      type: "file",
      accept: SUPPORTED_FILE_ACCEPT,
      className: "hidden",
      onChange: handleChange,
    },
    errorMessage,
    clearError,
    isLoading,
    isDragging,
    openPicker,
    dropHandlers: {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}
