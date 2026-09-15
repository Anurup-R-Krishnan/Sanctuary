import { BookOpen, Globe } from "lucide-react";
import React from "react";

import AddBookButton from "@/components/ui/AddBookButton";
import { Button } from "@/components/ui/Button";

interface LibraryEmptyStateProps {
  onAddBook: (file: File) => Promise<void>;
  onOpenCatalog?: () => void;
}

export function LibraryEmptyState({ onAddBook, onOpenCatalog }: LibraryEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-fadeInUp rounded-2xl border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface">
      <div className="mb-8 flex items-center justify-center w-20 h-20 rounded-2xl bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border">
        <BookOpen className="w-9 h-9 text-light-accent dark:text-dark-accent" strokeWidth={1.5} />
      </div>
      <h2 className="text-3xl font-sans font-bold text-light-text dark:text-dark-text mb-3">Your Library Awaits</h2>
      <p className="text-light-text-muted dark:text-dark-text-muted max-w-sm mx-auto mb-8 font-sans text-lg leading-relaxed">
        Add your first book to begin your reading journey
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <AddBookButton onAddBook={onAddBook} variant="inline" />
        {onOpenCatalog && (
          <Button onClick={onOpenCatalog} variant="secondary">
            <Globe className="w-4 h-4 mr-1.5" />
            Browse Catalogs
          </Button>
        )}
      </div>
      <span className="text-xs text-light-text-muted/50 dark:text-dark-text-muted/50 mt-3">Supports EPUB, MOBI, AZW3, FB2, CBZ, TXT, MD, HTML</span>
    </div>
  );
}
