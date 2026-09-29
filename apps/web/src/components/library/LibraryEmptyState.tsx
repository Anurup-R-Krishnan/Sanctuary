import { Globe, Plus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { UploadErrorToast } from "@/components/ui/UploadErrorToast";
import { useBookUpload } from "@/hooks/useBookUpload";

interface LibraryEmptyStateProps {
  onAddBook: (file: File) => Promise<void>;
  onOpenCatalog?: () => void;
}

const EMPTY_SPINES = [52, 60, 46, 64, 56, 50, 62];

export function LibraryEmptyState({ onAddBook, onOpenCatalog }: LibraryEmptyStateProps) {
  const upload = useBookUpload(onAddBook);

  return (
    <div
      className={`flex min-h-[62vh] flex-col items-center justify-center rounded-xl px-4 text-center transition-colors ${
        upload.isDragging ? "bg-accent/[0.06] outline-dashed outline-2 outline-offset-[-12px] outline-accent/50" : ""
      }`}
      {...upload.dropHandlers}
    >
      <input ref={upload.inputRef} {...upload.inputProps} />
      <div aria-hidden="true" className="flex items-end gap-[5px] border-b-2 border-fg/60 px-3 pb-px">
        {EMPTY_SPINES.map((height, index) => (
          <span
            className="w-3 rounded-t-[2px] border border-b-0 border-dashed border-line bg-subtle/60"
            key={index}
            style={{ height }}
          />
        ))}
      </div>
      <p className="label-caps mt-10">Your library</p>
      <h2 className="mt-2 font-display text-4xl font-medium tracking-tight text-fg">An empty shelf</h2>
      <p className="mx-auto mt-3 max-w-md text-fg-muted">
        Add EPUB, PDF, MOBI, AZW3, FB2, CBZ, Markdown, HTML or plain text files. Books are stored on this device and open offline.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button isLoading={upload.isLoading} onClick={upload.openPicker} size="lg">
          <Plus className="h-4 w-4" strokeWidth={2} />
          Add a book
        </Button>
        {onOpenCatalog && (
          <Button onClick={onOpenCatalog} size="lg" variant="secondary">
            <Globe className="h-4 w-4" strokeWidth={1.75} />
            Browse free classics
          </Button>
        )}
      </div>
      <p className="mt-4 text-sm text-fg-muted">or drop files here</p>
      {upload.errorMessage && (
        <div className="mt-4">
          <UploadErrorToast message={upload.errorMessage} onDismiss={upload.clearError} />
        </div>
      )}
    </div>
  );
}
