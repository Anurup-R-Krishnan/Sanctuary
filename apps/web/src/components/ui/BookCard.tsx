import { AlertTriangle, ArrowRight, Heart, PencilLine, Trash2 } from "lucide-react";
import React, { useCallback, useState } from "react";

import type { Book } from "@/types";

import { useAuthedCoverUrl } from "@/hooks/useAuthedCoverUrl";
import { useSettings } from "@/store/useSettingsStore";
import { cx } from "@/utils/cx";
import { clampPercent } from "@/utils/number";

import { ConfirmDialog } from "./Dialog";
import { GenerativeBookCover } from "./GenerativeBookCover";

type BookCardVariant = "default" | "compact" | "featured";

interface BookCardProps {
  book: Book;
  onDelete?: (id: string) => void;
  onEdit?: (book: Book) => void;
  onSelect: (book: Book) => void;
  onToggleFavorite?: (id: string) => void;
  variant?: BookCardVariant;
}

const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const getBookProgressPercent = (book: Pick<Book, "progress">) => Math.round(clampPercent(book.progress || 0));

function progressLabel(percent: number): string {
  if (percent >= 100) return "Finished";
  if (percent <= 0) return "Not started";
  return `${percent}% read`;
}

const BookCover = ({ book, reduceMotion, variant }: { book: Book; reduceMotion: boolean; variant: BookCardVariant }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const coverSrc = useAuthedCoverUrl(book.coverUrl);

  const containerClass = {
    compact: "relative h-20 w-14 shrink-0 overflow-hidden rounded-[3px] border border-line/60 bg-subtle shadow-sm",
    default: "relative aspect-[2/3] w-full overflow-hidden bg-subtle",
    featured: "relative aspect-[2/3] w-32 shrink-0 overflow-hidden rounded-[4px] border border-line/60 bg-subtle shadow-paper sm:w-40",
  }[variant];

  return (
    <div className={containerClass}>
      {coverSrc && !imageError ? (
        <img
          alt=""
          className={cx(
            "h-full w-full object-cover transition-[opacity,transform] duration-500",
            imageLoaded ? "opacity-100" : "opacity-0",
            !reduceMotion && variant === "default" && "group-hover:scale-[1.03]"
          )}
          onError={() => setImageError(true)}
          onLoad={() => setImageLoaded(true)}
          src={coverSrc}
        />
      ) : (
        <GenerativeBookCover author={book.author} title={book.title} variant={variant} />
      )}
      {variant !== "compact" && <div aria-hidden="true" className="book-spine-shadow pointer-events-none absolute inset-y-0 left-0 w-3" />}
    </div>
  );
};

const CardAction = ({ active = false, icon, label, onClick, tone = "default" }: {
  active?: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  tone?: "danger" | "default";
}) => (
  <button
    aria-label={label}
    aria-pressed={tone === "default" && label.includes("favorites") ? active : undefined}
    className={cx(
      "flex h-8 w-8 items-center justify-center rounded-md border border-line/80 bg-surface-raised/95 shadow-paper transition-colors duration-instant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
      active ? "text-accent" : "text-fg-muted",
      tone === "danger" ? "hover:border-danger/40 hover:text-danger" : "hover:border-accent/50 hover:text-accent"
    )}
    onClick={onClick}
    onKeyDown={(e) => e.stopPropagation()}
    title={label}
    type="button"
  >
    {icon}
  </button>
);

function StatusBadges({ book, isRecent, percent }: { book: Book; isRecent: boolean; percent: number }) {
  const hasContentIssue = !!book.contentStatus && book.contentStatus !== "available";
  if (!hasContentIssue && percent < 100 && !isRecent) return null;
  return (
    <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
      {hasContentIssue ? (
        <span className="inline-flex items-center gap-1 rounded-[3px] bg-danger px-1.5 py-0.5 text-2xs font-semibold text-white" title="The book file needs to be imported again">
          <AlertTriangle className="h-3 w-3" strokeWidth={2} />
          {book.contentStatus === "missing" ? "Missing file" : "Damaged file"}
        </span>
      ) : percent >= 100 ? (
        <span className="rounded-[3px] border border-line/80 bg-surface-raised/95 px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-[0.08em] text-fg">Finished</span>
      ) : (
        <span className="rounded-[3px] bg-accent px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-[0.08em] text-accent-fg">Recent</span>
      )}
    </div>
  );
}

function BookCard({ book, onDelete, onEdit, onSelect, onToggleFavorite, variant = "default" }: BookCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const reduceMotion = useSettings((state) => state.reduceMotion);

  const percent = getBookProgressPercent(book);
  const isRecent = !!book.lastOpenedAt && Date.now() - new Date(book.lastOpenedAt).getTime() < RECENT_WINDOW_MS;
  const isFavorite = !!book.isFavorite;

  const stop = (handler: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    handler();
  };

  const handleConfirmDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    onDelete?.(book.id);
  }, [book.id, onDelete]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(book);
    }
  };

  const actions = (
    <>
      {onToggleFavorite && (
        <CardAction
          active={isFavorite}
          icon={<Heart className={cx("h-4 w-4", isFavorite && "fill-current")} strokeWidth={1.75} />}
          label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          onClick={stop(() => onToggleFavorite(book.id))}
        />
      )}
      {onEdit && (
        <CardAction icon={<PencilLine className="h-4 w-4" strokeWidth={1.75} />} label="Edit details" onClick={stop(() => onEdit(book))} />
      )}
      {onDelete && (
        <CardAction icon={<Trash2 className="h-4 w-4" strokeWidth={1.75} />} label="Delete book" onClick={stop(() => setShowDeleteConfirm(true))} tone="danger" />
      )}
    </>
  );

  const revealActions = "opacity-0 transition-opacity duration-instant group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100";

  const cardProps = {
    "aria-label": `${book.title} by ${book.author}. ${progressLabel(percent)}.`,
    onClick: () => onSelect(book),
    onKeyDown: handleKeyDown,
    role: "button",
    tabIndex: 0,
  } as const;

  return (
    <>
      {variant === "compact" ? (
        <div
          {...cardProps}
          className="group relative flex h-full cursor-pointer items-center gap-4 rounded-lg border border-line bg-surface-raised p-3 pr-4 transition-colors duration-instant hover:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <BookCover book={book} reduceMotion={reduceMotion} variant="compact" />
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 font-display text-base font-medium leading-snug text-fg transition-colors group-hover:text-accent">{book.title}</h3>
            <p className="mt-0.5 truncate text-xs text-fg-muted">{book.author}</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
              </div>
              <span className="text-2xs tabular-nums text-fg-muted">{percent}%</span>
            </div>
          </div>
          {(onToggleFavorite || onEdit || onDelete) && (
            <div className={cx("flex shrink-0 items-center gap-1.5", revealActions)}>{actions}</div>
          )}
        </div>
      ) : variant === "featured" ? (
        <article
          {...cardProps}
          className="group paper-card relative cursor-pointer overflow-hidden p-6 transition-colors duration-instant hover:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:p-8"
        >
          <div className="flex items-start gap-6 sm:gap-9">
            <BookCover book={book} reduceMotion={reduceMotion} variant="featured" />
            <div className="flex min-w-0 flex-1 flex-col self-stretch">
              <div className="flex items-start justify-between gap-4">
                <p className="label-caps !text-accent">Now reading</p>
                <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
              </div>
              <h3 className="mt-3 line-clamp-2 font-display text-3xl font-medium leading-[1.08] tracking-tight text-fg sm:text-[2.6rem]">{book.title}</h3>
              <p className="mt-2 truncate text-lg text-fg-muted">{book.author}</p>
              <div className="mt-auto max-w-md pt-6">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-fg-muted">{progressLabel(percent)}</span>
                  <span className="font-display text-xl font-medium tabular-nums text-fg">{percent}%</span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${percent}%` }} />
                </div>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-accent">
                  {percent >= 100 ? "Read again" : "Resume reading"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
                </span>
              </div>
            </div>
          </div>
        </article>
      ) : (
        <article
          {...cardProps}
          className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-lg border border-line bg-surface-raised shadow-paper transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <div className="relative">
            <BookCover book={book} reduceMotion={reduceMotion} variant="default" />
            <StatusBadges book={book} isRecent={isRecent} percent={percent} />
            {(onToggleFavorite || onEdit || onDelete) && (
              <div className={cx("absolute right-2.5 top-2.5 flex flex-col gap-1.5", revealActions)}>{actions}</div>
            )}
            {isFavorite && (
              <Heart aria-hidden="true" className="absolute bottom-3 right-3 h-4 w-4 fill-accent text-accent drop-shadow-sm transition-opacity group-hover:opacity-0" strokeWidth={1.75} />
            )}
            <div className="absolute inset-x-0 bottom-0 h-[3px] bg-line/80">
              <div className="h-full bg-accent transition-[width] duration-500" style={{ width: `${percent}%` }} />
            </div>
          </div>
          <div className="flex flex-1 flex-col px-4 pb-4 pt-3.5">
            <h3 className="line-clamp-2 min-h-[2.75em] font-display text-lg font-medium leading-snug tracking-tight text-fg transition-colors group-hover:text-accent">
              {book.title}
            </h3>
            <p className="mt-1 truncate text-xs text-fg-muted">{book.author || "Unknown author"}</p>
            <div className="mt-auto flex items-center justify-between border-t border-line/60 pt-3 text-xs">
              <span className="text-fg-muted">{progressLabel(percent)}</span>
              {percent > 0 && percent < 100 && <span className="font-semibold tabular-nums text-accent">{percent}%</span>}
            </div>
          </div>
        </article>
      )}
      <ConfirmDialog
        confirmLabel="Delete"
        description={`"${book.title}" and its reading progress will be removed. This cannot be undone.`}
        isDestructive
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Delete book"
      />
    </>
  );
}

export default BookCard;
