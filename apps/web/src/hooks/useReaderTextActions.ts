import { useCallback } from "react";

import type { ReaderSelection } from "@/types/reader";

interface UseReaderTextActionsProps {
  addAnnotation: (
    selection: ReaderSelection,
    type: "highlight" | "underline" | "note",
    color?: string,
    note?: string
  ) => void;
  clearSelection: () => void;
  selection: ReaderSelection | null;
  speak: (text: string) => void;
}

export function useReaderTextActions({
  selection,
  addAnnotation,
  speak,
  clearSelection,
}: UseReaderTextActionsProps) {
  const handleHighlight = useCallback(
    (color: string) => {
      if (selection) addAnnotation(selection, "highlight", color);
    },
    [selection, addAnnotation]
  );

  const handleUnderline = useCallback(() => {
    if (selection) addAnnotation(selection, "underline");
  }, [selection, addAnnotation]);

  const handleAddNote = useCallback(() => {
    if (!selection) return;
    const note = window.prompt("Add a note:");
    if (note !== null) addAnnotation(selection, "note", undefined, note);
  }, [selection, addAnnotation]);

  const handleCopy = useCallback(() => {
    if (!selection) return;
    navigator.clipboard.writeText(selection.text);
    clearSelection();
  }, [selection, clearSelection]);

  const handleSpeak = useCallback(() => {
    if (!selection) return;
    speak(selection.text);
    clearSelection();
  }, [selection, speak, clearSelection]);

  return {
    handleHighlight,
    handleUnderline,
    handleAddNote,
    handleCopy,
    handleSpeak,
  };
}
