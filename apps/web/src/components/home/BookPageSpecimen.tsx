import type { Book } from "@/types";

import { useBookExcerpt } from "@/hooks/useBookExcerpt";

const FALLBACK = {
  chapter: "Loomings",
  runningHead: "Moby-Dick",
  section: "Chapter I",
  text: "Call me Ishmael. Some years ago, never mind how long precisely, having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world. It is a way I have of driving off the spleen and regulating the circulation. Whenever I find myself growing grim about the mouth; whenever it is a damp, drizzly November in my soul; then, I account it high time to get to sea as soon as I can.",
};

interface BookPageSpecimenProps {
  backBooks?: Book[];
  book?: Book | null;
  onOpenBook?: (book: Book) => void;
}

function BackSheet({ book, className }: { book?: Book; className: string }) {
  return (
    <div className={`absolute inset-0 rounded-[6px] border border-line/70 bg-surface-raised shadow-sm ${className}`}>
      {book && (
        <div className="flex items-center justify-between px-8 pt-7 opacity-50 sm:px-11">
          <span className="label-caps max-w-[70%] truncate !text-2xs !tracking-[0.2em]">{book.title}</span>
        </div>
      )}
    </div>
  );
}

export function BookPageSpecimen({ backBooks = [], book = null, onOpenBook }: BookPageSpecimenProps) {
  const excerpt = useBookExcerpt(book);
  const page = book && excerpt
    ? { chapter: excerpt.chapter, runningHead: book.title, section: book.author || "", text: excerpt.text }
    : FALLBACK;
  const initial = page.text.charAt(0);
  const rest = page.text.slice(1);
  const isInteractive = Boolean(book && excerpt && onOpenBook);

  const sheet = (
    <div className="relative rotate-[-0.6deg] rounded-[6px] border border-line bg-surface-raised px-8 pb-8 pt-7 shadow-xl transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-[-0.3deg] sm:px-11">
      <div className="flex items-center justify-between gap-4 border-b border-line/70 pb-2">
        <span className="label-caps min-w-0 truncate !text-2xs !tracking-[0.2em]">{page.runningHead}</span>
        {page.section && <span className="label-caps shrink-0 max-w-[45%] truncate !text-2xs !tracking-[0.2em]">{page.section}</span>}
      </div>

      {page.chapter && (
        <>
          <h3 className="mt-7 text-center font-display text-2xl font-medium tracking-tight text-fg line-clamp-2">{page.chapter}</h3>
          <div className="mx-auto mt-3 h-px w-10 bg-accent/60" />
        </>
      )}

      <p className="mt-6 font-serif text-[0.97rem] leading-[1.68] text-fg/90 [hyphens:auto] [text-align:justify] [text-wrap:pretty]" lang="en">
        <span className="float-left -ml-0.5 mr-[3px] mt-[0.3rem] font-display text-[3.5rem] font-medium leading-[0.78] text-accent">{initial}</span>
        {rest}
      </p>

      <div className="mt-6 text-center">
        <span className="folio text-sm text-fg-muted">1</span>
      </div>
    </div>
  );

  return (
    <div className="relative mx-auto w-full max-w-[25rem] select-none">
      <BackSheet book={backBooks[1]} className="translate-x-3 translate-y-2 rotate-[2.5deg]" />
      <BackSheet book={backBooks[0]} className="translate-x-1.5 translate-y-1 rotate-[1.2deg]" />
      {isInteractive && book ? (
        <button
          aria-label={`Open ${book.title}`}
          className="group relative block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 rounded-[6px]"
          onClick={() => onOpenBook?.(book)}
          type="button"
        >
          {sheet}
        </button>
      ) : (
        <div aria-hidden="true">{sheet}</div>
      )}
    </div>
  );
}
