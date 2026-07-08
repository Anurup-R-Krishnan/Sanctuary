import React from "react";

import type { Book } from "@/types";

import { ConfirmDialog } from "@/components/ui/Dialog";

interface DeleteBookDialogProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (bookId: string) => void;
}

export function DeleteBookDialog({ book, isOpen, onClose, onConfirm }: DeleteBookDialogProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Book"
      description={
        book
          ? `Are you sure you want to delete "${book.title}"? This action cannot be undone and will permanently remove all reading progress, bookmarks, and highlights associated with this book.`
          : ""
      }
      confirmLabel="Delete Book"
      onConfirm={() => {
        if (book) {
          onConfirm(book.id);
        }
      }}
      isDestructive={true}
    />
  );
}
