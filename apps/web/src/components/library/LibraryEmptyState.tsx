import { BookOpen, Globe } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/Button";

interface LibraryEmptyStateProps {
  onOpenCatalog?: () => void;
}

export function LibraryEmptyState({ onOpenCatalog }: LibraryEmptyStateProps) {

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="mb-6 flex items-center justify-center w-12 h-12">
        <BookOpen className="w-8 h-8 text-fg-muted" strokeWidth={1.5} />
      </div>
      <h2 className="font-display font-medium text-2xl text-fg mb-2">No books yet</h2>
      <p className="text-fg-muted max-w-sm mx-auto mb-2">
        EPUB, PDF, MOBI, AZW3, FB2, CBZ comics, Markdown, HTML and plain text are supported.
      </p>
      <p className="text-fg-muted max-w-sm mx-auto mb-6">
        Use Add Book at the top of the page to import one.
      </p>
      {onOpenCatalog && (
        <Button onClick={onOpenCatalog} variant="secondary" className="inline-flex items-center gap-1.5">
          <Globe className="w-4 h-4" />
          Browse catalogs
        </Button>
      )}
    </div>
  );
}
