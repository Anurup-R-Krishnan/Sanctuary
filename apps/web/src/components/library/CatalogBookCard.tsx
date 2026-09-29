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
  onNavigate?: (url: string) => void;
}

export const CatalogBookCard: React.FC<CatalogBookCardProps> = ({
  entry,
  isImported = false,
  isImporting = false,
  onImport,
  onNavigate,
}) => {
  const [imageError, setImageError] = useState(false);
  const isNavigable = entry.navigationUrl && !entry.acquisitionUrl;

  return (
    <div className="flex flex-col justify-between p-4 rounded-xl bg-surface border border-line hover:border-accent/40 transition-all">
      <div className="flex gap-4">
        {/* Book Cover */}
        <div className="w-20 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-page border border-line/60 relative flex items-center justify-center">
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
          <h3 className="text-sm font-semibold text-fg line-clamp-2 leading-snug">
            {entry.title}
          </h3>
          {entry.author && (
            <p className="text-xs text-fg-muted mt-1 truncate">
              {entry.author}
            </p>
          )}
          {entry.published && (
            <p className="text-xs text-fg-muted mt-0.5">
              {entry.published.slice(0, 10)}
            </p>
          )}
          {entry.summary && (
            <p className="text-xs text-fg-muted/90 mt-2 line-clamp-3 leading-relaxed">
              {entry.summary.replace(/<[^>]*>?/gm, "")}
            </p>
          )}
        </div>
      </div>

      {/* Action footer */}
      <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between">
        {isNavigable ? (
          <span className="text-xs text-fg-muted uppercase tracking-wider font-mono">
            CATALOG
          </span>
        ) : (
          <span className="text-xs text-fg-muted uppercase tracking-wider font-mono">
            {entry.format?.includes("epub") ? "EPUB" : entry.format || "EBOOK"}
          </span>
        )}

        {isNavigable ? (
          <Button
            onClick={() => onNavigate?.(entry.navigationUrl!)}
            size="sm"
            variant="secondary"
          >
            Open
          </Button>
        ) : isImported ? (
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
