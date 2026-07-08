import { BookOpen } from "lucide-react";
import React from "react";

import AddBookButton from "@/components/ui/AddBookButton";

interface LibraryEmptyStateProps {
  onAddBook: (file: File) => Promise<void>;
}

export function LibraryEmptyState({ onAddBook }: LibraryEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-fadeInUp rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-light-surface dark:bg-dark-surface">
      <div className="mb-8 flex items-center justify-center w-20 h-20 rounded-2xl bg-light-surface dark:bg-dark-surface border border-black/[0.08] dark:border-white/[0.08]">
        <BookOpen className="w-9 h-9 text-light-accent dark:text-dark-accent" strokeWidth={1.5} />
      </div>
      <h2 className="text-2xl font-bold text-light-text dark:text-dark-text mb-2">Your Library Awaits</h2>
      <p className="text-light-text-muted dark:text-dark-text-muted max-w-sm mx-auto mb-7 text-sm leading-relaxed">
        Add your first book to begin your reading journey
      </p>
      <div className="flex flex-col items-center gap-3">
        <AddBookButton onAddBook={onAddBook} variant="inline" />
        <span className="text-xs text-light-text-muted/50 dark:text-dark-text-muted/50">EPUB format supported</span>
      </div>
    </div>
  );
}
