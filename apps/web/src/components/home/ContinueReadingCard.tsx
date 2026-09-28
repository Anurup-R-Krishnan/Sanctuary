import { ArrowRight } from "lucide-react";

import type { Book } from "@/types";

import { CoverImage } from "@/components/ui/CoverImage";
import { GenerativeBookCover } from "@/components/ui/GenerativeBookCover";
import { clampPercent } from "@/utils/number";

interface ContinueReadingCardProps {
  book: Book;
  onOpen: (book: Book) => void;
}

export function ContinueReadingCard({ book, onOpen }: ContinueReadingCardProps) {
  const progress = clampPercent(book.progress);

  return (
    <button
      className="paper-card group flex w-full items-center gap-5 p-4 text-left transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 sm:p-5"
      onClick={() => onOpen(book)}
      type="button"
    >
      <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-[3px] border border-line/70 shadow-sm">
        <CoverImage
          className="h-full w-full object-cover"
          fallback={<GenerativeBookCover author={book.author} title={book.title} variant="compact" />}
          url={book.coverUrl}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="label-caps">Continue reading</p>
        <p className="mt-1.5 truncate font-display text-xl font-medium tracking-tight text-fg">{book.title}</p>
        <p className="truncate text-sm text-fg-muted">{book.author}</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-line/70">
            <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
          </div>
          <span className="folio text-sm tabular-nums text-fg-muted">{progress}%</span>
        </div>
      </div>

      <ArrowRight className="h-5 w-5 shrink-0 text-fg-muted transition-transform duration-200 group-hover:translate-x-1 group-hover:text-accent" strokeWidth={1.5} />
    </button>
  );
}
