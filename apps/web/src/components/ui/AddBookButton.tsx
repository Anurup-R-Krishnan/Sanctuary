import { Plus, Upload } from "lucide-react";

import { useBookUpload } from "@/hooks/useBookUpload";
import { cx } from "@/utils/cx";

import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { UploadErrorToast } from "./UploadErrorToast";

type AddBookVariant = "fab" | "inline" | "header";

interface AddBookButtonProps {
  onAddBook: (file: File) => Promise<void>;
  variant?: AddBookVariant;
}

function AddBookButton({ onAddBook, variant = "fab" }: AddBookButtonProps) {
  const {
    inputRef,
    inputProps,
    errorMessage,
    clearError,
    isLoading,
    isDragging,
    openPicker,
    dropHandlers,
  } = useBookUpload(onAddBook);

  const hiddenInput = <input ref={inputRef} {...inputProps} />;

  if (variant === "header") {
    return (
      <>
        {hiddenInput}
        <div className="relative">
          <Button onClick={openPicker} isLoading={isLoading} variant="primary" className="gap-2">
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            <span className="hidden sm:inline">Add Book</span>
          </Button>
          {errorMessage && (
            <UploadErrorToast
              message={errorMessage}
              onDismiss={clearError}
              className="absolute top-full right-0 mt-2 z-50 whitespace-nowrap shadow-lg"
            />
          )}
        </div>
      </>
    );
  }

  if (variant === "inline") {
    return (
      <>
        {hiddenInput}
        <div className="flex items-center gap-3">
          <Button onClick={openPicker} isLoading={isLoading} variant="primary" className="gap-2">
            <Upload className="w-4 h-4" />
            <span>Add Book</span>
          </Button>
          {errorMessage && <UploadErrorToast message={errorMessage} onDismiss={clearError} />}
        </div>
      </>
    );
  }

  return (
    <>
      {hiddenInput}
      <div
        className={cx(
          "fixed bottom-24 right-6 z-40 transition-transform duration-instant",
          isDragging && "scale-110"
        )}
      >
        <IconButton
          icon={
            <Plus
              className={cx(
                "w-6 h-6 text-white transition-transform duration-instant",
                isDragging ? "rotate-45" : "group-hover:rotate-90"
              )}
            />
          }
          label="Add book"
          onClick={openPicker}
          isLoading={isLoading}
          {...dropHandlers}
          className={cx(
            "w-14 h-14 !rounded-2xl shadow-lg border-0 group transition-all duration-instant",
            "bg-light-accent dark:bg-dark-accent",
            isDragging ? "scale-110" : "hover:shadow-xl hover:scale-105"
          )}
        />

        {isDragging && (
          <div className="absolute -inset-4 rounded-3xl border-2 border-dashed border-light-accent dark:border-dark-accent animate-pulse pointer-events-none" />
        )}

        {errorMessage && (
          <UploadErrorToast
            message={errorMessage}
            onDismiss={clearError}
            className="absolute bottom-full right-0 mb-3 whitespace-nowrap shadow-lg"
          />
        )}
      </div>
    </>
  );
}

export default AddBookButton;
