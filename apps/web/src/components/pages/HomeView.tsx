import { ArrowRight, Library, Plus } from "lucide-react";
import { type CSSProperties, useMemo } from "react";

import type { Book } from "@/types";

import { BookPageSpecimen } from "@/components/home/BookPageSpecimen";
import { ContinueReadingCard } from "@/components/home/ContinueReadingCard";
import { Button } from "@/components/ui/Button";
import { CoverImage } from "@/components/ui/CoverImage";
import { GenerativeBookCover } from "@/components/ui/GenerativeBookCover";
import { UploadErrorToast } from "@/components/ui/UploadErrorToast";
import { useBookUpload } from "@/hooks/useBookUpload";
import { useBookStore } from "@/store/useBookStore";

interface HomeViewProps {
  onAddBook: (file: File) => Promise<void>;
  onBrowseCatalog?: () => void;
  onOpenBook: (book: Book) => void;
  onOpenLibrary: () => void;
  onShowLogin?: () => void;
}

const FEATURES = [
  {
    numeral: "I",
    text: "EPUB, PDF, MOBI, AZW3, FB2, CBZ, CBR, Markdown, HTML and plain text.",
    title: "Any book file",
  },
  {
    numeral: "II",
    text: "Books are kept on this device and open without a connection. Syncing is optional.",
    title: "Yours, offline",
  },
  {
    numeral: "III",
    text: "Highlight passages, write notes and export them as Markdown or JSON.",
    title: "Notes that stay",
  },
  {
    numeral: "IV",
    text: "Themes, fine typography controls, read aloud, bionic reading and a dyslexia-friendly font.",
    title: "Read your way",
  },
];

const reveal = (step: number): CSSProperties => ({ animationDelay: `${step * 90}ms`, animationFillMode: "both" });

export default function HomeView({ onAddBook, onBrowseCatalog, onOpenBook, onOpenLibrary, onShowLogin }: HomeViewProps) {
  const books = useBookStore((state) => state.books);
  const recentBooks = useBookStore((state) => state.recentBooks);
  const upload = useBookUpload(onAddBook);

  const lastBook = useMemo(
    () => recentBooks.find((book) => book.lastOpenedAt && book.progress < 100) ?? null,
    [recentBooks]
  );
  const specimenBook = lastBook ?? recentBooks[0] ?? books[0] ?? null;
  const specimenBackBooks = useMemo(
    () => recentBooks.filter((book) => book.id !== specimenBook?.id).slice(0, 2),
    [recentBooks, specimenBook]
  );
  const shelf = useMemo(
    () => recentBooks.filter((book) => book.id !== lastBook?.id).slice(0, 6),
    [recentBooks, lastBook]
  );

  return (
    <div
      className={`relative page-stack ${upload.isDragging ? "outline outline-2 outline-dashed outline-accent/50 outline-offset-[-12px] rounded-xl" : ""}`}
      {...upload.dropHandlers}
    >
      <input ref={upload.inputRef} {...upload.inputProps} />

      <section className="grid items-center gap-14 pt-2 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20 lg:pt-8">
        <div>
          <p className="label-caps animate-fadeInUp" style={reveal(0)}>
            A reading room
          </p>
          <h1
            className="mt-5 animate-fadeInUp font-display text-[3.5rem] font-medium leading-[0.95] tracking-[-0.035em] text-fg sm:text-[5rem] lg:text-[6rem]"
            style={reveal(1)}
          >
            Sanctuary
          </h1>
          <div className="mt-6 h-px w-16 animate-fadeInUp bg-accent/70" style={reveal(2)} />
          <p
            className="mt-6 max-w-[30rem] animate-fadeInUp font-display text-xl leading-relaxed text-fg/80 sm:text-[1.4rem]"
            style={reveal(2)}
          >
            A quiet reader for the books you keep. Open a file and read it, set in good type, on this device.
          </p>

          <div className="mt-9 space-y-5 animate-fadeInUp" style={reveal(3)}>
            {lastBook && <ContinueReadingCard book={lastBook} onOpen={onOpenBook} />}

            <div className="flex flex-wrap items-center gap-3">
              <Button isLoading={upload.isLoading} onClick={upload.openPicker} size="lg">
                <Plus className="h-4 w-4" strokeWidth={2} />
                Add a book
              </Button>
              <Button onClick={onOpenLibrary} size="lg" variant="secondary">
                <Library className="h-4 w-4" strokeWidth={1.75} />
                {books.length > 0 ? `Open library · ${books.length}` : "Open library"}
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              {onBrowseCatalog && (
                <button
                  className="group inline-flex items-center gap-1.5 font-medium text-accent underline-offset-4 hover:underline"
                  onClick={onBrowseCatalog}
                  type="button"
                >
                  Browse free classics
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              )}
              <span className="text-fg-muted">or drop a file anywhere on this page</span>
            </div>

            {upload.errorMessage && <UploadErrorToast message={upload.errorMessage} onDismiss={upload.clearError} />}
          </div>
        </div>

        <div className="animate-fadeInUp px-4 sm:px-8 lg:px-0" style={reveal(4)}>
          <BookPageSpecimen backBooks={specimenBackBooks} book={specimenBook} onOpenBook={onOpenBook} />
        </div>
      </section>

      {shelf.length > 0 && (
        <section className="animate-fadeInUp" style={reveal(5)}>
          <div className="flex items-baseline justify-between border-b border-line pb-3">
            <h2 className="font-display text-2xl font-medium tracking-tight text-fg">Recently opened</h2>
            <button className="text-sm font-medium text-accent hover:underline underline-offset-4" onClick={onOpenLibrary} type="button">
              All books
            </button>
          </div>
          <ul className="mt-6 grid grid-cols-3 gap-5 sm:grid-cols-6">
            {shelf.map((book) => (
              <li key={book.id}>
                <button className="group block w-full text-left" onClick={() => onOpenBook(book)} type="button">
                  <div className="aspect-[2/3] overflow-hidden rounded-[3px] border border-line/70 bg-subtle shadow-sm transition-[transform,box-shadow] duration-200 group-hover:-translate-y-1 group-hover:shadow-xl">
                    <CoverImage
                      className="h-full w-full object-cover"
                      fallback={<GenerativeBookCover author={book.author} title={book.title} variant="compact" />}
                      url={book.coverUrl}
                    />
                  </div>
                  <p className="mt-2 truncate text-sm font-medium text-fg">{book.title}</p>
                  <p className="truncate text-xs text-fg-muted">{book.author}</p>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="animate-fadeInUp" style={reveal(6)}>
        <div className="rule-ornament font-display text-xl" aria-hidden="true">
          <span>❧</span>
        </div>
        <dl className="mt-10 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div key={feature.title}>
              <dt className="flex items-baseline gap-3">
                <span className="folio text-sm text-accent">{feature.numeral}</span>
                <span className="font-display text-lg font-medium tracking-tight text-fg">{feature.title}</span>
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-fg-muted">{feature.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      {onShowLogin && (
        <p className="animate-fadeInUp text-center text-sm text-fg-muted" style={reveal(7)}>
          Reading on more than one device?{" "}
          <button className="font-medium text-accent underline-offset-4 hover:underline" onClick={onShowLogin} type="button">
            Sign in to sync
          </button>
          . An account is optional.
        </p>
      )}
    </div>
  );
}
