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
  onRequestNote?: (selection: ReaderSelection, color?: string) => void;
  selection: ReaderSelection | null;
  speak: (text: string) => void;
}

export function useReaderTextActions({
  addAnnotation,
  clearSelection,
  onRequestNote,
  selection,
  speak,
}: UseReaderTextActionsProps) {
  const handleHighlight = useCallback(
    (color?: string) => {
      if (selection) addAnnotation(selection, "highlight", color);
    },
    [selection, addAnnotation]
  );

  const handleUnderline = useCallback(() => {
    if (selection) addAnnotation(selection, "underline");
  }, [selection, addAnnotation]);

  const handleAddNote = useCallback(
    (color?: string) => {
      if (!selection) return;
      if (onRequestNote) {
        onRequestNote(selection, color);
        return;
      }
      const note = window.prompt("Add a note:");
      if (note !== null) addAnnotation(selection, "note", color, note);
    },
    [selection, onRequestNote, addAnnotation]
  );

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
