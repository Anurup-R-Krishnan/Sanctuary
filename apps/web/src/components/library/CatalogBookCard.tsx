import { Check, Download, Loader2 } from "lucide-react";
import React, { useState } from "react";

import type { OpdsEntry } from "@/types/opds";

import { Button } from "@/components/ui/Button";
import { GenerativeBookCover } from "@/components/ui/GenerativeBookCover";

interface CatalogBookCardProps {
  entry: OpdsEntry;
  isImported?: boolean;
  isImporting?: boolean;
  onImport: (entry: OpdsEntry) => void;
}

export const CatalogBookCard: React.FC<CatalogBookCardProps> = ({
  entry,
  isImported = false,
  isImporting = false,
  onImport,
}) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="flex flex-col justify-between p-4 rounded-xl bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border hover:border-light-accent/40 dark:hover:border-dark-accent/40 transition-all">
      <div className="flex gap-4">
        {/* Book Cover */}
        <div className="w-20 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-light-primary dark:bg-dark-primary border border-light-border/60 dark:border-dark-border/60 relative flex items-center justify-center">
          {entry.coverUrl && !imageError ? (
            <img
              alt={entry.title}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => setImageError(true)}
              src={entry.coverUrl}
            />
          ) : (
            <GenerativeBookCover author={entry.author} title={entry.title} variant="compact" />
          )}
        </div>

        {/* Book Details */}
        <div className="flex-1 min-w-0 flex flex-col justify-start">
          <h3 className="text-sm font-semibold text-light-text dark:text-dark-text line-clamp-2 leading-snug">
            {entry.title}
          </h3>
          {entry.author && (
            <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-1 truncate">
              {entry.author}
            </p>
          )}
          {entry.published && (
            <p className="text-[11px] text-light-text-muted/70 dark:text-dark-text-muted/70 mt-0.5">
              {entry.published.slice(0, 10)}
            </p>
          )}
          {entry.summary && (
            <p className="text-xs text-light-text-muted dark:text-dark-text-muted/90 mt-2 line-clamp-3 leading-relaxed">
              {entry.summary.replace(/<[^>]*>?/gm, "")}
            </p>
          )}
        </div>
      </div>

      {/* Action footer */}
      <div className="mt-4 pt-3 border-t border-light-border/60 dark:border-dark-border/60 flex items-center justify-between">
        <span className="text-[11px] text-light-text-muted/70 dark:text-dark-text-muted/70 uppercase tracking-wider font-mono">
          {entry.format?.includes("epub") ? "EPUB" : entry.format || "EBOOK"}
        </span>

        {isImported ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
            <Check className="w-3.5 h-3.5" />
            Imported
          </span>
        ) : (
          <Button
            disabled={!entry.acquisitionUrl || isImporting}
            isLoading={isImporting}
            onClick={() => onImport(entry)}
            size="sm"
            variant="secondary"
          >
            {isImporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <Download className="w-3.5 h-3.5 mr-1" />
            )}
            Import
          </Button>
        )}
      </div>
    </div>
  );
};
